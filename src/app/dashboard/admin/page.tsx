import { redirect } from "next/navigation";
import { AlertCircle, Info } from "lucide-react";
import PendingVerificationList from "@/components/PendingVerificationList";
import { loadPendingVerifications } from "@/lib/auth/review-verification";
import {
  PENDING_LIST_LOAD_ERROR,
  REVIEW_NOTICE_TEXT,
  pendingCountLabel,
  reviewNoticeOf,
} from "@/lib/admin-review-view";
import { createClient } from "@/lib/supabase/server";

/**
 * The admin dashboard (S2-11.2, #256): the landlord verifications waiting
 * for review, oldest first. Each one opens its review page, where the
 * admin approves or rejects it.
 *
 * The proxy only lets admins in (src/lib/auth/route-guard.ts), and RLS
 * only shows other landlords' submissions to admins (0014).
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // After a review, the review page sends the admin here with ?notice=.
  // It only picks the note; its text is fixed, so nothing from the URL is
  // shown on the page.
  const { notice } = await searchParams;
  const reviewNotice = reviewNoticeOf(notice);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already sends signed-out users home; this is for a session
  // that ends between the two.
  if (!user) {
    redirect("/");
  }

  const pending = await loadPendingVerifications(supabase);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            Verification requests
          </h1>
          <p className="mt-1 max-w-xl text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Landlords send a valid ID and a selfie to verify their account.
            Check each one, then approve it or reject it with a reason.
          </p>
        </div>
        {pending.ok && pending.items.length > 0 && (
          <p className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            {pendingCountLabel(pending.items.length)}
          </p>
        )}
      </div>

      {/* What just happened, after a review */}
      {reviewNotice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-purple-700 dark:text-purple-400" />
          <p>{REVIEW_NOTICE_TEXT[reviewNotice]}</p>
        </div>
      )}

      {pending.ok ? (
        <PendingVerificationList items={pending.items} />
      ) : (
        // The read failed: say so, rather than "nothing waiting".
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{PENDING_LIST_LOAD_ERROR}</p>
        </div>
      )}
    </div>
  );
}
