import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Proxy (Next.js 16 — antes llamado middleware).
 * Corre en el Edge Runtime antes de cualquier route handler o page.
 *
 * Rutas protegidas:
 *   /dashboard        → UI del SOC (solo usuarios autenticados)
 *   /api/generate-vpn → firma de certificados (solo POST autenticado)
 *
 * La cookie `soc_session` es httpOnly+secure — el atacante no puede leerla
 * desde JS. Si no existe, este proxy corta la petición antes de que arranque
 * el proceso Node.js del route handler.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Proteger ruta de descarga del certificado ──────────────────────────────
  if (pathname.startsWith('/api/generate-vpn')) {
    // Solo se acepta POST (el botón del frontend lo envía así).
    // Un GET directo a la URL queda bloqueado aquí en el Edge.
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Método no permitido. Accede desde el dashboard.' },
        { status: 405 }
      );
    }

    const session = request.cookies.get('soc_session');
    if (!session?.value) {
      return NextResponse.json(
        { error: 'No autorizado. Inicie sesión primero.' },
        { status: 401 }
      );
    }
  }

  // ── Proteger el dashboard ──────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get('soc_session');
    if (!session?.value) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Activa el proxy solo en estas rutas (evita overhead en assets estáticos)
  matcher: ['/dashboard/:path*', '/api/generate-vpn'],
};
