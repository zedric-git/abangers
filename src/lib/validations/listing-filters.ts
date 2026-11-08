import { z } from "zod";
import {
  PROPERTY_TYPES,
  OCCUPANCY_TYPES,
  GENDER_POLICIES,
  type PropertyType,
  type OccupancyType,
  type GenderPolicy,
} from "@/lib/validations/listing";

export const FILTER_DISTANCE_OPTIONS = [
  "Within 500m",
  "Within 1 km",
  "Within 2 km",
  "Within 5 km",
] as const;

export const FILTER_UTILITIES_OPTIONS = [
  "Wi-Fi Included",
  "Water Included",
  "Electricity Included",
] as const;

export const FILTER_ROOM_FEATURES_OPTIONS = [
  "Air Conditioning",
  "Electric Fan",
  "Bed Provided",
  "Cabinet/Wardrobe",
  "Table/Desk",
  "Chair",
] as const;

export const FILTER_BATHROOM_OPTIONS = [
  "Private Bathroom/CR",
  "Shared Bathroom/CR",
] as const;

export const FILTER_KITCHEN_OPTIONS = [
  "Has Kitchen",
  "Cooking Allowed",
] as const;

export const FILTER_LAUNDRY_OPTIONS = [
  "Has Laundry Area",
  "Has Washing Machine",
] as const;

export const FILTER_SAFETY_OPTIONS = [
  "CCTV",
  "Gated Property",
  "Security Guard",
  "Secure/Individual Door Lock",
] as const;

export const FILTER_HOUSE_RULES_OPTIONS = [
  "Cooking Allowed",
  "Visitors Allowed",
  "Pets Allowed",
  "No Curfew",
  "Smoking Allowed",
] as const;

const arrayStringsSchema = z
  .array(z.string().trim().min(1))
  .optional()
  .catch(undefined);

/**
 * URL query parameters schema for listing search & filters matching .Abangers UI specification (S2-05, #15, #89, #90).
 */
export const listingFilterParamsSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined).default(""),
  min_rent: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const num = Number(val);
      return Number.isFinite(num) && num > 0 ? num : undefined;
    }, z.number().positive().optional())
    .optional()
    .catch(undefined),
  max_rent: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const num = Number(val);
      return Number.isFinite(num) && num > 0 ? num : undefined;
    }, z.number().positive().optional())
    .optional()
    .catch(undefined),
  property_type: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  occupancy: z.enum(OCCUPANCY_TYPES).optional().catch(undefined),
  gender: z.enum(GENDER_POLICIES).optional().catch(undefined),
  near: z.string().trim().max(100).optional().catch(undefined),
  distance: z.string().trim().max(50).optional().catch(undefined),
  parking: z
    .preprocess((val) => {
      if (val === true || val === "true" || val === "1") return true;
      return undefined;
    }, z.boolean().optional())
    .optional()
    .catch(undefined),
  utilities: arrayStringsSchema,
  room_features: arrayStringsSchema,
  bathroom: arrayStringsSchema,
  kitchen: arrayStringsSchema,
  laundry: arrayStringsSchema,
  safety: arrayStringsSchema,
  house_rules: arrayStringsSchema,
});

export type ListingFilterParams = {
  q: string;
  min_rent?: number;
  max_rent?: number;
  property_type?: PropertyType;
  occupancy?: OccupancyType;
  gender?: GenderPolicy;
  near?: string;
  distance?: string;
  parking?: boolean;
  utilities?: string[];
  room_features?: string[];
  bathroom?: string[];
  kitchen?: string[];
  laundry?: string[];
  safety?: string[];
  house_rules?: string[];
};

/**
 * Normalizes input from various sources (Next.js searchParams, URLSearchParams, or plain objects)
 * into a clean ListingFilterParams object with safe defaults.
 */
export function parseListingFilterParams(
  rawParams: unknown,
): ListingFilterParams {
  if (!rawParams || typeof rawParams !== "object") {
    return { q: "" };
  }

  const getFirst = (key: string): unknown => {
    if (
      rawParams &&
      typeof (rawParams as { get?: unknown }).get === "function"
    ) {
      return (
        (rawParams as { get: (k: string) => string | null }).get(key) ??
        undefined
      );
    }
    const val = (rawParams as Record<string, unknown>)[key];
    if (Array.isArray(val)) {
      return val[0];
    }
    return val;
  };

  const getList = (key: string): string[] | undefined => {
    if (
      rawParams &&
      typeof (rawParams as { getAll?: unknown }).getAll === "function"
    ) {
      const list = (rawParams as { getAll: (k: string) => string[] }).getAll(
        key,
      );
      if (list && list.length > 0) {
        const flattened = list
          .flatMap((s) => s.split(","))
          .map((s) => s.trim())
          .filter(Boolean);
        return flattened.length > 0 ? flattened : undefined;
      }
    }
    const val = (rawParams as Record<string, unknown>)[key];
    if (Array.isArray(val)) {
      const flattened = val
        .flatMap((v) => (typeof v === "string" ? v.split(",") : []))
        .map((s) => s.trim())
        .filter(Boolean);
      return flattened.length > 0 ? flattened : undefined;
    }
    if (typeof val === "string") {
      const split = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return split.length > 0 ? split : undefined;
    }
    return undefined;
  };

  const parsed = listingFilterParamsSchema.safeParse({
    q: getFirst("q"),
    min_rent: getFirst("min_rent"),
    max_rent: getFirst("max_rent"),
    property_type: getFirst("property_type"),
    occupancy: getFirst("occupancy"),
    gender: getFirst("gender"),
    near: getFirst("near"),
    distance: getFirst("distance"),
    parking: getFirst("parking"),
    utilities: getList("utilities"),
    room_features: getList("room_features"),
    bathroom: getList("bathroom"),
    kitchen: getList("kitchen"),
    laundry: getList("laundry"),
    safety: getList("safety"),
    house_rules: getList("house_rules"),
  });

  if (!parsed.success) {
    return { q: "" };
  }

  return {
    q: parsed.data.q,
    min_rent: parsed.data.min_rent,
    max_rent: parsed.data.max_rent,
    property_type: parsed.data.property_type,
    occupancy: parsed.data.occupancy,
    gender: parsed.data.gender,
    near: parsed.data.near,
    distance: parsed.data.distance,
    parking: parsed.data.parking,
    utilities: parsed.data.utilities,
    room_features: parsed.data.room_features,
    bathroom: parsed.data.bathroom,
    kitchen: parsed.data.kitchen,
    laundry: parsed.data.laundry,
    safety: parsed.data.safety,
    house_rules: parsed.data.house_rules,
  };
}
