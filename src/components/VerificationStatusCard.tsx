import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Clock,
  Plus,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NEW_LISTING_PATH,
  PROFILE_PATH,
  VERIFY_ACCOUNT_PATH,
  type VerificationStatusAction,
  type VerificationStatusView,
} from "@/lib/verify-account";

type Icon = React.ComponentType<{ className?: string }>;

/** The id of the card's heading: the form moves the focus there after Submit. */
export const VERIFICATION_STATUS_HEADING_ID = "verification-status-heading";

const TONES: Record<
  VerificationStatusView["tone"],
  { icon: Icon; className: string }
> = {
  pending: {
    icon: Clock,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  verified: {
    icon: BadgeCheck,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  problem: {
    icon: AlertCircle,
    className:
      "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
  },
};

/**
 * Each button a card can have. A Record, so a new VerificationStatusAction
 * can't be added without its link.
 */
const ACTIONS: Record<
  VerificationStatusAction,
  { label: string; href: string; icon: Icon; reload?: boolean }
> = {
  back_to_profile: {
    label: "Back to Profile",
    href: PROFILE_PATH,
    icon: ArrowLeft,
  },
  go_to_profile: {
    label: "Go to Profile",
    href: PROFILE_PATH,
    icon: UserRound,
  },
  new_listing: { label: "Add New Listing", href: NEW_LISTING_PATH, icon: Plus },
  // A full page load, so the server checks the status again.
  try_again: {
    label: "Try again",
    href: VERIFY_ACCOUNT_PATH,
    icon: RotateCcw,
    reload: true,
  },
};

// The same button styles as ListingSaveErrorModal's.
const SECONDARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const PRIMARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-700";

/**
 * What the Verify account page (#203) shows instead of the form: the
 * verification is being reviewed, the account is verified, or something
 * stops the landlord from sending one. verifyPageView() and
 * afterSubmitView() (src/lib/verify-account.ts) decide which.
 *
 * No "use client": the page draws it on the server, and the form draws
 * the same card in the browser right after Submit.
 */
export default function VerificationStatusCard({
  status,
}: {
  status: VerificationStatusView;
}) {
  const tone = TONES[status.tone];
  const ToneIcon = tone.icon;

  return (
    <section
      aria-labelledby={VERIFICATION_STATUS_HEADING_ID}
      className="rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-2xs sm:p-10 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div
        className={cn(
          "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
          tone.className,
        )}
      >
        <ToneIcon className="h-7 w-7" />
      </div>

      {/* tabIndex -1: the form can move the focus here, the mouse can't. */}
      <h2
        id={VERIFICATION_STATUS_HEADING_ID}
        tabIndex={-1}
        className="mt-5 text-lg font-extrabold text-zinc-900 outline-none sm:text-xl dark:text-zinc-50"
      >
        {status.title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {status.message}
      </p>

      {/* The last button is the main one. On a phone it goes on top. */}
      <div className="mx-auto mt-7 flex max-w-md flex-col-reverse gap-3 sm:flex-row">
        {status.actions.map((action, index) => {
          const { label, href, icon: ActionIcon, reload } = ACTIONS[action];
          const className =
            index === status.actions.length - 1
              ? PRIMARY_BUTTON
              : SECONDARY_BUTTON;
          const content = (
            <>
              <ActionIcon className="h-4 w-4" />
              {label}
            </>
          );

          return reload ? (
            <a key={action} href={href} className={className}>
              {content}
            </a>
          ) : (
            <Link key={action} href={href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
