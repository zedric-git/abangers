import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  verificationSubmissionSchema,
  type VerificationPhotoType,
  type VerificationSubmissionInput,
} from "@/lib/validations/verification";

/**
 * Submits a landlord's account verification (S1-15.6, #204): photos of a
 * government ID and a selfie, saved as Pending until an admin reviews them
 * (#207). Used by the Verify account page (#203).
 *
 * IT RUNS IN THE BROWSER, with the browser Supabase client: the photos go
 * straight to Supabase Storage, like ImageUploader's listing photos. Not
 * a server action: that would have to carry up to three 5 MB photos, but
 * Next caps a server action's request at 1 MB, and src/proxy.ts only
 * passes on the first 10 MB of a request. It wouldn't be any safer either:
 * the database and the bucket enforce every rule themselves (see "WHO
 * ENFORCES WHAT" in src/lib/validations/verification.ts).
 *
 * THE ORDER MATTERS. A landlord can't replace or delete a file once it's
 * uploaded (0009), or change or withdraw a submission once it's saved
 * (0008). So submitVerification:
 *   1. checks the form values (verificationSubmissionSchema)
 *   2. checks the landlord may submit (a landlord, not already pending,
 *      not already verified), before anything is uploaded
 *   3. makes a new submission id
 *   4. uploads the photos, one at a time, into a new folder for this
 *      submission (0009's layout):
 *        <landlord id>/<submission id>/id-front.jpg
 *        <landlord id>/<submission id>/id-back.jpg   (not for a passport)
 *        <landlord id>/<submission id>/selfie.jpg
 *      (.png or .webp for those types)
 *   5. only then saves the submission row, with that id, as pending
 * It stops at the first problem. If an upload or the save fails partway,
 * the photos already uploaded stay in the landlord's folder (only an
 * admin can remove them, #207), and trying again uses a new folder. Never
 * save the row first: a pending row whose photos are missing can't be
 * fixed, and it blocks the landlord from submitting again.
 */

export const VERIFICATION_BUCKET = "verification-documents";

/** The profiles column the check reads. */
export type VerificationProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "role"
>;

/** Where a landlord's verification stands (#205 shows these four). */
export type VerificationStatus =
  "verified" | "pending" | "rejected" | "not_verified";

export type CannotSubmitVerificationReason =
  | "invalid_input"
  | "not_landlord"
  | "profile_missing"
  | "already_pending"
  | "already_verified"
  | "check_failed"
  | "photo_too_big"
  | "wrong_photo_type"
  | "not_allowed"
  | "upload_failed"
  | "save_failed";

type CannotSubmitVerification = {
  ok: false;
  reason: CannotSubmitVerificationReason;
  message: string;
};

export type CanSubmitVerificationResult =
  { ok: true } | CannotSubmitVerification;

export type SubmitVerificationResult =
  { ok: true; submissionId: string } | CannotSubmitVerification;

const MESSAGES: Record<CannotSubmitVerificationReason, string> = {
  // Normally the schema's own message is shown instead (it says which
  // field is wrong); this is only the fallback.
  invalid_input:
    "Some details are missing or invalid. Check the form and try again.",
  not_landlord: "Only landlord accounts can verify their identity.",
  profile_missing:
    "We couldn't find your profile. Save your Profile page first, then verify your account.",
  already_pending:
    "Your verification is already being reviewed. You can only send a new one if it's rejected.",
  already_verified: "Your account is already verified.",
  check_failed:
    "We couldn't check your verification status. Please try again in a moment.",
  photo_too_big: "Each photo must be 5 MB or smaller.",
  wrong_photo_type: "Photos must be JPEG, PNG or WebP images.",
  not_allowed:
    "You're not allowed to send this verification. Log in again with your landlord account, then try again.",
  upload_failed:
    "We couldn't upload your photos. Check your internet connection and try again.",
  save_failed: "We couldn't save your verification. Please try again.",
};

function cannotSubmit(
  reason: CannotSubmitVerificationReason,
  message = MESSAGES[reason],
): CannotSubmitVerification {
  return { ok: false, reason, message };
}

/**
 * Sums up a landlord's submissions, given the status of each of their
 * landlord_verifications rows, in any order. "Verified" = any approved
 * submission, like the listings insert policy (0012). A landlord can't
 * have a pending and an approved one at the same time (0008's unique
 * index); after a rejection they can submit again, so older rejected rows
 * don't count once there's a newer pending or approved one.
 */
export function verificationStatusOf(statuses: string[]): VerificationStatus {
  if (statuses.includes("approved")) return "verified";
  if (statuses.includes("pending")) return "pending";
  if (statuses.includes("rejected")) return "rejected";
  return "not_verified";
}

/**
 * Whether the user may send a verification now, without any database
 * calls (unit-tested in submit-verification.test.ts).
 * - `profile`: their profiles row, or null if they have none.
 * - `verificationStatuses`: the status of each of their
 *   landlord_verifications rows, in any order.
 * The same rules as 0008's insert policy and unique index, checked first
 * so nothing is uploaded for a submission the database would refuse.
 */
export function decideCanSubmitVerification(
  profile: VerificationProfile | null,
  verificationStatuses: string[],
): CanSubmitVerificationResult {
  // Saving the Profile page creates a missing profiles row.
  if (!profile) {
    return cannotSubmit("profile_missing");
  }
  if (profile.role !== "landlord") {
    return cannotSubmit("not_landlord");
  }

  switch (verificationStatusOf(verificationStatuses)) {
    case "verified":
      return cannotSubmit("already_verified");
    case "pending":
      return cannotSubmit("already_pending");
    case "rejected":
    case "not_verified":
      // Nothing sent yet, or every submission was rejected: go ahead.
      return { ok: true };
  }
}

