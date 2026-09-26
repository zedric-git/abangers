import { z } from "zod";

/**
 * Validation rules for the sign-up form. Used by:
 * - the sign-up form (client-side, via React Hook Form's zodResolver)
 * - re-checked implicitly by Supabase Auth + the `profiles.role` CHECK
 *   constraint on the server side (see supabase/migrations/0001_init.sql)
 *
 * `role` matches the `check (role in ('renter', 'landlord'))` constraint
 * on public.profiles — keep these in sync if that constraint ever changes.
 */
export const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["renter", "landlord"], {
      message: "Select whether you're a renter or landlord",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
