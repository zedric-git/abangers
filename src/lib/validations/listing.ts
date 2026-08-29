import { z } from "zod";

/**
 * Validation rules for a single listing. Used by:
 * - the add/edit listing form (client-side, via React Hook Form's zodResolver)
 * - the server action / route handler that saves it (server-side re-check)
 * One schema, two enforcement points — never trust client-only validation.
 */
export const listingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  monthly_rent: z.coerce.number().positive("Rent must be a positive amount"),
  available_rooms: z.coerce
    .number()
    .int()
    .nonnegative("Available rooms can't be negative"),
  amenities: z.array(z.string()).default([]),
  house_rules: z.string().max(2000).optional(),
  address: z.string().min(5, "Address is required"),
  // Populated by a map-picker later (Phase 2). Optional for MVP.
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contact_info: z.string().min(3, "How should renters reach you?"),
  availability_status: z.enum(["available", "almost_full", "fully_occupied"]),
});

export type ListingInput = z.infer<typeof listingSchema>;
