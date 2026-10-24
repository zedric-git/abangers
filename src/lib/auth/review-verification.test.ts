import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";
import {
  loadPendingVerifications,
  photoPathsOf,
  photosWithLinks,
  reviewChanges,
  reviewErrorReason,
  reviewVerification,
} from "./review-verification";

const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const SUBMISSION_ID = "b1b2c3d4-0000-4000-8000-000000000002";
const FOLDER = `11111111-1111-4111-8111-111111111111/${SUBMISSION_ID}`;

// It logs what went wrong to the console; keep the test output clean.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("photoPathsOf", () => {
  it("lists the front, back and selfie of an ID", () => {
    expect(
      photoPathsOf({
        id_front_path: `${FOLDER}/id-front.jpg`,
        id_back_path: `${FOLDER}/id-back.jpg`,
        selfie_path: `${FOLDER}/selfie.jpg`,
      }),
    ).toEqual([
      { name: "id-front", path: `${FOLDER}/id-front.jpg` },
      { name: "id-back", path: `${FOLDER}/id-back.jpg` },
      { name: "selfie", path: `${FOLDER}/selfie.jpg` },
    ]);
  });

  it("has no back for a passport", () => {
    expect(
      photoPathsOf({
        id_front_path: `${FOLDER}/id-front.jpg`,
        id_back_path: null,
        selfie_path: `${FOLDER}/selfie.jpg`,
      }).map((photo) => photo.name),
    ).toEqual(["id-front", "selfie"]);
  });
});

describe("photosWithLinks", () => {
  const photos = photoPathsOf({
    id_front_path: `${FOLDER}/id-front.jpg`,
    id_back_path: null,
    selfie_path: `${FOLDER}/selfie.jpg`,
  });
  const link = (url: string) => ({ error: null, signedUrl: url });

  it("pairs each photo with its signed link", () => {
    expect(
      photosWithLinks(photos, [link("https://a/front"), link("https://a/me")]),
    ).toEqual([
      { name: "id-front", url: "https://a/front" },
      { name: "selfie", url: "https://a/me" },
    ]);
  });

  it.each([
    ["Storage refused the request", null],
    ["a link is missing", [link("https://a/front")]],
    [
      "one photo has an error (e.g. the file isn't there)",
      [link("https://a/front"), { error: "Object not found", signedUrl: null }],
    ],
    [
      "one photo has no link",
      [link("https://a/front"), { error: null, signedUrl: null }],
    ],
  ])("is null when %s, so Approve stays off", (_why, links) => {
    expect(photosWithLinks(photos, links)).toBeNull();
  });
});

describe("reviewChanges", () => {
  const now = new Date("2026-10-24T02:00:00Z");

  it("approves with no reason, as the admin, now", () => {
    expect(
      reviewChanges(
        { submissionId: SUBMISSION_ID, decision: "approve" },
        ADMIN_ID,
        now,
      ),
    ).toEqual({
      status: "approved",
      rejection_reason: null,
      reviewed_at: "2026-10-24T02:00:00.000Z",
      reviewed_by: ADMIN_ID,
    });
  });

  it("rejects with the reason the landlord will see", () => {
    expect(
      reviewChanges(
        {
          submissionId: SUBMISSION_ID,
          decision: "reject",
          reason: "The ID photo is blurry.",
        },
        ADMIN_ID,
        now,
      ),
    ).toEqual({
      status: "rejected",
      rejection_reason: "The ID photo is blurry.",
      reviewed_at: "2026-10-24T02:00:00.000Z",
      reviewed_by: ADMIN_ID,
    });
  });

  it("only ever changes 0014's four review columns", () => {
    expect(
      Object.keys(
        reviewChanges(
          { submissionId: SUBMISSION_ID, decision: "approve" },
          ADMIN_ID,
          now,
        ),
      ).sort(),
    ).toEqual(["rejection_reason", "reviewed_at", "reviewed_by", "status"]);
  });
});

describe("reviewErrorReason", () => {
  it.each([
    ["42501", "not_allowed"],
    ["23514", "invalid_input"],
    ["08006", "save_failed"],
    [undefined, "save_failed"],
  ])("%s → %s", (code, reason) => {
    expect(reviewErrorReason(code)).toBe(reason);
  });
});

/** What the fake Supabase client answers. */
interface FakeSetup {
  /** The caller's profiles.role, or null for no profile row. */
  role?: string | null;
  roleReadFails?: boolean;
  /** Whether the update finds the submission still pending. */
  stillPending?: boolean;
  updateErrorCode?: string;
}

/**
 * A stand-in for the Supabase client with just what reviewVerification
 * calls, recording each update and its filters.
 */
