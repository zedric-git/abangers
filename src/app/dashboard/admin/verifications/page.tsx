import { redirect } from "next/navigation";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-review-view";

/**
 * /dashboard/admin/verifications on its own has nothing to show: the list
 * is the admin dashboard itself. Redirect there rather than show a 404
 * (#244), e.g. for someone who trims a review page's URL.
 */
export default function VerificationsPage() {
  redirect(ADMIN_DASHBOARD_PATH);
}
