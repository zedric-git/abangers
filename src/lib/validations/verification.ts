import { z } from "zod";

/**
 * Validation rules for a landlord's account verification (S1-15.6, #204):
 * the type of ID, photos of it, a selfie, and the consent checkbox. Used by:
 * - the Verify account form (#203), through React Hook Form's zodResolver
 * - submitVerification (src/lib/auth/submit-verification.ts), which checks
 *   the same values again before it uploads anything
 *
 * WHO ENFORCES WHAT: the database and the storage bucket enforce every
 * rule below themselves, so these checks are here to give the landlord a
 * clear message, not to keep bad data out:
 * - the ID types and the back-photo rule: the CHECK rules in
 *   supabase/migrations/0008_create_landlord_verifications.sql
 * - the photo size and types: the verification-documents bucket in
 *   supabase/migrations/0009_create_verification_documents_bucket.sql
 * - consent: 0008's consent_given_at has no default, so nothing is saved
 *   without it
 * Change them together: if this file and the database disagree, landlords
 * get errors the app can't explain.
 */

/**
 * The IDs a landlord can verify with: exactly the list in 0008's
 * id_type_is_known CHECK. Adding one needs a new migration too.
 */
export const ID_TYPES = [
  "national_id", // PhilSys National ID
  "drivers_license",
  "passport",
  "umid",
  "prc_id",
  "postal_id",
] as const;

export const idTypeSchema = z.enum(ID_TYPES, {
  message: "Choose the type of ID you're uploading",
});

export type IdType = z.infer<typeof idTypeSchema>;

/**
 * What the Verify account form shows for each ID type (#203). A Record,
 * so a new ID type can't be added without a label.
 */
export const ID_TYPE_LABELS: Record<IdType, string> = {
  national_id: "PhilSys National ID",
  drivers_license: "Driver's License",
  passport: "Passport",
  umid: "UMID",
  prc_id: "PRC ID",
  postal_id: "Postal ID",
};

/**
 * Every ID needs a photo of its back, except a passport: only its photo
 * page is uploaded (0008's id_back_matches_id_type CHECK).
 */
export function needsBackPhoto(idType: IdType): boolean {
  return idType !== "passport";
}

/** The bucket's size limit (0009): 5 MB = 5 * 1024 * 1024 bytes per photo. */
export const VERIFICATION_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The photo types the bucket accepts (0009). Not every image type: an SVG
 * can contain scripts, and most browsers can't show a HEIC (iPhone) photo
 * to the admin.
 */
export const VERIFICATION_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type VerificationPhotoType = (typeof VERIFICATION_PHOTO_TYPES)[number];

/**
 * One photo: a File (what a file input gives; the camera component, #202,
 * hands its selfie over as a File too), of an accepted type, not empty,
 * and at most 5 MB.
 * - `what` names the photo in the messages, e.g. "The front of your ID".
 * - `missingMessage` is shown when there's no photo at all.
 */
function photoSchema(what: string, missingMessage: string) {
  return z
    .file({ message: missingMessage })
    .mime(
      [...VERIFICATION_PHOTO_TYPES],
      `${what} must be a JPEG, PNG or WebP image`,
    )
    .min(1, `${what} is an empty file. Choose another photo.`)
    .max(VERIFICATION_PHOTO_MAX_BYTES, `${what} must be 5 MB or smaller`);
}

const CONSENT_MESSAGE =
  "Tick the box to agree that we can use your ID and selfie to verify your account";

