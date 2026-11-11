import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const DUPLICATE_KEY_ERROR_CODE = "23505";
export const FAVORITE_SAVE_ERROR_MESSAGE =
  "Unable to save to favorites. Please try again.";
export const FAVORITE_REMOVE_ERROR_MESSAGE =
  "Unable to remove from favorites. Please try again.";
export const FAVORITE_UNAUTHENTICATED_MESSAGE =
  "You must be logged in as a renter to save favorites.";

export type FavoriteActionResult = {
  ok: boolean;
  error?: string;
};

export interface FavoriteTransitionState {
  isFavorited: boolean;
  errorMessage: string | null;
}

/**
 * Computes the state transition after a favorite action attempt (#97).
 *
 * - On success (`result.ok === true`), sets `isFavorited` to `attemptedFavorited` and clears any error.
 * - On failure (`result.ok === false`), rolls back `isFavorited` to `previousFavorited` and returns `result.error`.
 */
export function resolveFavoriteStateAfterAction(
  previousFavorited: boolean,
  attemptedFavorited: boolean,
  result: FavoriteActionResult,
): FavoriteTransitionState {
  if (result.ok) {
    return {
      isFavorited: attemptedFavorited,
      errorMessage: null,
    };
  }

  return {
    isFavorited: previousFavorited,
    errorMessage:
      result.error ||
      (attemptedFavorited
        ? FAVORITE_SAVE_ERROR_MESSAGE
        : FAVORITE_REMOVE_ERROR_MESSAGE),
  };
}

/**
 * Inserts a favorite row for the currently authenticated renter.
 * If the row already exists (duplicate key error 23505), treats it as successfully saved (#97).
 */
export async function addFavorite(
  supabase: SupabaseClient<Database>,
  listingId: string,
): Promise<FavoriteActionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: FAVORITE_UNAUTHENTICATED_MESSAGE };
  }

  const { error } = await supabase.from("favorites").insert({
    renter_id: user.id,
    listing_id: listingId,
  });

  if (error) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      return { ok: true };
    }
    return { ok: false, error: FAVORITE_SAVE_ERROR_MESSAGE };
  }

  return { ok: true };
}

/**
 * Deletes a favorite row for the currently authenticated renter (#97).
 */
export async function removeFavorite(
  supabase: SupabaseClient<Database>,
  listingId: string,
): Promise<FavoriteActionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: FAVORITE_UNAUTHENTICATED_MESSAGE };
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("renter_id", user.id)
    .eq("listing_id", listingId);

  if (error) {
    return { ok: false, error: FAVORITE_REMOVE_ERROR_MESSAGE };
  }

  return { ok: true };
}

/**
 * Fetches the set of listing IDs saved by the current user.
 * Called once per page on the server for /listings or listing detail views (#97).
 * Returns an empty set for unauthenticated guests, landlords, or admins.
 */
export async function getFavoritedListingIds(
  supabase: SupabaseClient<Database>,
): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("renter_id", user.id);

  if (error || !data) {
    return new Set();
  }

  return new Set(data.map((row) => row.listing_id));
}
