import { z } from "zod";

/**
 * Validation rules for a single listing. Used by:
 * - the add/edit listing form (client-side, via React Hook Form's zodResolver)
 * - the server action / route handler that saves it (server-side re-check)
 * One schema, two enforcement points — never trust client-only validation.
 */
export const listingSchema = z.object({
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
  // Populated by a map-picker later (Phase 2). Optional for MVP.
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contact_info: z.string().min(3, "How should renters reach you?"),
  availability_status: z
    .enum(["available", "almost_full", "fully_occupied"])
    .default("available"),
});

export type ListingInput = z.infer<typeof listingSchema>;
