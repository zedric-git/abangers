/**
 * What a query for one listing found (#244), without any React, so it can
 * be unit-tested (listing-lookup.test.ts). The listing pages
 * (/listings/[id], and the landlord's View and Edit) ask for the listing
 * with `.maybeSingle()` and pass the result here:
 * - found: the listing is there, so the page shows it;
 * - missing: there's no such listing (deleted, someone else's, or the id
 *   in the URL isn't a listing id at all), so the page redirects
 *   somewhere the user can carry on from instead of showing a 404;
 * - failed: the query itself failed (e.g. the connection dropped), so the
 *   page says the listing couldn't be loaded. It mustn't say "not found":
 *   the listing may well be there.
 */

/**
 * Postgres's "invalid_text_representation": the id in the URL isn't a
 * UUID (mistyped or cut off), so Postgres refuses it before looking. No
 * listing can have that id, so it counts as missing, not as a failure.
 */
export const INVALID_UUID_ERROR_CODE = "22P02";

export type ListingLookup<T> =
  | { kind: "found"; listing: T }
  | { kind: "missing" }
  | { kind: "failed"; error: { code: string; message: string } };

/**
 * Sorts the result of a `.maybeSingle()` listing query into found,
 * missing or failed. With `.maybeSingle()` "no row" is `data: null` and
 * no error (`.single()` would turn it into an error).
 */
export function lookupListing<T>(result: {
  data: T | null;
  error: { code: string; message: string } | null;
}): ListingLookup<NonNullable<T>> {
  const { data, error } = result;

  if (error) {
    if (error.code === INVALID_UUID_ERROR_CODE) {
      return { kind: "missing" };
    }
    return { kind: "failed", error };
  }

  if (data === null || data === undefined) {
    return { kind: "missing" };
  }

  return { kind: "found", listing: data };
}

/**
 * Where a landlord's View or Edit page sends them when the listing is
 * missing: My Posted Listings, with `?notice=` choosing the note shown
 * above the list. The note's text is fixed in the page; nothing from the
 * URL is shown.
 */
export const MISSING_LISTING_NOTICE = "listing-not-found";
export const MISSING_LISTING_REDIRECT_PATH = `/dashboard/landlord/listings?notice=${MISSING_LISTING_NOTICE}`;

/** The note on My Posted Listings after that redirect. */
export const MISSING_LISTING_NOTE =
  "That listing no longer exists, or it isn't yours.";

/** What a listing page shows instead of the listing when the query fails. */
export const LISTING_LOAD_ERROR_MESSAGE =
  "We couldn't load this listing. Refresh the page to try again.";