/**
 * Loads the landlord's role and verification statuses, then decides. Both
 * reads go through RLS as the landlord: anyone signed in can read
 * profiles, and a landlord can read their own verification rows (0008).
 * The Verify account page (#203) calls this when it loads, to show either
 * the form or why there's no need for it.
 */
export async function checkCanSubmitVerification(
  supabase: SupabaseClient<Database>,
  landlordId: string,
): Promise<CanSubmitVerificationResult> {
  const [profileResult, verificationsResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", landlordId).maybeSingle(),
    supabase
      .from("landlord_verifications")
      .select("status")
      .eq("landlord_id", landlordId),
  ]);

  if (profileResult.error || verificationsResult.error) {
    return cannotSubmit("check_failed");
  }

  return decideCanSubmitVerification(
    profileResult.data,
    verificationsResult.data.map((row) => row.status),
  );
}

/** Each photo's file extension, from its type. */
const EXTENSIONS: Record<VerificationPhotoType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** The photos of a submission, named as they are in the bucket. */
export type VerificationPhotoName = "id-front" | "id-back" | "selfie";

/**
 * Where a photo goes in the bucket:
 * <landlord id>/<submission id>/<name>.<jpg|png|webp>. The folder is what
 * the bucket's policies and 0008's CHECK look at: it must start with the
 * landlord's own id.
 */
export function verificationPhotoPath(
  landlordId: string,
  submissionId: string,
  name: VerificationPhotoName,
  photo: File,
): string {
  // The schema only lets those three types through.
  const extension = EXTENSIONS[photo.type as VerificationPhotoType];
  return `${landlordId}/${submissionId}/${name}.${extension}`;
}

/**
 * What a refused upload means for the landlord. Storage answers every
 * refused upload with HTTP 400 and puts the real code in the response,
 * which supabase-js gives as `error.statusCode`, a string (#213; see
 * AGENTS.md). `error.status` is always 400, so don't use it.
 */
export function uploadErrorReason(
  statusCode: string | undefined,
): CannotSubmitVerificationReason {
  switch (statusCode) {
    case "413": // over the bucket's 5 MB
      return "photo_too_big";
    case "415": // not a JPEG, PNG or WebP
      return "wrong_photo_type";
    case "403": // RLS: not a landlord, signed out, or not their folder
      return "not_allowed";
    default:
      // Includes "409" (a file is already there), which a new submission
      // id rules out, and network errors (no statusCode at all).
      return "upload_failed";
  }
}

/** What a refused insert means for the landlord (error codes from 0008). */
export function saveErrorReason(
  code: string | undefined,
): CannotSubmitVerificationReason {
  switch (code) {
    case "23505":
      // The one-open-submission index: a submission was sent in between,
      // e.g. from another tab.
      return "already_pending";
    case "42501": // RLS: not a landlord, or signed out
      return "not_allowed";
    default:
      return "save_failed";
  }
}

/**
 * Checks, uploads and saves a verification, in that order (see the top of
 * this file). `landlordId` is the signed-in user's id. Returns the new
 * submission's id, or why it wasn't sent.
 */
export async function submitVerification(
  supabase: SupabaseClient<Database>,
  landlordId: string,
  values: VerificationSubmissionInput,
): Promise<SubmitVerificationResult> {
  // 1. The form values. Nothing is sent if they're wrong.
  const parsed = verificationSubmissionSchema.safeParse(values);
  if (!parsed.success) {
    return cannotSubmit("invalid_input", parsed.error.issues[0]?.message);
  }
  const submission = parsed.data;

  // 2. Before anything is uploaded: uploaded photos can't be deleted.
  const permission = await checkCanSubmitVerification(supabase, landlordId);
  if (!permission.ok) {
    return permission;
  }

  // 3. A new folder for this submission. The id is also the row's id, so
  //    the admin can find the photos from the row.
  const submissionId = crypto.randomUUID();
  const withPath = (name: VerificationPhotoName, photo: File) => ({
    path: verificationPhotoPath(landlordId, submissionId, name, photo),
    photo,
  });

  const front = withPath("id-front", submission.id_front);
  // The schema made sure there's a back photo exactly when the ID needs
  // one: for anything but a passport.
  const back = submission.id_back
    ? withPath("id-back", submission.id_back)
    : null;
  const selfie = withPath("selfie", submission.selfie);

  // 4. One at a time, stopping at the first refusal, so a failed
  //    submission leaves as few photos behind as possible. Never
  //    `upsert: true`: landlords can't replace files (0009).
  const uploads = back ? [front, back, selfie] : [front, selfie];
  for (const { path, photo } of uploads) {
    const { error } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .upload(path, photo, { upsert: false });
    if (error) {
      console.error("Verification photo upload error:", error);
      return cannotSubmit(uploadErrorReason(error.statusCode));
    }
  }

  // 5. Save the submission. status, rejection_reason and reviewed_at are
  //    left to their defaults (pending, empty, empty): 0008's insert
  //    policy only accepts a fresh pending submission. A plain insert,
  //    without .select(): the page doesn't need the row back.
  const { error: insertError } = await supabase
    .from("landlord_verifications")
    .insert({
      id: submissionId,
      landlord_id: landlordId,
      id_type: submission.id_type,
      id_front_path: front.path,
      id_back_path: back ? back.path : null,
      selfie_path: selfie.path,
      // The schema made sure the consent box was ticked.
      consent_given_at: new Date().toISOString(),
    });
  if (insertError) {
    console.error("Verification save error:", insertError);
    return cannotSubmit(saveErrorReason(insertError.code));
  }

  return { ok: true, submissionId };
}
