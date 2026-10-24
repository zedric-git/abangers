import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { lookupListing } from "@/lib/listing-lookup";
import {
  VERIFICATION_BUCKET,
  type VerificationPhotoName,
} from "@/lib/auth/submit-verification";
import {
  verificationReviewSchema,
  type VerificationReviewInput,
} from "@/lib/validations/verification";

/**
 * The admin's review of landlord verifications (S2-11.2, #256): the list
 * of submissions waiting for review, one submission with its photos, and
 * approving or rejecting it. Used by the admin dashboard's pages and by
 * reviewVerificationAction (src/app/dashboard/admin/verifications/actions.ts).
 *
 * WHO ENFORCES WHAT: the database, whatever the app sends (0014). Only an
 * admin can read other landlords' submissions and their files, and only an
 * admin can change a submission, only while it's pending, only to approved
 * or rejected, with themselves as reviewed_by. This file checks the same
 * things first only to tell the admin clearly what went wrong.
 *
 * Every read and write goes through RLS as the signed-in admin: no service
 * key (AGENTS.md, rule 3).
 */

/**
 * How long a signed link to an ID photo or selfie works: 10 minutes. The
 * review page shows the photos straight away; the link only matters again
 * when the admin opens a photo full size later.
 */
export const SIGNED_LINK_SECONDS = 10 * 60;

/** The foreign key that names the landlord in a PostgREST join. */
const LANDLORD = "profiles!landlord_verifications_landlord_id_fkey";

// ── The list of submissions waiting for review ──────────────────────

/** One row of the pending list. */
export interface PendingVerification {
  id: string;
  /** As saved: one of ID_TYPES (0008's CHECK makes sure). */
  idType: string;
  submittedAt: string;
  landlordName: string | null;
  landlordEmail: string | null;
}

export type PendingVerificationsResult =
  { ok: true; items: PendingVerification[] } | { ok: false };

/**
 * The submissions waiting for review, oldest first (first come, first
 * served), each with its landlord's name and email. Returns ok: false if
 * the read failed, so the page can say so rather than "nothing waiting".
 */
export async function loadPendingVerifications(
  supabase: SupabaseClient<Database>,
): Promise<PendingVerificationsResult> {
  const { data, error } = await supabase
    .from("landlord_verifications")
    .select(`id, id_type, submitted_at, landlord:${LANDLORD}(full_name, email)`)
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("Pending verifications read error:", error);
    return { ok: false };
  }

  return {
    ok: true,
    items: data.map((row) => ({
      id: row.id,
      idType: row.id_type,
      submittedAt: row.submitted_at,
      landlordName: row.landlord?.full_name?.trim() || null,
      landlordEmail: row.landlord?.email?.trim() || null,
    })),
  };
}

// ── One submission, for the review page ─────────────────────────────

/** The landlord's profile, as the review page shows it. */
export interface ReviewLandlord {
  fullName: string | null;
  email: string | null;
  /** As saved: 09 + 9 digits (src/lib/ph-mobile-number.ts). */
  contactNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
}

export interface SubmissionForReview {
  id: string;
  landlordId: string;
  idType: string;
  submittedAt: string;
  landlord: ReviewLandlord;
}

/** One photo of a submission, with its short-lived signed link. */
export interface ReviewPhoto {
  name: VerificationPhotoName;
  url: string;
}

export type ReviewPageData =
  /** Not there: deleted, or the id in the URL isn't a submission. */
  | { kind: "missing" }
  /** Already approved or rejected: there's nothing left to decide. */
  | { kind: "reviewed" }
  /** The read itself failed: it may well be there. */
  | { kind: "failed" }
  | {
      kind: "found";
      submission: SubmissionForReview;
      /** null when the signed links couldn't be made. */
      photos: ReviewPhoto[] | null;
    };

/** The columns the review page reads. */
type SubmissionRow = Pick<
  Database["public"]["Tables"]["landlord_verifications"]["Row"],
  "id_front_path" | "id_back_path" | "selfie_path"
>;

/**
 * A submission's photos in the order the review page shows them: the
 * front (a passport's photo page), the back (not for a passport), the
 * selfie.
 */
export function photoPathsOf(
  row: SubmissionRow,
): { name: VerificationPhotoName; path: string }[] {
  const photos: { name: VerificationPhotoName; path: string }[] = [
    { name: "id-front", path: row.id_front_path },
  ];
  if (row.id_back_path) {
    photos.push({ name: "id-back", path: row.id_back_path });
  }
  photos.push({ name: "selfie", path: row.selfie_path });
  return photos;
}

/**
 * The photos with their signed links, or null if any link is missing:
 * the page then says the photos couldn't be loaded, and the admin can't
 * approve without seeing them. `links` is what Storage's createSignedUrls
 * returned for those paths, in the same order.
 */
export function photosWithLinks(
  photos: { name: VerificationPhotoName; path: string }[],
  links: { error: string | null; signedUrl: string | null }[] | null,
): ReviewPhoto[] | null {
  if (!links || links.length !== photos.length) {
    return null;
  }

  const withLinks: ReviewPhoto[] = [];
  for (const [index, photo] of photos.entries()) {
    const link = links[index];
    if (link.error || !link.signedUrl) {
      return null;
    }
    withLinks.push({ name: photo.name, url: link.signedUrl });
  }
  return withLinks;
}

/**
 * One submission with its landlord's profile and short-lived signed links
 * to its photos, made with the admin's own session (0014's read policy on
 * the verification-documents bucket).
 */
