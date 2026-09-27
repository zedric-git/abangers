"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home, Phone, Share2, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { profileSetupSchema } from "@/lib/validations/profile";

export default function ProfileSetupModal() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [xUrl, setXUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setEmail(user.email || "");

          // Attempt to load existing profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile) {
            setFullName(
              profile.full_name || user.user_metadata?.full_name || "",
            );
            if (profile.contact_number)
              setContactNumber(profile.contact_number);
            if (profile.facebook_url) setFacebookUrl(profile.facebook_url);
            if (profile.instagram_url) setInstagramUrl(profile.instagram_url);
            if (profile.x_url) setXUrl(profile.x_url);
          } else {
            setFullName(user.user_metadata?.full_name || "");
          }
        }
      } catch (err) {
        console.error("Error loading user details:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUserData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate with Zod
    const validation = profileSetupSchema.safeParse({
      full_name: fullName,
      email: email,
      contact_number: contactNumber.trim(),
      facebook_url: facebookUrl.trim() || undefined,
      instagram_url: instagramUrl.trim() || undefined,
      x_url: xUrl.trim() || undefined,
    });

    if (!validation.success) {
      const firstError =
        validation.error.issues[0]?.message ||
        "Please fill in all required fields correctly.";
      setError(firstError);
      return;
    }

    if (!userId) {
      setError("User session not found. Please log in again.");
      return;
    }

    setSubmitting(true);

    try {
      const profileData = {
        contact_number: contactNumber.trim(),
        email: email,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        x_url: xUrl.trim() || null,
        profile_completed: true,
      };

      // 1. Always update Supabase Auth user metadata (guaranteed to succeed)
      await supabase.auth.updateUser({
        data: profileData,
      });

      // 2. Best-effort update to public.profiles table
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (existingProfile) {
          await supabase
            .from("profiles")
            .update({
              contact_number: contactNumber.trim(),
              email: email,
              facebook_url: facebookUrl.trim() || null,
              instagram_url: instagramUrl.trim() || null,
              x_url: xUrl.trim() || null,
            })
            .eq("id", userId);
        } else {
          await supabase.from("profiles").insert({
            id: userId,
            role: "landlord",
            full_name: fullName,
            contact_number: contactNumber.trim(),
            email: email,
            facebook_url: facebookUrl.trim() || null,
            instagram_url: instagramUrl.trim() || null,
            x_url: xUrl.trim() || null,
          });
        }
      } catch (dbErr) {
        console.warn("Database schema sync warning:", dbErr);
      }

      // 3. Always redirect to Landlord Dashboard upon completion
      router.push("/dashboard/landlord");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen [scrollbar-width:none] items-center justify-center overflow-y-auto bg-black/75 p-4 py-10 backdrop-blur-md [-ms-overflow-style:none] sm:p-6 [&::-webkit-scrollbar]:hidden">
      {/* Non-dismissable Card container (No X button, no backdrop click) */}
      <div className="relative my-auto w-full max-w-[620px] rounded-3xl border border-zinc-100 bg-white p-8 text-left shadow-2xl transition-all sm:p-10 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
            <Home className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-purple-950 dark:text-zinc-50">
            BoardingHub
          </span>
        </div>

        <div className="mb-6 space-y-1.5">
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
            Complete Your Profile
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Please provide your contact number and at least one social media
            account to start posting rental listings.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {loadingUser ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <p className="text-sm">Loading profile details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Information (Pre-filled / Read-Only) */}
            <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Account Info (Pre-filled)
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Full Name
                </label>
                <input
                  type="text"
                  disabled
                  value={fullName}
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="h-11 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                />
              </div>
            </div>

            {/* Required Phone Number */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <Phone className="h-4 w-4 text-purple-600" />
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={11}
                placeholder="09171234567"
                value={contactNumber}
                onChange={(e) =>
                  setContactNumber(e.target.value.replace(/\D/g, ""))
                }
                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 px-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
              />
              <p className="text-xs text-zinc-400">
                Must be exactly 11 digits (Philippine mobile format).
              </p>
            </div>

            {/* Social Media Links Section (1 out of 3 required) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  <Share2 className="h-4 w-4 text-purple-600" />
                  Social Media Account <span className="text-red-500">*</span>
                </label>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  1 of 3 Required
                </span>
              </div>

              {/* Facebook */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Facebook
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-blue-600 dark:text-blue-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Profile URL or username (e.g. facebook.com/yourname)"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 pr-4 pl-11 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
                  />
                </div>
              </div>

              {/* Instagram */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Instagram
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-pink-600 dark:text-pink-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Instagram handle or URL (e.g. @yourname)"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 pr-4 pl-11 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
                  />
                </div>
              </div>

              {/* X / Twitter */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  X (Twitter)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-4.5 w-4.5 text-zinc-900 dark:text-zinc-100"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="X handle or URL (e.g. @yourname)"
                    value={xUrl}
                    onChange={(e) => setXUrl(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 pr-4 pl-11 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-purple-700 font-medium text-white transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Proceed"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
