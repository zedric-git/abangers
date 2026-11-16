import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ListingStatus } from "@/lib/listing-status-view";

/**
 * The listings renters and guests browse. /listings and the renter's Find
 * a Place both load them from here, so the two pages can't drift apart
 * again: each had its own copy of this query, and both lost the
 * almost-full listings at once (#300, #309).
 */

/**
 * The columns the browse pages need (ListingPreview in
 * src/types/listing.ts): the cards, the filters and the map's pins.
 * Contact details are left out: they're for signed-in users, on a
 * listing's own page (#19).
 */
export const PUBLIC_LISTING_COLUMNS =
  "id, title, monthly_rent, available_rooms, total_rooms, property_type, occupancy_type, allowed_gender, address, city, description, cover_image, images, availability_status, amenities, utilities, room_features, bathroom_features, kitchen_features, laundry_features, safety_features, house_rules, latitude, longitude, created_at";

/**
 * The statuses a renter can still ask about: available and almost full.
 * Fully occupied listings stay off the browse pages.
 */
export const BROWSABLE_LISTING_STATUSES = [
  "available",
  "almost_full",
] as const satisfies readonly ListingStatus[];

/** The listings to browse, newest first. */
export function loadBrowsableListings(supabase: SupabaseClient<Database>) {
  return supabase
    .from("listings")
    .select(PUBLIC_LISTING_COLUMNS)
    .in("availability_status", [...BROWSABLE_LISTING_STATUSES])
    .order("created_at", { ascending: false });
}
