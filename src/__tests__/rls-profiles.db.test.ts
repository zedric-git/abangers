/**
 * RLS / trigger test for public.profiles (#174) — runs against the REAL
 * shared Supabase project, signed in as the seed accounts.
 *
 * Checks supabase/migrations/0007_enforce_roles_in_rls.sql:
 * - A user cannot change their own `role` (renter → landlord).
 * - Writing the SAME role back still works — LandlordProfileForm upserts
 *   role = 'landlord' on every save, so this must not break.
 * - A user still cannot update someone else's profile (0001_init.sql).
 *
 * SAFE ON SHARED DATA: blocked writes change nothing; allowed writes put
 * the current values back. If the role lock is ever broken, the renter
 * test switches the role straight back, and `npm run db:seed` restores
 * every seed account anyway.
 *
 * Run with: npm run test:db   (needs .env.local and the seed data loaded)
 */

import { describe, expect, it } from "vitest";
import { LANDLORD_A_EMAIL, RENTER_EMAIL, signedInAs } from "./db-helpers";

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
