import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import {
  decideCanSubmitVerification,
  saveErrorReason,
  submitVerification,
  uploadErrorReason,
  verificationPhotoPath,
  verificationStatusOf,
  type CannotSubmitVerificationReason,
  type VerificationProfile,
  type VerificationStatus,
} from "./submit-verification";

const LANDLORD_ID = "11111111-1111-4111-8111-111111111111";

/** What crypto.randomUUID() makes (a version 4 UUID). */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A small photo. Only its type matters here. */
function photo(type = "image/jpeg") {
  return new File([new Uint8Array(100)], "photo", { type });
}

const landlord: VerificationProfile = { role: "landlord" };

describe("verificationStatusOf", () => {
  it.each([
    [[], "not_verified"],
    [["rejected"], "rejected"],
    [["rejected", "rejected"], "rejected"],
    [["rejected", "pending"], "pending"],
    [["approved"], "verified"],
    [["rejected", "approved"], "verified"],
  ] satisfies [string[], VerificationStatus][])(
    "%j → %s",
    (statuses, status) => {
      expect(verificationStatusOf(statuses)).toBe(status);
    },
  );
});

describe("decideCanSubmitVerification", () => {
  it("lets a landlord who never sent one submit", () => {
    expect(decideCanSubmitVerification(landlord, [])).toEqual({ ok: true });
  });

  it("lets a landlord submit again after a rejection", () => {
    expect(
      decideCanSubmitVerification(landlord, ["rejected", "rejected"]),
    ).toEqual({ ok: true });
  });

  it("stops a landlord whose verification is still being reviewed", () => {
    expect(
      decideCanSubmitVerification(landlord, ["rejected", "pending"]),
    ).toMatchObject({ ok: false, reason: "already_pending" });
  });

  it("stops a verified landlord", () => {
    expect(
      decideCanSubmitVerification(landlord, ["rejected", "approved"]),
    ).toMatchObject({ ok: false, reason: "already_verified" });
  });

  it("stops renters, whatever their rows say", () => {
    expect(decideCanSubmitVerification({ role: "renter" }, [])).toMatchObject({
      ok: false,
      reason: "not_landlord",
    });
  });

  it("sends a user with no profiles row to their Profile page", () => {
    expect(decideCanSubmitVerification(null, [])).toMatchObject({
      ok: false,
      reason: "profile_missing",
    });
  });
});

describe("verificationPhotoPath", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("puts a %s photo in the submission's folder, as .%s", (type, ext) => {
    expect(
      verificationPhotoPath(
        LANDLORD_ID,
        "submission-1",
        "id-front",
        photo(type),
      ),
    ).toBe(`${LANDLORD_ID}/submission-1/id-front.${ext}`);
  });
});

describe("uploadErrorReason (Storage's error.statusCode)", () => {
  it.each([
    ["413", "photo_too_big"],
    ["415", "wrong_photo_type"],
    ["403", "not_allowed"],
    ["409", "upload_failed"],
    ["500", "upload_failed"],
    [undefined, "upload_failed"], // a network error has no statusCode
  ] satisfies [string | undefined, CannotSubmitVerificationReason][])(
    "%s → %s",
    (statusCode, reason) => {
      expect(uploadErrorReason(statusCode)).toBe(reason);
    },
  );
});

describe("saveErrorReason (the insert's error.code)", () => {
  it.each([
    ["23505", "already_pending"],
    ["42501", "not_allowed"],
    ["23514", "save_failed"],
    [undefined, "save_failed"],
  ] satisfies [string | undefined, CannotSubmitVerificationReason][])(
    "%s → %s",
    (code, reason) => {
      expect(saveErrorReason(code)).toBe(reason);
    },
  );
});

/** How the fake client should answer. */
type FakeSetup = {
  /** The landlord's profiles row (null = they have none). */
  profile?: VerificationProfile | null;
  /** The status of each of their landlord_verifications rows. */
  statuses?: string[];
  /** Both reads fail, e.g. no connection. */
  readFails?: boolean;
  /**
   * Storage refuses the upload at that position (0 = the first photo).
   * `{}` = a network error, which has no statusCode.
   */
  uploadErrors?: Record<number, { statusCode?: string }>;
  /** The insert fails with this Postgres error code. */
  insertErrorCode?: string;
};

/**
 * A stand-in for the Supabase client, with just the calls
 * submitVerification makes. It answers the two reads from `setup`, and
 * records every call in `calls.log`, so a test can check what was sent,
 * in which order, and what wasn't sent at all.
 */
