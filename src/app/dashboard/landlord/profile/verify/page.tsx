import { redirect } from "next/navigation";

/**
 * The dedicated verification page redirects to the Landlord Profile page's
 * embedded verification section (#verify-account).
 */
export default function VerifyAccountPage() {
  redirect("/dashboard/landlord/profile#verify-account");
}
