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
