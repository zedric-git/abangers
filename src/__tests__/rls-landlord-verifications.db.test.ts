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
 *
 * SAFE ON SHARED DATA: nothing here is ever saved. Each insert is either
 * blocked by RLS (42501) or gets past RLS and is then stopped by a CHECK
 * rule (23514). Postgres runs RLS checks *before* CHECK constraints, so a
 * 23514 proves RLS allowed the insert — that's how the "allowed" case is
 * tested without leaving a row behind. A real row couldn't be removed
 * from here (landlords have no delete policy, on purpose), so if a test
 * fails because an insert went through, delete the stray row in the
 * Supabase dashboard (Table Editor → landlord_verifications).
 *
 * landlord1 (A) becomes the verified seed landlord and landlord2 (B)
 * stays unverified (#206). The cases that need A's approved row — reading
 * your own row, resubmitting (23505), the name lock — are added with that
 * seed data in #206.
 *
 * Run with: npm run test:db   (needs .env.local, the seed data, and
 * migration 0008 pushed to the shared project)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  LANDLORD_A_EMAIL,
  LANDLORD_B_EMAIL,
  RENTER_EMAIL,
  newClient,
  signedInAs,
} from "./db-helpers";

/**
 * A submission that passes every rule for `ownerId`. Each test changes
 * one thing about it — never insert it unchanged, or it would really be
 * saved. The files don't need to exist in storage for these tests.
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

  it("a landlord cannot read another landlord's submissions", async () => {
    // RLS filters other landlords' rows out: no error, just nothing back.
    // (Until #206 seeds landlord A's approved submission, A has no rows
    // anyway — the seed is what makes this case bite.)
    const { data, error } = await landlordB.client
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
