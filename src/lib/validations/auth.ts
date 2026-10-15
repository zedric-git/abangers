import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";

/**
 * Validation rules for sign-up. Used by:
 * - LandlordAuthModal sign-up state (role is always "landlord" there)
 * - re-checked implicitly by Supabase Auth + the `profiles.role` CHECK
 *   constraint on the server side (see supabase/migrations/0001_init.sql)
 *
 * `role` matches the `check (role in ('renter', 'landlord'))` constraint
 * on public.profiles — keep these in sync if that constraint ever changes.
 */
/**
 * The two account roles. Matches the `check (role in ('renter',
 * 'landlord'))` constraint on public.profiles. Also used to validate the
 * role read back from the database / auth metadata after login
 * (src/lib/auth/post-login.ts).
 */
export const roleSchema = z.enum(["renter", "landlord"], {
  message: "Select whether you're a renter or landlord",
});

export type Role = z.infer<typeof roleSchema>;

export const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: roleSchema,
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
