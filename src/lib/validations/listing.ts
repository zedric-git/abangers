import { z } from "zod";
import type { Listing } from "@/types/listing";

/**
 * The only values the listings.availability_status CHECK constraint
 * (0001_init.sql) accepts. The listing schema, parseAvailabilityStatus
 * and updateListingStatusAction all use this one list.
 */
export const AVAILABILITY_STATUSES = [
  "available",
  "almost_full",
  "fully_occupied",
] as const;

export const availabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);

export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

/**
 * Each listing field's own rules. listingSchema below adds the rules
 * that compare fields. Zod 4 can't .extend, .pick or .omit a schema
 * after .refine, so build any variant from this one.
 */
const listingFieldsSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  monthly_rent: z.coerce.number().positive("Rent must be a positive amount"),
  total_rooms: z.coerce.number().int().min(1, "Total rooms must be at least 1"),
  available_rooms: z.coerce
    .number()
    .int()
    .nonnegative("Available rooms can't be negative"),
  property_type: z.string().min(1, "Property type is required"),
  occupancy_type: z.string().min(1, "Occupancy type is required"),
  allowed_gender: z.string().min(1, "Allowed gender policy is required"),
  amenities: z.array(z.string()).default([]),
  utilities: z.array(z.string()).default([]),
  room_features: z.array(z.string()).default([]),
  bathroom_features: z.array(z.string()).default([]),
  kitchen_features: z.array(z.string()).default([]),
  laundry_features: z.array(z.string()).default([]),
  safety_features: z.array(z.string()).default([]),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  house_rules: z
    .string()
    .max(2000, "House rules cannot exceed 2000 characters")
    .optional(),
  images: z
    .array(z.string())
    .min(1, "At least one photo is required before a listing can be published"),
  cover_image: z.string().min(1, "A cover photo is required"),
  latitude: z
    .number({
      message: "Pinning your property location on the map is required",
    })
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),
  longitude: z
    .number({
      message: "Pinning your property location on the map is required",
    })
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  contact_info: z.string().min(3, "How should renters reach you?"),
  availability_status: availabilityStatusSchema.default("available"),
});

// Just the two room numbers, to tell whether both are valid on their own.
const roomCountsSchema = listingFieldsSchema.pick({
  total_rooms: true,
  available_rooms: true,
});

/**
 * Validation rules for a single listing. Used by:
 * - the add/edit listing form (client-side, via React Hook Form's zodResolver)
 * - the server action / route handler that saves it (server-side re-check)
 * One schema, two enforcement points — never trust client-only validation.
 */
export const listingSchema = listingFieldsSchema.refine(
  // A place can't have more rooms free than it has rooms (#231).
  (listing) => listing.available_rooms <= listing.total_rooms,
  {
    message: "Available rooms can't be more than total rooms",
    // Shown under Available Rooms in the form.
    path: ["available_rooms"],
    // By default Zod skips this check while another field is still
    // invalid (e.g. the map pin isn't set yet), so the landlord would only
    // see it after fixing everything else. Run it whenever both room
    // numbers are valid, so it shows up together with the other errors.
    when: (payload) => roomCountsSchema.safeParse(payload.value).success,
  },
);

export type ListingInput = z.infer<typeof listingSchema>;

/**
 * The database stores availability_status as text with a CHECK
 * constraint, so the generated type is plain `string`. This narrows it
 * to the three allowed values, falling back to "available".
 */
export function parseAvailabilityStatus(
  value: string | null | undefined,
): AvailabilityStatus {
  const result = availabilityStatusSchema.safeParse(value);
  return result.success ? result.data : "available";
}

/**
 * Converts a database row into the shape the listing form and
 * ListingDetailView use. The database returns `null` for empty optional
 * columns; the form expects `undefined` / empty values instead.
 * Values are passed through as-is — no defaults are invented here.
 */
export function listingRowToFormValues(row: Listing): Partial<ListingInput> {
  return {
    title: row.title,
    address: row.address,
    city: row.city ?? undefined,
    monthly_rent: row.monthly_rent,
    total_rooms: row.total_rooms ?? undefined,
    available_rooms: row.available_rooms,
    property_type: row.property_type ?? undefined,
    occupancy_type: row.occupancy_type ?? undefined,
    allowed_gender: row.allowed_gender ?? undefined,
    amenities: row.amenities,
    utilities: row.utilities ?? [],
    room_features: row.room_features ?? [],
    bathroom_features: row.bathroom_features ?? [],
    kitchen_features: row.kitchen_features ?? [],
    laundry_features: row.laundry_features ?? [],
    safety_features: row.safety_features ?? [],
    description: row.description ?? undefined,
    house_rules: row.house_rules ?? undefined,
    images: row.images ?? [],
    cover_image: row.cover_image ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    contact_info: row.contact_info,
    availability_status: parseAvailabilityStatus(row.availability_status),
  };
}
