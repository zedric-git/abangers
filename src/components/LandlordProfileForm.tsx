"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Share2,
  Loader2,
  Save,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import PhMobileNumberInput from "@/components/PhMobileNumberInput";
import VerificationBadge from "@/components/VerificationBadge";
import VerificationBanner from "@/components/VerificationBanner";
import type { LandlordStatus } from "@/lib/auth/landlord-status";
import {
  nameFieldView,
  profileSaveErrorMessage,
} from "@/lib/landlord-status-view";
import {
  toPhMobileDigits,
  toStoredPhMobileNumber,
} from "@/lib/ph-mobile-number";
import { createClient } from "@/lib/supabase/client";
import { profileSetupSchema } from "@/lib/validations/profile";
import { VERIFY_ACCOUNT_PATH } from "@/lib/verify-account";

interface LandlordProfileFormProps {
  /**
   * Where the landlord stands, read by the page on the server (#205): the
   * badge, the banner, and whether the name is locked. null if it
   * couldn't be read.
   */
  status: LandlordStatus | null;
}

export default function LandlordProfileForm({
  status,
}: LandlordProfileFormProps) {
  const supabase = createClient();
  // Read-only once verified: 0008's trigger refuses a new name then.
  const nameField = nameFieldView(status);

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  // The 10 digits after +63, as the field shows them ("9171234567").
  const [contactNumber, setContactNumber] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [xUrl, setXUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setEmail(user.email || "");

          // Load profile from Supabase
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile) {
            setFullName(
              profile.full_name || user.user_metadata?.full_name || "",
            );
            setContactNumber(
              toPhMobileDigits(
                profile.contact_number ||
                  user.user_metadata?.contact_number ||
                  "",
              ),
            );
            setFacebookUrl(
              profile.facebook_url || user.user_metadata?.facebook_url || "",
            );
            setInstagramUrl(
              profile.instagram_url || user.user_metadata?.instagram_url || "",
            );
            setXUrl(profile.x_url || user.user_metadata?.x_url || "");
          } else {
            setFullName(user.user_metadata?.full_name || "");
            if (user.user_metadata?.contact_number)
              setContactNumber(
                toPhMobileDigits(user.user_metadata.contact_number),
              );
            if (user.user_metadata?.facebook_url)
              setFacebookUrl(user.user_metadata.facebook_url);
            if (user.user_metadata?.instagram_url)
              setInstagramUrl(user.user_metadata.instagram_url);
            if (user.user_metadata?.x_url) setXUrl(user.user_metadata.x_url);
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadProfile();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // What's saved (and validated) is "0" + the 10 digits: 09171234567.
    const storedContactNumber = toStoredPhMobileNumber(contactNumber);

    // Validate with Zod
    const validation = profileSetupSchema.safeParse({
      full_name: fullName,
      email: email,
      contact_number: storedContactNumber,
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

    setSaving(true);

    try {
      const profileData = {
        contact_number: storedContactNumber,
        email: email,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        x_url: xUrl.trim() || null,
        profile_completed: true,
      };

      // 1. Update Auth user metadata
      await supabase.auth.updateUser({
        data: profileData,
      });

      // 2. Update public.profiles table
      const { error: updateError } = await supabase.from("profiles").upsert({
        id: userId,
        role: "landlord",
        full_name: fullName,
        ...profileData,
      });

      if (updateError) {
        // Don't say it was saved when it wasn't. E.g. 0008's name lock,
        // when this page was opened before the landlord was verified and
        // the name was changed since (#205).
        console.error("Profile save error:", updateError);
        setError(profileSaveErrorMessage(updateError));
        return;
      }

      setSuccess("Profile updated successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile changes";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        <p className="text-sm">Loading profile information...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
            Landlord Profile
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your personal details, contact number, and social media
            verification accounts.
          </p>
        </div>

        {/* The verification badge (#205). The banner below has the
            button to the Verify account page (#203). If the status
            couldn't be read, link there instead, so there's always a way
            in: that page checks for itself. */}
        {status ? (
          <VerificationBadge verification={status.verification} />
        ) : (
          <Link
            href={VERIFY_ACCOUNT_PATH}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify account
          </Link>
        )}
      </div>

      {/* Not verified / Pending / Rejected with the reason; nothing once verified */}
      <VerificationBanner status={status} />

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700 dark:border-green-900/30 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Profile Form Container */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Account Details Section */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
            <User className="h-5 w-5 text-purple-600" />
            Account Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="full-name"
                className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Full Name
              </label>
              <div className="relative">
                {/* Read-only, not disabled, once verified: it can still be
                    focused, and its note below is read out with it. */}
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  readOnly={nameField.locked}
                  aria-describedby="full-name-hint"
                  className={
                    nameField.locked
                      ? "h-11 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 pr-10 pl-4 text-sm font-medium text-zinc-500 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400"
                      : "h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 px-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-purple-500"
                  }
                />
                {nameField.locked && (
                  <Lock className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                )}
              </div>
              <p id="full-name-hint" className="mt-1 text-xs text-zinc-400">
                {nameField.hint}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="h-11 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400"
              />
            </div>
          </div>
        </div>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* Contact Details */}
        <div className="space-y-4">
          <h2
            id="contact-number-heading"
            className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100"
          >
            <Phone className="h-5 w-5 text-purple-600" />
            Contact Number <span className="text-red-500">*</span>
          </h2>

          <div className="max-w-md">
            <PhMobileNumberInput
              id="contact-number"
              aria-labelledby="contact-number-heading"
              aria-describedby="contact-number-hint"
              value={contactNumber}
              onChange={setContactNumber}
            />
            <p id="contact-number-hint" className="mt-1 text-xs text-zinc-400">
              10 digits after +63, starting with 9 (e.g. 917 123 4567).
            </p>
          </div>
        </div>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* Social Media Verification Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
              <Share2 className="h-5 w-5 text-purple-600" />
              Social Media Accounts <span className="text-red-500">*</span>
            </h2>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              At least 1 Required
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Facebook */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Facebook
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg
                    className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Profile URL or handle"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 pr-3.5 pl-10 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-purple-500"
                />
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Instagram
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg
                    className="h-4.5 w-4.5 text-pink-600 dark:text-pink-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Instagram handle or URL"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 pr-3.5 pl-10 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-purple-500"
                />
              </div>
            </div>

            {/* X / Twitter */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                X (Twitter)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg
                    className="h-4 w-4 text-zinc-900 dark:text-zinc-100"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="X handle or URL"
                  value={xUrl}
                  onChange={(e) => setXUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-100/70 pr-3.5 pl-10 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-zinc-100 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
