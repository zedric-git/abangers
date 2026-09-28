"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteListingAction } from "@/app/dashboard/landlord/listings/actions";

interface DeleteListingModalProps {
  isOpen: boolean;
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteListingModal({
  isOpen,
  listingId,
  listingTitle,
  onClose,
  onSuccess,
}: DeleteListingModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || typeof window === "undefined") return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await deleteListingAction(listingId);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error);
      }
    } catch (err) {
      console.error("Delete listing error:", err);
      setError("An unexpected error occurred while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Warning Header Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <Trash2 className="h-7 w-7" />
        </div>

        {/* Modal Title & Message */}
        <div className="mt-5 text-center">
          <h3 className="text-lg font-extrabold text-zinc-900 sm:text-xl dark:text-zinc-50">
            Delete Listing?
          </h3>
          <p className="mt-2 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              &quot;{listingTitle}&quot;
            </span>
            ? This action cannot be undone and will permanently remove the
            property from BoardingHub.
          </p>
        </div>

        {/* Server Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-700"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Listing
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
