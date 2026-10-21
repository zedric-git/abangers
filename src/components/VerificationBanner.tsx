import Link from "next/link";
import { AlertCircle, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import type { LandlordStatus } from "@/lib/auth/landlord-status";
import {
  verificationBanner,
  type VerificationBannerView,
} from "@/lib/landlord-status-view";
import { cn } from "@/lib/utils";

type Icon = React.ComponentType<{ className?: string }>;

/** The id of the banner's title. There's at most one banner on a page. */
const TITLE_ID = "verification-banner-title";

const TONES: Record<
  VerificationBannerView["tone"],
  { icon: Icon; box: string; iconBox: string; title: string; text: string }
> = {
  // A call to action, in the app's purple.
  not_verified: {
    icon: ShieldCheck,
    box: "border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/40",
    iconBox:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    title: "text-purple-950 dark:text-purple-100",
    text: "text-purple-800 dark:text-purple-300",
  },
  // Waiting, like VerificationStatusCard's "being reviewed" card.
  pending: {
    icon: Clock,
    box: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40",
    iconBox:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    title: "text-amber-950 dark:text-amber-100",
    text: "text-amber-800 dark:text-amber-200",
  },
  // Something to fix, like the app's other problem cards.
  rejected: {
    icon: AlertCircle,
    box: "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40",
    iconBox: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
    title: "text-rose-950 dark:text-rose-100",
    text: "text-rose-800 dark:text-rose-300",
  },
};

/**
 * The banner under the page header on the landlord dashboard, My Posted
 * Listings and Profile pages (#205): Not verified, Pending, or Rejected
 * with the admin's reason. It keeps prompting until the landlord is
 * verified, then disappears (verificationBanner() in
 * src/lib/landlord-status-view.ts decides what it says).
 *
 * No "use client": the pages draw it on the server, and the Profile form
 * draws it in the browser.
 */
export default function VerificationBanner({
  status,
}: {
  /** From loadLandlordStatus; null (couldn't be read) shows nothing. */
  status: LandlordStatus | null;
}) {
  const banner = verificationBanner(status);
  if (!banner) {
    return null;
  }

  const tone = TONES[banner.tone];
  const ToneIcon = tone.icon;

  return (
    <section
      aria-labelledby={TITLE_ID}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5",
        tone.box,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone.iconBox,
          )}
        >
          <ToneIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id={TITLE_ID} className={cn("text-sm font-bold", tone.title)}>
            {banner.title}
          </h2>
          {banner.reason && (
            <p className={cn("mt-1 text-xs wrap-break-word", tone.text)}>
              <span className="font-semibold">Reason:</span> {banner.reason}
            </p>
          )}
          <p className={cn("mt-1 text-xs", tone.text)}>{banner.message}</p>
        </div>
      </div>

      {banner.action && (
        <Link
          href={banner.action.href}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-800 active:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          {banner.action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}
