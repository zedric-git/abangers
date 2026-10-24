import type { VerificationPhotoName } from "@/lib/auth/submit-verification";
import { PH_MOBILE_DIGITS, toPhMobileDigits } from "@/lib/ph-mobile-number";
import { ID_TYPE_LABELS, idTypeSchema } from "@/lib/validations/verification";

/**
 * What the admin dashboard says and links to (S2-11.2, #256), without any
 * React, so it can be unit-tested (admin-review-view.test.ts):
 * - the paths: the pending list and each submission's review page;
 * - the note above the list after a review (?notice=);
 * - the list's empty and error states;
 * - the review page: the photo labels, the landlord's details, what to
 *   check, and the two dialogs.
 * The data comes from src/lib/auth/review-verification.ts; the pages are
 * under src/app/dashboard/admin/.
 */

/** The admin's dashboard: the list of verifications waiting for review. */
export const ADMIN_DASHBOARD_PATH = "/dashboard/admin";

/** One submission's review page. */
export function reviewPagePath(submissionId: string): string {
  return `${ADMIN_DASHBOARD_PATH}/verifications/${encodeURIComponent(submissionId)}`;
}

// ── The note above the list ─────────────────────────────────────────

/**
 * Why the admin was sent back to the list: they approved or rejected a
 * submission, or the one they opened was already reviewed or isn't there.
 */
export const REVIEW_NOTICES = [
  "approved",
  "rejected",
  "already-reviewed",
] as const;

export type ReviewNotice = (typeof REVIEW_NOTICES)[number];

/** The note's text. Fixed here: nothing from the URL is shown on the page. */
export const REVIEW_NOTICE_TEXT: Record<ReviewNotice, string> = {
  approved: "Verification approved. The landlord can now post listings.",
  rejected: "Verification rejected. The landlord will see your reason.",
  "already-reviewed":
    "That verification was already reviewed, or it no longer exists.",
};

/** The list's URL with a note above it. */
export function listPathWithNotice(notice: ReviewNotice): string {
  return `${ADMIN_DASHBOARD_PATH}?notice=${notice}`;
}

/** The ?notice= value, if it's one of ours (anything else shows nothing). */
export function reviewNoticeOf(
  value: string | string[] | undefined,
): ReviewNotice | null {
  return REVIEW_NOTICES.find((notice) => notice === value) ?? null;
}

/** The note after a decision was saved. */
export function noticeAfterReview(
  decision: "approve" | "reject",
): ReviewNotice {
  return decision === "approve" ? "approved" : "rejected";
}

// ── The list ────────────────────────────────────────────────────────

export const PENDING_LIST_EMPTY = {
  title: "No verifications waiting for review",
  message: "When a landlord sends their ID and selfie, it shows up here.",
};

export const PENDING_LIST_LOAD_ERROR =
  "We couldn't load the verification requests. Refresh the page to try again.";

/** "1 waiting for review", "3 waiting for review". */
export function pendingCountLabel(count: number): string {
  return `${count} waiting for review`;
}

/** The ID type as the landlord chose it on the Verify page (#203). */
export function idTypeLabel(idType: string): string {
  const parsed = idTypeSchema.safeParse(idType);
  return parsed.success ? ID_TYPE_LABELS[parsed.data] : idType;
}

// "Oct 23, 2026, 3:04 PM", always in Philippine time, like the listing
// cards: the same text on the server and in the browser.
const SUBMITTED_AT_FORMAT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

/** When the landlord sent it, in Philippine time. */
export function formatSubmittedAt(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? isoDate
    : SUBMITTED_AT_FORMAT.format(date);
}

// ── The review page ─────────────────────────────────────────────────

/** What each photo is called, for the ID type the landlord chose. */
export function reviewPhotoLabel(
  name: VerificationPhotoName,
  idType: string,
): string {
  switch (name) {
    case "id-front":
      // A passport only has its photo page (0008), saved as id-front.
      return idType === "passport" ? "Passport photo page" : "Front of the ID";
    case "id-back":
      return "Back of the ID";
    case "selfie":
      return "Selfie";
  }
}

/**
 * The saved mobile number as people write it: "+63 917 555 0101" for
 * 09175550101 (src/lib/ph-mobile-number.ts). Anything that isn't a full
 * PH mobile number is shown as it was saved.
 */
export function formatMobileNumber(saved: string | null): string | null {
  const digits = toPhMobileDigits(saved);
  if (digits.length !== PH_MOBILE_DIGITS) {
    return saved?.trim() || null;
  }
  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** One of the landlord's social media links. */
export interface ProfileLink {
  label: string;
  /** What they saved, shown as it is. */
  text: string;
  /**
   * Where the link goes, or null to show `text` without a link. The
   * profile forms accept any text here (landlordProfileSchema), so only a
   * real http(s) address becomes a link: never "javascript:" or the like.
   */
  href: string | null;
}

function webAddressOf(text: string): string | null {
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** The landlord's social media links that aren't empty, in a fixed order. */
export function socialLinksOf(landlord: {
  facebookUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
}): ProfileLink[] {
  const saved: [string, string | null][] = [
    ["Facebook", landlord.facebookUrl],
    ["Instagram", landlord.instagramUrl],
    ["X", landlord.xUrl],
  ];
  return saved.flatMap(([label, value]) => {
    const text = value?.trim();
    return text ? [{ label, text, href: webAddressOf(text) }] : [];
  });
}

/** The short list of what the admin checks before deciding. */
export const WHAT_TO_CHECK = [
  "The name on the ID matches the name on the profile.",
  "It's a valid government ID, and you can read it.",
  "The selfie shows the same person as the ID.",
];

/** Under the photos: how long their links work. */
export function signedLinksNote(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `These links stop working after ${minutes} minutes. Refresh the page to load the photos again.`;
}

export const PHOTOS_LOAD_ERROR =
  "We couldn't load the photos, so this verification can't be approved yet. Refresh the page to try again.";

export const REVIEW_LOAD_ERROR =
  "We couldn't load this verification. Refresh the page to try again.";

/** The Approve dialog, for a landlord's name (or none on their profile). */
export function approveDialogText(landlordName: string | null): {
  title: string;
  description: string;
} {
  return {
    title: landlordName
      ? `Approve ${landlordName}'s verification?`
      : "Approve this verification?",
    description:
      "They'll be able to post listings, and their name will be locked. You can't undo this from the app.",
  };
}

/** The Reject dialog. */
export const REJECT_DIALOG = {
  title: "Reject this verification?",
  label: "Why are you rejecting it?",
  hint: "The landlord sees this reason and can send a new verification.",
  placeholder: "e.g. The ID photo is blurry. Retake it in good light.",
};
