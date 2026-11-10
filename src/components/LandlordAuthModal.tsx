"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X, Home, Loader2, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  loginSchema,
  mapAuthError,
  signUpSchema,
  type SignUpRole,
} from "@/lib/validations/auth";
import { resolvePostLoginPath } from "@/lib/auth/post-login";
import { signUpWithProfile } from "@/lib/auth/sign-up";

interface LandlordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  initialRole?: SignUpRole;
  promptTitle?: string;
  promptDescription?: string;
}

/**
 * The landlord login / sign-up popup, opened from the home page.
 *
 * Built on shadcn's Dialog (#245): Escape and a click outside close it,
 * Tab stays inside it, screen readers announce it as a dialog named by
 * its title, the page behind can't scroll, and focus goes back to the
 * button that opened it.
 */
export default function LandlordAuthModal({
  isOpen,
  onClose,
  initialMode = "signup",
  initialRole = "landlord",
  promptTitle,
  promptDescription,
}: LandlordAuthModalProps) {
  const router = useRouter();
  const supabase = createClient();
  // The button that opened the popup, to give focus back to on close.
  const openerRef = useRef<HTMLElement | null>(null);

  const [isLoginMode, setIsLoginMode] = useState(initialMode === "login");
  const [selectedRole, setSelectedRole] = useState<SignUpRole>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Per-field messages from the shared Zod schemas, keyed by field name
  // (e.g. fieldErrors.confirmPassword = "Passwords don't match").
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Validates with the shared auth schemas (src/lib/validations/auth.ts),
   * so the client and any future entry point use the same rules.
   * Returns true if the form is valid.
   */
  const validate = () => {
    const result = isLoginMode
      ? loginSchema.safeParse({ email, password })
      : signUpSchema.safeParse({
          fullName,
          email,
          password,
          confirmPassword,
          role: selectedRole,
        });

    if (result.success) {
      setFieldErrors({});
      return true;
    }

    // Keep the first message for each field.
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      errors[field] ??= issue.message;
    }
    setFieldErrors(errors);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validate()) return;
    setLoading(true);

    try {
      if (isLoginMode) {
        // Sign In
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;

        if (data.user) {
          // Shared role-based redirect (src/lib/auth/post-login.ts, #170).
          const result = await resolvePostLoginPath(supabase, data.user);
          if (!result.ok) {
            // Don't leave them signed in with no usable role.
            await supabase.auth.signOut();
            setError(result.message);
            return;
          }

          router.push(result.path);
          onClose();
        }
      } else {
        // Sign Up — shared flow, including the
        // already-registered-email check (src/lib/auth/sign-up.ts).
        const result = await signUpWithProfile(supabase, {
          email,
          password,
          fullName,
          role: selectedRole,
        });

        if (!result.ok) {
          setError(result.message);
          return;
        }

        if (result.kind === "signed-in") {
          if (selectedRole === "landlord") {
            // New landlords fill in their contact details first.
            router.push("/profile-setup");
          } else {
            // Renters go directly to renter dashboard.
            router.push("/dashboard/renter");
          }
          onClose();
        } else {
          setSuccess(
            "Registration successful! Please check your email to confirm your account.",
          );
          setFullName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? mapAuthError(err)
          : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Called when Escape, a click outside or the X closes it.
        if (!open) onClose();
      }}
    >
      {/*
        Put together from the dialog's parts instead of shadcn's
        DialogContent, which always draws its own lighter overlay with no
        blur. This keeps the popup looking as it did before.
      */}
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />

        {/* Modal Card */}
        <DialogPrimitive.Content
          // The home page mounts this popup only while it's open, so there's
          // no DialogTrigger for Radix to give focus back to. Remember the
          // button that opened it (it still has focus at this point)...
          onOpenAutoFocus={() => {
            const opener = document.activeElement;
            openerRef.current = opener instanceof HTMLElement ? opener : null;
          }}
          // ...and focus it again when the popup closes.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-zinc-100 bg-white p-6 text-left shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* Logo / Branding */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-purple-950 dark:text-zinc-50">
              Abangers
            </span>
          </div>

          {/* Title & Subtitle — DialogTitle names the dialog for screen readers */}
          <div className="mb-4 space-y-1">
            <DialogTitle className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-50">
              {promptTitle ||
                (isLoginMode ? "Welcome back" : "Create an account")}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
              {promptDescription ||
                (isLoginMode
                  ? "Sign in to manage your listings or viewings"
                  : selectedRole === "renter"
                    ? "Start finding and booking boarding houses today"
                    : "Start listing your properties today")}
            </DialogDescription>
          </div>

          {/* Error / Success Alerts */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3.5 text-sm text-green-700 dark:border-green-900/30 dark:bg-green-950/30 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Form */}
          {/* noValidate: the shared Zod schemas show the messages, not the browser */}
          <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
            {!isLoginMode && (
              <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedRole("renter")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                    selectedRole === "renter"
                      ? "bg-white text-purple-700 shadow-xs dark:bg-zinc-900 dark:text-purple-300"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  Renter
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("landlord")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                    selectedRole === "landlord"
                      ? "bg-white text-purple-700 shadow-xs dark:bg-zinc-900 dark:text-purple-300"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  Landlord
                </button>
              </div>
            )}
            {!isLoginMode && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Full Name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={!!fieldErrors.fullName}
                  className="h-10.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
                />
                <FieldError message={fieldErrors.fullName} />
              </div>
            )}

            <div className="space-y-1.5">
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                className="h-10.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete={
                    isLoginMode ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.password}
                  className="h-10.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pr-10 pl-3.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
            </div>

            {!isLoginMode && (
              <div className="space-y-1.5">
                {/* Has its own show/hide toggle, separate from the password field */}
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    className="h-10.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pr-10 pl-3.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <FieldError message={fieldErrors.confirmPassword} />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-purple-700 text-sm font-semibold text-white transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700 dark:active:bg-purple-800"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLoginMode ? (
                "Log In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Footer toggle */}
          <div className="mt-4 text-center text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            {isLoginMode ? (
              <>
                {"Don't have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setError(null);
                    setSuccess(null);
                    setFieldErrors({});
                  }}
                  className="font-semibold text-purple-700 hover:underline dark:text-purple-400"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setError(null);
                    setSuccess(null);
                    setFieldErrors({});
                  }}
                  className="font-semibold text-purple-700 hover:underline dark:text-purple-400"
                >
                  Log in
                </button>
              </>
            )}
          </div>

          {/*
            Close Button — last in the card so the popup opens with focus
            on the first field; it still shows in the top-right corner.
          */}
          <DialogClose
            className="absolute top-6 right-6 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** Red message under a field, or nothing when the field is valid. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="px-1 text-xs text-red-600 dark:text-red-400">{message}</p>
  );
}
