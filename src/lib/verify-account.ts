import type {
  CanSubmitVerificationResult,
  CannotSubmitVerificationReason,
  SubmitVerificationResult,
} from "@/lib/auth/submit-verification";
import { needsBackPhoto, type IdType } from "@/lib/validations/verification";

/**
 * What the Verify account page shows (S1-15.5, #203), without any React,
 * so it can be unit-tested (verify-account.test.ts):
 * - verifyPageView(): the form, or a status card instead of it, from
 *   checkCanSubmitVerification() when the page loads;
 * - afterSubmitView(): the card or the error message to show once
 *   submitVerification() has answered;
 * - idPhotoLabels(): what the ID photos are called for each ID type.
 * The page is src/app/dashboard/landlord/profile/verify/page.tsx; the
 * cards are drawn by VerificationStatusCard.
 */

/** The Verify account page: under Profile, so the sidebar highlights it. */
export const VERIFY_ACCOUNT_PATH = "/dashboard/landlord/profile/verify";
export const PROFILE_PATH = "/dashboard/landlord/profile";
export const NEW_LISTING_PATH = "/dashboard/landlord/listings/new";

/**
 * The buttons a status card can have. VerificationStatusCard turns each
 * into a link: "try_again" reloads this page.
 */
export type VerificationStatusAction =
  "back_to_profile" | "go_to_profile" | "new_listing" | "try_again";

/** A card shown instead of the form. */
export interface VerificationStatusView {
  /** Its icon and colours: waiting, done, or something's wrong. */
  tone: "pending" | "verified" | "problem";
  title: string;
  message: string;
  /** The buttons, in order. The last one is the main one. */
  actions: VerificationStatusAction[];
}

export type VerifyPageView =
  { show: "form" } | { show: "status"; status: VerificationStatusView };

export type AfterSubmitView =
  | { show: "status"; status: VerificationStatusView }
  | { show: "error"; message: string };

/**
 * Sent and waiting for the admin (#207). The same card whether the page
 * loads like this or the landlord has just sent it, so nothing jumps when
 * the page reloads from the server after Submit.
 */
const BEING_REVIEWED: VerificationStatusView = {
  tone: "pending",
  title: "Your verification is being reviewed",
  message:
    "An admin is checking your ID and selfie. You can post listings once it's approved.",
  actions: ["back_to_profile"],
};

const VERIFIED: VerificationStatusView = {
  tone: "verified",
  title: "Your account is verified",
  message: "You can post listings.",
  actions: ["back_to_profile", "new_listing"],
};

/**
 * The card for a reason the landlord can't send a verification. The
 * message is submitVerification's own (it says what to do), except for
 * the two states that aren't problems.
 */
function statusFor(
  reason: CannotSubmitVerificationReason,
  message: string,
): VerificationStatusView {
  switch (reason) {
    case "already_pending":
      return BEING_REVIEWED;
    case "already_verified":
      return VERIFIED;
    case "profile_missing":
      // Saving the Profile page creates the missing profiles row.
      return {
        tone: "problem",
        title: "Save your profile first",
        message,
        actions: ["go_to_profile"],
      };
    case "check_failed":
      return {
        tone: "problem",
        title: "We couldn't load your verification",
        message,
        actions: ["try_again"],
      };
    default:
      // not_landlord: the proxy keeps renters off the landlord dashboard,
      // so this shouldn't happen. (The other reasons only come from
      // submitting, never from the check.)
      return {
        tone: "problem",
        title: "You can't verify this account",
        message,
        actions: ["back_to_profile"],
      };
  }
}

/**
 * What the page shows when it loads, from checkCanSubmitVerification():
 * the form when the landlord may send a verification (they never have,
 * or every one was rejected), or a card saying why not.
 */
export function verifyPageView(
  check: CanSubmitVerificationResult,
): VerifyPageView {
  if (check.ok) {
    return { show: "form" };
  }
  return { show: "status", status: statusFor(check.reason, check.message) };
}

/**
 * What the form shows once submitVerification() has answered:
 * - sent: the "being reviewed" card;
 * - already pending or verified (e.g. sent from another tab in the
 *   meantime): that card;
 * - anything else: the message, next to the Submit button, so they can
 *   try again.
 * The form reloads the page from the server whenever it shows a card.
 */
export function afterSubmitView(
  result: SubmitVerificationResult,
): AfterSubmitView {
  if (result.ok) {
    return { show: "status", status: BEING_REVIEWED };
  }
  if (
    result.reason === "already_pending" ||
    result.reason === "already_verified"
  ) {
    return { show: "status", status: statusFor(result.reason, result.message) };
  }
  return { show: "error", message: result.message };
}

/** What the ID photos are called on the form and the review step. */
export interface IdPhotoLabels {
  front: string;
  /** null when the ID only needs one photo (a passport). */
  back: string | null;
}

/**
 * The photo labels for the chosen ID type, or for no type yet. Until a
 * type is chosen the form asks for both sides, like the schema does
 * (needsBackPhoto is false only for a passport).
 */
export function idPhotoLabels(idType: IdType | undefined): IdPhotoLabels {
  if (idType !== undefined && !needsBackPhoto(idType)) {
    return { front: "Photo page of your passport", back: null };
  }
  return { front: "Front of your ID", back: "Back of your ID" };
}
