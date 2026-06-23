"use client";

import { useEffect, useState } from "react";
import { loginAction, registerAction } from "@/app/actions";

type AuthMode = "login" | "register";

export default function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [systemTime, setSystemTime] = useState("");
  const [threatLevel, setThreatLevel] = useState("SECURE");
  const [networkLoad, setNetworkLoad] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize background logs
  useEffect(() => {
    const initialLogs = [
      "SYSTEM INIT: SECURE SOCKET GATEWAY ACTIVE",
      "M2M HANDSHAKE V2: SYMMETRIC CIPHER ENABLED",
      "MAIN CONSOLE: STANDBY FOR OPERATOR COMMAND...",
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
      if (loading) return; // Pause random activity logs when performing authentication
      const randomLog = logCandidates[Math.floor(Math.random() * logCandidates.length)];
      setLogs((prev) => [...prev.slice(-3), `${new Date().toLocaleTimeString()} - ${randomLog}`]);
      setNetworkLoad(Math.floor(Math.random() * 40) + 10);
    }, 4500);

    return () => clearInterval(interval);
  }, [loading]);

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

  // Sync threat level indicator
  useEffect(() => {
    if (loading) {
      setThreatLevel("VERIFYING");
    } else if (error) {
      setThreatLevel("ALERT");
    } else {
      setThreatLevel("SECURE");
    }
  }, [loading, error]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-5), `${timestamp} - ${message}`]);
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Reset form inputs and errors when switching tabs (User Control & Freedom)
  const handleModeChange = (newMode: AuthMode) => {
    if (loading) return;
    setMode(newMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    addLog(`SWITCHED TERMINAL TO ${newMode === "login" ? "SIGN-IN MODE" : "REGISTRATION MODE"}`);
  };

  // Input Validation (Error Prevention Heuristic)
  const isEmailValid = email.includes("@") && email.includes(".");
  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = mode === "login" || password === confirmPassword;
  
  const isFormValid = isEmailValid && isPasswordLongEnough && doPasswordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }

    if (!isPasswordLongEnough) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (mode === "register" && !doPasswordsMatch) {
      setError("Decryption access keys do not match");
      return;
    }

    setLoading(true);
    setError(null);

    // Heuristic 1: Visibility of System Status
    if (mode === "login") {
      addLog("OPERATOR SIGN-IN HANDSHAKE INITIATED");
      await delay(400);
      addLog("CONNECTING TO AUTHENTICATION SERVER ENGINE...");
      await delay(500);
      addLog("TRANSMITTING ENCRYPTED KEYPAIR FOR VERIFICATION...");
      await delay(450);

      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      try {
        const result = await loginAction(null, formData);

        if (result.success) {
          addLog("VERIFICATION MATCH: ACCESS GRANTED");
          addLog("DECRYPTING USER SEED AND BUILDING SECURE SESSION...");
          await delay(500);
          window.location.href = "/dashboard";
        } else {
          // Heuristic 9: Help users recognize, diagnose, and recover from errors
          let userError = result.error || "Authentication rejected";
          if (userError.includes("invalid") || userError.includes("failed")) {
            userError = "Incorrect password. Please verify your Access Key.";
          } else if (userError.includes("not found")) {
            userError = "This Operator Email is not registered. Toggle to the Sign Up tab to create it.";
          }
          
          addLog(`SECURITY ERROR: ACCESS DENIED [${userError.toUpperCase()}]`);
          setError(userError);
          setLoading(false);
        }
      } catch (err: any) {
        addLog("SECURITY SYSTEM FAULT: INTERNAL SERVER ERROR");
        setError("Internal login bridge connection timed out. Verify Docker containers are active.");
        setLoading(false);
      }
    } else {
      addLog("OPERATOR PROFILE REGISTRATION SEQUENCE INITIATED");
      await delay(400);
      addLog("PREVENTING IDENTITY COLLISION (DUPLICATE EMAILS)...");
      await delay(500);
      addLog("ALLOCATING CRYPTOGRAPHIC HASH SEEDS ON CORE...");
      await delay(450);

      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);

      try {
        const result = await registerAction(null, formData);

        if (result.success) {
          addLog("REGISTRATION SUCCESS: OPERATOR PROFILE COMPILED");
          addLog("SIGNING SECURE SESSION TOKEN AND REDIRECTING...");
          await delay(500);
          window.location.href = "/dashboard";
        } else {
          let userError = result.error || "Registration rejected";
          if (userError.includes("already registered") || userError.includes("exists")) {
            userError = "Operator email is already registered. Click the SIGN IN tab above.";
          }
          
          addLog(`REGISTRATION ERROR: COMPILE FAILED [${userError.toUpperCase()}]`);
          setError(userError);
          setLoading(false);
        }
      } catch (err: any) {
        addLog("SECURITY SYSTEM FAULT: WRITE ACCESS DENIED");
        setError("Could not register user. Make sure Logto is running and your M2M App credentials are correct.");
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex-col gap-4">
      {/* Top Header Info - Compact & Legible */}
      <div className="flex-between pb-3 mb-2" style={{ borderBottom: '1px solid rgba(0, 255, 102, 0.1)' }}>
        <div className="flex-row gap-3">
          <span className={`pulse-indicator ${threatLevel === "ALERT" ? "threat-critical" : threatLevel === "VERIFYING" ? "threat-warning" : ""}`} style={{
            width: '12px',
            height: '12px',
            backgroundColor: threatLevel === "ALERT" ? "var(--error-color)" : threatLevel === "VERIFYING" ? "var(--warning-color)" : "var(--text-primary)",
            boxShadow: threatLevel === "ALERT" ? "0 0 10px var(--error-color)" : threatLevel === "VERIFYING" ? "0 0 10px var(--warning-color)" : "0 0 10px var(--text-primary)"
          }} />
          <div>
            <h1 className="hud-glow" style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.1em', margin: 0 }}>
              SECURITY GATEWAY // V3.8.1-SYS
            </h1>
          </div>
        </div>
        <div className="text-right">
          <span className="hud-cyan-glow block" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
            {systemTime}
          </span>
        </div>
      </div>

      {/* Tabs Navigation - Large click targets (Heuristic #4 Consistency and standards) */}
      <div className="cyber-tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`cyber-tab-btn ${mode === "login" ? "active" : ""}`}
          onClick={() => handleModeChange("login")}
          disabled={loading}
          style={{ padding: '14px 18px', fontSize: '1rem', letterSpacing: '1px' }}
        >
          🔐 ACCESS / SIGN IN
        </button>
        <button
          type="button"
          className={`cyber-tab-btn ${mode === "register" ? "active" : ""}`}
          onClick={() => handleModeChange("register")}
          disabled={loading}
          style={{ padding: '14px 18px', fontSize: '1rem', letterSpacing: '1px' }}
        >
          📝 REGISTER OPERATOR
        </button>
      </div>

      {/* Embedded Login / Register Form - Highly visible input fields */}
      <div className="w-full">
        <form onSubmit={handleSubmit} className="flex-col gap-3">
          <div className="cyber-input-group">
            <label htmlFor="email" className="cyber-label" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              🛡️ Operator Identity (Email Address)
            </label>
            <input
              type="email"
              id="email"
              className="cyber-input"
              style={{ padding: '14px 16px', fontSize: '1.05rem', letterSpacing: '0.5px' }}
              placeholder="e.g. operator@defense.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            {email && !isEmailValid && (
              <span className="cyber-warning-msg" style={{ fontSize: '10px' }}>⚠️ Enter a valid email address structure</span>
            )}
          </div>

          <div className="cyber-input-group">
            <label htmlFor="password" className="cyber-label" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              🔑 Decryption Access Key (Password)
            </label>
            <input
              type="password"
              id="password"
              className="cyber-input"
              style={{ padding: '14px 16px', fontSize: '1.05rem', letterSpacing: '0.5px' }}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            {password && !isPasswordLongEnough && (
              <span className="cyber-warning-msg" style={{ fontSize: '10px' }}>⚠️ Key must be at least 8 characters long</span>
            )}
          </div>

          {mode === "register" && (
            <div className="cyber-input-group">
              <label htmlFor="confirmPassword" className="cyber-label" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                🔄 Re-enter Access Key (Confirm Password)
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="cyber-input"
                style={{ padding: '14px 16px', fontSize: '1.05rem', letterSpacing: '0.5px' }}
                placeholder="Must match password above"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
              {confirmPassword && !doPasswordsMatch && (
                <span className="cyber-error-msg" style={{ fontSize: '10px' }}>❌ Decryption access keys mismatch</span>
              )}
              {confirmPassword && doPasswordsMatch && (
                <span className="console-success" style={{ fontSize: '10px', marginTop: '2px', display: 'block' }}>✓ Decryption access keys match</span>
              )}
            </div>
          )}

          {error && (
            <div className="cyber-error-msg" style={{ margin: '6px 0 10px 0', border: '1px solid rgba(255, 51, 102, 0.3)', padding: '10px 14px', backgroundColor: 'rgba(255, 51, 102, 0.05)', borderRadius: '4px', fontSize: '11px' }}>
              ❌ ACCESS ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            className={`cyber-btn ${loading ? "cyber-btn-cyan" : ""} ${!isFormValid ? "disabled" : ""}`}
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              opacity: isFormValid ? 1 : 0.4, 
              cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
              padding: '16px 22px',
              fontSize: '1.1rem',
              letterSpacing: '2px',
              marginTop: '8px'
            }}
            disabled={loading || !isFormValid}
          >
            {loading 
              ? "⚡ PERFORMING OPERATIONS..." 
              : mode === "login"
                ? "🔐 INITIALIZE ACCESS"
                : "⚙️ ENROLL OPERATOR"}
          </button>
        </form>
      </div>

      {/* Terminal Diagnostic Stream & Stats - Secondary Focus */}
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 130px', gap: '12px' }}>
        {/* Terminal Logs Panel */}
        <div className="p-3 rounded" style={{ border: '1px solid rgba(0, 255, 102, 0.15)', backgroundColor: 'rgba(0, 0, 0, 0.6)', height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          <div style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid rgba(0, 255, 102, 0.1)', paddingBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>DIAGNOSTIC FEED</span>
            <span className="crt-flicker" style={{ color: threatLevel === "ALERT" ? "var(--error-color)" : "var(--text-primary)" }}>
              {threatLevel === "ALERT" ? "CRITICAL" : "ONLINE"}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', marginTop: '4px' }}>
            {logs.slice(-3).map((log, index) => {
              let logClass = "console-info";
              if (log.includes("DENIED") || log.includes("ERROR") || log.includes("ALERT") || log.includes("FAILED")) {
                logClass = "console-error";
              } else if (log.includes("SUCCESS") || log.includes("GRANTED") || log.includes("ACTIVE") || log.includes("SWITCHED")) {
                logClass = "console-success";
              } else if (log.includes("INITIATED") || log.includes("CONNECTING") || log.includes("TRANSMITTING") || log.includes("ALLOCATING")) {
                logClass = "console-warning";
              }
              return (
                <div key={index} className="console-log-line" style={{ fontSize: '0.7rem', marginBottom: '2px', lineHeight: '1.2' }}>
                  <span className="console-timestamp" style={{ marginRight: '4px' }}>[{log.substring(0, 8)}]</span>
                  <span className={logClass}>{log.includes(" - ") ? log.split(" - ")[1] : log}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Grid Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="p-2" style={{ border: '1px solid rgba(0, 255, 102, 0.15)', backgroundColor: 'rgba(11, 21, 36, 0.3)', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '37px' }}>
            <span style={{ fontSize: '7px', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: '1' }}>THREAT LEVEL</span>
            <span className={threatLevel === "SECURE" ? "threat-secure" : "threat-critical"} style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '2px' }}>{threatLevel}</span>
          </div>
          <div className="p-2" style={{ border: '1px solid rgba(0, 255, 102, 0.15)', backgroundColor: 'rgba(11, 21, 36, 0.3)', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '37px' }}>
            <span style={{ fontSize: '7px', textTransform: 'uppercase', color: 'var(--text-muted)', lineHeight: '1' }}>NET TRAFFIC</span>
            <span className="hud-cyan-glow" style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '2px' }}>{networkLoad} GB/s</span>
          </div>
        </div>
      </div>

      {/* Warning Notice Banner - Compact Footer */}
      <div style={{ marginTop: '4px', padding: '6px', border: '1px solid rgba(255, 51, 102, 0.2)', backgroundColor: 'rgba(255, 51, 102, 0.03)', borderRadius: '4px', textAlign: 'center' }}>
        <p style={{ fontSize: '8px', color: 'rgba(255, 200, 200, 0.6)', margin: 0, letterSpacing: '0.05em' }}>
          ⚠️ SECURITY WARNING: UNAUTHORIZED ATTEMPTS WILL TRIGGER INTRUSION PROTOCOLS ⚠️
        </p>
      </div>
    </div>
  );
}
