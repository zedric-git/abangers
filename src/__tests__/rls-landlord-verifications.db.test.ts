/**
 * RLS test for public.landlord_verifications (S1-15.1 / #199) — runs
 * against the REAL shared Supabase project, signed in as the seed
 * accounts.
 *
 * Checks supabase/migrations/0008_create_landlord_verifications.sql:
 * - A landlord can submit a pending verification for themselves, but not
 *   for someone else, and not one that's already approved.
 * - Renters and anonymous visitors can't submit at all.
 * - Nobody can update (approve) or delete a submission from the app.
 * - A landlord can't read another landlord's submissions.
 * - The CHECK rules: a back photo for every ID except a passport, and
 *   every file inside the landlord's own folder.
 * - With landlord1's approved submission (#206): they can read it, can't
 *   change or withdraw it, and can't submit another one while it's
 *   approved (23505). Other landlords and renters can't read it.
 * - The app's submit logic (#204, src/lib/auth/submit-verification.ts):
 *   its check before uploading agrees with the seed data, and Storage
 *   refusing an upload reaches the landlord as "not allowed".
 * - Where a landlord stands, as the dashboard shows it (#205,
 *   src/lib/auth/landlord-status.ts): it agrees with the seed data. These
 *   only read.
 *
 * SEED DATA (supabase/seed.sql, #206): landlord1 (A) has one approved
 * submission (LANDLORD_A_SUBMISSION_ID) and landlord2 (B) has none. If a
 * test says otherwise, run `npm run db:seed`. The name lock that comes
 * with being verified is tested in rls-profiles.db.test.ts.
 *
 * SAFE ON SHARED DATA: nothing here is ever saved. Each insert is either
 * blocked by RLS (42501), or gets past RLS and is then stopped by a CHECK
 * rule (23514) or by the one-open-submission index (23505). Postgres runs
 * RLS checks *before* CHECK constraints, so a 23514 proves RLS allowed
 * the insert — that's how the "allowed" case is tested without leaving a
 * row behind. A real row couldn't be removed from here (landlords have no
 * delete policy, on purpose), so if a test fails because an insert went
 * through, run `npm run db:seed` (it deletes the seed landlords' other
 * submissions) or delete the stray row in the Supabase dashboard (Table
 * Editor → landlord_verifications).
 *
 * Run with: npm run test:db   (needs .env.local, the seed data, and
 * migration 0008 pushed to the shared project)
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  loadLandlordStatus,
  type LandlordStatus,
} from "@/lib/auth/landlord-status";
import {
  VERIFICATION_BUCKET,
  checkCanSubmitVerification,
  submitVerification,
} from "@/lib/auth/submit-verification";
import {
  LANDLORD_A_EMAIL,
  LANDLORD_A_SUBMISSION_ID,
  LANDLORD_B_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
  type SeedUser,
} from "./db-helpers";

/**
 * A submission that passes every rule for `ownerId`. Each test changes
 * one thing about it — never insert it unchanged, or it would really be
 * saved (the one exception is the resubmit test: landlord1 is already
 * approved, so the one-open-submission index stops it). The files don't
 * need to exist in storage for these tests.
 */
function submissionFor(ownerId: string) {
  return {
    landlord_id: ownerId,
    id_type: "drivers_license",
    id_front_path: `${ownerId}/rls-test/id-front.jpg`,
    id_back_path: `${ownerId}/rls-test/id-back.jpg`,
    selfie_path: `${ownerId}/rls-test/selfie.jpg`,
    consent_given_at: new Date().toISOString(),
  };
}

/**
 * Tries to submit `row` as `client` and returns the error (null if it was
 * saved). A plain insert, without .select(): returning the new row would
 * also run the SELECT policy, which could block an insert that the INSERT
 * policy wrongly allowed — and hide that bug.
 */
async function submit(client: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await client.from("landlord_verifications").insert(row);
  return error;
}

