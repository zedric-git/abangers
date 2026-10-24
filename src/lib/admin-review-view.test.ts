import { describe, expect, it } from "vitest";
import {
  ADMIN_DASHBOARD_PATH,
  REVIEW_NOTICES,
  REVIEW_NOTICE_TEXT,
  approveDialogText,
  formatMobileNumber,
  formatSubmittedAt,
  idTypeLabel,
  listPathWithNotice,
  noticeAfterReview,
  pendingCountLabel,
  reviewNoticeOf,
  reviewPagePath,
  reviewPhotoLabel,
  signedLinksNote,
  socialLinksOf,
} from "./admin-review-view";

describe("the admin dashboard's paths", () => {
  it("puts each submission's review page under the dashboard", () => {
    expect(reviewPagePath("b1b2c3d4-0000-4000-8000-000000000002")).toBe(
      "/dashboard/admin/verifications/b1b2c3d4-0000-4000-8000-000000000002",
    );
  });

  it("keeps a strange id inside its own path segment", () => {
    expect(reviewPagePath("../x?y")).toBe(
      "/dashboard/admin/verifications/..%2Fx%3Fy",
    );
  });
});

describe("the note above the list", () => {
  it.each(REVIEW_NOTICES)("goes through the URL and back: %s", (notice) => {
    const url = new URL(listPathWithNotice(notice), "http://localhost");
    expect(url.pathname).toBe(ADMIN_DASHBOARD_PATH);
    expect(reviewNoticeOf(url.searchParams.get("notice") ?? undefined)).toBe(
      notice,
    );
  });

  it.each([undefined, "", "deleted", "toString", "__proto__"])(
    "shows nothing for anything else (%j)",
    (value) => {
      expect(reviewNoticeOf(value)).toBeNull();
    },
  );

  it("shows nothing when the parameter is there twice", () => {
    expect(reviewNoticeOf(["approved", "rejected"])).toBeNull();
  });

  it("says what happened after each decision", () => {
    expect(REVIEW_NOTICE_TEXT[noticeAfterReview("approve")]).toContain(
      "approved",
    );
    expect(REVIEW_NOTICE_TEXT[noticeAfterReview("reject")]).toContain(
      "rejected",
    );
  });
});

describe("the list", () => {
  it("counts what's waiting", () => {
    expect(pendingCountLabel(1)).toBe("1 waiting for review");
    expect(pendingCountLabel(3)).toBe("3 waiting for review");
  });

  it("names the ID types like the Verify page does", () => {
    expect(idTypeLabel("passport")).toBe("Passport");
    expect(idTypeLabel("drivers_license")).toBe("Driver's License");
    // 0008's CHECK only allows the known ones; anything else as it is.
    expect(idTypeLabel("library_card")).toBe("library_card");
  });

  it("shows when it was sent in Philippine time", () => {
    // 4:30 PM in UTC is 12:30 AM the next day in Manila (UTC+8).
    const shown = formatSubmittedAt("2026-10-23T16:30:00Z");
    expect(shown).toContain("Oct 24, 2026");
    expect(shown).toContain("12:30");
  });

  it("shows a date it can't read as it is", () => {
    expect(formatSubmittedAt("not a date")).toBe("not a date");
  });
});

describe("the review page", () => {
  it("calls a passport's only photo its photo page", () => {
    expect(reviewPhotoLabel("id-front", "passport")).toBe(
      "Passport photo page",
    );
    expect(reviewPhotoLabel("id-front", "national_id")).toBe("Front of the ID");
    expect(reviewPhotoLabel("id-back", "national_id")).toBe("Back of the ID");
    expect(reviewPhotoLabel("selfie", "passport")).toBe("Selfie");
  });

  it("writes the saved mobile number with +63", () => {
    expect(formatMobileNumber("09175550101")).toBe("+63 917 555 0101");
  });

  it("shows any other saved number as it is", () => {
    expect(formatMobileNumber("12345")).toBe("12345");
    expect(formatMobileNumber(null)).toBeNull();
    expect(formatMobileNumber("  ")).toBeNull();
  });

  it("lists the social links that aren't empty, in order", () => {
    expect(
      socialLinksOf({
        facebookUrl: null,
        instagramUrl: "  https://www.instagram.com/someone  ",
        xUrl: "https://x.com/someone",
      }),
    ).toEqual([
      {
        label: "Instagram",
        text: "https://www.instagram.com/someone",
        href: "https://www.instagram.com/someone",
      },
      {
        label: "X",
        text: "https://x.com/someone",
        href: "https://x.com/someone",
      },
    ]);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "facebook.com/someone",
    "@someone",
  ])("only links real web addresses, not %j", (saved) => {
    expect(
      socialLinksOf({ facebookUrl: saved, instagramUrl: null, xUrl: null }),
    ).toEqual([{ label: "Facebook", text: saved, href: null }]);
  });

  it("says how long the photo links work", () => {
    expect(signedLinksNote(600)).toBe(
      "These links stop working after 10 minutes. Refresh the page to load the photos again.",
    );
  });

  it("names the landlord in the Approve dialog when it can", () => {
    expect(approveDialogText("Rosa Villanueva").title).toBe(
      "Approve Rosa Villanueva's verification?",
    );
    expect(approveDialogText(null).title).toBe("Approve this verification?");
  });
});
