"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Turns raw Supabase Auth errors into copy a user can actually act on.
 * Supabase's own messages are sometimes accurate-but-terse ("User already
 * registered") or, for privacy reasons, deliberately vague (a duplicate
 * email during sign-up returns a *success* with an empty `identities`
 * array instead of an error, to avoid leaking which emails are taken —
 * that case is handled separately in onSubmit, not here).
 */
function mapAuthError(error: AuthError): string {
  const message = error.message.toLowerCase();

  if (
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (message.includes("password")) {
    // Supabase's own password-strength messages are already clear
    // (e.g. "Password should be at least 6 characters").
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

  // Fallback: still show Supabase's message rather than swallowing it,
  // just labeled as unexpected so it's obviously not a validation error.
  return `Something went wrong: ${error.message}`;
}

export default function SignupPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpInput) {
    setSubmitError(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitError(mapAuthError(error));
      return;
    }

    // Supabase returns a "successful" signUp with an empty identities
    // array when the email is already registered (anti-enumeration
    // behavior) — this is NOT a new user, even though there's no `error`.
    if (data.user && data.user.identities?.length === 0) {
      setSubmitError(
        "An account with this email already exists. Try logging in instead.",
      );
      return;
    }

    if (!data.user) {
      setSubmitError(
        "Something went wrong creating your account. Please try again.",
      );
      return;
    }

    // No session means email confirmation is required (Supabase project
    // setting). We can't insert into `profiles` yet — RLS requires
    // auth.uid() = id, which needs an authenticated session, not just a
    // created auth user. The profile row has to be created after they
    // confirm + log in (see TODO below).
    if (!data.session) {
      setAwaitingConfirmation(true);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      role: values.role,
      full_name: values.fullName,
    });

    if (profileError) {
      setSubmitError(
        "Your account was created, but we couldn't save your profile. Please try logging in — if this keeps happening, contact support.",
      );
      return;
    }

    router.push(
      values.role === "landlord" ? "/dashboard/landlord" : "/dashboard/renter",
    );
  }

  if (awaitingConfirmation) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to your inbox. Once you confirm and log
          in, we&apos;ll finish setting up your profile.
        </p>
        {/*
         * TODO (follow-up, not in scope for S1-01): the profiles row for
         * this user hasn't been created yet — it needs to happen on their
         * first authenticated action after confirming, most likely inside
         * the S1-02 login flow (check for a missing profiles row and
         * create it there using the role chosen here). Right now that
         * role choice isn't persisted anywhere if they close this tab.
         */}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold">Create an account</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Sign up as a renter looking for a place, or a landlord listing one.
      </p>

      {submitError && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border p-3 text-sm">
          {submitError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Juan Dela Cruz"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a...</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="renter">Renter</SelectItem>
                    <SelectItem value="landlord">Landlord</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Creating account..."
              : "Create account"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
