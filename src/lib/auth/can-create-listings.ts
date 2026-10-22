import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { landlordProfileSchema } from "@/lib/validations/profile";

/**
 * Decides whether a signed-in user may create a NEW listing (S1-15.3,
 * #201), and if not, what to tell them. Used by createListingAction.
 *
 * The database enforces this rule: the listings insert policy in
 * supabase/migrations/0012_require_ph_mobile_number_for_new_listings.sql.
 * The app checks the same rule first, because RLS only answers "42501"
 * whatever is missing, while this tells the landlord which step to do.
 * A user can create listings when:
 *   1. their profiles row has role = 'landlord',
 *   2. their profile is complete: landlordProfileSchema, the same three
 *      rules the policy checks in SQL, and
 *   3. they're verified: at least one landlord_verifications row with
 *      status = 'approved' (0008).
 * Editing existing listings doesn't go through this: those stay editable.
 */

/** The profiles columns the rule reads. */
export type ListingProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "role"
  | "full_name"
  | "contact_number"
  | "facebook_url"
  | "instagram_url"
  | "x_url"
>;

export type CannotCreateListingsReason =
  | "not_landlord"
  | "profile_incomplete"
  | "verification_pending"
  | "verification_rejected"
  | "not_verified"
  | "check_failed";

export type CanCreateListingsResult =
  | { ok: true }
  | { ok: false; reason: CannotCreateListingsReason; message: string };

const MESSAGES: Record<CannotCreateListingsReason, string> = {
  not_landlord: "Only landlord accounts can create listings.",
  profile_incomplete:
    "Complete your profile before posting a listing: add your mobile number and at least one social media link on your Profile page.",
  verification_pending:
    "Your account verification is still being reviewed. You can post listings once it's approved.",
  verification_rejected:
    "Your account verification was rejected. Check the reason on your Profile page and submit again.",
  not_verified:
    "Verify your account before posting a listing: upload a valid ID and take a selfie on your Profile page.",
  check_failed:
    "We couldn't check whether your account can post listings. Please try again in a moment.",
};

/**
 * For when the insert itself comes back 42501 (the policy refused it)
 * even though the check passed, e.g. the profile changed in between.
 * Like most of the messages above, it sends the landlord to their Profile
 * page, so createListingAction sets fixOnProfilePage with it (#221).
 */
export const CANNOT_CREATE_LISTINGS_MESSAGE =
  "You can't post listings yet: your profile must be complete and your account verified. Check your Profile page, then try again.";

/**
 * Whether the landlord fixes each reason on their Profile page, which is
 * where its message sends them. When it's true, the listing form's error
 * card links there (#221). A Record, so whoever adds a reason has to
 * decide this too.
 */
const FIXED_ON_PROFILE_PAGE: Record<CannotCreateListingsReason, boolean> = {
  not_landlord: false,
  profile_incomplete: true,
  // Nothing to do but wait for the review.
  verification_pending: false,
  verification_rejected: true,
  not_verified: true,
  // The check couldn't read the database: trying again is the fix.
  check_failed: false,
};

export function isFixedOnProfilePage(
  reason: CannotCreateListingsReason,
): boolean {
  return FIXED_ON_PROFILE_PAGE[reason];
}

function cannotCreate(
  reason: CannotCreateListingsReason,
): CanCreateListingsResult {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/**
 * The message for a reason, for a page that shows one without running
 * the check itself, e.g. the new-listing page when it couldn't read the
 * landlord's status (#205).
 */
export function cannotCreateListingsMessage(
  reason: CannotCreateListingsReason,
): string {
  return MESSAGES[reason];
}

/**
 * True when a saved profile passes landlordProfileSchema. The database
 * returns null for empty columns; the schema expects a string, or
 * undefined for the optional social links.
 */
export function isProfileComplete(profile: ListingProfile): boolean {
  return landlordProfileSchema.safeParse({
    full_name: profile.full_name ?? "",
    contact_number: profile.contact_number ?? "",
    facebook_url: profile.facebook_url ?? undefined,
    instagram_url: profile.instagram_url ?? undefined,
    x_url: profile.x_url ?? undefined,
  }).success;
}

/**
 * The decision itself, without any database calls (unit-tested in
 * can-create-listings.test.ts).
 * - `profile`: the user's profiles row, or null if they have none.
 * - `verificationStatuses`: the status of each of their
 *   landlord_verifications rows, in any order.
 */
export function decideCanCreateListings(
  profile: ListingProfile | null,
  verificationStatuses: string[],
): CanCreateListingsResult {
  // No profiles row at all: saving the Profile page creates it, so point
  // them there rather than saying they aren't a landlord.
  if (!profile) {
    return cannotCreate("profile_incomplete");
  }
  if (profile.role !== "landlord") {
    return cannotCreate("not_landlord");
  }
  if (!isProfileComplete(profile)) {
    return cannotCreate("profile_incomplete");
  }

  // "Verified" = any approved submission, exactly like the policy. A
  // landlord can't have a pending and an approved one at the same time
  // (0008's unique index), so the order of these checks is only about
  // which message to show.
  if (verificationStatuses.includes("approved")) {
    return { ok: true };
  }
  if (verificationStatuses.includes("pending")) {
    return cannotCreate("verification_pending");
  }
  if (verificationStatuses.includes("rejected")) {
    return cannotCreate("verification_rejected");
  }
  return cannotCreate("not_verified");
}

/**
 * Loads the user's profile and verification statuses, then decides. Both
 * reads go through RLS as the user: anyone signed in can read profiles,
 * and a landlord can read their own verification rows (0008).
 */
export async function checkCanCreateListings(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CanCreateListingsResult> {
  const [profileResult, verificationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "role, full_name, contact_number, facebook_url, instagram_url, x_url",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("landlord_verifications")
      .select("status")
      .eq("landlord_id", userId),
  ]);

  if (profileResult.error || verificationsResult.error) {
    return cannotCreate("check_failed");
  }

  return decideCanCreateListings(
    profileResult.data,
    verificationsResult.data.map((row) => row.status),
  );
}
