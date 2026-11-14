"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Loader2,
  Phone,
  Save,
  User,
} from "lucide-react";
import PhMobileNumberInput from "@/components/PhMobileNumberInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileSaveErrorMessage } from "@/lib/landlord-status-view";
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

const RENTER_GENDERS = GENDERS.filter((g) => g !== "Prefer not to say");

interface RenterProfileFormProps {
  /**
   * "setup" renders the standalone card for onboarding (/renter/profile-setup).
   * "edit" renders inside the dashboard (/dashboard/renter/profile) with breadcrumbs,
   * standard card styling, error protection against null wipes, and inline success notices.
   */
  mode?: "setup" | "edit";
}

export default function RenterProfileForm({
  mode = "setup",
}: RenterProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = mode === "edit";

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setEmail(user.email ?? "");

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error("Failed to load user profile:", profileError);
            // In edit mode, don't show an empty form that could wipe saved data (PM note #2)
            if (isEdit) {
              setLoadError(
                "We couldn't load your profile. Please check your connection and reload the page.",
              );
              return;
            }
          }

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
        } else if (isEdit) {
          setLoadError("User session not found. Please log in again.");
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
        if (isEdit) {
          setLoadError(
            "We couldn't load your profile. Please check your connection and reload the page.",
          );
        }
      } finally {
        setLoadingUser(false);
      }
    }

    void loadUserData();
  }, [supabase, isEdit, retryKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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

    if (!validation.success || !occupationStatus) {
      const errors: Record<string, string> = {};

      if (!occupationStatus) {
        errors.occupation_status = "Student / worker status is required.";
      }

      if (!validation.success) {
        for (const issue of validation.error.issues) {
          const field = String(issue.path[0]);
          errors[field] ??= issue.message;
        }
      }

      setFieldErrors(errors);
      setError(
        errors.full_name ||
          errors.gender ||
          errors.occupation_status ||
          errors.contact_number ||
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
        setError(profileSaveErrorMessage(saveError));
        return;
      }

      if (isEdit) {
        setSuccess("Profile updated successfully!");
        router.refresh();
      } else {
        router.push("/dashboard/renter");
        router.refresh();
      }
    } catch (err) {
      console.error("Renter profile save exception:", err);
      setError("We couldn't save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        {isEdit && <p className="text-sm">Loading profile information...</p>}
      </div>
    );
  }

  // Error screen on failed load in edit mode (PM note #2: prevents empty form wiping data)
  if (isEdit && loadError) {
    return (
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <span>Renter</span>
            <span>/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Profile
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            Renter Profile
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your personal details, contact number, and rental profile
            preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-2xs dark:border-red-950/60 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-md flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Failed to load profile data
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {loadError}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setLoadingUser(true);
                  setLoadError(null);
                  setRetryKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Edit View (PM note #3: drops onboarding layout, uses dashboard page card)
  if (isEdit) {
    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div>
          <div className="mb-0.5 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <span>Renter</span>
            <span>/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Profile
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Renter Profile
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your personal details, contact number, and rental profile
            preferences.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3.5 text-sm font-medium text-green-700 dark:border-green-900/30 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* Account Information Section */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-1">
                <label
                  htmlFor="full_name"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  required
                  placeholder="e.g. Ana Reyes"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-purple-500 dark:focus:bg-zinc-800"
                />
                {fieldErrors.full_name && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  readOnly
                  disabled
                  value={email}
                  className="h-10 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100/70 px-3.5 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800" />

          {/* Contact & Preferences Section */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Contact & Preferences
            </h2>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Gender */}
              <div className="space-y-1">
                <label
                  htmlFor="gender"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Gender <span className="text-red-500">*</span>
                </label>
                <Select
                  value={gender || undefined}
                  onValueChange={(val) => {
                    setGender(val as Gender);
                    if (fieldErrors.gender) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.gender;
                        return next;
                      });
                    }
                  }}
                >
                  <SelectTrigger
                    id="gender"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 text-sm text-zinc-900 transition-colors focus-visible:border-purple-600 focus-visible:ring-1 focus-visible:ring-purple-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus-visible:border-purple-500"
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {RENTER_GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.gender && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.gender}
                  </p>
                )}
              </div>

              {/* Student / Worker Status */}
              <div className="space-y-1">
                <label
                  htmlFor="occupation_status"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Student / Worker Status{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={occupationStatus || undefined}
                  onValueChange={(val) => {
                    setOccupationStatus(val as OccupationStatus);
                    if (fieldErrors.occupation_status) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.occupation_status;
                        return next;
                      });
                    }
                  }}
                >
                  <SelectTrigger
                    id="occupation_status"
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 text-sm text-zinc-900 transition-colors focus-visible:border-purple-600 focus-visible:ring-1 focus-visible:ring-purple-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus-visible:border-purple-500"
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCUPATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.occupation_status && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.occupation_status}
                  </p>
                )}
              </div>

              {/* Contact Number (Span 2) */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="contact_number"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
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
                  className="h-10"
                />
                {fieldErrors.contact_number && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.contact_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 text-sm font-semibold text-white shadow-xs transition-all hover:bg-purple-800 active:scale-[0.99] disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Setup / Onboarding Mode
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
          <Select
            value={gender || undefined}
            onValueChange={(val) => {
              setGender(val as Gender);
              if (fieldErrors.gender) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.gender;
                  return next;
                });
              }
            }}
          >
            <SelectTrigger
              id="gender"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus-visible:border-purple-600 focus-visible:ring-1 focus-visible:ring-purple-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus-visible:border-purple-500"
            >
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {RENTER_GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <label
            htmlFor="occupation_status"
            className="text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            Student / Worker Status <span className="text-red-500">*</span>
          </label>
          <Select
            value={occupationStatus || undefined}
            onValueChange={(val) => {
              setOccupationStatus(val as OccupationStatus);
              if (fieldErrors.occupation_status) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.occupation_status;
                  return next;
                });
              }
            }}
          >
            <SelectTrigger
              id="occupation_status"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus-visible:border-purple-600 focus-visible:ring-1 focus-visible:ring-purple-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus-visible:border-purple-500"
            >
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {OCCUPATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
