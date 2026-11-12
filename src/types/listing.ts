import type { Database } from "@/types/database";

/**
 * A row from public.listings, exactly as the database returns it.
 *
 * Derived from the generated `src/types/database.ts` (run
 * `npm run db:types` after any migration), so it can't drift from the
 * real table. This used to be a hand-written interface, which ended up
 * with a `price` field the table never had.
 *
 * Optional columns come back as `null`, not `undefined`. To feed a row
 * into the listing form or ListingDetailView, convert it with
 * `listingRowToFormValues` (src/lib/validations/listing.ts).
 */
export type Listing = Database["public"]["Tables"]["listings"]["Row"];

/**
 * The subset of columns sent to the public browse page (S2-04, S2-05, S2-06, #14, #15, #18).
 * The amenity and house rule columns feed the filters, and the coordinates
 * place the pins on the map view. Contact details (contact_info) are left
 * out: they're reserved for signed-in detail views (#19).
 */
export type ListingPreview = Pick<
  Listing,
  | "id"
  | "title"
  | "monthly_rent"
  | "available_rooms"
  | "total_rooms"
  | "property_type"
  | "occupancy_type"
  | "allowed_gender"
  | "address"
  | "city"
  | "description"
  | "cover_image"
  | "images"
  | "availability_status"
  | "created_at"
  | "amenities"
  | "utilities"
  | "room_features"
  | "bathroom_features"
  | "kitchen_features"
  | "laundry_features"
  | "safety_features"
  | "house_rules"
> &
  // Optional: the map view skips a listing without them.
  Partial<Pick<Listing, "latitude" | "longitude">>;
