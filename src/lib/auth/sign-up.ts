import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { mapAuthError, type Role } from "@/lib/validations/auth";

/**
 * Creates an account and its `profiles` row. Used by LandlordAuthModal;
 * any future sign-up entry point (e.g. renter sign-up) should call this
 * too, so the flows can't drift apart. Each caller still decides where to
 * send the user afterwards (see `SignUpResult`).
 *
 * After `supabase.auth.signUp` there are four cases:
 *
 *   1. email already registered → Supabase still returns "success", but
 *                                  with an empty `identities` array
 *                                  (anti-enumeration) — show an error
 *   2. no user at all           → show a generic error
 *   3. user but no session      → email confirmation is on; the profile
 *                                  row is created on first login instead
 *                                  (src/lib/auth/post-login.ts)
 *   4. user and session         → insert the profiles row now
 */

export type SignUpResult =
  | { ok: true; kind: "signed-in" }
  | { ok: true; kind: "awaiting-confirmation" }
  | { ok: false; message: string };

export const ALREADY_REGISTERED_MESSAGE =
  "An account with this email already exists. Try logging in instead.";

const GENERIC_ERROR_MESSAGE =
  "Something went wrong creating your account. Please try again.";

const PROFILE_INSERT_FAILED_MESSAGE =
  "Your account was created, but we couldn't save your profile. Please try logging in — if this keeps happening, contact support.";

/**
 * Pure decision on the signUp response (unit-tested in sign-up.test.ts).
 * Matches the four cases in the comment at the top of this file.
 */
export function classifySignUpResponse(
  user: Pick<User, "identities"> | null,
  session: Session | null,
): "already-registered" | "no-user" | "awaiting-confirmation" | "signed-in" {
  // Only an *empty* array means "already registered" — a missing
  // `identities` field isn't proof either way, so treat it as a new user.
  if (user && user.identities?.length === 0) return "already-registered";
  if (!user) return "no-user";
  if (!session) return "awaiting-confirmation";
  return "signed-in";
}

export async function signUpWithProfile(
  supabase: SupabaseClient,
  values: { email: string; password: string; fullName: string; role: Role },
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      // Also saved on the auth user itself, so if the `profiles` insert
      // below fails (or is skipped because email confirmation is on),
      // login can still recreate the row with the right role
      // (src/lib/auth/post-login.ts).
      data: { full_name: values.fullName, role: values.role },
    },
  });

  if (error) {
    return { ok: false, message: mapAuthError(error) };
  }

  switch (classifySignUpResponse(data.user, data.session)) {
    case "already-registered":
      return { ok: false, message: ALREADY_REGISTERED_MESSAGE };
    case "no-user":
      return { ok: false, message: GENERIC_ERROR_MESSAGE };
    case "awaiting-confirmation":
      // We can't insert into `profiles` yet — RLS requires
      // auth.uid() = id, which needs an authenticated session, not just
      // a created auth user.
      return { ok: true, kind: "awaiting-confirmation" };
    case "signed-in":
      break;
  }

  // Always true here ("signed-in" implies a user); this just lets
  // TypeScript know `data.user` isn't null below.
  if (!data.user) {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    role: values.role,
    full_name: values.fullName,
  });

  if (profileError) {
    return { ok: false, message: PROFILE_INSERT_FAILED_MESSAGE };
  }

  return { ok: true, kind: "signed-in" };
}
