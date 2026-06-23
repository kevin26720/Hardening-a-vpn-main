import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function Home() {
  const session = await getSession();

  // If already authenticated, bypass login and redirect straight to the SOC console
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="page-wrapper">
      <div className="container-card cyber-card p-6">
        {/* Render simulated dashboard dials, logging telemetry, and credentials input */}
        <LoginForm />
      </div>

      {/* Footer */}
      <div className="text-center mt-8" style={{ pointerEvents: 'none' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
          CENTRALIZED SECURITY PROTOCOL CONSOLE V3.8
        </span>
        <span style={{ fontSize: '8px', letterSpacing: '0.05em', color: 'rgba(78, 117, 138, 0.5)', marginTop: '4px', display: 'block' }}>
          THESIS PROJECT - COMPUTER NETWORKS & SECURE SYSTEMS DEPT.
        </span>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
