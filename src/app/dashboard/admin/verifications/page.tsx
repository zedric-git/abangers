import { AlertCircle, Info } from "lucide-react";
import PendingVerificationList from "@/components/PendingVerificationList";
import {
  loadPendingVerifications,
  type PendingVerification,
} from "@/lib/auth/review-verification";
import {
  PENDING_LIST_LOAD_ERROR,
  REVIEW_NOTICE_TEXT,
  pendingCountLabel,
  reviewNoticeOf,
} from "@/lib/admin-review-view";
import { createClient } from "@/lib/supabase/server";

const demoVerifications: PendingVerification[] = [
  {
    id: "VER-891",
    idType: "philippine_passport",
    submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    landlordName: "Rodrigo D. Alonzo",
    landlordEmail: "rodrigo.alonzo@gmail.com",
  },
  {
    id: "VER-890",
    idType: "drivers_license",
    submittedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    landlordName: "Teresa Ramos Castro",
    landlordEmail: "teresa.castro@gmail.com",
  },
  {
    id: "VER-889",
    idType: "umid",
    submittedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    landlordName: "Mateo S. Bernardo",
    landlordEmail: "mateo.bernardo@gmail.com",
  },
];

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { notice } = await searchParams;
  const reviewNotice = reviewNoticeOf(notice);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pendingItems: PendingVerification[] = [];
  let isOk = true;

  if (user) {
    const pending = await loadPendingVerifications(supabase);
    if (pending.ok) {
      pendingItems = pending.items;
    } else {
      isOk = false;
    }
  } else {
    // In demo sandbox mode, show the sample pending verifications
    pendingItems = demoVerifications;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <span>Admin</span>
            <span>/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Verifications
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            Verification requests
          </h1>
          <p className="mt-1 max-w-xl text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Landlords send a valid government ID and a live selfie to verify
            their account. Check each submission, then approve it or reject it
            with an explanation.
          </p>
        </div>
        {pendingItems.length > 0 && (
          <p className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            {pendingCountLabel(pendingItems.length)}
          </p>
        )}
      </div>

      {/* Notice after review */}
      {reviewNotice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-purple-700 dark:text-purple-400" />
          <p>{REVIEW_NOTICE_TEXT[reviewNotice]}</p>
        </div>
      )}

      {isOk ? (
        <PendingVerificationList items={pendingItems} />
      ) : (
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