export const verificationSubmissionSchema = z
  .object({
    id_type: idTypeSchema,
    id_front: photoSchema(
      "The front of your ID",
      "Add a photo of the front of your ID",
    ),
    // Required for every ID except a passport: checked below, because it
    // depends on id_type.
    id_back: photoSchema(
      "The back of your ID",
      "Add a photo of the back of your ID",
    ).optional(),
    selfie: photoSchema("Your selfie", "Take a selfie"),
    // The consent checkbox. A boolean that must be true (not z.literal),
    // so the form can start with the box unticked.
    consent: z
      .boolean({ message: CONSENT_MESSAGE })
      .refine((value) => value, CONSENT_MESSAGE),
  })
  .superRefine(
    (data, ctx) => {
      if (needsBackPhoto(data.id_type) && !data.id_back) {
        ctx.addIssue({
          code: "custom",
          path: ["id_back"],
          message: "Add a photo of the back of your ID",
        });
      }
      // Refused rather than ignored: a back photo with "Passport" chosen
      // usually means the wrong ID type was picked.
      if (!needsBackPhoto(data.id_type) && data.id_back) {
        ctx.addIssue({
          code: "custom",
          path: ["id_back"],
          message:
            "A passport only needs its photo page. Remove the back photo, or choose another type of ID.",
        });
      }
    },
    {
      // When this rule runs. By default Zod skips it while any other
      // field has a problem, so on an empty Verify account form (#203)
      // "Add a photo of the back of your ID" only showed on the second
      // try. Running it with the other rules shows every missing photo at
      // once. It's skipped only when the back photo has a problem of its
      // own (e.g. it's over 5 MB), or the values aren't an object at all.
      // Other fields may be missing when it runs: with no ID type chosen,
      // needsBackPhoto() says a back photo is needed, which matches the
      // form (it only hides the back photo for a passport).
      when: (payload) =>
        typeof payload.value === "object" &&
        payload.value !== null &&
        !payload.issues.some((issue) => issue.path?.[0] === "id_back"),
    },
  );

export type VerificationSubmissionInput = z.infer<
  typeof verificationSubmissionSchema
>;

// ── The admin's review (S2-11.2, #256) ──────────────────────────────

/**
 * The longest rejection reason. The landlord reads it on their dashboard's
 * banner and checklist (#205), so it's kept to a short paragraph.
 */
export const REJECTION_REASON_MAX_LENGTH = 500;

const REASON_MISSING_MESSAGE =
  "Write the reason the landlord will see, so they know what to fix";

/** Which submission: its landlord_verifications id. */
const submissionIdSchema = z.uuid({
  message:
    "This verification's id isn't valid. Go back to the list and open it again.",
});

/** Approving: nothing else to say (an approval has no reason). */
export const approvalSchema = z.object({
  submissionId: submissionIdSchema,
  decision: z.literal("approve"),
});

/**
 * Rejecting: with a reason the landlord sees. The Reject dialog's form
 * uses this part of verificationReviewSchema on its own (it only ever
 * rejects).
 */
export const rejectionSchema = z.object({
  submissionId: submissionIdSchema,
  decision: z.literal("reject"),
  // Trimmed first, so a reason of only spaces (or tabs, line breaks, and
  // the other characters .trim() removes) counts as missing.
  reason: z
    .string({ message: REASON_MISSING_MESSAGE })
    .trim()
    .min(1, REASON_MISSING_MESSAGE)
    .max(
      REJECTION_REASON_MAX_LENGTH,
      `Keep the reason to ${REJECTION_REASON_MAX_LENGTH} characters or fewer`,
    ),
});

/**
 * An admin's decision on one submission: approve it, or reject it with a
 * reason. Used by the review page's dialogs and by reviewVerification
 * (src/lib/auth/review-verification.ts), which checks it again on the
 * server.
 *
 * WHO ENFORCES WHAT: the database does, whatever the app sends (0014's
 * update policy and 0008's rejection_reason_matches_status CHECK): only an
 * admin, only a pending submission, and a rejection needs a reason. This
 * is stricter than that CHECK, which only refuses a reason that's empty
 * once spaces are removed, so the database never refuses a reason the
 * form accepts.
 */
export const verificationReviewSchema = z.discriminatedUnion("decision", [
  approvalSchema,
  rejectionSchema,
]);

export type VerificationReviewInput = z.infer<typeof verificationReviewSchema>;
export type RejectionInput = z.infer<typeof rejectionSchema>;