function fakeSupabase(setup: FakeSetup = {}) {
  const {
    profile = landlord,
    statuses = [],
    readFails = false,
    uploadErrors = {},
    insertErrorCode,
  } = setup;
  const readError = readFails ? { message: "network error" } : null;

  const calls = {
    log: [] as string[],
    uploads: [] as {
      bucket: string;
      path: string;
      photo: File;
      options: unknown;
    }[],
    inserts: [] as { table: string; row: Record<string, unknown> }[],
  };

  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              calls.log.push(`read ${table}`);
              if (table === "profiles") {
                return {
                  maybeSingle: async () => ({
                    data: readFails ? null : profile,
                    error: readError,
                  }),
                };
              }
              return Promise.resolve({
                data: readFails ? null : statuses.map((status) => ({ status })),
                error: readError,
              });
            },
          };
        },
        async insert(row: Record<string, unknown>) {
          calls.log.push(`insert ${table}`);
          calls.inserts.push({ table, row });
          return {
            error: insertErrorCode
              ? { code: insertErrorCode, message: "refused" }
              : null,
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, photo: File, options: unknown) {
            const refusal = uploadErrors[calls.uploads.length];
            calls.log.push(`upload ${path}`);
            calls.uploads.push({ bucket, path, photo, options });
            // Like the real thing: HTTP 400 for every refusal, with the
            // real code in statusCode (#213).
            return refusal
              ? {
                  data: null,
                  error: { message: "refused", status: 400, ...refusal },
                }
              : { data: { path }, error: null };
          },
        };
      },
    },
  };

  return { supabase: client as unknown as SupabaseClient<Database>, calls };
}

