import { describe, expect, it } from "vitest";
import {
  ID_TYPES,
  ID_TYPE_LABELS,
  REJECTION_REASON_MAX_LENGTH,
  VERIFICATION_PHOTO_MAX_BYTES,
  VERIFICATION_PHOTO_TYPES,
  needsBackPhoto,
  rejectionSchema,
  verificationReviewSchema,
  verificationSubmissionSchema,
} from "./verification";

// The database and the bucket check the same rules (0008, 0009). These
// are the cases they have to agree on: if a rule changes here, the
// database needs a new migration too.

/** A photo of `size` bytes. Only the size and the type matter here. */
function photo(type = "image/jpeg", size = 100) {
  return new File([new Uint8Array(size)], "photo", { type });
}

const valid = {
  id_type: "drivers_license",
  id_front: photo(),
  id_back: photo(),
  selfie: photo(),
  consent: true,
};

/** The messages of every issue, for `toContain`. */
function messagesOf(values: unknown) {
  const result = verificationSubmissionSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("the rules the database also checks", () => {
  it("has exactly the ID types in 0008's id_type_is_known CHECK", () => {
    expect([...ID_TYPES]).toEqual([
      "national_id",
      "drivers_license",
      "passport",
      "umid",
      "prc_id",
      "postal_id",
    ]);
  });

  it("has exactly the bucket's size limit and file types (0009)", () => {
    expect(VERIFICATION_PHOTO_MAX_BYTES).toBe(5242880);
    expect([...VERIFICATION_PHOTO_TYPES]).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("gives every ID type a label", () => {
    for (const idType of ID_TYPES) {
      expect(ID_TYPE_LABELS[idType]).not.toBe("");
    }
  });

  it("needs a back photo for every ID except a passport", () => {
    for (const idType of ID_TYPES) {
      expect(needsBackPhoto(idType)).toBe(idType !== "passport");
    }
  });
});

describe("verificationSubmissionSchema", () => {
  it.each(ID_TYPES.filter((idType) => idType !== "passport"))(
    "accepts a %s with its front, back and a selfie",
    (idType) => {
      const result = verificationSubmissionSchema.safeParse({
        ...valid,
        id_type: idType,
      });
      expect(result.success).toBe(true);
    },
  );

  it("accepts a passport with only its photo page and a selfie", () => {
    const result = verificationSubmissionSchema.safeParse({
      ...valid,
      id_type: "passport",
      id_back: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("refuses a back photo for a passport", () => {
    const result = verificationSubmissionSchema.safeParse({
      ...valid,
      id_type: "passport",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["id_back"]);
    expect(result.error?.issues[0].message).toContain("passport");
  });

  it("needs a back photo for any other ID", () => {
    const result = verificationSubmissionSchema.safeParse({
      ...valid,
      id_back: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["id_back"]);
    expect(result.error?.issues[0].message).toBe(
      "Add a photo of the back of your ID",
    );
  });

  // The Verify account form (#203) shows every problem at once, so the
  // back-photo rule has to run even while other fields are missing.
  it("lists every missing field of an empty form, the back photo included", () => {
    const result = verificationSubmissionSchema.safeParse({ consent: false });
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "consent",
      "id_back",
      "id_front",
      "id_type",
      "selfie",
    ]);
    expect(messagesOf({ consent: false })).toContain(
      "Add a photo of the back of your ID",
    );
  });

  it("doesn't ask an empty passport form for a back photo", () => {
    const result = verificationSubmissionSchema.safeParse({
      id_type: "passport",
      consent: false,
    });
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "consent",
      "id_front",
      "selfie",
    ]);
  });

  it("refuses a passport's back photo even while other fields are missing", () => {
    expect(
      messagesOf({ id_type: "passport", id_back: photo(), consent: false }),
    ).toContain(
      "A passport only needs its photo page. Remove the back photo, or choose another type of ID.",
    );
  });

  it("says only once what's wrong with a back photo", () => {
    const result = verificationSubmissionSchema.safeParse({
      id_type: "drivers_license",
      id_back: "not a photo",
      consent: false,
    });
    const backIssues = result.error?.issues.filter(
      (issue) => issue.path[0] === "id_back",
    );
    expect(backIssues?.map((issue) => issue.message)).toEqual([
      "Add a photo of the back of your ID",
    ]);
  });

  it("refuses an ID type the database doesn't know", () => {
    expect(messagesOf({ ...valid, id_type: "library_card" })).toEqual([
      "Choose the type of ID you're uploading",
    ]);
  });

  it.each(["id_front", "selfie"])("needs %s", (field) => {
    const result = verificationSubmissionSchema.safeParse({
      ...valid,
      [field]: undefined,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it("says what's missing", () => {
    expect(messagesOf({ ...valid, id_front: undefined })).toContain(
      "Add a photo of the front of your ID",
    );
    expect(messagesOf({ ...valid, selfie: undefined })).toContain(
      "Take a selfie",
    );
  });

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts a %s photo of exactly 5 MB",
    (type) => {
      const result = verificationSubmissionSchema.safeParse({
        ...valid,
        selfie: photo(type, VERIFICATION_PHOTO_MAX_BYTES),
      });
      expect(result.success).toBe(true);
    },
  );

  it("refuses a photo 1 byte over 5 MB, and says which one", () => {
    expect(
      messagesOf({
        ...valid,
        id_back: photo("image/jpeg", VERIFICATION_PHOTO_MAX_BYTES + 1),
      }),
    ).toEqual(["The back of your ID must be 5 MB or smaller"]);
  });

  it.each([
    "image/gif",
    "image/heic", // iPhone photos: most browsers can't show them
    "image/svg+xml", // can contain scripts
    "application/pdf",
    "", // the browser didn't know the type
  ])("refuses a %j photo", (type) => {
    expect(messagesOf({ ...valid, id_front: photo(type) })).toEqual([
      "The front of your ID must be a JPEG, PNG or WebP image",
    ]);
  });

  it("refuses an empty file", () => {
    expect(messagesOf({ ...valid, selfie: photo("image/jpeg", 0) })).toEqual([
      "Your selfie is an empty file. Choose another photo.",
    ]);
  });

  it("needs a File, not just a Blob (the camera hands over a File, #202)", () => {
    const result = verificationSubmissionSchema.safeParse({
      ...valid,
      selfie: new Blob([new Uint8Array(100)], { type: "image/jpeg" }),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["selfie"]);
  });

  it.each([false, undefined])("needs consent (got %j)", (consent) => {
    const result = verificationSubmissionSchema.safeParse({
      ...valid,
      consent,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["consent"]);
    expect(result.error?.issues[0].message).toContain("Tick the box");
  });
});

// #256: the admin's decision. 0008's rejection_reason_matches_status CHECK
// only refuses a reason that's empty once spaces are removed; this schema
// has to be at least as strict, so the database never refuses what the
// Reject dialog accepts.
describe("verificationReviewSchema", () => {
  const submissionId = "b1b2c3d4-0000-4000-8000-000000000002";

  /** The first issue's message, or null if the values are valid. */
  function firstMessage(values: unknown) {
    const result = verificationReviewSchema.safeParse(values);
    return result.success ? null : result.error.issues[0].message;
  }

  it("accepts an approval", () => {
    expect(
      verificationReviewSchema.parse({ submissionId, decision: "approve" }),
    ).toEqual({ submissionId, decision: "approve" });
  });

  it("drops a reason sent with an approval (an approval has none)", () => {
    expect(
      verificationReviewSchema.parse({
        submissionId,
        decision: "approve",
        reason: "Looks fine",
      }),
    ).toEqual({ submissionId, decision: "approve" });
  });

  it("accepts a rejection with a reason, trimmed", () => {
    expect(
      verificationReviewSchema.parse({
        submissionId,
        decision: "reject",
        reason: "  The ID photo is blurry.\n",
      }),
    ).toEqual({
      submissionId,
      decision: "reject",
      reason: "The ID photo is blurry.",
    });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["only spaces", "   "],
    ["only tabs and line breaks", "\t\n\r\n"],
    ["only no-break and ideographic spaces", "\u00A0\u3000"],
  ])("refuses a rejection whose reason is %s", (_what, reason) => {
    expect(firstMessage({ submissionId, decision: "reject", reason })).toBe(
      "Write the reason the landlord will see, so they know what to fix",
    );
  });

  it(`allows a reason of up to ${REJECTION_REASON_MAX_LENGTH} characters`, () => {
    const longest = "a".repeat(REJECTION_REASON_MAX_LENGTH);
    expect(
      firstMessage({ submissionId, decision: "reject", reason: longest }),
    ).toBeNull();
    expect(
      firstMessage({ submissionId, decision: "reject", reason: `${longest}a` }),
    ).toBe(
      `Keep the reason to ${REJECTION_REASON_MAX_LENGTH} characters or fewer`,
    );
  });

  it("counts the length after trimming", () => {
    const longest = "a".repeat(REJECTION_REASON_MAX_LENGTH);
    expect(
      firstMessage({
        submissionId,
        decision: "reject",
        reason: `  ${longest}  `,
      }),
    ).toBeNull();
  });

  it.each(["", "not-a-uuid", "../landlord_verifications", undefined])(
    "refuses a submission id that isn't a UUID (%j)",
    (badId) => {
      expect(
        firstMessage({ submissionId: badId, decision: "approve" }),
      ).toContain("This verification's id isn't valid");
    },
  );

  it.each(["pending", "approved", "", undefined])(
    "refuses any decision but approve or reject (%j)",
    (decision) => {
      expect(
        verificationReviewSchema.safeParse({ submissionId, decision }).success,
      ).toBe(false);
    },
  );

  it("the Reject dialog's part is the same rule", () => {
    // rejectionSchema is one branch of verificationReviewSchema, so the
    // dialog and the server can't disagree.
    expect(
      rejectionSchema.safeParse({
        submissionId,
        decision: "reject",
        reason: " ",
      }).success,
    ).toBe(false);
    expect(
      rejectionSchema.parse({
        submissionId,
        decision: "reject",
        reason: " x ",
      }),
    ).toEqual({ submissionId, decision: "reject", reason: "x" });
  });
});
