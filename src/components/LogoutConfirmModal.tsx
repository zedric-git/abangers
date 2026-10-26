"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

const emptySubscribe = () => () => {};

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !isMounted) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!loading) onClose();
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Amber warning badge header */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <AlertTriangle className="h-7 w-7" />
        </div>

        {/* Modal Title & Message */}
        <div className="mt-5 text-center">
          <h3
            id="logout-modal-title"
            className="text-lg font-extrabold text-zinc-900 sm:text-xl dark:text-zinc-50"
          >
            Log Out?
          </h3>
          <p className="mt-2 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Are you sure you want to log out? Any unsaved changes in your
            dashboard will be lost.
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Log Out"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
