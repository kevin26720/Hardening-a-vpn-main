"use client";

import { useEffect, useState, useRef } from "react";

interface SOCDashboardProps {
  userClaims: any;
  onSignOut: () => Promise<void>;
}

export default function SOCDashboard({ userClaims, onSignOut }: SOCDashboardProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [cpuLoad, setCpuLoad] = useState(32);
  const [firewallStatus, setFirewallStatus] = useState("SECURE");
  const [alerts, setAlerts] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadVpn = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      // POST — el middleware rechaza cualquier GET a esta ruta.
      // La petición al servidor SOLO existe cuando el usuario pulsa el botón.
      const res = await fetch('/api/generate-vpn', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.details || json.error || 'Error al generar el perfil');
      }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a   = document.createElement('a');
      const email: string = userClaims?.email || '';
      const username = (email ? email.split('@')[0] : 'operator')
        .replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32) || 'operator';
      a.href = url;
      a.download = `${username}.ovpn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Initialize and generate fake network grid scan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Particles for cyber grid
    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let i = 0; i < 20; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw lines
      ctx.strokeStyle = "rgba(0, 255, 102, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      ctx.fillStyle = "rgba(0, 229, 255, 0.6)";
      for (let node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Update positions
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }

      // Draw radar sweep line
      const time = Date.now() * 0.0015;
      const sweepY = ((time * 100) % height);
      ctx.strokeStyle = "rgba(0, 255, 102, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(width, sweepY);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update CPU load, firewall logs and alerts periodically
  useEffect(() => {
    const alertList = [
      "CRITICAL: Port scan detected from range 10.0.8.0/24",
      "WARNING: Exceeded login rate limit for user guest@local",
      "INFO: Automated cron job updated dependency graph",
      "SECURITY: Revoked expired session identifier [SES-8822]"
    ];

    const initialLogs = [
      "USER IDENTITY VERIFIED via OAuth 2.0 / OpenID Connect",
      "TOKEN AUD: http://localhost:3000",
      "SUBJECT ID: " + (userClaims?.sub || "undefined"),
      "SECURITY POLICIES CONFIGURED: STRICT-TRANSPORT"
    ];
    setLogs(initialLogs);

    const logCandidates = [
      "SYN flood mitigators operating at 100% efficiency",
      "Encrypted packet verified: SHA3-512 match",
      "Intrusion detection model completed full cycle scan",
      "IP blacklist updated: 144 new entries compiled",
      "System logs exported to local Docker storage mount"
    ];

    const interval = setInterval(() => {
      // Fluctuate CPU
      setCpuLoad(Math.floor(Math.random() * 45) + 15);
      
      // Update logs
      const randomLog = logCandidates[Math.floor(Math.random() * logCandidates.length)];
      setLogs((prev) => [...prev.slice(-4), randomLog]);

      // Randomly trigger alert
      if (Math.random() > 0.6) {
        const randomAlert = alertList[Math.floor(Math.random() * alertList.length)];
        setAlerts((prev) => [randomAlert, ...prev.slice(0, 2)]);
        setFirewallStatus("ATTACK DETECTED / BLOCKED");
        setTimeout(() => setFirewallStatus("SECURE"), 3000);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [userClaims]);

  return (
    <div className="dashboard-wrapper">
      {/* Top Banner Dashboard Header */}
      <header className="dashboard-header">
        <div>
          <span className="hud-cyan-glow" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', color: 'var(--text-secondary)' }}>
            ★ DECRYPT INTEGRITY VERIFIED
          </span>
          <h1 className="hud-glow" style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            SECURITY OPERATIONS CONSOLE
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
            SECURE PORTAL LAYER // SESSION STATUS: ACTIVE
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="text-right">
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>OPERATOR SESSION</span>
            <span className="hud-cyan-glow" style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', color: 'var(--text-secondary)' }}>
              {userClaims?.email || userClaims?.name || userClaims?.sub?.substring(0, 12) + "..."}
            </span>
          </div>
          <button
            onClick={async () => {
              await onSignOut();
            }}
            className="cyber-btn cyber-btn-red"
            style={{ fontSize: '11px', padding: '10px 16px' }}
          >
            ❌ PURGE SESSION
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="dashboard-grid">
        {/* Top Greeting Panel */}
        <section className="cyber-card p-6 lg-span-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0, 255, 102, 0.04)', border: '1px solid var(--text-primary)', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="pulse-indicator" style={{ backgroundColor: 'var(--text-primary)', boxShadow: '0 0 10px var(--text-primary)' }} />
            <div>
              <h2 className="hud-glow" style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.15em' }}>
                HOLA, OPERADOR {userClaims?.name || userClaims?.email || userClaims?.sub?.substring(0, 12)}
              </h2>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                SESSION ESTABLISHED // INTEGRITY VERIFICATION COMPLETED
              </p>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-primary)', border: '1px solid rgba(0,255,102,0.3)', padding: '4px 8px', borderRadius: '2px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            STATUS: SECURE ACCESS GRANTED
          </span>
        </section>

        {/* Left Column: User Identity Metadata */}
        <section className="cyber-card p-6 flex-col gap-6">
          <div className="pb-3" style={{ borderBottom: '1px solid rgba(0, 255, 102, 0.1)' }}>
            <h2 className="hud-cyan-glow" style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
              🔐 SESSION CLAIMS
            </h2>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DECRYPTED PARAMS FROM OIDC</p>
          </div>

          <div className="flex-col gap-4">
            <div className="p-2.5 flex-col gap-1" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SUBJECT ID (sub)</span>
              <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{userClaims?.sub || "N/A"}</span>
            </div>
            
            {userClaims?.email && (
              <div className="p-2.5 flex-col gap-1" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EMAIL ADDRESS</span>
                <span style={{ color: 'var(--text-primary)' }}>{userClaims?.email}</span>
              </div>
            )}

            {userClaims?.name && (
              <div className="p-2.5 flex-col gap-1" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DISPLAY NAME</span>
                <span style={{ color: 'var(--text-primary)' }}>{userClaims?.name}</span>
              </div>
            )}

            <div className="p-2.5 flex-col gap-1" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ISSUER (iss)</span>
              <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{userClaims?.iss || "http://localhost:3001/oidc"}</span>
            </div>

            <div className="p-2.5 flex-col gap-1" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOKEN ISSUED AT (iat)</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {userClaims?.iat ? new Date(userClaims.iat * 1000).toLocaleString() : "N/A"}
              </span>
            </div>

            <div className="p-2.5 flex-col gap-1" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOKEN EXPIRATION (exp)</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {userClaims?.exp ? new Date(userClaims.exp * 1000).toLocaleString() : "N/A"}
              </span>
            </div>

            {/* ===== VPN PROFILE DOWNLOAD ===== */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0, 255, 102, 0.15)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px', letterSpacing: '0.1em' }}>
                📡 OPENVPN ACCESS PROFILE
              </span>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.5' }}>
                Genera y descarga tu perfil <strong style={{ color: 'var(--text-primary)' }}>.ovpn</strong> firmado dinámicamente. Conéctate al clúster de {' '}
                <strong style={{ color: 'var(--text-secondary)' }}>HAProxy → 3×OpenVPN</strong>.
              </p>
              {downloadError && (
                <div style={{ fontSize: '9px', color: 'var(--error-color)', border: '1px solid rgba(255,51,102,0.3)', padding: '6px 10px', borderRadius: '3px', marginBottom: '8px', backgroundColor: 'rgba(255,51,102,0.05)' }}>
                  ❌ {downloadError}
                </div>
              )}
              <button
                id="download-ovpn-btn"
                onClick={handleDownloadVpn}
                disabled={downloading}
                className="cyber-btn cyber-btn-cyan"
                style={{ fontSize: '11px', padding: '12px 16px', width: '100%', opacity: downloading ? 0.6 : 1 }}
              >
                {downloading ? '⚡ GENERANDO CERTIFICADO...' : '📥 DESCARGAR PERFIL VPN (.ovpn)'}
              </button>
            </div>
          </div>
        </section>

        {/* Center Column: Live Traffic Chart & Network Map */}
        <section className="cyber-card p-6 flex-col gap-6 lg-span-2">
          <div className="pb-3 flex-between" style={{ borderBottom: '1px solid rgba(0, 255, 102, 0.1)' }}>
            <div>
              <h2 className="hud-glow" style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                🛰️ LIVE NETWORK SPATIAL MAP
              </h2>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mitigation Graph Monitor</p>
            </div>
            <div className="text-right">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FIREWALL STATUS: </span>
              <span className={firewallStatus === "SECURE" ? "threat-secure" : "threat-critical"} style={{ fontSize: '11px', fontWeight: 'bold', border: '1px solid', padding: '2px 8px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                {firewallStatus}
              </span>
            </div>
          </div>

          {/* Network Canvas Animation */}
          <div className="radar-map-container">
            <canvas ref={canvasRef} className="radar-canvas" />
            <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(5, 11, 20, 0.85)', border: '1px solid rgba(0, 255, 102, 0.3)', padding: '8px', borderRadius: '4px', fontSize: '9px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>SCAN FREQUENCY: 1200 MHz</span>
              <span>ALGORITHM: ED25519 SECURE</span>
              <span>FILTER RULE: BLOCKED OVERFLOWS</span>
            </div>
          </div>

          {/* Mini CPU / Traffic panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="p-3" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>NODE CPU LOAD</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${cpuLoad}%` }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{cpuLoad}%</span>
              </div>
            </div>
            
            <div className="p-3" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>MITIGATION ACTIVE</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>DDoS SHIELD ENABLED</span>
            </div>

            <div className="p-3" style={{ border: '1px solid rgba(0, 255, 102, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>LOCAL SUBNET IP</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>172.20.0.5</span>
            </div>
          </div>
        </section>

        {/* Bottom / Extended Panel: Logs & Intrusions */}
        <section className="cyber-card p-6 flex-col gap-4 lg-span-3">
          <div className="pb-3 flex-between" style={{ borderBottom: '1px solid rgba(0, 255, 102, 0.1)' }}>
            <div>
              <h2 className="hud-glow" style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                📋 SYSTEM DIAGNOSTICS LOGS
              </h2>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>REAL-TIME CONTAINER SYSLOG</p>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              LOGTO OIDC ENGINE ACTIVE
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Logs feed */}
            <div className="p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(0, 255, 102, 0.15)', borderRadius: '4px', minHeight: '120px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0, 255, 102, 0.1)', paddingBottom: '4px', marginBottom: '8px' }}>AUTH PROTOCOL LOGS</div>
              {logs.map((log, index) => (
                <div key={index} className="console-log-line">
                  <span className="console-timestamp">[{new Date().toLocaleTimeString()}]</span>
                  <span className="console-success">{log}</span>
                </div>
              ))}
            </div>

            {/* Warning alerts stream */}
            <div className="p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(255, 51, 102, 0.15)', borderRadius: '4px', minHeight: '120px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 51, 102, 0.1)', paddingBottom: '4px', marginBottom: '8px' }}>INTRUSION DETECTOR AUDIT</div>
              {alerts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', fontSize: '11px' }}>
                  No recent alert telemetry detected. Status green.
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div key={index} className="console-log-line">
                    <span className="console-timestamp">[{new Date().toLocaleTimeString()}]</span>
                    <span className="console-error">{alert}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="pb-3 pt-4" style={{ borderTop: '1px solid rgba(0, 255, 102, 0.1)', marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
        <span>SECURITY MAINBOARD ACCESS LOGS ISOLATED UNDER THESIS ENVIRONMENT</span>
        <span>© 2026 THESIS SECURITY LAB. POWERED BY NEXT.JS, PNPM & LOGTO</span>
      </footer>
    </div>
  );
}
