import {
  STANDARD_HOUSE_RULES,
  type StandardHouseRule,
} from "@/lib/house-rules";

/**
 * Canonical option lists for the 7 listing feature groups and house rules (S2-06, #18, #91).
 *
 * This is the single source of truth shared between:
 * - LandlordListingForm (saving listings)
 * - ListingFilterControls (discovery filters)
 * - Filter query logic & alias normalization
 *
 * Keeping them in one module ensures filter choices cannot drift from
 * what landlords can select and save.
 */

export const AMENITIES_OPTIONS = ["Has Parking"] as const;

export const UTILITIES_OPTIONS = [
  "Wi-Fi Included",
  "Water Included",
  "Electricity Included",
] as const;

export const ROOM_FEATURES_OPTIONS = [
  "Air Conditioning",
  "Electric Fan",
  "Bed Provided",
  "Cabinet/Wardrobe",
  "Table/Desk",
  "Chair",
] as const;

export const BATHROOM_FEATURES_OPTIONS = [
  "Private Bathroom/CR",
  "Shared Bathroom/CR",
] as const;

export const KITCHEN_FEATURES_OPTIONS = [
  "Has Kitchen",
  "Cooking Allowed",
] as const;

export const LAUNDRY_FEATURES_OPTIONS = [
  "Has Laundry Area",
  "Has Washing Machine",
] as const;

export const SAFETY_FEATURES_OPTIONS = [
  "CCTV",
  "Gated Property",
  "Security Guard",
  "Secure/Individual Door Lock",
] as const;

export const HOUSE_RULES_OPTIONS = STANDARD_HOUSE_RULES;

export type FeatureCategoryColumn =
  | "amenities"
  | "utilities"
  | "room_features"
  | "bathroom_features"
  | "kitchen_features"
  | "laundry_features"
  | "safety_features";

export interface FeatureCategoryConfig {
  id: string;
  title: string;
  column: FeatureCategoryColumn;
  options: readonly string[];
}

/**
 * Metadata descriptor for each feature category group rendered in filter controls.
 */
export const FEATURE_CATEGORIES: readonly FeatureCategoryConfig[] = [
  {
    id: "utilities",
    title: "Utilities",
    column: "utilities",
    options: UTILITIES_OPTIONS,
  },
  {
    id: "room_features",
    title: "Room Features",
    column: "room_features",
    options: ROOM_FEATURES_OPTIONS,
  },
  {
    id: "bathroom_features",
    title: "Bathroom",
    column: "bathroom_features",
    options: BATHROOM_FEATURES_OPTIONS,
  },
  {
    id: "kitchen_features",
    title: "Kitchen",
    column: "kitchen_features",
    options: KITCHEN_FEATURES_OPTIONS,
  },
  {
    id: "laundry_features",
    title: "Laundry",
    column: "laundry_features",
    options: LAUNDRY_FEATURES_OPTIONS,
  },
  {
    id: "safety_features",
    title: "Safety & Security",
    column: "safety_features",
    options: SAFETY_FEATURES_OPTIONS,
  },
  {
    id: "amenities",
    title: "Parking & Property",
    column: "amenities",
    options: AMENITIES_OPTIONS,
  },
] as const;

/** All canonical feature strings across all 7 categories (excluding house rules) */
export const ALL_CANONICAL_FEATURES: readonly string[] = [
  ...AMENITIES_OPTIONS,
  ...UTILITIES_OPTIONS,
  ...ROOM_FEATURES_OPTIONS,
  ...BATHROOM_FEATURES_OPTIONS,
  ...KITCHEN_FEATURES_OPTIONS,
  ...LAUNDRY_FEATURES_OPTIONS,
  ...SAFETY_FEATURES_OPTIONS,
];

export type CanonicalFeature = (typeof ALL_CANONICAL_FEATURES)[number];
export type CanonicalHouseRule = StandardHouseRule;
