import { z } from "zod";
import {
  PROPERTY_TYPES,
  OCCUPANCY_TYPES,
  GENDER_POLICIES,
  type PropertyType,
  type OccupancyType,
  type GenderPolicy,
} from "@/lib/validations/listing";

/**
 * URL query parameters schema for listing search & core attribute filters (S2-05, #15, #89, #90).
 *
 * Safely parses and sanitizes:
 * - `q`: keyword search term (trimmed, max 100 chars, defaults to "")
 * - `max_rent`: positive number (ignores malformed values like "abc", 0, or negative numbers)
 * - `property_type`: matches PROPERTY_TYPES (ignores unrecognized values)
 * - `occupancy`: matches OCCUPANCY_TYPES (ignores unrecognized values)
 * - `gender`: matches GENDER_POLICIES (ignores unrecognized values)
 */
export const listingFilterParamsSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined).default(""),
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
});

export type ListingFilterParams = {
  q: string;
  max_rent?: number;
  property_type?: PropertyType;
  occupancy?: OccupancyType;
  gender?: GenderPolicy;
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

  const parsed = listingFilterParamsSchema.safeParse({
    q: getFirst("q"),
    max_rent: getFirst("max_rent"),
    property_type: getFirst("property_type"),
    occupancy: getFirst("occupancy"),
    gender: getFirst("gender"),
  });

  if (!parsed.success) {
    return { q: "" };
  }

  return {
    q: parsed.data.q,
    max_rent: parsed.data.max_rent,
    property_type: parsed.data.property_type,
    occupancy: parsed.data.occupancy,
    gender: parsed.data.gender,
  };
}
