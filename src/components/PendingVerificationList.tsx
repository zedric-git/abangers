import Link from "next/link";
import { ChevronRight, Clock, IdCard, Inbox, UserRound } from "lucide-react";
import type { PendingVerification } from "@/lib/auth/review-verification";
import {
  PENDING_LIST_EMPTY,
  formatSubmittedAt,
  idTypeLabel,
  reviewPagePath,
} from "@/lib/admin-review-view";

interface PendingVerificationListProps {
  /** Oldest first (loadPendingVerifications). */
  items: PendingVerification[];
}

/**
 * The verifications waiting for review on the admin dashboard (S2-11.2,
 * #256): one row per submission, oldest first, each linking to its review
 * page. No photos here: their signed links are only made when a review
 * page opens.
 */
export default function PendingVerificationList({
  items,
}: PendingVerificationListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
          <Inbox className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-100">
          {PENDING_LIST_EMPTY.title}
        </h2>
        <p className="mt-1 max-w-sm text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
          {PENDING_LIST_EMPTY.message}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const name = item.landlordName ?? "No name on their profile";
        return (
          <li
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {name}
                </p>
                {item.landlordEmail && (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {item.landlordEmail}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5" />
                    {idTypeLabel(item.idType)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Sent {formatSubmittedAt(item.submittedAt)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={reviewPagePath(item.id)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-purple-700 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              Review
              <span className="sr-only">{name}&apos;s verification</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
