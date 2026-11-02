import { z } from "zod";

/**
 * Shared building blocks for profiles (Rule 2: one schema per entity).
 */
export const fullNameSchema = z.string().min(1, "Full name is required");

// A PH mobile number in the form it's saved: 09, then 9 more digits
// (09171234567). The profile forms show it as +63 and the 10 digits
// after it, which start with 9 (+63 917 123 4567), and save "0" + those
// 10 digits (src/lib/ph-mobile-number.ts, #225).
export const phMobileNumberPattern = /^09\d{9}$/;
export const phMobileNumberMessage =
  "Enter your mobile number: +63 and then 10 digits starting with 9 (e.g. +63 917 123 4567)";

export const phMobileNumberSchema = z
  .string()
  .regex(phMobileNumberPattern, phMobileNumberMessage);

export const optionalPhMobileNumberSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => !val || phMobileNumberPattern.test(val),
    phMobileNumberMessage,
  );

export const GENDERS = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;

export type Gender = (typeof GENDERS)[number];

export const OCCUPATION_STATUSES = [
  "Student",
  "Worker",
  "Student & Worker",
  "Other",
] as const;

export type OccupationStatus = (typeof OCCUPATION_STATUSES)[number];

/**
 * A complete landlord profile: what a landlord has to fill in before they
 * can post listings (S1-15.3, #201). Used by:
 * - the profile forms, through profileSetupSchema below
 * - createListingAction, which checks the landlord's saved profile against
 *   it first (src/lib/auth/can-create-listings.ts)
 *
 * The listings insert policy in
 * supabase/migrations/0012_require_ph_mobile_number_for_new_listings.sql
 * checks the same three rules in SQL. Change both together: if this schema
 * and the policy disagree, landlords get errors the app can't explain.
 */
export const landlordProfileSchema = z
  .object({
    full_name: fullNameSchema,
    contact_number: phMobileNumberSchema,
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

/**
 * What the renter profile setup form validates (S2-01, #78, #82, #83):
 * Name, email, and gender are required. Contact number and occupation status
 * are optional.
 */
export const renterProfileSchema = z.object({
  full_name: fullNameSchema,
  email: z.string().email("Valid email is required"),
  gender: z.enum(GENDERS, {
    message: "Gender is required",
  }),
  contact_number: optionalPhMobileNumberSchema,
  occupation_status: z
    .union([z.enum(OCCUPATION_STATUSES), z.literal(""), z.null()])
    .optional()
    .transform((val) => (val === "" || val === null ? undefined : val)),
});

export type RenterProfileInput = z.infer<typeof renterProfileSchema>;
