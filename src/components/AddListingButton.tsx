"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEW_LISTING_PATH } from "@/lib/verify-account";

interface AddListingButtonProps {
  /** The landlord can't post yet: isAddListingLocked(). */
  locked: boolean;
  /** The page's own look for the button: its size, shape and colours. */
  className?: string;
  /** What it says. Defaults to "Add New Listing". */
  label?: string;
}

export default function AddListingButton({
  locked,
  className,
  label = "Add New Listing",
}: AddListingButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!locked) {
    return (
      <Link
        href={NEW_LISTING_PATH}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700",
          className,
        )}
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-200 px-5 text-sm font-semibold text-zinc-600 shadow-none transition-colors dark:bg-zinc-800 dark:text-zinc-400",
          className,
        )}
      >
        <Lock className="h-4 w-4 shrink-0" />
        <span>{label}</span>
        <span className="sr-only"> (locked)</span>
      </button>

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