describe("landlord_verifications RLS", () => {
  let landlordA: { client: SupabaseClient; userId: string };
  let landlordB: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    landlordA = await signedInAs(LANDLORD_A_EMAIL);
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
  });

  it("RLS lets a landlord submit their own pending verification", async () => {
    // An unknown ID type gets past RLS, then the CHECK rule stops it, so
    // nothing is saved. 23514 (not 42501) means RLS allowed the insert.
    const error = await submit(landlordB.client, {
      ...submissionFor(landlordB.userId),
      id_type: "library_card",
    });
    expect(error?.code).toBe("23514");
    expect(error?.message).toContain("id_type_is_known");
  });

  it("a landlord cannot submit a verification for another landlord", async () => {
    const error = await submit(
      landlordA.client,
      submissionFor(landlordB.userId),
    );
    expect(error?.code).toBe("42501");
  });

  it("a landlord cannot submit an already-approved verification", async () => {
    const error = await submit(landlordB.client, {
      ...submissionFor(landlordB.userId),
      status: "approved",
    });
    expect(error?.code).toBe("42501");
  });

  it("a verified landlord cannot submit another verification", async () => {
    // A valid submission: it gets past RLS and every CHECK rule, and only
    // the one-open-submission index stops it, because landlord1 is already
    // approved. If that index were ever missing, this row would really be
    // saved, so it gets an id the failure message can name.
    const id = randomUUID();
    const error = await submit(landlordA.client, {
      ...submissionFor(landlordA.userId),
      id,
    });
    expect(
      error?.code,
      `If this says undefined, submission ${id} was saved: run npm run db:seed to remove it.`,
    ).toBe("23505");
    expect(error?.message).toContain(
      "landlord_verifications_one_pending_or_approved",
    );
  });

  it("a renter cannot submit a verification, even for themselves", async () => {
    const renter = await signedInAs(RENTER_EMAIL);
    const error = await submit(renter.client, submissionFor(renter.userId));
    expect(error?.code).toBe("42501");
  });

  it("an ID other than a passport needs a back photo", async () => {
    const error = await submit(landlordB.client, {
      ...submissionFor(landlordB.userId),
      id_back_path: null,
    });
    expect(error?.code).toBe("23514");
    expect(error?.message).toContain("id_back_matches_id_type");
  });

  it("a passport has no back photo (photo page only)", async () => {
    const error = await submit(landlordB.client, {
      ...submissionFor(landlordB.userId),
      id_type: "passport",
    });
    expect(error?.code).toBe("23514");
    expect(error?.message).toContain("id_back_matches_id_type");
  });

  it.each(["id_front_path", "id_back_path", "selfie_path"])(
    "%s must be inside the landlord's own folder",
    async (field) => {
      const error = await submit(landlordB.client, {
        ...submissionFor(landlordB.userId),
        [field]: `${landlordA.userId}/rls-test/not-mine.jpg`,
      });
      expect(error?.code).toBe("23514");
      expect(error?.message).toContain("files_in_landlords_own_folder");
    },
  );

  it("a landlord cannot update (e.g. approve) or delete a submission", async () => {
    // Landlords have no UPDATE or DELETE grant at all, so these are
    // permission errors (42501), not silent 0-row results.
    const { error: updateError } = await landlordB.client
      .from("landlord_verifications")
      .update({ status: "approved" })
      .eq("landlord_id", landlordB.userId);
    expect(updateError?.code).toBe("42501");

    const { error: deleteError } = await landlordB.client
      .from("landlord_verifications")
      .delete()
      .eq("landlord_id", landlordB.userId);
    expect(deleteError?.code).toBe("42501");
  });

  it("a verified landlord cannot change or withdraw their approved submission", async () => {
    // The same permission errors, this time on a real row. The update
    // writes the status it already has, so even if it got through,
    // nothing would change. If the delete ever got through, run
    // `npm run db:seed` to put the row back.
    const { error: updateError } = await landlordA.client
      .from("landlord_verifications")
      .update({ status: "approved" })
      .eq("id", LANDLORD_A_SUBMISSION_ID);
    expect(updateError?.code).toBe("42501");

    const { error: deleteError } = await landlordA.client
      .from("landlord_verifications")
      .delete()
      .eq("id", LANDLORD_A_SUBMISSION_ID);
    expect(deleteError?.code).toBe("42501");
  });

  it("a landlord can read their own submission", async () => {
    // landlord1's approved submission from the seed data (#206), with its
    // files in their own folder.
    const { data, error } = await landlordA.client
      .from("landlord_verifications")
      .select("id, status, id_front_path")
      .eq("landlord_id", landlordA.userId);
    expect(error).toBeNull();
    expect(data).toEqual([
      {
        id: LANDLORD_A_SUBMISSION_ID,
        status: "approved",
        id_front_path: `${landlordA.userId}/${LANDLORD_A_SUBMISSION_ID}/id-front.jpg`,
      },
    ]);
  });

  it("a landlord cannot read another landlord's submissions", async () => {
    // RLS filters other landlords' rows out: no error, just nothing back,
    // although landlord1 has a submission (see the test above).
    const { data, error } = await landlordB.client
      .from("landlord_verifications")
      .select("id")
      .eq("landlord_id", landlordA.userId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a renter cannot read a landlord's submissions", async () => {
    const renter = await signedInAs(RENTER_EMAIL);
    const { data, error } = await renter.client
      .from("landlord_verifications")
      .select("id")
      .eq("landlord_id", landlordA.userId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anonymous visitors cannot read or submit verifications", async () => {
    const anon = newClient();

    // anon has no grants on this table at all (0008), so both are
    // permission errors rather than empty results.
    const { error: readError } = await anon
      .from("landlord_verifications")
      .select("id");
    expect(readError?.code).toBe("42501");

    const writeError = await submit(anon, submissionFor(landlordB.userId));
    expect(writeError?.code).toBe("42501");
  });
});

