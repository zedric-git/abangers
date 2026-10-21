import { describe, expect, it } from "vitest";
import { cannotCreateListingsMessage } from "@/lib/auth/can-create-listings";
import type { LandlordStatus } from "@/lib/auth/landlord-status";
import type { VerificationStatus } from "@/lib/auth/submit-verification";
import {
  isAddListingLocked,
  nameFieldView,
  newListingPageView,
  profileSaveErrorMessage,
  verificationBanner,
  VERIFICATION_BADGE_LABELS,
  type ChecklistStep,
  type VerificationBannerView,
} from "./landlord-status-view";
import {
  BEING_REVIEWED,
  PROFILE_PATH,
  VERIFY_ACCOUNT_INTRO,
  VERIFY_ACCOUNT_PATH,
} from "./verify-account";

const VERIFICATION_STATUSES: VerificationStatus[] = [
  "not_verified",
  "pending",
  "rejected",
  "verified",
];

const REASON = "The photo of your ID is blurry.";

/**
 * A landlord's status, as loadLandlordStatus gives it. By default: a
 * complete profile and no verification yet.
 */
function status(overrides: Partial<LandlordStatus> = {}): LandlordStatus {
  const verification = overrides.verification ?? "not_verified";
  const profileComplete = overrides.profileComplete ?? true;
  return {
    verification,
    rejectionReason: verification === "rejected" ? REASON : null,
    profileComplete,
    canCreateListings: profileComplete && verification === "verified",
    fullName: "Jun Dela Cruz",
    ...overrides,
  };
}

/** The checklist the new-listing page shows for `landlord`. */
function checklistFor(landlord: LandlordStatus): ChecklistStep[] {
  const view = newListingPageView(landlord);
  if (view.show !== "checklist") {
    throw new Error(`expected the checklist, got ${view.show}`);
  }
  return view.steps;
}

describe("verificationBanner", () => {
  it("asks a landlord who isn't verified to verify, with the Verify page's words", () => {
    expect(verificationBanner(status())).toEqual({
      tone: "not_verified",
      title: "Verify your account to start posting listings",
      reason: null,
      message: VERIFY_ACCOUNT_INTRO,
      action: { label: "Verify account", href: VERIFY_ACCOUNT_PATH },
    } satisfies VerificationBannerView);
  });

  it("says a pending verification is being reviewed, like the Verify page, with no button", () => {
    expect(verificationBanner(status({ verification: "pending" }))).toEqual({
      tone: "pending",
      title: BEING_REVIEWED.title,
      reason: null,
      message: BEING_REVIEWED.message,
      action: null,
    } satisfies VerificationBannerView);
  });

  it("shows the admin's reason for a rejection, and offers to submit again", () => {
    expect(verificationBanner(status({ verification: "rejected" }))).toEqual({
      tone: "rejected",
      title: "Your verification was rejected",
      reason: REASON,
      message: "Fix this and send a new one.",
      action: { label: "Submit again", href: VERIFY_ACCOUNT_PATH },
    } satisfies VerificationBannerView);
  });

  it("stops once the landlord is verified", () => {
    expect(verificationBanner(status({ verification: "verified" }))).toBeNull();
  });

  it("says nothing when the status couldn't be read", () => {
    expect(verificationBanner(null)).toBeNull();
  });

  it("is only about the verification, not the profile", () => {
    for (const verification of VERIFICATION_STATUSES) {
      expect(
        verificationBanner(status({ verification, profileComplete: false })),
      ).toEqual(verificationBanner(status({ verification })));
    }
  });
});

describe("VERIFICATION_BADGE_LABELS", () => {
  it("names each status", () => {
    expect(VERIFICATION_BADGE_LABELS).toEqual({
      not_verified: "Not verified",
      pending: "Pending review",
      rejected: "Rejected",
      verified: "Verified",
    } satisfies Record<VerificationStatus, string>);
  });
});

describe("isAddListingLocked", () => {
  it("locks Add New Listing when the landlord can't post yet", () => {
    expect(isAddListingLocked(status())).toBe(true);
    expect(
      isAddListingLocked(
        status({ verification: "verified", profileComplete: false }),
      ),
    ).toBe(true);
  });

  it("leaves it unlocked when they can post", () => {
    expect(isAddListingLocked(status({ verification: "verified" }))).toBe(
      false,
    );
  });

  it("leaves it unlocked when the status couldn't be read: the page checks again", () => {
    expect(isAddListingLocked(null)).toBe(false);
  });
});

