import { ALL_CANONICAL_FEATURES } from "@/lib/listing-features";

/**
 * Normalization alias dictionary mapping seed listing strings, legacy form inputs,
 * and slug keys to canonical feature names (S2-06, #18, #92).
 *
 * Seed listings store short strings in their array columns (e.g., "WiFi", "Private CR",
 * "Shared kitchen", "Laundry area", "Study area", "Air conditioning", "Water included").
 * This dictionary ensures that filtering for "Wi-Fi Included" matches listings containing "WiFi".
 */

// Normalized (lowercase trimmed) -> Canonical name
const ALIAS_MAP: Record<string, string> = {
  // Utilities
  wifi: "Wi-Fi Included",
  "wi-fi": "Wi-Fi Included",
  "wi-fi included": "Wi-Fi Included",
  "wifi included": "Wi-Fi Included",
  "water included": "Water Included",
  "water-included": "Water Included",
  "electricity included": "Electricity Included",
  "electricity-included": "Electricity Included",

  // Room features
  aircon: "Air Conditioning",
  "air conditioning": "Air Conditioning",
  "air-conditioning": "Air Conditioning",
  "electric fan": "Electric Fan",
  "electric-fan": "Electric Fan",
  fan: "Electric Fan",
  "bed provided": "Bed Provided",
  "bed-provided": "Bed Provided",
  bed: "Bed Provided",
  "cabinet/wardrobe": "Cabinet/Wardrobe",
  cabinet: "Cabinet/Wardrobe",
  wardrobe: "Cabinet/Wardrobe",
  "table/desk": "Table/Desk",
  table: "Table/Desk",
  desk: "Table/Desk",
  "study area": "Table/Desk",
  "study desk": "Table/Desk",
  chair: "Chair",

  // Bathroom features
  "private cr": "Private Bathroom/CR",
  "private bathroom": "Private Bathroom/CR",
  "private bathroom/cr": "Private Bathroom/CR",
  "shared cr": "Shared Bathroom/CR",
  "shared bathroom": "Shared Bathroom/CR",
  "shared bathroom/cr": "Shared Bathroom/CR",

  // Kitchen features
  "has kitchen": "Has Kitchen",
  kitchen: "Has Kitchen",
  "shared kitchen": "Has Kitchen",
  kitchenette: "Has Kitchen",
  "cooking allowed": "Cooking Allowed",

  // Laundry features
  "has laundry area": "Has Laundry Area",
  "laundry area": "Has Laundry Area",
  laundry: "Has Laundry Area",
  "has washing machine": "Has Washing Machine",
  "washing machine": "Has Washing Machine",

  // Safety features
  cctv: "CCTV",
  "cctv surveillance": "CCTV",
  "gated property": "Gated Property",
  gated: "Gated Property",
  "security guard": "Security Guard",
  "24/7 security": "Security Guard",
  security: "Security Guard",
  "secure/individual door lock": "Secure/Individual Door Lock",
  "secure door lock": "Secure/Individual Door Lock",
  "door lock": "Secure/Individual Door Lock",

  // Amenities / Parking
  "has parking": "Has Parking",
  parking: "Has Parking",
};

// Also index all canonical features in lowercase
for (const feature of ALL_CANONICAL_FEATURES) {
  const lower = feature.toLowerCase();
  if (!ALIAS_MAP[lower]) {
    ALIAS_MAP[lower] = feature;
  }
}

/**
 * Maps a single raw string (from seed data, legacy listings, or URL params)
 * to its canonical feature name if recognized, or returns the trimmed string.
 */
export function canonicalizeFeature(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  return ALIAS_MAP[lower] ?? trimmed;
}

/**
 * Normalizes an array of raw feature strings into a deduplicated list of canonical feature names.
 */
export function normalizeFeatures(rawFeatures: readonly string[]): string[] {
  const result = new Set<string>();
  for (const item of rawFeatures) {
    if (!item) continue;
    const canonical = canonicalizeFeature(item);
    if (canonical) {
      result.add(canonical);
    }
  }
  return Array.from(result);
}

/**
 * Converts a canonical feature name to a URL-friendly slug (e.g. "Wi-Fi Included" -> "wifi").
 */
export function featureToSlug(feature: string): string {
  return feature
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
