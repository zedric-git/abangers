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
  type LucideIcon,
} from "lucide-react";
import { updateListingStatusAction } from "@/app/dashboard/landlord/listings/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LISTING_STATUSES,
  listingStatusView,
  type ListingStatus,
} from "@/lib/listing-status-view";

/** Each status's icon; its label and colours come from listingStatusView. */
const STATUS_ICONS: Record<ListingStatus, LucideIcon> = {
  available: CheckCircle2,
  almost_full: AlertTriangle,
  fully_occupied: XCircle,
};

/** When the action couldn't be reached at all (e.g. the connection dropped). */
const UNEXPECTED_ERROR =
  "We couldn't change the status. Check your connection and try again.";

interface ListingStatusToggleProps {
  listingId: string;
  /** For screen readers: which listing this badge changes. */
  listingTitle: string;
  /** The listing's availability_status, as saved. */
  currentStatus: string;
  availableRooms?: number;
}

/**
 * The status badge on a landlord's listing card (S1-12.1, #232). It shows
 * the saved status and opens a menu of the three statuses; picking one
 * saves it straight away, without a full edit. If saving fails, the badge
 * keeps the old status and the error shows under it.
 */
export default function ListingStatusToggle({
  listingId,
  listingTitle,
  currentStatus,
  availableRooms,
}: ListingStatusToggleProps) {
  const router = useRouter();

  // The status the badge shows. It starts as the saved one; the card
  // re-mounts this toggle when the saved status changes (see its `key`).
  const [status, setStatus] = useState<ListingStatus>(
    listingStatusView(currentStatus).status,
  );
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Warning Modal State when switching from Occupied to Available/Almost Full while rooms == 0
  const [pendingTargetStatus, setPendingTargetStatus] =
    useState<ListingStatus | null>(null);

  const activeView = listingStatusView(status);
  const ActiveIcon = STATUS_ICONS[status];

  const executeStatusChange = async (targetStatus: ListingStatus) => {
    setUpdating(true);
    setPendingTargetStatus(null);
    setError(null);

    try {
      const res = await updateListingStatusAction(listingId, targetStatus);
      if (res.success) {
        setStatus(targetStatus);
        // Re-read the page so the counts and the tabs agree with the badge.
        router.refresh();
      } else {
        // Keep the old status; say why it didn't change.
        setError(res.error);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(UNEXPECTED_ERROR);
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectStatus = (newStatus: ListingStatus) => {
    if (newStatus === status || updating) {
      return;
    }

    // Intercept if availableRooms is 0 or less AND user selects Available or Almost Full
    if (
      availableRooms !== undefined &&
      availableRooms <= 0 &&
      (newStatus === "available" || newStatus === "almost_full")
    ) {
      setPendingTargetStatus(newStatus);
      return;
    }

    executeStatusChange(newStatus);
  };

  const pendingLabel = pendingTargetStatus
    ? listingStatusView(pendingTargetStatus).label
    : "";

  return (
    <div className="flex flex-col items-start gap-1">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={updating}
            aria-label={`${activeView.label}. Change the status of ${listingTitle}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900 ${activeView.badgeClassName}`}
          >
            {updating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ActiveIcon className="h-3.5 w-3.5" />
            )}
            <span>{activeView.label}</span>
            <ChevronDown className="h-3 w-3 opacity-80" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-48 rounded-xl border-zinc-200 bg-white p-1.5 text-zinc-700 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            Set Listing Status
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) =>
              handleSelectStatus(listingStatusView(value).status)
            }
          >
            {LISTING_STATUSES.map((option) => {
              const view = listingStatusView(option);
              const Icon = STATUS_ICONS[option];
              return (
                <DropdownMenuRadioItem
                  key={option}
                  value={option}
                  className="cursor-pointer rounded-lg text-xs font-semibold focus:bg-zinc-100 focus:text-zinc-900 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-900 dark:focus:bg-zinc-800 dark:focus:text-zinc-50 dark:data-[state=checked]:bg-zinc-800 dark:data-[state=checked]:text-zinc-50"
                >
                  <Icon className={`h-3.5 w-3.5 ${view.iconClassName}`} />
                  {view.label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p
          role="alert"
          className="max-w-[14rem] text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
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