describe("newListingPageView", () => {
  it("shows the form to a landlord who can post", () => {
    expect(newListingPageView(status({ verification: "verified" }))).toEqual({
      show: "form",
    });
  });

  it("says it couldn't check, instead of guessing, when the status couldn't be read", () => {
    expect(newListingPageView(null)).toEqual({
      show: "problem",
      message: cannotCreateListingsMessage("check_failed"),
    });
  });

  it("lists both steps for a landlord with a complete profile who isn't verified", () => {
    expect(checklistFor(status())).toEqual([
      {
        title: "Complete your profile",
        state: "done",
        stateLabel: "Done",
        reason: null,
        message: "Your mobile number and a social media link are saved.",
        action: null,
      },
      {
        title: "Verify your account",
        state: "to_do",
        stateLabel: "To do",
        reason: null,
        message: "Send photos of a valid government ID and a selfie.",
        action: { label: "Verify account", href: VERIFY_ACCOUNT_PATH },
      },
    ] satisfies ChecklistStep[]);
  });

  it("sends an incomplete profile to the Profile page", () => {
    expect(checklistFor(status({ profileComplete: false }))[0]).toEqual({
      title: "Complete your profile",
      state: "to_do",
      stateLabel: "To do",
      reason: null,
      message: "Add your mobile number and at least one social media link.",
      action: { label: "Go to Profile", href: PROFILE_PATH },
    } satisfies ChecklistStep);
  });

  it("says a pending verification is being reviewed, with no button", () => {
    expect(checklistFor(status({ verification: "pending" }))[1]).toEqual({
      title: "Verify your account",
      state: "being_reviewed",
      stateLabel: "Being reviewed",
      reason: null,
      message: BEING_REVIEWED.message,
      action: null,
    } satisfies ChecklistStep);
  });

  it("shows the admin's reason for a rejection, and offers to submit again", () => {
    expect(checklistFor(status({ verification: "rejected" }))[1]).toEqual({
      title: "Verify your account",
      state: "rejected",
      stateLabel: "Rejected",
      reason: REASON,
      message: "Fix this and send a new one.",
      action: { label: "Submit again", href: VERIFY_ACCOUNT_PATH },
    } satisfies ChecklistStep);
  });

  it("marks the verification done for a verified landlord whose profile isn't complete", () => {
    const steps = checklistFor(
      status({ verification: "verified", profileComplete: false }),
    );
    expect(steps.map((s) => s.state)).toEqual(["to_do", "done"]);
    expect(steps[1]).toMatchObject({
      message: "Your ID and selfie were approved.",
      action: null,
    });
  });

  it("always leaves something to do, with a button unless it's waiting for the admin", () => {
    for (const verification of VERIFICATION_STATUSES) {
      for (const profileComplete of [true, false]) {
        const view = newListingPageView(
          status({ verification, profileComplete }),
        );
        if (view.show !== "checklist") continue; // the form

        const open = view.steps.filter((s) => s.state !== "done");
        expect(open.length).toBeGreaterThan(0);
        for (const s of open) {
          if (s.state === "being_reviewed") {
            expect(s.action).toBeNull();
          } else {
            expect(s.action).not.toBeNull();
          }
        }
      }
    }
  });

  it("doesn't show a checklist with nothing left to do (an account that isn't a landlord's)", () => {
    expect(
      newListingPageView(
        status({ verification: "verified", canCreateListings: false }),
      ),
    ).toEqual({
      show: "problem",
      message: cannotCreateListingsMessage("not_landlord"),
    });
  });
});

describe("nameFieldView", () => {
  it("locks the name once the landlord is verified", () => {
    expect(nameFieldView(status({ verification: "verified" }))).toEqual({
      locked: true,
      hint: "Your name is locked because your account is verified.",
    });
  });

  it("leaves it editable until then, asking for the name on their ID", () => {
    const editable = {
      locked: false,
      hint: "Use the name on your valid ID. It can't be changed once your account is verified.",
    };
    for (const verification of [
      "not_verified",
      "pending",
      "rejected",
    ] as const) {
      expect(nameFieldView(status({ verification }))).toEqual(editable);
    }
    // The database still refuses a new name if they're verified after all.
    expect(nameFieldView(null)).toEqual(editable);
  });
});

describe("profileSaveErrorMessage", () => {
  it("explains the name lock (0008's trigger)", () => {
    expect(
      profileSaveErrorMessage({
        code: "42501",
        message:
          "profiles.full_name cannot be changed once the account is verified",
      }),
    ).toBe("Your name can't be changed once your account is verified.");
  });

  it.each([
    {
      code: "42501",
      message:
        'new row violates row-level security policy for table "profiles"',
    },
    { code: "23514", message: "check constraint failed" },
    { message: "Failed to fetch" },
  ])("gives the general message for anything else: %j", (error) => {
    expect(profileSaveErrorMessage(error)).toBe(
      "We couldn't save your profile. Please try again.",
    );
  });
});
