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
 * - A landlord who isn't verified can still change their name. (The
 *   locked case needs a verified seed landlord, so it's added with that
 *   seed data in #206.)
 *
 * SAFE ON SHARED DATA: blocked writes change nothing; allowed writes put
 * the current values back (the name-lock test renames landlord2, then
 * restores the name in a `finally`). If the role lock is ever broken, the
 * renter test switches the role straight back, and `npm run db:seed`
 * restores every seed account anyway.
 *
 * Run with: npm run test:db   (needs .env.local and the seed data loaded)
 */

import { describe, expect, it } from "vitest";
import {
  LANDLORD_A_EMAIL,
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

    // Same shape as LandlordProfileForm: upsert including role.
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
// full_name (0008). landlord2 stays unverified in the seed data (#206), so
// they must still be able to rename.
describe("profiles name lock", () => {
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
