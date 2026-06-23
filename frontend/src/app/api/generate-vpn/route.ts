import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { getSession } from '../../../lib/auth';

/**
 * POST /api/generate-vpn
 *
 * Genera un perfil OpenVPN (.ovpn) efímero para el usuario autenticado.
 *
 * Garantías de seguridad:
 *  1. El middleware bloquea cualquier GET — la ruta solo existe si viene del
 *     botón del dashboard (POST explícito del usuario).
 *  2. La sesión se valida aquí en el route handler (doble comprobación).
 *  3. Toda la criptografía ocurre en /tmp del contenedor con nombres UUID
 *     irrepetibles; los archivos se destruyen en el bloque `finally` sea cual
 *     sea el resultado (éxito o error).
 *  4. El perfil se mantiene en memoria (string) y nunca se escribe a disco
 *     una vez ensamblado.
 *  5. El certificado generado expira en 24 horas (no en 365 días) para
 *     minimizar la ventana si alguien obtuviera el .ovpn.
 */

const PKI_DIR       = '/etc/openvpn/pki';
const TEMPLATE_PATH = '/etc/openvpn/client.ovpn.template';

// Resuelve una ruta PKI: primero el mount del contenedor, luego fallback local
function resolvePki(filename: string, localFallback: string): string {
  const mountedPath = path.join(PKI_DIR, filename);
  return fs.existsSync(mountedPath) ? mountedPath : path.resolve(localFallback);
}

export async function POST(request: Request) {
  // ── 1. Verificar sesión (double-check tras el middleware) ──────────────────
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json(
      { error: 'No autorizado. Inicie sesión primero.' },
      { status: 401 }
    );
  }

  // ── 2. Nombre de usuario seguro derivado del email ─────────────────────────
  const email: string = session.email || '';
  let username = email ? email.split('@')[0] : 'operator';
  username = username.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32) || 'operator';

  // ── 3. Rutas efímeras con UUID irrepetible en /tmp ─────────────────────────
  const uid      = crypto.randomUUID();
  const keyPath  = `/tmp/client_${uid}.key`;
  const csrPath  = `/tmp/client_${uid}.csr`;
  const crtPath  = `/tmp/client_${uid}.crt`;
  const extPath  = `/tmp/ext_${uid}.cnf`;
  const srlPath  = `/tmp/ca_${uid}.srl`;

  try {
    // ── 4. Localizar archivos PKI ────────────────────────────────────────────
    const caPath    = resolvePki('ca.crt',        '../docker/config/pki/ca.crt');
    const caKeyPath = resolvePki('ca.key',        '../docker/config/pki/ca.key');
    const tlsPath   = resolvePki('tls-crypt.key', '../docker/config/pki/tls-crypt.key');
    const tplPath   = fs.existsSync(TEMPLATE_PATH)
      ? TEMPLATE_PATH
      : path.resolve('../docker/config/client.ovpn.template');

    // ── 5. Verificar que todos los archivos necesarios existen ───────────────
    const missing = (
      [
        ['ca.crt',               caPath],
        ['ca.key',               caKeyPath],
        ['tls-crypt.key',        tlsPath],
        ['client.ovpn.template', tplPath],
      ] as [string, string][]
    ).filter(([, p]) => !fs.existsSync(p)).map(([name]) => name);

    if (missing.length) {
      console.error('[generate-vpn] PKI files missing:', missing);
      return NextResponse.json(
        { error: 'PKI incompleto en el servidor.', details: `Faltantes: ${missing.join(', ')}` },
        { status: 500 }
      );
    }

    // ── 6. Generar clave, CSR y certificado firmado (expira en 24 h) ─────────
    fs.writeFileSync(
      extPath,
      'basicConstraints=CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=clientAuth'
    );

    execSync(`openssl genrsa -out ${keyPath} 2048`,                                           { stdio: 'pipe' });
    execSync(`openssl req -new -key ${keyPath} -out ${csrPath} -subj "/CN=${username}"`,      { stdio: 'pipe' });
    execSync(
      `openssl x509 -req -in ${csrPath} -CA ${caPath} -CAkey ${caKeyPath} ` +
      `-CAserial ${srlPath} -CAcreateserial -out ${crtPath} -days 1 -extfile ${extPath} -sha256`,
      { stdio: 'pipe' }
    );

    // ── 7. Leer todo en memoria y ensamblar el perfil ─────────────────────────
    const caCrt  = fs.readFileSync(caPath,   'utf8').trim();
    const cert   = fs.readFileSync(crtPath,  'utf8').trim();
    const key    = fs.readFileSync(keyPath,  'utf8').trim();
    const tlsKey = fs.readFileSync(tlsPath,  'utf8').trim();
    const tmpl   = fs.readFileSync(tplPath,  'utf8');

    // Reemplaza bloques en el template; si no existen los tags, los inyecta al final
    let ovpn = tmpl
      .replace(/<ca>[\s\S]*?<\/ca>/,               `<ca>\n${caCrt}\n</ca>`)
      .replace(/<cert>[\s\S]*?<\/cert>/,            `<cert>\n${cert}\n</cert>`)
      .replace(/<key>[\s\S]*?<\/key>/,              `<key>\n${key}\n</key>`)
      .replace(/<tls-crypt>[\s\S]*?<\/tls-crypt>/, `<tls-crypt>\n${tlsKey}\n</tls-crypt>`);

    // Si el template no tenía los bloques, añadirlos al final
    if (!ovpn.includes('<ca>'))       ovpn += `\n<ca>\n${caCrt}\n</ca>`;
    if (!ovpn.includes('<cert>'))     ovpn += `\n<cert>\n${cert}\n</cert>`;
    if (!ovpn.includes('<key>'))      ovpn += `\n<key>\n${key}\n</key>`;
    if (!ovpn.includes('<tls-crypt>'))ovpn += `\n<tls-crypt>\n${tlsKey}\n</tls-crypt>`;

    console.log(`[generate-vpn] Perfil generado para usuario ${session.sub} (${email})`);

    // ── 8. Devolver el perfil como descarga (nunca escrito al disco) ──────────
    return new Response(ovpn, {
      status: 200,
      headers: {
        'Content-Type':        'application/x-openvpn-profile',
        'Content-Disposition': `attachment; filename="${username}.ovpn"`,
        // Impedir que el navegador o proxies intermedios guarden el perfil
        'Cache-Control':       'no-store, no-cache, must-revalidate',
        'Pragma':              'no-cache',
      },
    });

  } catch (err: any) {
    console.error('[generate-vpn] Error durante generación:', err);
    return NextResponse.json(
      { error: 'Error generando perfil VPN.', details: err.message },
      { status: 500 }
    );
  } finally {
    // ── 9. Destruir TODO el material criptográfico efímero ───────────────────
    // Este bloque se ejecuta SIEMPRE, incluso si hubo un error.
    for (const f of [keyPath, csrPath, crtPath, extPath, srlPath]) {
      try {
        if (fs.existsSync(f)) {
          // Sobreescribir con ceros antes de eliminar (best-effort)
          const size = fs.statSync(f).size;
          if (size > 0) fs.writeFileSync(f, Buffer.alloc(size, 0));
          fs.unlinkSync(f);
        }
      } catch { /* ignorar errores de limpieza */ }
    }
    console.log(`[generate-vpn] Material efímero destruido para uid ${uid}`);
  }
}
