"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2, User } from "lucide-react";
import PhMobileNumberInput from "@/components/PhMobileNumberInput";
import {
  toPhMobileDigits,
  toStoredPhMobileNumber,
} from "@/lib/ph-mobile-number";
import { createClient } from "@/lib/supabase/client";
import {
  GENDERS,
  OCCUPATION_STATUSES,
  renterProfileSchema,
  type Gender,
  type OccupationStatus,
} from "@/lib/validations/profile";

export default function RenterProfileForm() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [contactNumber, setContactNumber] = useState("");
  const [occupationStatus, setOccupationStatus] = useState<
    OccupationStatus | ""
  >("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setEmail(user.email ?? "");

          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile) {
            setFullName(
              profile.full_name || user.user_metadata?.full_name || "",
            );
            if (profile.gender) setGender(profile.gender as Gender);
            if (profile.contact_number) {
              setContactNumber(toPhMobileDigits(profile.contact_number));
            }
            if (profile.occupation_status) {
              setOccupationStatus(
                profile.occupation_status as OccupationStatus,
              );
            }
          } else {
            setFullName(user.user_metadata?.full_name || "");
          }
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUserData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const storedContactNumber = contactNumber.trim()
      ? toStoredPhMobileNumber(contactNumber)
      : undefined;

    const validation = renterProfileSchema.safeParse({
      full_name: fullName,
      email: email,
      gender: gender || undefined,
      contact_number: storedContactNumber,
      occupation_status: occupationStatus || undefined,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0]);
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      setError(
        validation.error.issues[0]?.message ||
          "Please check the form for errors.",
      );
      return;
    }

    if (!userId) {
      setError("User session not found. Please log in again.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: saveError } = await supabase
        .from("profiles")
        .update({
          full_name: validation.data.full_name,
          gender: validation.data.gender,
          contact_number: storedContactNumber ?? null,
          occupation_status: validation.data.occupation_status ?? null,
          profile_completed: true,
        })
        .eq("id", userId);

      if (saveError) {
        console.error("Renter profile save error:", saveError);
        setError(
          saveError.message || "Failed to save profile. Please try again.",
        );
        return;
      }

      router.push("/dashboard/renter");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  return (
    <div className="relative my-auto w-full max-w-[580px] rounded-3xl border border-zinc-100 bg-white p-8 text-left shadow-2xl transition-all sm:p-10 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
          <Home className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-purple-950 dark:text-zinc-50">
          Abangers
        </span>
      </div>

      <div className="mb-6 space-y-1.5">
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
          Complete Your Profile
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tell landlords a little about yourself to help with your inquiries.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="full_name"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            <User className="h-3.5 w-3.5" />
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="full_name"
            type="text"
            required
            placeholder="e.g. Ana Reyes"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
          />
          {fieldErrors.full_name && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.full_name}
            </p>
          )}
        </div>

        {/* Email (Read-only) */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            readOnly
            disabled
            value={email}
            className="h-11 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100/70 px-4 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400"
          />
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <label
            htmlFor="gender"
            className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            id="gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
          >
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {fieldErrors.gender && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.gender}
            </p>
          )}
        </div>

        {/* Contact Number */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="contact_number"
              className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Contact Number
            </label>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Optional
            </span>
          </div>
          <PhMobileNumberInput
            id="contact_number"
            value={contactNumber}
            onChange={setContactNumber}
            required={false}
          />
          {fieldErrors.contact_number && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.contact_number}
            </p>
          )}
        </div>

        {/* Occupation Status */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="occupation_status"
              className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
            >
              Student / Worker Status
            </label>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Optional
            </span>
          </div>
          <select
            id="occupation_status"
            value={occupationStatus}
            onChange={(e) =>
              setOccupationStatus(e.target.value as OccupationStatus)
            }
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
          >
            <option value="">Select status (optional)</option>
            {OCCUPATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {fieldErrors.occupation_status && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.occupation_status}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-700 font-semibold text-white shadow-md transition-all hover:bg-purple-800 active:scale-[0.99] disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving Profile...
            </>
          ) : (
            "Save & Continue to Dashboard"
          )}
        </button>
      </form>
    </div>
  );
}
