"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Home, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LandlordAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LandlordAuthModal({
  isOpen,
  onClose,
}: LandlordAuthModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

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
          // Fetch user profile to verify role
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

          if (profileError) {
            // Profile doesn't exist yet, but they logged in
            console.error("Profile not found:", profileError);
          }

          // Even if they are renter, we redirect to their dashboard, but preferably landlord
          if (profile?.role === "landlord") {
            router.push("/dashboard/landlord");
          } else if (profile?.role === "renter") {
            router.push("/dashboard/renter");
          } else {
            // Default fallback
            router.push("/dashboard/landlord");
          }
          onClose();
        }
      } else {
        // Sign Up (Landlord)
        if (!fullName.trim()) {
          throw new Error("Full name is required");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "landlord",
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Insert the profiles row manually (in case triggers aren't set up yet)
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              role: "landlord",
              full_name: fullName,
            });

          if (profileError) {
            // If the profile insert failed (e.g. because email confirmation is required and they are not logged in yet)
            // we don't throw, but we warn or handle it.
            console.error("Failed to insert profile row:", profileError);
          }

          // If session is present immediately (email confirmation disabled), redirect
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            router.push("/dashboard/landlord");
            onClose();
          } else {
            setSuccess(
              "Registration successful! Please check your email to confirm your account.",
            );
            // Clear fields
            setFullName("");
            setEmail("");
            setPassword("");
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-[440px] transform rounded-3xl border border-zinc-100 bg-white p-8 text-left shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo / Branding */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
            <Home className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-purple-950 dark:text-zinc-50">
            BoardingHub
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6 space-y-1.5">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {isLoginMode ? "Welcome back" : "Create an account"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLoginMode
              ? "Sign in to manage your listings"
              : "Start listing your properties today"}
          </p>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div className="space-y-1.5">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-900 dark:focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-purple-700 font-medium text-white transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700 dark:active:bg-purple-800"
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
        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {isLoginMode ? (
            <>
              {"Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setError(null);
                  setSuccess(null);
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
                }}
                className="font-semibold text-purple-700 hover:underline dark:text-purple-400"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
