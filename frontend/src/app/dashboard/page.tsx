import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { redirect } from "next/navigation";
import SOCDashboard from "@/components/SOCDashboard";

export default async function DashboardPage() {
  const session = await getSession();

  // If not authenticated (no active session cookie), redirect back to the login terminal
  if (!session) {
    redirect("/");
  }

  // If authenticated, load the premium SOC Dashboard component with session details
  return <SOCDashboard userClaims={session} onSignOut={logoutAction} />;
}
export const dynamic = 'force-dynamic';