function fakeSupabase(setup: FakeSetup = {}) {
  const {
    role = "admin",
    roleReadFails = false,
    stillPending = true,
    updateErrorCode,
  } = setup;
  const updates: {
    table: string;
    changes: Record<string, unknown>;
    filters: [string, unknown][];
  }[] = [];

  const client = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                roleReadFails
                  ? { data: null, error: { message: "network error" } }
                  : { data: role === null ? null : { role }, error: null },
            }),
          }),
        };
      }
      return {
        update(changes: Record<string, unknown>) {
          const update = { table, changes, filters: [] as [string, unknown][] };
          updates.push(update);
          const chain = {
            eq(column: string, value: unknown) {
              update.filters.push([column, value]);
              return chain;
            },
            select: () => chain,
            maybeSingle: async () =>
              updateErrorCode
                ? {
                    data: null,
                    error: { code: updateErrorCode, message: "refused" },
                  }
                : {
                    data: stillPending ? { id: SUBMISSION_ID } : null,
                    error: null,
                  },
          };
          return chain;
        },
      };
    },
  };

  return {
    supabase: client as unknown as SupabaseClient<Database>,
    updates,
  };
}

describe("reviewVerification", () => {
  const approve = { submissionId: SUBMISSION_ID, decision: "approve" } as const;

  it("saves an approval on that submission, only while it's pending", async () => {
    const { supabase, updates } = fakeSupabase();
    expect(await reviewVerification(supabase, ADMIN_ID, approve)).toEqual({
      ok: true,
      decision: "approve",
    });
    expect(updates).toHaveLength(1);
    expect(updates[0].table).toBe("landlord_verifications");
    expect(updates[0].changes).toMatchObject({
      status: "approved",
      rejection_reason: null,
      reviewed_by: ADMIN_ID,
    });
    expect(updates[0].filters).toEqual([
      ["id", SUBMISSION_ID],
      ["status", "pending"],
    ]);
  });

  it("saves a rejection with its trimmed reason", async () => {
    const { supabase, updates } = fakeSupabase();
    expect(
      await reviewVerification(supabase, ADMIN_ID, {
        submissionId: SUBMISSION_ID,
        decision: "reject",
        reason: "  Retake the selfie in good light.  ",
      }),
    ).toEqual({ ok: true, decision: "reject" });
    expect(updates[0].changes).toMatchObject({
      status: "rejected",
      rejection_reason: "Retake the selfie in good light.",
    });
  });

  it.each([
    ["a landlord", "landlord"],
    ["a renter", "renter"],
    ["someone with no profile", null],
  ])("stops %s before saving anything", async (_who, role) => {
    const { supabase, updates } = fakeSupabase({ role });
    expect(await reviewVerification(supabase, ADMIN_ID, approve)).toMatchObject(
      { ok: false, reason: "not_admin" },
    );
    expect(updates).toEqual([]);
  });

  it("says so when it can't check the role", async () => {
    const { supabase, updates } = fakeSupabase({ roleReadFails: true });
    expect(await reviewVerification(supabase, ADMIN_ID, approve)).toMatchObject(
      { ok: false, reason: "check_failed" },
    );
    expect(updates).toEqual([]);
  });

  it("refuses a rejection without a reason, with the schema's message", async () => {
    const { supabase, updates } = fakeSupabase();
    expect(
      await reviewVerification(supabase, ADMIN_ID, {
        submissionId: SUBMISSION_ID,
        decision: "reject",
        reason: "   ",
      }),
    ).toEqual({
      ok: false,
      reason: "invalid_input",
      message:
        "Write the reason the landlord will see, so they know what to fix",
    });
    expect(updates).toEqual([]);
  });

  it("says it was already reviewed when no pending submission matched", async () => {
    const { supabase } = fakeSupabase({ stillPending: false });
    expect(await reviewVerification(supabase, ADMIN_ID, approve)).toMatchObject(
      { ok: false, reason: "already_reviewed" },
    );
  });

  it("reports RLS refusing the update as not allowed", async () => {
    const { supabase } = fakeSupabase({ updateErrorCode: "42501" });
    expect(await reviewVerification(supabase, ADMIN_ID, approve)).toMatchObject(
      { ok: false, reason: "not_allowed" },
    );
  });
});

describe("loadPendingVerifications", () => {
  /** A stand-in client whose pending-list query answers with `result`. */
  function clientAnswering(result: { data: unknown; error: unknown }) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: async () => result,
    };
    return { from: () => chain } as unknown as SupabaseClient<Database>;
  }

  it("lists each submission with its landlord's name and email", async () => {
    const supabase = clientAnswering({
      data: [
        {
          id: SUBMISSION_ID,
          id_type: "passport",
          submitted_at: "2026-10-23T08:00:00Z",
          landlord: { full_name: " Rosa Villanueva ", email: "" },
        },
      ],
      error: null,
    });
    expect(await loadPendingVerifications(supabase)).toEqual({
      ok: true,
      items: [
        {
          id: SUBMISSION_ID,
          idType: "passport",
          submittedAt: "2026-10-23T08:00:00Z",
          landlordName: "Rosa Villanueva",
          landlordEmail: null,
        },
      ],
    });
  });

  it("says the read failed instead of listing nothing", async () => {
    const supabase = clientAnswering({
      data: null,
      error: { message: "network error" },
    });
    expect(await loadPendingVerifications(supabase)).toEqual({ ok: false });
  });
});
