"use client";

import { useEffect, useState } from "react";

export default function ConsoleLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [systemTime, setSystemTime] = useState("");
  const [threatLevel, setThreatLevel] = useState("SECURE");
  const [networkLoad, setNetworkLoad] = useState(14);

  // Simulated live log feed
  useEffect(() => {
    const initialLogs = [
      "SYSTEM INIT: SECURE SOCKET GATEWAY ACTIVE",
      "HANDSHAKE V2: SYMMETRIC CIPHER ENABLED",
      "MAIN CONSOLE: WAITING FOR SECURE LOGTO HANDSHAKE...",
      "STATUS: PORT 3001 DETECTED ON DOCKER ROUTER"
    ];
    setLogs(initialLogs);

    const logCandidates = [
      "INBOUND SCAN DETECTED - PORT 443 [RESOLVED]",
      "KEY ROTATION INITIATED: SUCCESSFUL",
      "FIREWALL BLOCKED IP: 192.168.1.199 [DDoS ATTRIBUTE]",
      "SHA-256 INTEGRITY VERIFICATION: OK",
      "HEARTBEAT: OK",
      "DECRYPT PROTOCOL READY",
      "ACTIVE CONNECTIONS: 8 NODES ONLINE"
    ];

    const interval = setInterval(() => {
      const randomLog = logCandidates[Math.floor(Math.random() * logCandidates.length)];
      setLogs((prev) => [...prev.slice(-6), `${new Date().toLocaleTimeString()} - ${randomLog}`]);
      setNetworkLoad(Math.floor(Math.random() * 40) + 10);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Dynamic threat level fluctuation
  useEffect(() => {
    const levels = ["SECURE", "ELEVATED", "ALERT", "SECURE"];
    const levelInterval = setInterval(() => {
      setThreatLevel(levels[Math.floor(Math.random() * levels.length)]);
    }, 15000);
    return () => clearInterval(levelInterval);
  }, []);

  return (
    <>
      {/* Top Header Information inside layout */}
      <div className="flex-between pb-4 mb-6">
        <div className="flex-row gap-3">
          <span className="pulse-indicator" />
          <div>
            <h1 className="hud-glow" style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              CORE MAINBOARD
            </h1>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              NODE SECURITY GATEWAY // V3.8.1-SYS
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="hud-cyan-glow block" style={{ fontSize: '0.75rem' }}>
            {systemTime}
          </span>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block' }}>
            SYSTEM HOST TIME
          </span>
        </div>
      </div>

      {/* Warning Panel */}
      <div className="cyber-card-error p-4 rounded mb-6 text-center" style={{ backgroundColor: 'rgba(255, 51, 102, 0.05)', border: '1px solid rgba(255, 51, 102, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="hud-red-glow" style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.1em', color: 'var(--error-color)', textTransform: 'uppercase' }}>
          ⚠️ SYSTEM RESTRICTION NOTICE ⚠️
        </span>
        <p style={{ fontSize: '11px', color: 'rgba(255, 200, 200, 0.8)' }}>
          THIS TERMINAL CONTAINS PROPRIETARY RESEARCH. UNAUTHORIZED CONNECTIONS ARE TRACED AND DEVIATIONS REPORTED TO DEPUTY HEAD OF SECURITY.
        </p>
      </div>

      {/* Main Console Stats Grid */}
      <div className="logs-grid">
        <div className="log-stat-card">
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>DECRYPT ENGINE</span>
          <span className="hud-glow" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>LOGTO-OIDC</span>
        </div>
        <div className="log-stat-card">
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>THREAT LEVEL</span>
          <span className={threatLevel === "SECURE" ? "threat-secure" : "threat-warning"} style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
            {threatLevel}
          </span>
        </div>
        <div className="log-stat-card">
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>NETWORK FLOW</span>
          <span className="hud-cyan-glow" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{networkLoad} GB/s</span>
        </div>
        <div className="log-stat-card">
          <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>STACK FRAMEWORK</span>
          <span className="hud-cyan-glow" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>NEXT.JS/PNPM</span>
        </div>
      </div>

      {/* Console Log Terminal */}
      <div className="p-4 rounded mb-8" style={{ border: '1px solid rgba(0, 255, 102, 0.15)', backgroundColor: 'rgba(0, 0, 0, 0.6)', minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="flex-between pb-2 mb-3" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0, 255, 102, 0.1)' }}>
            <span>CONSOLE DIAGNOSTIC STREAM</span>
            <span className="crt-flicker">ONLINE</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="console-log-line">
              <span className="console-timestamp">[{new Date().toLocaleTimeString()}]</span>
              <span className="console-info">{log}</span>
            </div>
          ))}
          <div className="console-log-line blinking-cursor">
            <span className="console-timestamp">[{new Date().toLocaleTimeString()}]</span>
            <span style={{ color: '#ffffff' }}>system-ready@local:~$ </span>
          </div>
        </div>
      </div>
    </>
  );
}
