"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEW_LISTING_PATH } from "@/lib/verify-account";

/**
 * The locked look. cn() (tailwind-merge) puts these in place of the
 * page's own colours, so the button keeps its size and shape.
 */
const LOCKED_COLOURS =
  "bg-zinc-200 text-zinc-600 shadow-none hover:bg-zinc-300 active:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700";

interface AddListingButtonProps {
  /** The landlord can't post yet: isAddListingLocked(). */
  locked: boolean;
  /** The page's own look for the button: its size, shape and colours. */
  className?: string;
  /** What it says. Defaults to "Add New Listing". */
  label?: string;
}

/**
 * Every way in to the new-listing page (#205): the header buttons on the
 * dashboard and My Posted Listings, and their buttons for a first listing.
 *
 * Until the landlord can post (a complete profile and a verified account),
 * it's grey with a lock and a hover/focus tooltip. It still opens the page,
 * which then shows the checklist of what's left instead of the form
 * (newListingPageView in src/lib/landlord-status-view.ts), so the landlord
 * finds out why (including when they already have listings and don't see
 * the in-place checklist).
 */
export default function AddListingButton({
  locked,
  className,
  label = "Add New Listing",
}: AddListingButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const baseClassName = cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700",
    className,
  );

  if (!locked) {
    return (
      <Link href={NEW_LISTING_PATH} className={baseClassName}>
        <Plus className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <div className="relative inline-block">
      <Link
        href={NEW_LISTING_PATH}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={cn(baseClassName, LOCKED_COLOURS)}
      >
        <Lock className="h-4 w-4 shrink-0" />
        <span>{label}</span>
        <span className="sr-only"> (locked)</span>
      </Link>

      {showTooltip && (
        <div
          role="tooltip"
          className="animate-in fade-in zoom-in-95 pointer-events-none absolute top-full right-0 z-50 mt-2 flex w-64 items-start gap-2.5 rounded-xl border border-amber-200 bg-white p-3 text-xs text-zinc-700 shadow-xl dark:border-amber-900/50 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-tight">
            Complete your profile and verification first to post listings.
          </p>
        </div>
      )}
    </div>
  );
}
