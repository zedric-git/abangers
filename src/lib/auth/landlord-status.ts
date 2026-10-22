import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  decideCanCreateListings,
  isProfileComplete,
  type ListingProfile,
} from "@/lib/auth/can-create-listings";
import {
  verificationStatusOf,
  type VerificationStatus,
} from "@/lib/auth/submit-verification";

/**
 * Where a landlord stands (S1-15.7, #205): is their profile complete, how
 * far along is their verification, and can they post a new listing? The
 * landlord dashboard shows it in several places, all from this one answer:
 *   - the banner on the dashboard, My Posted Listings and Profile pages
 *     (Not verified, Pending, or Rejected with the admin's reason);
 *   - the badge in the Profile page's header;
 *   - the lock on Add New Listing, and the checklist the new-listing page
 *     shows instead of the form;
 *   - the Profile page's read-only name once the landlord is verified.
 * What each of those says is in src/lib/landlord-status-view.ts.
 *
 * NO NEW RULES HERE. "Complete" is isProfileComplete, the verification
 * status is verificationStatusOf, and "can post" is decideCanCreateListings,
 * the same check createListingAction runs before saving. The database
 * enforces all of it anyway (the listings insert policy in 0012, and 0008's
 * name lock); this only tells the landlord up front.
 *
 * Each page loads it itself, not the shared landlord layout: Next doesn't
 * re-render a layout when moving between pages, so a status shown there
 * could be out of date.
 */

/** The landlord_verifications columns this file reads, one row per submission. */
export type VerificationRow = Pick<
  Database["public"]["Tables"]["landlord_verifications"]["Row"],
  "status" | "rejection_reason" | "submitted_at"
>;

export interface LandlordStatus {
  /** verified, pending, rejected or not_verified (#204). */
  verification: VerificationStatus;
  /**
   * Why the admin rejected their newest submission. Only set when
   * `verification` is "rejected": once there's a newer pending or approved
   * submission, an old rejection doesn't matter any more.
   */
  rejectionReason: string | null;
  /** Their profile passes landlordProfileSchema (a name, a PH mobile number, one social link). */
  profileComplete: boolean;
  /** They may create a new listing: a landlord with a complete profile who is verified. */
  canCreateListings: boolean;
  /** The name on their profile, or null if it's empty. */
  fullName: string | null;
}

/**
 * The reason on their newest rejected submission. The rows can come in
 * any order, so this compares the submission times itself.
 */
function newestRejectionReason(
  verifications: VerificationRow[],
): string | null {
  let newest: VerificationRow | null = null;
  for (const row of verifications) {
    if (
      row.status === "rejected" &&
      (newest === null ||
        Date.parse(row.submitted_at) > Date.parse(newest.submitted_at))
    ) {
      newest = row;
    }
  }
  // 0008 makes sure every rejection has a reason; this is just in case.
  return newest?.rejection_reason?.trim() || null;
}

/**
 * The decision itself, without any database calls (unit-tested in
 * landlord-status.test.ts).
 * - `profile`: the landlord's profiles row, or null if they have none.
 * - `verifications`: their landlord_verifications rows, in any order.
 */
export function decideLandlordStatus(
  profile: ListingProfile | null,
  verifications: VerificationRow[],
): LandlordStatus {
  const statuses = verifications.map((row) => row.status);
  const verification = verificationStatusOf(statuses);

  return {
    verification,
    rejectionReason:
      verification === "rejected" ? newestRejectionReason(verifications) : null,
    profileComplete: profile !== null && isProfileComplete(profile),
    canCreateListings: decideCanCreateListings(profile, statuses).ok,
    fullName: profile?.full_name?.trim() || null,
  };
}

/**
 * Loads the landlord's profile and verification rows, then decides. Both
 * reads go through RLS as the landlord: anyone signed in can read
 * profiles, and a landlord can read their own verification rows,
 * rejection_reason included (0008).
 *
 * Returns null if either read fails. The pages then show less (no banner,
 * an unlocked Add New Listing) rather than an error, and the new-listing
 * page says it couldn't check.
 */
export async function loadLandlordStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<LandlordStatus | null> {
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
      .select("status, rejection_reason, submitted_at")
      .eq("landlord_id", userId),
  ]);

  if (profileResult.error || verificationsResult.error) {
    // So a failed read shows up in the server's output; the page itself
    // just leaves the status out.
    console.error(
      "Landlord status read error:",
      profileResult.error ?? verificationsResult.error,
    );
    return null;
  }

  return decideLandlordStatus(profileResult.data, verificationsResult.data);
}
