import { BadgeCheck, Clock, ShieldAlert, XCircle } from "lucide-react";
import type { VerificationStatus } from "@/lib/auth/submit-verification";
import { VERIFICATION_BADGE_LABELS } from "@/lib/landlord-status-view";
import { cn } from "@/lib/utils";

type Icon = React.ComponentType<{ className?: string }>;

/** Each status's icon and colours. A Record, so a new status needs a look. */
const STYLES: Record<VerificationStatus, { icon: Icon; className: string }> = {
  not_verified: {
    icon: ShieldAlert,
    className:
      "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  pending: {
    icon: Clock,
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300",
  },
  rejected: {
    icon: XCircle,
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300",
  },
  verified: {
    icon: BadgeCheck,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
};

/**
 * The verification badge in the Profile page's header (#205): Not
 * verified, Pending review, Rejected or Verified. It isn't a link: the
 * banner under the header has the button to the Verify page.
 *
 * No "use client": it has no state (the Profile form draws it).
 */
export default function VerificationBadge({
  verification,
}: {
  verification: VerificationStatus;
}) {
  const { icon: StatusIcon, className } = STYLES[verification];

  return (
    // self-start: on a phone the header is a column, and the badge would
    // otherwise stretch across it.
    <span
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full border px-3.5 text-xs font-bold sm:self-auto",
        className,
      )}
    >
      <StatusIcon className="h-4 w-4" />
      <span className="sr-only">Account verification: </span>
      {VERIFICATION_BADGE_LABELS[verification]}
    </span>
  );
}
