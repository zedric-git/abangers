import { z } from "zod";

/**
 * A complete landlord profile: what a landlord has to fill in before they
 * can post listings (S1-15.3, #201). Used by:
 * - the profile forms, through profileSetupSchema below
 * - createListingAction, which checks the landlord's saved profile against
 *   it first (src/lib/auth/can-create-listings.ts)
 *
 * The listings insert policy in
 * supabase/migrations/0011_readable_listings_insert_policy.sql
 * checks the same three rules in SQL. Change both together: if this schema
 * and the policy disagree, landlords get errors the app can't explain.
 */
export const landlordProfileSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    contact_number: z
      .string()
      .regex(
        /^\d{11}$/,
        "Contact number must be exactly 11 digits (e.g. 09171234567)",
      ),
    facebook_url: z.string().optional(),
    instagram_url: z.string().optional(),
    x_url: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.facebook_url?.trim()) ||
      Boolean(data.instagram_url?.trim()) ||
      Boolean(data.x_url?.trim()),
    {
      message:
        "Please provide at least one social media link (Facebook, Instagram, or X)",
      path: ["facebook_url"],
    },
  );

export type LandlordProfileInput = z.infer<typeof landlordProfileSchema>;

/**
 * What the profile forms (ProfileSetupModal, LandlordProfileForm) validate:
 * the complete-profile rules above, plus the email. The forms fill the
 * email in from the login and show it read-only, so it isn't part of
 * "complete" (and the database doesn't check it).
 */
export const profileSetupSchema = landlordProfileSchema.extend({
  email: z.string().email("Valid email is required"),
});

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
