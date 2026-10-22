import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import VerificationStatusCard from "@/components/VerificationStatusCard";
import VerifyAccountForm from "@/components/VerifyAccountForm";
import { loadLandlordStatus } from "@/lib/auth/landlord-status";
import { checkCanSubmitVerification } from "@/lib/auth/submit-verification";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_PATH,
  VERIFY_ACCOUNT_INTRO,
  verifyPageView,
} from "@/lib/verify-account";

/**
 * The Verify account page (S1-15.5, #203), under Profile: a landlord sends
 * photos of a government ID and a selfie, which an admin reviews (#207).
 * Only verified landlords can post listings (#201).
 *
 * It checks first (checkCanSubmitVerification, #204) and shows the form
 * only when the landlord may send a verification: they never have, or
 * every one was rejected. Otherwise it says why not: it's being reviewed,
 * they're already verified, ... (verifyPageView, src/lib/verify-account.ts).
 * After a rejection, the admin's reason shows above the form (#205).
 */
export default async function VerifyAccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  const [check, status] = await Promise.all([
    checkCanSubmitVerification(supabase, user.id),
    // The profile's name and the last rejection's reason (#205). Only for
    // the form's hints, which leave them out if they can't be read.
    loadLandlordStatus(supabase, user.id),
  ]);
  const view = verifyPageView(check);
  const profileName = status?.fullName ?? null;
  const rejectionReason = status?.rejectionReason ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={PROFILE_PATH}
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Verify your account
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {VERIFY_ACCOUNT_INTRO}
            </p>
          </div>
        </div>
      </div>

      {view.show === "form" ? (
        <VerifyAccountForm
          landlordId={user.id}
          profileName={profileName}
          rejectionReason={rejectionReason}
        />
      ) : (
        <VerificationStatusCard status={view.status} />
      )}
    </div>
  );
}
