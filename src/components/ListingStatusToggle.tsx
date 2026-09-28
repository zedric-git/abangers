"use client";

import { useState } from "react";
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
  onStatusChange?: (newStatus: string) => void;
}

export default function ListingStatusToggle({
  listingId,
  currentStatus,
  onStatusChange,
}: ListingStatusToggleProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(currentStatus || "available");
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

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

  const handleSelectStatus = async (newStatus: string) => {
    if (newStatus === status || updating) {
      setIsOpen(false);
      return;
    }

    setUpdating(true);
    setIsOpen(false);

    try {
      const res = await updateListingStatusAction(listingId, newStatus);
      if (res.success) {
        setStatus(newStatus);
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  };

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
              🟢 Available
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
              🟡 Almost Full
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
              🔴 Occupied
            </button>
          </div>
        </>
      )}
    </div>
  );
}
