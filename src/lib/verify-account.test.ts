import { describe, expect, it } from "vitest";
import type {
  CannotSubmitVerificationReason,
  SubmitVerificationResult,
} from "@/lib/auth/submit-verification";
import { ID_TYPES } from "@/lib/validations/verification";
import {
  afterSubmitView,
  idPhotoLabels,
  verifyPageView,
  type VerificationStatusView,
} from "./verify-account";

/** A "can't submit" answer, as checkCanSubmitVerification gives it. */
function cannot(reason: CannotSubmitVerificationReason, message = "msg") {
  return { ok: false as const, reason, message };
}

/** The card a page load shows for `reason`. */
function cardOnLoad(reason: CannotSubmitVerificationReason, message?: string) {
  const view = verifyPageView(cannot(reason, message));
  if (view.show !== "status") {
    throw new Error(`expected a card for ${reason}, got the form`);
  }
  return view.status;
}

describe("verifyPageView (when the page loads)", () => {
  it("shows the form when the landlord may send a verification", () => {
    expect(verifyPageView({ ok: true })).toEqual({ show: "form" });
  });

  it("says a pending verification is being reviewed", () => {
    expect(cardOnLoad("already_pending")).toMatchObject({
      tone: "pending",
      title: "Your verification is being reviewed",
      actions: ["back_to_profile"],
    } satisfies Partial<VerificationStatusView>);
  });

  it("says a verified account is verified, and offers a new listing", () => {
    expect(cardOnLoad("already_verified")).toMatchObject({
      tone: "verified",
      title: "Your account is verified",
      actions: ["back_to_profile", "new_listing"],
    } satisfies Partial<VerificationStatusView>);
  });

  it("sends a landlord with no profile to the Profile page", () => {
    expect(
      cardOnLoad("profile_missing", "Save your Profile page first"),
    ).toMatchObject({
      tone: "problem",
      message: "Save your Profile page first",
      actions: ["go_to_profile"],
    } satisfies Partial<VerificationStatusView>);
  });

  it("offers to try again when the status couldn't be read", () => {
    expect(cardOnLoad("check_failed", "Please try again")).toMatchObject({
      tone: "problem",
      message: "Please try again",
      actions: ["try_again"],
    } satisfies Partial<VerificationStatusView>);
  });

  it("shows the check's own message for anything else", () => {
    expect(
      cardOnLoad("not_landlord", "Only landlord accounts can verify"),
    ).toMatchObject({
      tone: "problem",
      message: "Only landlord accounts can verify",
      actions: ["back_to_profile"],
    } satisfies Partial<VerificationStatusView>);
  });

  it("ends every card with a button", () => {
    const reasons: CannotSubmitVerificationReason[] = [
      "not_landlord",
      "profile_missing",
      "already_pending",
      "already_verified",
      "check_failed",
    ];
    for (const reason of reasons) {
      expect(cardOnLoad(reason).actions.length).toBeGreaterThan(0);
    }
  });
});

describe("afterSubmitView (once Submit has an answer)", () => {
  it("shows the same 'being reviewed' card as a page load once it's sent", () => {
    expect(afterSubmitView({ ok: true, submissionId: "abc" })).toEqual({
      show: "status",
      status: cardOnLoad("already_pending"),
    });
  });

  it("shows the card when it was sent from another tab in the meantime", () => {
    expect(afterSubmitView(cannot("already_pending"))).toEqual({
      show: "status",
      status: cardOnLoad("already_pending"),
    });
    expect(afterSubmitView(cannot("already_verified"))).toEqual({
      show: "status",
      status: cardOnLoad("already_verified"),
    });
  });

  it.each([
    "invalid_input",
    "not_landlord",
    "profile_missing",
    "check_failed",
    "photo_too_big",
    "wrong_photo_type",
    "not_allowed",
    "upload_failed",
    "save_failed",
  ] satisfies CannotSubmitVerificationReason[])(
    "shows %s's message next to the Submit button",
    (reason) => {
      const result: SubmitVerificationResult = cannot(reason, `${reason}!`);
      expect(afterSubmitView(result)).toEqual({
        show: "error",
        message: `${reason}!`,
      });
    },
  );
});

describe("idPhotoLabels", () => {
  it("asks a passport for its photo page only", () => {
    expect(idPhotoLabels("passport")).toEqual({
      front: "Photo page of your passport",
      back: null,
    });
  });

  it.each(ID_TYPES.filter((idType) => idType !== "passport"))(
    "asks a %s for its front and back",
    (idType) => {
      expect(idPhotoLabels(idType)).toEqual({
        front: "Front of your ID",
        back: "Back of your ID",
      });
    },
  );

  it("asks for both sides until an ID type is chosen", () => {
    expect(idPhotoLabels(undefined).back).toBe("Back of your ID");
  });
});
