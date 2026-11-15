/**
 * Distances for the radius search on Find a Place and /listings (S2-10,
 * #102): a renter or guest picks a point and 500 m, 1 km or 5 km, and only the
 * listings within that distance stay in the cards and on the map.
 *
 * It's plain math on the listings' latitude and longitude, done in the
 * browser like the other filters, so there's no database query or PostGIS
 * involved. That's fine while the page loads every available listing
 * anyway. If that stops being true, move the filter into the query.
 */

/**
 * The radius choices, in kilometers (0.5 is 500 m), in the order the
 * controls show them. Mostly walking distances, since that's how renters
 * look for a place (plan update 2 on #28; it was 1, 5 and 10 km).
 */
export const SEARCH_RADII_KM = [0.5, 1, 5] as const;

export type SearchRadiusKm = (typeof SEARCH_RADII_KM)[number];

/**
 * The radius a search starts with when the URL doesn't name one: the
 * largest, so a new search shows results right away, and the visitor
 * narrows it down from there.
 */
export const DEFAULT_SEARCH_RADIUS_KM: SearchRadiusKm = 5;

/** The biggest radius, which "Try 5 km" switches to when nothing is near. */
export const LARGEST_SEARCH_RADIUS_KM: SearchRadiusKm =
  SEARCH_RADII_KM[SEARCH_RADII_KM.length - 1];

/** A radius for people to read: "500 m", "1 km", "5 km". */
export function formatRadius(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
}

/** True for 0.5, 1 and 5 (as numbers), and nothing else. */
export function isSearchRadiusKm(value: unknown): value is SearchRadiusKm {
  return SEARCH_RADII_KM.some((radius) => radius === value);
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** The point a radius search measures from. */
export interface SearchCenter extends LatLng {
  /**
   * What to call it: the name of the place the visitor looked up, or null
   * for a spot they picked on the map, which the page calls "the pin".
   */
  label: string | null;
}

// The Earth's mean radius. The haversine formula below treats the Earth as
// a perfect sphere. Around Cebu that reads up to 0.5% long: checked
// against Vincenty's formula on the real (WGS84) shape, it's about 30 m
// over 6 km, and less than the cards round to.
const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * The straight-line ("as the crow flies") distance between two points, in
 * kilometers, by the haversine formula. It isn't the walking or driving
 * distance: that would need a routing service.
 */
export function distanceKm(from: LatLng, to: LatLng): number {
  const latChange = toRadians(to.lat - from.lat);
  const lngChange = toRadians(to.lng - from.lng);
  const h =
    Math.sin(latChange / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(lngChange / 2) ** 2;
  // Math.min guards against rounding pushing h a hair above 1.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The columns a listing keeps its pin in (null when it has none). */
interface HasCoordinates {
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * A listing's pin, or null when it has none. The listing form requires a
 * pin, but a row saved some other way may not have one, and it can't be
 * put on the map or measured from (#309: those used to be pinned at
 * made-up spots around Cebu City).
 */
export function listingCoordinates(listing: HasCoordinates): LatLng | null {
  const { latitude, longitude } = listing;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { lat: latitude, lng: longitude };
}

export interface ListingWithDistance<T> {
  listing: T;
  distanceKm: number;
}

/**
 * The listings within `radiusKm` of `center`, nearest first, each with its
 * distance. A listing exactly on the edge counts as inside. Listings
 * without a pin are left out, since there's no telling how far they are.
 */
export function listingsWithinRadius<T extends HasCoordinates>(
  listings: readonly T[],
  center: LatLng,
  radiusKm: number,
): ListingWithDistance<T>[] {
  const inside: ListingWithDistance<T>[] = [];
  for (const listing of listings) {
    const point = listingCoordinates(listing);
    if (!point) continue;

    const distance = distanceKm(center, point);
    if (distance <= radiusKm) {
      inside.push({ listing, distanceKm: distance });
    }
  }
  // sort() keeps equal items in their order, so two listings the same
  // distance away stay newest first, like the rest of the page.
  return inside.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * A distance for people to read: meters under 1 km (to the nearest 10 m,
 * and never "0 m"), then kilometers with one decimal below 10 km and whole
 * ones after that. The page shows it as "450 m away" or "1.2 km away".
 */
export function formatDistance(km: number): string {
  const meters = Math.round(km * 100) * 10;
  if (meters < 1000) {
    return `${Math.max(meters, 10)} m`;
  }
  const tenths = Math.round(km * 10) / 10;
  return tenths < 10 ? `${tenths.toFixed(1)} km` : `${Math.round(km)} km`;
}
