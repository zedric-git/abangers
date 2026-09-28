"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { updateListingStatusAction } from "@/app/dashboard/landlord/listings/actions";

interface ListingStatusToggleProps {
  listingId: string;
  currentStatus: string;
  availableRooms?: number;
  onStatusChange?: (newStatus: string) => void;
}

export default function ListingStatusToggle({
  listingId,
  currentStatus,
  availableRooms,
  onStatusChange,
}: ListingStatusToggleProps) {
  const router = useRouter();

  // If availableRooms is 0 or less, auto-default initial display status to fully_occupied
  const effectiveInitialStatus =
    availableRooms !== undefined && availableRooms <= 0
      ? "fully_occupied"
      : currentStatus || "available";

  const [status, setStatus] = useState<string>(effectiveInitialStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Warning Modal State when switching from Occupied to Available/Almost Full while rooms == 0
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string | null>(
    null,
  );

  const getStatusConfig = (st: string) => {
    switch (st) {
      case "available":
        return {
          label: "Available",
          bg: "bg-emerald-500/90 text-white border-emerald-400",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-white" />,
        };
      case "almost_full":
        return {
          label: "Almost Full",
          bg: "bg-amber-500/90 text-white border-amber-400",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-white" />,
        };
      case "fully_occupied":
      case "unavailable":
      case "occupied":
        return {
          label: "Occupied",
          bg: "bg-rose-500/90 text-white border-rose-400",
          icon: <XCircle className="h-3.5 w-3.5 text-white" />,
        };
      default:
        return {
          label: "Available",
          bg: "bg-emerald-500/90 text-white border-emerald-400",
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-white" />,
        };
    }
  };

  const activeConfig = getStatusConfig(status);

  const executeStatusChange = async (targetStatus: string) => {
    setUpdating(true);
    setIsOpen(false);
    setPendingTargetStatus(null);

    try {
      const res = await updateListingStatusAction(listingId, targetStatus);
      if (res.success) {
        setStatus(targetStatus);
        if (onStatusChange) {
          onStatusChange(targetStatus);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectStatus = (newStatus: string) => {
    if (newStatus === status || updating) {
      setIsOpen(false);
      return;
    }

    // Intercept if availableRooms is 0 or less AND user selects Available or Almost Full
    if (
      availableRooms !== undefined &&
      availableRooms <= 0 &&
      (newStatus === "available" || newStatus === "almost_full")
    ) {
      setIsOpen(false);
      setPendingTargetStatus(newStatus);
      return;
    }

    executeStatusChange(newStatus);
  };

  const pendingLabel =
    pendingTargetStatus === "available"
      ? "Available"
      : pendingTargetStatus === "almost_full"
        ? "Almost Full"
        : "Available";

  return (
    <div className="relative inline-block text-left">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={updating}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${activeConfig.bg}`}
        title="Click to toggle listing availability status"
      >
        {updating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
        ) : (
          activeConfig.icon
        )}
        <span>{activeConfig.label}</span>
        <ChevronDown className="h-3 w-3 text-white/80" />
      </button>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <>
          {/* Backdrop dismiss overlay */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />

          <div className="animate-in fade-in zoom-in-95 absolute left-0 z-30 mt-1.5 w-44 origin-top-left rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-lg duration-150 dark:border-zinc-800 dark:bg-zinc-900/95">
            <p className="px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Set Listing Status
            </p>

            <button
              type="button"
              onClick={() => handleSelectStatus("available")}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                status === "available"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Available
            </button>

            <button
              type="button"
              onClick={() => handleSelectStatus("almost_full")}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                status === "almost_full"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Almost Full
            </button>

            <button
              type="button"
              onClick={() => handleSelectStatus("fully_occupied")}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                status === "fully_occupied" || status === "unavailable"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              Occupied
            </button>
          </div>
        </>
      )}

      {/* Warning Confirmation Modal when changing status while Available Rooms is 0 */}
      {pendingTargetStatus &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-lg font-extrabold text-zinc-900 sm:text-xl dark:text-zinc-50">
                  Change Status to {pendingLabel}?
                </h3>
                <p className="mt-2 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                  Currently, Available Rooms is set to 0. Are you sure you want
                  to mark this listing as{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {pendingLabel}
                  </span>
                  ?
                </p>
              </div>

              <div className="mt-7 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPendingTargetStatus(null)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeStatusChange(pendingTargetStatus)}
                  disabled={updating}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>Yes, Mark as {pendingLabel}</>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
