import { cannotCreateListingsMessage } from "@/lib/auth/can-create-listings";
import type { LandlordStatus } from "@/lib/auth/landlord-status";
import type { VerificationStatus } from "@/lib/auth/submit-verification";
import {
  BEING_REVIEWED,
  PROFILE_PATH,
  VERIFY_ACCOUNT_INTRO,
  VERIFY_ACCOUNT_PATH,
} from "@/lib/verify-account";

/**
 * What the landlord dashboard says about where a landlord stands
 * (S1-15.7, #205), without any React, so it can be unit-tested
 * (landlord-status-view.test.ts):
 * - verificationBanner(): the banner on the dashboard, My Posted Listings
 *   and Profile pages;
 * - VERIFICATION_BADGE_LABELS: the badge in the Profile page's header;
 * - isAddListingLocked(): whether Add New Listing shows its lock;
 * - newListingPageView(): the listing form, or the checklist of what's
 *   left to do instead of it;
 * - nameFieldView(): whether the Profile page's name is read-only;
 * - profileSaveErrorMessage(): what the Profile form says when a save fails.
 * The status comes from loadLandlordStatus (src/lib/auth/landlord-status.ts):
 * null means it couldn't be read. The components that draw these are
 * VerificationBanner, VerificationBadge, AddListingButton and
 * ListingChecklist.
 */

/** A button that opens another page. */
export interface StatusLink {
  label: string;
  href: string;
}

const VERIFY_ACCOUNT: StatusLink = {
  label: "Verify account",
  href: VERIFY_ACCOUNT_PATH,
};
const SUBMIT_AGAIN: StatusLink = {
  label: "Submit again",
  href: VERIFY_ACCOUNT_PATH,
};
const GO_TO_PROFILE: StatusLink = {
  label: "Go to Profile",
  href: PROFILE_PATH,
};

/** Under the admin's reason, when a verification was rejected. */
const FIX_AND_SEND_AGAIN = "Fix this and send a new one.";

// ── The banner ──────────────────────────────────────────────────────

export interface VerificationBannerView {
  /** Its colours and icon: every status but "verified" has a banner. */
  tone: Exclude<VerificationStatus, "verified">;
  title: string;
  /** The admin's reason, shown under the title. Only for a rejection. */
  reason: string | null;
  message: string;
  /** Its button, or null for none. */
  action: StatusLink | null;
}

/**
 * The banner for a landlord's status, or null for none. Once they're
 * verified there's nothing left to prompt (the Profile badge says
 * Verified), and when the status couldn't be read there's nothing to say.
 */
export function verificationBanner(
  status: LandlordStatus | null,
): VerificationBannerView | null {
  if (status === null) {
    return null;
  }

  switch (status.verification) {
    case "not_verified":
      return {
        tone: "not_verified",
        title: "Verify your account to start posting listings",
        reason: null,
        message: VERIFY_ACCOUNT_INTRO,
        action: VERIFY_ACCOUNT,
      };
    case "pending":
      // The Verify page's own card (#203). Nothing to do but wait for the
      // admin, so no button.
      return {
        tone: "pending",
        title: BEING_REVIEWED.title,
        reason: null,
        message: BEING_REVIEWED.message,
        action: null,
      };
    case "rejected":
      return {
        tone: "rejected",
        title: "Your verification was rejected",
        reason: status.rejectionReason,
        message: FIX_AND_SEND_AGAIN,
        action: SUBMIT_AGAIN,
      };
    case "verified":
      return null;
  }
}

// ── The Profile badge ───────────────────────────────────────────────

/** What the badge in the Profile page's header says, for each status. */
export const VERIFICATION_BADGE_LABELS: Record<VerificationStatus, string> = {
  not_verified: "Not verified",
  pending: "Pending review",
  rejected: "Rejected",
  verified: "Verified",
};

// ── Add New Listing and its checklist ───────────────────────────────

/**
 * Whether Add New Listing shows its lock: only when we know they can't
 * post yet. If the status couldn't be read, it looks as usual, and the
 * new-listing page checks again.
 */
export function isAddListingLocked(status: LandlordStatus | null): boolean {
  return status !== null && !status.canCreateListings;
}

export type ChecklistStepState =
  "done" | "to_do" | "being_reviewed" | "rejected";

