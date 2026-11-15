/**
 * Place lookups with OpenStreetMap's Nominatim (S1-13.3, S2-10).
 *
 * Both maps use it: the landlord's LocationPicker, to find their property,
 * and the "Near" box on Find a Place and /listings, to pick the point for
 * the radius search.
 *
 * Nominatim's public server is free, but only for light use (AGENTS.md,
 * "Maps and location"). So only call this when someone presses a search
 * button or Enter, never as they type, and keep the button disabled while
 * a lookup is on its way.
 */

export const NOMINATIM_SEARCH_URL =
  "https://nominatim.openstreetmap.org/search";

/** A rectangle on the map, in degrees. */
export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Metro Cebu (Cebu City, Mandaue, Lapu-Lapu, Talisay and around), where
 * the rentals are.
 */
export const METRO_CEBU: BoundingBox = {
  west: 123.75,
  south: 10.2,
  east: 124.05,
  north: 10.45,
};

/**
 * How renters' lookups search (the search bar and the "Near" box):
 * - only in the Philippines, where every rental on Abangers is, so "USC"
 *   finds the University of San Carlos and not the one in California;
 * - Metro Cebu first, so "IT Park" finds Cebu's and not Bacolod's. Places
 *   elsewhere still come up when nothing in Metro Cebu matches.
 */
export const RENTAL_PLACE_SEARCH = {
  countryCodes: ["ph"],
  preferArea: METRO_CEBU,
} as const satisfies SearchPlacesOptions;

/**
 * Headers for every Nominatim request. Its usage policy asks apps to say
 * who they are. Browsers send the page's address as the Referer, which
 * does that, and the User-Agent is there for anything that lets us set it.
 */
export const NOMINATIM_HEADERS = {
  "Accept-Language": "en",
  "User-Agent": "AbangersApp/1.0 (student-project)",
} as const;

/** One place Nominatim found. */
export interface PlaceResult {
  /** Nominatim's id for the place. */
  id: number;
  /** The full name, e.g. "Nasipit Road, Talamban, Cebu City, ..., Philippines". */
  name: string;
  /** Just the first part of `name`, short enough for a filter chip. */
  shortName: string;
  lat: number;
  lng: number;
}

export interface SearchPlacesOptions {
  /** Only places in these countries (two-letter codes, e.g. ["ph"]). */
  countryCodes?: readonly string[];
  /**
   * Rank places in this area first, without leaving out the rest
   * (Nominatim's `viewbox` with `bounded=0`).
   */
  preferArea?: BoundingBox;
  /** At most this many places. */
  limit?: number;
}

/** The address of a Nominatim search for `query`. */
export function buildPlaceSearchUrl(
  query: string,
  { countryCodes, preferArea, limit = 5 }: SearchPlacesOptions = {},
): string {
  const params = new URLSearchParams({
    format: "json",
    q: query.trim(),
    limit: String(limit),
  });
  if (countryCodes && countryCodes.length > 0) {
    params.set("countrycodes", countryCodes.join(","));
  }
  if (preferArea) {
    // Two opposite corners, longitude first: west,north,east,south.
    const { west, north, east, south } = preferArea;
    params.set("viewbox", [west, north, east, south].join(","));
    params.set("bounded", "0");
  }
  return `${NOMINATIM_SEARCH_URL}?${params.toString()}`;
}

/**
 * The first part of a place's full name ("University of San Carlos,
 * Nasipit Road, ..." gives "University of San Carlos"). A house number on
 * its own says nothing, so it keeps the street with it ("12 Gorordo Avenue").
 */
export function shortPlaceName(fullName: string): string {
  const parts = fullName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return fullName.trim();
  if (/^\d+[a-z]?$/i.test(parts[0]) && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

// Nominatim sends the coordinates as strings ("10.3530"). Anything else
// (missing, empty, not a number) gives NaN, so the place is skipped.
function toCoordinate(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

/**
 * Looks `query` up and returns up to `limit` places, best match first, or
 * an empty list when nothing matches (or the query is blank). Throws when
 * Nominatim can't be reached or answers with an error, so the caller can
 * say so.
 */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceResult[]> {
  if (!query.trim()) return [];

  const response = await fetch(buildPlaceSearchUrl(query, options), {
    headers: NOMINATIM_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Nominatim answered with HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];

  const places: PlaceResult[] = [];
  data.forEach((item: Record<string, unknown>, index) => {
    const lat = toCoordinate(item?.lat);
    const lng = toCoordinate(item?.lon);
    const name = item?.display_name;
    if (
      typeof name !== "string" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }
    places.push({
      id: typeof item.place_id === "number" ? item.place_id : index,
      name,
      shortName: shortPlaceName(name),
      lat,
      lng,
    });
  });
  return places;
}