export async function loadSubmissionForReview(
  supabase: SupabaseClient<Database>,
  submissionId: string,
): Promise<ReviewPageData> {
  // maybeSingle, not single: "no such submission" is no row, not an error,
  // so it can't be mixed up with a query that failed (#244). lookupListing
  // sorts any row out that way, not only listings.
  const result = await supabase
    .from("landlord_verifications")
    .select(
      `id, landlord_id, id_type, id_front_path, id_back_path, selfie_path, status, submitted_at, landlord:${LANDLORD}(full_name, email, contact_number, facebook_url, instagram_url, x_url)`,
    )
    .eq("id", submissionId)
    .maybeSingle();
  const lookup = lookupListing(result);

  if (lookup.kind === "missing") {
    return { kind: "missing" };
  }
  if (lookup.kind === "failed") {
    console.error("Verification read error:", lookup.error);
    return { kind: "failed" };
  }

  const row = lookup.listing;
  if (row.status !== "pending") {
    return { kind: "reviewed" };
  }

  const photos = photoPathsOf(row);
  const { data: links, error: linkError } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrls(
      photos.map((photo) => photo.path),
      SIGNED_LINK_SECONDS,
    );
  if (linkError) {
    console.error("Verification photo links error:", linkError);
  }

  return {
    kind: "found",
    submission: {
      id: row.id,
      landlordId: row.landlord_id,
      idType: row.id_type,
      submittedAt: row.submitted_at,
      landlord: {
        fullName: row.landlord?.full_name?.trim() || null,
        email: row.landlord?.email?.trim() || null,
        contactNumber: row.landlord?.contact_number ?? null,
        facebookUrl: row.landlord?.facebook_url?.trim() || null,
        instagramUrl: row.landlord?.instagram_url?.trim() || null,
        xUrl: row.landlord?.x_url?.trim() || null,
      },
    },
    photos: photosWithLinks(photos, linkError ? null : links),
  };
}

// ── Approving or rejecting ──────────────────────────────────────────

export type CannotReviewReason =
  | "not_signed_in"
  | "not_admin"
  | "check_failed"
  | "invalid_input"
  | "already_reviewed"
  | "not_allowed"
  | "save_failed";

export type ReviewVerificationResult =
  | { ok: true; decision: VerificationReviewInput["decision"] }
  | { ok: false; reason: CannotReviewReason; message: string };

const MESSAGES: Record<CannotReviewReason, string> = {
  not_signed_in:
    "You've been logged out. Log in again with your admin account, then try again.",
  not_admin: "Only admins can review verifications.",
  check_failed: "We couldn't check your account. Please try again in a moment.",
  // Normally the schema's own message is shown instead (it says what's
  // wrong); this is only the fallback.
  invalid_input: "Check your decision and try again.",
  already_reviewed:
    "This verification was already reviewed, or it no longer exists. Go back to the list to see what's waiting.",
  not_allowed:
    "You're not allowed to review this verification. Log in again with your admin account, then try again.",
  save_failed: "We couldn't save your decision. Please try again.",
};

/** The answer for a review that didn't go through. */
export function cannotReview(
  reason: CannotReviewReason,
  message = MESSAGES[reason],
): ReviewVerificationResult {
  return { ok: false, reason, message };
}

/**
 * What a review saves: exactly the four columns 0014 lets an admin
 * change. A rejection keeps its (trimmed) reason, which the landlord sees
 * (#205); an approval has none (0008's CHECK).
 */
export function reviewChanges(
  review: VerificationReviewInput,
  adminId: string,
  now: Date,
) {
  return {
    status: review.decision === "approve" ? "approved" : "rejected",
    rejection_reason: review.decision === "reject" ? review.reason : null,
    reviewed_at: now.toISOString(),
    reviewed_by: adminId,
  };
}

/** What a refused update means for the admin (error codes from 0014). */
export function reviewErrorReason(
  code: string | undefined,
): CannotReviewReason {
  switch (code) {
    case "42501": // RLS or the column grant: not an admin, or signed out
      return "not_allowed";
    case "23514": // 0008's CHECK: the schema should have caught it first
      return "invalid_input";
    default:
      return "save_failed";
  }
}

/**
 * Approves or rejects one submission as the admin `adminId` (the
 * signed-in user). In order:
 *   1. checks they're an admin (profiles.role), for a clear message;
 *   2. checks the decision (verificationReviewSchema);
 *   3. saves it, only while the submission is still pending. No row back
 *      means another admin got there first, or it's gone.
 */
export async function reviewVerification(
  supabase: SupabaseClient<Database>,
  adminId: string,
  values: VerificationReviewInput,
): Promise<ReviewVerificationResult> {
  // 1. An admin? RLS refuses anyone else anyway (0014).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .maybeSingle();
  if (profileError) {
    console.error("Reviewer role read error:", profileError);
    return cannotReview("check_failed");
  }
  if (profile?.role !== "admin") {
    return cannotReview("not_admin");
  }

  // 2. The decision. A server action can be called with anything, so this
  //    check, not the form's, is the one that counts.
  const parsed = verificationReviewSchema.safeParse(values);
  if (!parsed.success) {
    return cannotReview("invalid_input", parsed.error.issues[0]?.message);
  }
  const review = parsed.data;

  // 3. Only while it's still pending: the same rule as 0014's policy, here
  //    so a second review matches no row instead of erroring.
  const { data: updated, error: updateError } = await supabase
    .from("landlord_verifications")
    .update(reviewChanges(review, adminId, new Date()))
    .eq("id", review.submissionId)
    .eq("status", "pending")
    .select("id")
    // maybeSingle, not single: no row back is an answer here, not an error.
    .maybeSingle();

  if (updateError) {
    console.error("Verification review save error:", updateError);
    return cannotReview(reviewErrorReason(updateError.code));
  }
  if (!updated) {
    return cannotReview("already_reviewed");
  }

  return { ok: true, decision: review.decision };
}
