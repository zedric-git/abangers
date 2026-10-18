"use client";

import { useRef, type RefObject } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Why Publish / Save failed, as the listing form shows it (#221). */
export interface ListingSaveError {
  /** The server action's message, shown as it is. */
  message: string;
  /** The fix is on the Profile page, so the card links there. */
  fixOnProfilePage: boolean;
}

interface ListingSaveErrorModalProps {
  /** The error to show. null keeps the card closed. */
  error: ListingSaveError | null;
  isEditing: boolean;
  onClose: () => void;
  /** Gets the focus back when the card closes: the Publish / Save button. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

// The same button styles as DeleteListingModal's.
const SECONDARY_BUTTON =
  "inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";
const PRIMARY_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-700";

/**
 * The card that pops up over the listing form when Publish Listing Now
 * or Save Listing Changes fails (#221). Those buttons are at the bottom
 * of a long preview, so an error at the top of the page went unseen.
 *
 * Built on shadcn's AlertDialog: focus moves into the card, Escape
 * closes it, and the page behind can't be scrolled or clicked while it's
 * open. Screen readers announce it as an alert.
 */
export default function ListingSaveErrorModal({
  error,
  isEditing,
  onClose,
  returnFocusRef,
}: ListingSaveErrorModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      open={error !== null}
      onOpenChange={(open) => {
        // Called when Escape closes the card.
        if (!open) onClose();
      }}
    >
      <AlertDialogContent
        // Start on Close. AlertDialog would focus an AlertDialogCancel, but
        // shadcn's one is styled with theme colours this app doesn't define,
        // so Close is a plain button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          closeButtonRef.current?.focus();
        }}
        // When the card closes, go back to the button that saved, not the
        // top of the page. (That button was disabled while saving, so the
        // browser had already taken the focus off it.)
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
        className="gap-0 rounded-3xl border-zinc-200 bg-white p-6 shadow-2xl sm:p-7 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Warning Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <AlertCircle className="h-7 w-7" />
        </div>

        {/* Title & Server Message */}
        <div className="mt-5 text-center">
          <AlertDialogTitle className="text-lg font-extrabold text-zinc-900 sm:text-xl dark:text-zinc-50">
            {isEditing
              ? "Couldn't save your changes"
              : "Couldn't publish your listing"}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            {error?.message}
          </AlertDialogDescription>
          {error?.fixOnProfilePage && (
            <p className="mt-3 text-[11px] text-zinc-500 sm:text-xs dark:text-zinc-400">
              Your Profile page opens in a new tab, so you won&apos;t lose what
              you&apos;ve entered here.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-7 flex items-center gap-3">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={
              error?.fixOnProfilePage ? SECONDARY_BUTTON : PRIMARY_BUTTON
            }
          >
            Close
          </button>
          {error?.fixOnProfilePage && (
            // A new tab, so the listing they typed and the photos they
            // uploaded stay on this form. Leaving the page would lose them.
            <Link
              href="/dashboard/landlord/profile"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={PRIMARY_BUTTON}
            >
              <ExternalLink className="h-4 w-4" />
              Open Profile page
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
