import type { SupabaseClient, User } from "@supabase/supabase-js";
import { roleSchema, type Role } from "@/lib/validations/auth";

/**
 * Decides where a user goes right after signing in. Shared by the login
 * page and LandlordAuthModal so the two can't drift apart (#170).
 *
 * The role normally comes from the user's `profiles` row. That row can be
 * missing — e.g. sign-up created the auth user but the separate
 * `profiles` insert failed. Older code guessed a dashboard in that case
 * (the login page guessed renter, the modal guessed landlord), silently
 * putting people on the wrong side of the app. Now:
 *
 *   1. profiles row exists      → go to that role's dashboard
 *   2. no row, but sign-up saved the role in auth user metadata
 *                               → recreate the row from it, then continue
 *   3. no row and no saved role → show an error; never guess
 */

export type PostLoginResult =
  { ok: true; path: string } | { ok: false; message: string };

const MISSING_PROFILE_MESSAGE =
  "We couldn't find your account profile, so we don't know whether you're a renter or a landlord. Please contact support.";

/** Turns an unknown value into a Role, or null if it isn't a valid one. */
export function parseRole(value: unknown): Role | null {
  const result = roleSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Pure routing decision (unit-tested in post-login.test.ts).
 * `profileRole` is from public.profiles (undefined = no row);
 * `metadataRole` is from auth user metadata saved at sign-up.
 */
export function decidePostLoginRoute(
  profileRole: unknown,
  metadataRole: unknown,
):
  | { kind: "dashboard"; role: Role }
  | { kind: "recreate-profile"; role: Role }
  | { kind: "error" } {
  if (profileRole !== undefined) {
    // A row exists: trust it, but only if it holds a known role.
    const role = parseRole(profileRole);
    return role ? { kind: "dashboard", role } : { kind: "error" };
  }

  const role = parseRole(metadataRole);
  return role ? { kind: "recreate-profile", role } : { kind: "error" };
}

function dashboardFor(role: Role): string {
  return role === "landlord" ? "/dashboard/landlord" : "/dashboard/renter";
}

/** Looks up the user's role (repairing a missing profile row if possible). */
export async function resolvePostLoginPath(
  supabase: SupabaseClient,
  user: User,
): Promise<PostLoginResult> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      message:
        "Signed in, but we couldn't load your profile. Please try again in a moment.",
    };
  }

  const decision = decidePostLoginRoute(
    profile ? profile.role : undefined,
    user.user_metadata?.role,
  );

  if (decision.kind === "error") {
    return { ok: false, message: MISSING_PROFILE_MESSAGE };
  }

  if (decision.kind === "dashboard") {
    return { ok: true, path: dashboardFor(decision.role) };
  }

  // decision.kind === "recreate-profile": the user is signed in now, so
  // RLS (auth.uid() = id) allows inserting their own row.
  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    role: decision.role,
    full_name: user.user_metadata?.full_name ?? null,
  });

  if (insertError) {
    return { ok: false, message: MISSING_PROFILE_MESSAGE };
  }

  // A recreated landlord profile has no contact details yet, so send
  // landlords through profile setup (same as a brand-new landlord).
  return {
    ok: true,
    path:
      decision.role === "landlord" ? "/profile-setup" : dashboardFor("renter"),
  };
}