// #204: the submit logic the Verify account page uses. Nothing is saved
// here either: the checks only read, and the one submit is refused at its
// first upload.
describe("submitting from the app (submit-verification.ts, #204)", () => {
  let landlordA: SeedUser;
  let landlordB: SeedUser;

  beforeAll(async () => {
    landlordA = await signedInAs(LANDLORD_A_EMAIL);
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
  });

  it("lets landlord2 submit: a landlord with no submissions", async () => {
    const result = await checkCanSubmitVerification(
      landlordB.client,
      landlordB.userId,
    );
    expect(result).toEqual({ ok: true });
  });

  it("stops landlord1 before uploading anything: they're already verified", async () => {
    const result = await checkCanSubmitVerification(
      landlordA.client,
      landlordA.userId,
    );
    expect(result).toMatchObject({ ok: false, reason: "already_verified" });
  });

  it("stops a renter before uploading anything", async () => {
    const renter = await signedInAs(RENTER_EMAIL);
    const result = await checkCanSubmitVerification(
      renter.client,
      renter.userId,
    );
    expect(result).toMatchObject({ ok: false, reason: "not_landlord" });
  });

  it('reports Storage refusing an upload ("403") as not allowed', async () => {
    // The app always passes the signed-in landlord's own id. Here landlord2
    // passes landlord1's id instead: RLS hides landlord1's submissions from
    // landlord2, so the check lets it through, and then Storage refuses
    // the first upload, because it's not landlord2's folder. This checks
    // that the app reads Storage's real error code (error.statusCode, not
    // error.status, #213). The upload is refused, so the row is never
    // sent and nothing is saved.
    const foldersOfLandlordA = async () => {
      const { data, error } = await landlordA.client.storage
        .from(VERIFICATION_BUCKET)
        .list(landlordA.userId);
      if (error) throw error;
      return data.map((entry) => entry.name).sort();
    };
    const before = await foldersOfLandlordA();
    const photo = (name: string) =>
      new File(["rls test"], name, { type: "image/jpeg" });

    // submitVerification logs the refusal; keep the test output clean.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const result = await submitVerification(
        landlordB.client,
        landlordA.userId,
        {
          // A passport: only 2 photos, in case a broken policy let them in.
          id_type: "passport",
          id_front: photo("id-front.jpg"),
          selfie: photo("selfie.jpg"),
          consent: true,
        },
      );
      expect(result).toMatchObject({ ok: false, reason: "not_allowed" });
    } finally {
      consoleError.mockRestore();
    }

    expect(
      await foldersOfLandlordA(),
      `If there's a new folder, delete it in the Supabase dashboard (Storage → ${VERIFICATION_BUCKET} → ${landlordA.userId}).`,
    ).toEqual(before);
  });
});

// #205: where a landlord stands, as the dashboard shows it (the banner,
// the Profile badge, the lock on Add New Listing and the read-only name).
// Only reads: nothing is saved.
describe("where a landlord stands (landlord-status.ts, #205)", () => {
  let landlordA: SeedUser;
  let landlordB: SeedUser;

  beforeAll(async () => {
    landlordA = await signedInAs(LANDLORD_A_EMAIL);
    landlordB = await signedInAs(LANDLORD_B_EMAIL);
  });

  it("landlord1 is verified, with a complete profile, so they can post", async () => {
    expect(
      await loadLandlordStatus(landlordA.client, landlordA.userId),
    ).toEqual({
      verification: "verified",
      rejectionReason: null,
      profileComplete: true,
      canCreateListings: true,
      fullName: "Maria Santos",
    } satisfies LandlordStatus);
  });

  it("landlord2 has a complete profile but isn't verified, so they can't post yet", async () => {
    expect(
      await loadLandlordStatus(landlordB.client, landlordB.userId),
    ).toEqual({
      verification: "not_verified",
      rejectionReason: null,
      profileComplete: true,
      canCreateListings: false,
      fullName: "Jun Dela Cruz",
    } satisfies LandlordStatus);
  });
});
