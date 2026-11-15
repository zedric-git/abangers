import { redirect } from "next/navigation";
import AdminDashboardView from "@/components/AdminDashboardView";
import { loadAdminOverview } from "@/lib/admin-overview";
import { createClient } from "@/lib/supabase/server";

/**
 * The admin dashboard's home (#294): real numbers and the oldest
 * verifications waiting for review (#309). The proxy only lets admins in
 * (src/lib/auth/route-guard.ts).
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  const { overview, pending } = await loadAdminOverview(supabase);

  return <AdminDashboardView overview={overview} pending={pending} />;
}
