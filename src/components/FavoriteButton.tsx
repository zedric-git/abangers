"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  listingId: string;
  initialFavorited?: boolean;
  /**
   * The signed-in user's role ("renter", "landlord", "admin"), or null if guest.
   * If landlord or admin, the button is not rendered (hidden per #95 RLS rule).
   */
  userRole?: string | null;
  /**
   * Optional callback for unauthenticated guests to prompt login/sign-up (#86).
   */
  onRequireAuth?: () => void;
  /**
   * Optional callback when favorite state toggles (used for optimistic list updates, #98).
   */
  onToggle?: (nextState: boolean) => void;
  /**
   * Visual variant:
   * - "card": floating circular glassmorphic button for listing preview cards
   * - "detail": pill button with "Save" / "Saved" label for detail pages
   */
  variant?: "card" | "detail";
  className?: string;
}

/**
 * Accessible favorite toggle button for renters and guests (S2-08.2, #96).
 *
 * - Renders heart icon (filled rose when saved, outlined when unsaved).
 * - Hidden from landlords and admins (#95).
 * - Opens auth prompt for guests (#86).
 * - Performs optimistic updates with rollback and friendly error handling for renters (#97).
 * - Disabled while network request is in flight to prevent duplicate requests.
 */
export default function FavoriteButton({
  listingId,
  initialFavorited = false,
  userRole = null,
  onRequireAuth,
  onToggle,
  variant = "card",
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, setIsPending] = useState(false);

  // Landlords and admins cannot save favorites (Rule 1 & #95 RLS) — hide the button.
  if (userRole === "landlord" || userRole === "admin") {
    return null;
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Guest: prompt auth modal
    if (!userRole) {
      onRequireAuth?.();
      return;
    }

    // Only renters can toggle favorites
    if (userRole !== "renter" || isPending) {
      return;
    }

    const previousState = isFavorited;
    const nextState = !previousState;

    // Optimistic UI update
    setIsFavorited(nextState);
    setIsPending(true);
    onToggle?.(nextState);

    try {
      const supabase = createClient();
      const result = nextState
        ? await addFavorite(supabase, listingId)
        : await removeFavorite(supabase, listingId);

      if (!result.ok) {
        // Rollback on failure
        setIsFavorited(previousState);
        onToggle?.(previousState);
      }
    } catch {
      // Rollback on unexpected error
      setIsFavorited(previousState);
      onToggle?.(previousState);
    } finally {
      setIsPending(false);
    }
  };

  const label = isFavorited ? "Remove from favorites" : "Save to favorites";

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={label}
        aria-pressed={isFavorited}
        title={label}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all duration-200 disabled:opacity-60",
          isFavorited
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/50"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-rose-200 hover:text-rose-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-rose-400",
          className,
        )}
      >
        <Heart
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            isFavorited
              ? "fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400"
              : "text-zinc-500 dark:text-zinc-400",
          )}
        />
        <span>{isFavorited ? "Saved" : "Save"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={label}
      aria-pressed={isFavorited}
      title={label}
      className={cn(
        "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 shadow-xs backdrop-blur-md transition-all duration-200 active:scale-95 disabled:opacity-60",
        isFavorited
          ? "bg-rose-600 text-white shadow-md hover:bg-rose-700"
          : "bg-black/40 text-white hover:bg-black/60",
        className,
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-transform",
          isFavorited ? "fill-current" : "",
        )}
      />
    </button>
  );
}
