import AdminDashboardShell from "@/components/AdminDashboardShell";
import { countPendingVerifications } from "@/lib/auth/review-verification";
import { createClient } from "@/lib/supabase/server";

/**
 * The admin dashboard layout. The proxy only lets admins in
 * (src/lib/auth/route-guard.ts).
 *
 * A Server Component, so the sidebar's Verifications badge is the real
 * number waiting for review (#309). The sidebar and Log Out's dialog are
 * in AdminDashboardShell, a Client Component. A review refreshes this
 * layout (revalidatePath in verifications/actions.ts), so the badge
 * follows.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const pendingVerificationCount = await countPendingVerifications(supabase);

  return (
    <AdminDashboardShell pendingVerificationCount={pendingVerificationCount}>
      {children}
    </AdminDashboardShell>
  );
}