/** One step of the checklist the new-listing page shows instead of the form. */
export interface ChecklistStep {
  title: string;
  state: ChecklistStepState;
  /** The state in words, next to the title (not just a colour or an icon). */
  stateLabel: string;
  /** The admin's reason, for a rejected verification. */
  reason: string | null;
  message: string;
  /** Its button, or null for none. */
  action: StatusLink | null;
}

export type NewListingPageView =
  | { show: "form" }
  | { show: "checklist"; steps: ChecklistStep[] }
  | { show: "problem"; message: string };

const STATE_LABELS: Record<ChecklistStepState, string> = {
  done: "Done",
  to_do: "To do",
  being_reviewed: "Being reviewed",
  rejected: "Rejected",
};

function step(
  title: string,
  state: ChecklistStepState,
  message: string,
  action: StatusLink | null = null,
  reason: string | null = null,
): ChecklistStep {
  return {
    title,
    state,
    stateLabel: STATE_LABELS[state],
    reason,
    message,
    action,
  };
}

/** Step 1: a name, a PH mobile number and one social link (isProfileComplete). */
function profileStep(status: LandlordStatus): ChecklistStep {
  const title = "Complete your profile";
  return status.profileComplete
    ? step(
        title,
        "done",
        "Your mobile number and a social media link are saved.",
      )
    : step(
        title,
        "to_do",
        "Add your mobile number and at least one social media link.",
        GO_TO_PROFILE,
      );
}

/** Step 2: an approved verification. */
function verificationStep(status: LandlordStatus): ChecklistStep {
  const title = "Verify your account";
  switch (status.verification) {
    case "verified":
      return step(title, "done", "Your ID and selfie were approved.");
    case "pending":
      return step(title, "being_reviewed", BEING_REVIEWED.message);
    case "rejected":
      return step(
        title,
        "rejected",
        FIX_AND_SEND_AGAIN,
        SUBMIT_AGAIN,
        status.rejectionReason,
      );
    case "not_verified":
      return step(
        title,
        "to_do",
        "Send photos of a valid government ID and a selfie.",
        VERIFY_ACCOUNT,
      );
  }
}

/**
 * What the new-listing page shows: the form when the landlord can post;
 * otherwise the checklist of the two steps, which don't depend on each
 * other (#204's plan), so either can be done first. If the status
 * couldn't be read, it says so instead of guessing.
 */
export function newListingPageView(
  status: LandlordStatus | null,
): NewListingPageView {
  if (status === null) {
    return {
      show: "problem",
      message: cannotCreateListingsMessage("check_failed"),
    };
  }
  if (status.canCreateListings) {
    return { show: "form" };
  }

  const steps = [profileStep(status), verificationStep(status)];
  // Both steps done and still no listings: the account isn't a landlord's.
  // The proxy keeps renters off the landlord dashboard, so this shouldn't
  // happen, but a checklist with nothing left to do would be a dead end.
  if (steps.every((s) => s.state === "done")) {
    return {
      show: "problem",
      message: cannotCreateListingsMessage("not_landlord"),
    };
  }
  return { show: "checklist", steps };
}

// ── The Profile page's name ─────────────────────────────────────────

export interface NameFieldView {
  /** Read-only: 0008's trigger refuses a new name once they're verified. */
  locked: boolean;
  /** The note under the field. */
  hint: string;
}

/**
 * The Full Name field on the Profile page. The admin checks the name on
 * the ID against it, so it locks once the landlord is verified. Until
 * then the hint asks for the name on their ID, like the Verify page does.
 */
export function nameFieldView(status: LandlordStatus | null): NameFieldView {
  if (status?.verification === "verified") {
    return {
      locked: true,
      hint: "Your name is locked because your account is verified.",
    };
  }
  return {
    locked: false,
    hint: "Use the name on your valid ID. It can't be changed once your account is verified.",
  };
}

/**
 * What the Profile form says when saving the profile fails. 0008's name
 * lock answers 42501 with a message that names profiles.full_name, e.g.
 * when the page was opened before the landlord was verified and the name
 * was changed since. RLS refusals are 42501 too, but don't mention it.
 */
export function profileSaveErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code === "42501" && error.message?.includes("full_name")) {
    return "Your name can't be changed once your account is verified.";
  }
  return "We couldn't save your profile. Please try again.";
}
