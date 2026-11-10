import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { Listing } from "@/types/listing";
import {
  ListingInput,
  listingRowToFormValues,
} from "@/lib/validations/listing";
import { lookupListing, MISSING_LISTING_NOTICE } from "@/lib/listing-lookup";

/**
 * Where `/listings/[id]` sends a signed-in user when the listing is missing
 * (deleted or a mistyped id in the URL): back to `/listings` with a notice
 * instead of showing a 404 page (#244, #94).
 */
export const MISSING_PUBLIC_LISTING_REDIRECT_PATH = `/listings?notice=${MISSING_LISTING_NOTICE}`;

export const MISSING_PUBLIC_LISTING_NOTE =
  "That listing no longer exists or is unavailable.";

export type FetchedListingResult =
  | {
      kind: "found";
      listing: Listing;
      formValues: Partial<ListingInput>;
    }
  | { kind: "missing" }
  | { kind: "failed"; error: { code: string; message: string } };

/**
 * Fetches a single listing by ID via the existing public RLS select policy
 * ("listings viewable by everyone", #94) and classifies the result into
 * `found`, `missing` (no row or invalid UUID), or `failed`.
 */
export async function fetchListingById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<FetchedListingResult> {
  const result = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const lookup = lookupListing(result);

  if (lookup.kind !== "found") {
    return lookup;
  }

  return {
    kind: "found",
    listing: lookup.listing,
    formValues: listingRowToFormValues(lookup.listing),
  };
}