describe("submitVerification", () => {
  // It logs what went wrong to the console; keep the test output clean.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A driver's license, so all three photos (of three different types). */
  function licenseSubmission() {
    return {
      id_type: "drivers_license" as const,
      id_front: photo("image/jpeg"),
      id_back: photo("image/png"),
      selfie: photo("image/webp"),
      consent: true,
    };
  }

  it("checks, uploads the photos into a new folder, then saves a pending submission", async () => {
    const values = licenseSubmission();
    const { supabase, calls } = fakeSupabase();
    const before = Date.now();

    const result = await submitVerification(supabase, LANDLORD_ID, values);

    expect(result.ok).toBe(true);
    const submissionId = result.ok ? result.submissionId : "";
    expect(submissionId).toMatch(UUID);
    const folder = `${LANDLORD_ID}/${submissionId}`;

    // Check first, then every upload, and only then the save.
    expect(calls.log).toEqual([
      "read profiles",
      "read landlord_verifications",
      `upload ${folder}/id-front.jpg`,
      `upload ${folder}/id-back.png`,
      `upload ${folder}/selfie.webp`,
      "insert landlord_verifications",
    ]);

    // The landlord's own photos, to the private bucket, never replacing a
    // file.
    expect(calls.uploads.map((upload) => upload.photo)).toHaveLength(3);
    expect(calls.uploads[0].photo).toBe(values.id_front);
    expect(calls.uploads[1].photo).toBe(values.id_back);
    expect(calls.uploads[2].photo).toBe(values.selfie);
    for (const upload of calls.uploads) {
      expect(upload.bucket).toBe("verification-documents");
      expect(upload.options).toEqual({ upsert: false });
    }

    // One row with the same id. No status, rejection_reason or
    // reviewed_at: their defaults make it a fresh pending submission,
    // the only kind 0008's insert policy accepts.
    expect(calls.inserts).toEqual([
      {
        table: "landlord_verifications",
        row: {
          id: submissionId,
          landlord_id: LANDLORD_ID,
          id_type: "drivers_license",
          id_front_path: `${folder}/id-front.jpg`,
          id_back_path: `${folder}/id-back.png`,
          selfie_path: `${folder}/selfie.webp`,
          consent_given_at: expect.any(String),
        },
      },
    ]);
    const consentTime = Date.parse(
      calls.inserts[0].row.consent_given_at as string,
    );
    expect(consentTime).toBeGreaterThanOrEqual(before);
    expect(consentTime).toBeLessThanOrEqual(Date.now());
  });

  it("uploads only the photo page and the selfie for a passport", async () => {
    const { supabase, calls } = fakeSupabase();
    const result = await submitVerification(supabase, LANDLORD_ID, {
      ...licenseSubmission(),
      id_type: "passport",
      id_back: undefined,
    });

    expect(result.ok).toBe(true);
    expect(calls.uploads.map((upload) => upload.path.split("/")[2])).toEqual([
      "id-front.jpg",
      "selfie.webp",
    ]);
    expect(calls.inserts[0].row.id_type).toBe("passport");
    expect(calls.inserts[0].row.id_back_path).toBeNull();
  });

  it("lets a landlord send a new one after a rejection", async () => {
    const { supabase, calls } = fakeSupabase({ statuses: ["rejected"] });
    const result = await submitVerification(
      supabase,
      LANDLORD_ID,
      licenseSubmission(),
    );
    expect(result.ok).toBe(true);
    expect(calls.uploads).toHaveLength(3);
    expect(calls.inserts).toHaveLength(1);
  });

  it("uses a new folder for every submission", async () => {
    const first = await submitVerification(
      fakeSupabase().supabase,
      LANDLORD_ID,
      licenseSubmission(),
    );
    const second = await submitVerification(
      fakeSupabase().supabase,
      LANDLORD_ID,
      licenseSubmission(),
    );
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.submissionId).not.toBe(second.submissionId);
    }
  });

  it("sends nothing when the form values are wrong, and says what's wrong", async () => {
    const { supabase, calls } = fakeSupabase();
    const result = await submitVerification(supabase, LANDLORD_ID, {
      ...licenseSubmission(),
      selfie: undefined as unknown as File,
    });
    // The schema's own message, which names the field.
    expect(result).toEqual({
      ok: false,
      reason: "invalid_input",
      message: "Take a selfie",
    });
    expect(calls.log).toEqual([]);
  });

  it.each([
    ["a renter", { profile: { role: "renter" } }, "not_landlord"],
    ["a user with no profiles row", { profile: null }, "profile_missing"],
    [
      "a landlord whose verification is still being reviewed",
      { statuses: ["rejected", "pending"] },
      "already_pending",
    ],
    ["a verified landlord", { statuses: ["approved"] }, "already_verified"],
    [
      "a landlord whose status can't be read",
      { readFails: true },
      "check_failed",
    ],
  ] satisfies [string, FakeSetup, CannotSubmitVerificationReason][])(
    "uploads nothing for %s",
    async (_who, setup, reason) => {
      const { supabase, calls } = fakeSupabase(setup);
      const result = await submitVerification(
        supabase,
        LANDLORD_ID,
        licenseSubmission(),
      );
      expect(result).toMatchObject({ ok: false, reason });
      // Photos can't be deleted once uploaded, so none are.
      expect(calls.uploads).toEqual([]);
      expect(calls.inserts).toEqual([]);
    },
  );

  it.each([
    ["413", 1, "photo_too_big"],
    ["415", 0, "wrong_photo_type"],
    ["403", 0, "not_allowed"],
    ["409", 2, "upload_failed"],
    [undefined, 1, "upload_failed"], // a network error: no statusCode
  ] satisfies [string | undefined, number, CannotSubmitVerificationReason][])(
    "stops at a refused upload (%s on photo %i): %s",
    async (statusCode, position, reason) => {
      const { supabase, calls } = fakeSupabase({
        uploadErrors: { [position]: { statusCode } },
      });
      const result = await submitVerification(
        supabase,
        LANDLORD_ID,
        licenseSubmission(),
      );
      expect(result).toMatchObject({ ok: false, reason });
      // Nothing after the refused upload: no more photos, and no row.
      expect(calls.uploads).toHaveLength(position + 1);
      expect(calls.inserts).toEqual([]);
    },
  );

  it.each([
    ["23505", "already_pending"], // e.g. sent from another tab in between
    ["42501", "not_allowed"],
    ["23514", "save_failed"],
  ] satisfies [string, CannotSubmitVerificationReason][])(
    "reports a refused save (%s) as %s",
    async (code, reason) => {
      const { supabase, calls } = fakeSupabase({ insertErrorCode: code });
      const result = await submitVerification(
        supabase,
        LANDLORD_ID,
        licenseSubmission(),
      );
      expect(result).toMatchObject({ ok: false, reason });
      // The photos were uploaded before the save was tried.
      expect(calls.uploads).toHaveLength(3);
    },
  );

  it("gives every reason its own message", async () => {
    const setups: FakeSetup[] = [
      { profile: null },
      { profile: { role: "renter" } },
      { statuses: ["pending"] },
      { statuses: ["approved"] },
      { readFails: true },
      { uploadErrors: { 0: { statusCode: "413" } } },
      { uploadErrors: { 0: { statusCode: "415" } } },
      { uploadErrors: { 0: { statusCode: "403" } } },
      { uploadErrors: { 0: {} } },
      { insertErrorCode: "23514" },
    ];
    const messages = new Map<string, string>();
    for (const setup of setups) {
      const result = await submitVerification(
        fakeSupabase(setup).supabase,
        LANDLORD_ID,
        licenseSubmission(),
      );
      if (!result.ok) {
        messages.set(result.reason, result.message);
      }
    }
    // A different reason for each setup, each with its own message.
    expect(messages.size).toBe(setups.length);
    expect(new Set(messages.values()).size).toBe(messages.size);
    for (const message of messages.values()) {
      expect(message).not.toBe("");
    }
  });
});
