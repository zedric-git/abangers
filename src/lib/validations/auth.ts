import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";

/**
 * Every account role. Matches the `check (role in ('renter', 'landlord',
 * 'admin'))` constraint on public.profiles (0014): keep the two in sync.
 * Used to read the role back from a profiles row after login
 * (src/lib/auth/post-login.ts). Nobody can sign up as an admin: see
 * signUpRoleSchema.
 */
export const roleSchema = z.enum(["renter", "landlord", "admin"]);

export type Role = z.infer<typeof roleSchema>;

/**
 * The roles someone can sign up as: renter or landlord, never admin. The
 * profiles insert policy (0014) only creates renter or landlord profiles,
 * so an admin can only be made with SQL. Login also uses this for the role
 * saved in auth user metadata at sign-up (post-login.ts), because users
 * can change their own metadata.
 */
export const signUpRoleSchema = z.enum(["renter", "landlord"], {
  message: "Select whether you're a renter or landlord",
});

export type SignUpRole = z.infer<typeof signUpRoleSchema>;

/**
 * Validation rules for sign-up. Used by:
 * - LandlordAuthModal sign-up state (role is always "landlord" there)
 * - re-checked implicitly by Supabase Auth, and on the server side by
 *   the profiles insert policy and `profiles.role` CHECK constraint (see
 *   supabase/migrations/0014_admin_role_and_verification_review.sql)
 */
export const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: signUpRoleSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Validation rules for login. Used by:
 * - LandlordAuthModal login state
 */
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Turns raw Supabase Auth errors into copy a user can actually act on.
 * Handles both sign-in and sign-up error cases.
 */
export function mapAuthError(error: AuthError | Error): string {
  const message = error.message.toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email address before logging in. Check your inbox for the confirmation link.";
  }
  if (message.includes("password")) {
    return error.message;
  }
  if (
    message.includes("invalid email") ||
    message.includes("unable to validate")
  ) {
    return "Enter a valid email address.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  return `Something went wrong: ${error.message}`;
}
