/**
 * RLS / trigger test for public.profiles (#174, #199) — runs against the
 * REAL shared Supabase project, signed in as the seed accounts.
 *
 * Checks supabase/migrations/0007_enforce_roles_in_rls.sql:
 * - A user cannot change their own `role` (renter → landlord).
 * - Writing the SAME role back still works — LandlordProfileForm upserts
 *   role = 'landlord' on every save, so this must not break.
 * - A user still cannot update someone else's profile (0001_init.sql).
 *
 * And the name lock in 0008_create_landlord_verifications.sql:
 * - A verified landlord can't change their name, but can still save the
 *   same name (the profile form saves it on every save).
 * - A landlord who isn't verified can still change their name.
 *
 * SEED DATA (supabase/seed.sql, #206): landlord1 is verified and landlord2
 * isn't. If a test says otherwise, run `npm run db:seed`.
 *
 * SAFE ON SHARED DATA: blocked writes change nothing; allowed writes put
 * the current values back (the name-lock tests restore the name in a
 * `finally`: landlord2's rename, and landlord1's if the lock is ever
 * broken). If the role lock is ever broken, the renter test switches the
 * role straight back, and `npm run db:seed` restores every seed account
 * anyway.
 *
 * Run with: npm run test:db   (needs .env.local and the seed data loaded)
 */

import { describe, expect, it } from "vitest";
import {
  LANDLORD_A_EMAIL,
  LANDLORD_A_SUBMISSION_ID,
  LANDLORD_B_EMAIL,
  RENTER_EMAIL,
  signedInAs,
} from "./db-helpers";

describe("profiles role lock", () => {
  it("a renter cannot make themselves a landlord", async () => {
    const renter = await signedInAs(RENTER_EMAIL);

    const { data, error } = await renter.client
      .from("profiles")
      .update({ role: "landlord" })
      .eq("id", renter.userId)
      .select("role");

    // If the lock is ever broken, undo the change immediately.
    if (data?.[0]?.role === "landlord") {
      await renter.client
        .from("profiles")
        .update({ role: "renter" })
        .eq("id", renter.userId);
    }

    expect(error?.code).toBe("42501");

    const { data: after } = await renter.client
      .from("profiles")
      .select("role")
      .eq("id", renter.userId)
      .single();
    expect(after?.role).toBe("renter");
  });

  it("a landlord can still save their profile with the same role (LandlordProfileForm's upsert)", async () => {
    const landlord = await signedInAs(LANDLORD_A_EMAIL);

    const { data: current, error: readError } = await landlord.client
      .from("profiles")
      .select("role, full_name")
      .eq("id", landlord.userId)
      .single();
    expect(readError).toBeNull();
    expect(current?.role).toBe("landlord");

    // Same shape as LandlordProfileForm: upsert including role. (landlord1
    // is verified, so this also shows the name lock lets the same name
    // through.)
    const { error } = await landlord.client.from("profiles").upsert({
      id: landlord.userId,
      role: "landlord",
      full_name: current!.full_name,
    });
    expect(error).toBeNull();
  });

  it("a user cannot update someone else's profile", async () => {
    const renter = await signedInAs(RENTER_EMAIL);
    const landlord = await signedInAs(LANDLORD_A_EMAIL);

    const { data, error } = await renter.client
      .from("profiles")
      .update({ full_name: "Hijacked by renter" })
      .eq("id", landlord.userId)
      .select("id");

    // RLS filters the row out: no error, 0 rows changed.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// #199: once a landlord is verified, a trigger stops them changing
// full_name (0008). In the seed data (#206), landlord1 is verified and
// landlord2 isn't, so landlord2 must still be able to rename.
describe("profiles name lock", () => {
  it("a verified landlord cannot change their name", async () => {
    const landlord = await signedInAs(LANDLORD_A_EMAIL);

    // This test relies on landlord1 being verified.
    const { data: approved, error: verificationError } = await landlord.client
      .from("landlord_verifications")
      .select("id")
      .eq("landlord_id", landlord.userId)
      .eq("status", "approved");
    expect(verificationError).toBeNull();
    expect(approved).toEqual([{ id: LANDLORD_A_SUBMISSION_ID }]);

    const { data: current, error: readError } = await landlord.client
      .from("profiles")
      .select("full_name")
      .eq("id", landlord.userId)
      .single();
    expect(readError).toBeNull();

    try {
      // The trigger raises 42501, like RLS, so nothing comes back.
      const { data, error } = await landlord.client
        .from("profiles")
        .update({ full_name: `${current!.full_name} (name-lock test)` })
        .eq("id", landlord.userId)
        .select("id");
      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    } finally {
      // If the lock is ever broken, put the real name back. (When it
      // works, this saves the same name, which the lock allows.)
      await landlord.client
        .from("profiles")
        .update({ full_name: current!.full_name })
        .eq("id", landlord.userId);
    }
  });

  it("a verified landlord can still save the same name", async () => {
    // The profile forms save full_name on every save, so writing the same
    // value back must keep working once a landlord is verified.
    const landlord = await signedInAs(LANDLORD_A_EMAIL);

    const { data: current, error: readError } = await landlord.client
      .from("profiles")
      .select("full_name")
      .eq("id", landlord.userId)
      .single();
    expect(readError).toBeNull();

    const { data, error } = await landlord.client
      .from("profiles")
      .update({ full_name: current!.full_name })
      .eq("id", landlord.userId)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("a landlord who isn't verified can still change their name", async () => {
    const landlord = await signedInAs(LANDLORD_B_EMAIL);

    // This test relies on landlord2 having no approved verification.
    const { data: approved, error: verificationError } = await landlord.client
      .from("landlord_verifications")
      .select("id")
      .eq("landlord_id", landlord.userId)
      .eq("status", "approved");
    expect(verificationError).toBeNull();
    expect(approved).toEqual([]);

    const { data: current, error: readError } = await landlord.client
      .from("profiles")
      .select("full_name")
      .eq("id", landlord.userId)
      .single();
    expect(readError).toBeNull();

    try {
      const { data, error } = await landlord.client
        .from("profiles")
        .update({ full_name: `${current!.full_name} (name-lock test)` })
        .eq("id", landlord.userId)
        .select("id");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    } finally {
      // Put the real name back so shared data is unchanged.
      await landlord.client
        .from("profiles")
        .update({ full_name: current!.full_name })
        .eq("id", landlord.userId);
    }
  });
});
