"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Loader2,
  Home,
  CheckCircle2,
  AlertCircle,
  Eye,
  Pencil,
  Send,
} from "lucide-react";
import { listingSchema, ListingInput } from "@/lib/validations/listing";
import ImageUploader from "@/components/ImageUploader";
import ListingDetailView from "@/components/ListingDetailView";
import { createListingAction } from "../actions";

const PROPERTY_TYPES = [
  "Boarding House",
  "Apartment",
  "Dormitory",
  "House",
  "Condo",
];

const OCCUPANCY_TYPES = ["Bedspace", "Single Room", "Shared Room", "Studio"];

const GENDER_POLICIES = ["Any / Co-ed", "Male Only", "Female Only"];

const AVAILABLE_UTILITIES = [
  "Water Included",
  "Electricity Included",
  "Wi-Fi Included",
  "Gas Included",
];

const AVAILABLE_AMENITIES = [
  "Air Conditioning",
  "Fully Furnished",
  "Private Bathroom",
  "Study Desk & Chair",
  "Balcony / Terrace",
  "Parking Space",
];

const SAFETY_FEATURES = [
  "CCTV Surveillance",
  "24/7 Security / Gated",
  "Fire Extinguisher",
  "Smoke Detector",
];

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      address: "",
      city: "",
      monthly_rent: 3000,
      total_rooms: 1,
      available_rooms: 1,
      property_type: "Boarding House",
      occupancy_type: "Bedspace",
      allowed_gender: "Any / Co-ed",
      amenities: [],
      utilities: [],
      room_features: [],
      bathroom_features: [],
      kitchen_features: [],
      laundry_features: [],
      safety_features: [],
      description: "",
      house_rules: "",
      contact_info: "",
      availability_status: "available",
      images: [] as string[],
      cover_image: "",
    },
  });

  const selectedUtilities = useWatch({ control, name: "utilities" }) || [];
  const selectedAmenities = useWatch({ control, name: "amenities" }) || [];
  const selectedSafety = useWatch({ control, name: "safety_features" }) || [];
  const uploadedImages = useWatch({ control, name: "images" }) || [];
  const activeCoverImage = useWatch({ control, name: "cover_image" }) || "";

  const handleToggleArrayItem = (
    fieldName: "utilities" | "amenities" | "safety_features",
    item: string,
  ) => {
    const currentList = getValues(fieldName) || [];
    if (currentList.includes(item)) {
      setValue(
        fieldName,
        currentList.filter((i) => i !== item),
        { shouldValidate: true },
      );
    } else {
      setValue(fieldName, [...currentList, item], { shouldValidate: true });
    }
  };

  const handlePreviewSubmit = () => {
    setServerError(null);
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePublish = async (data: ListingInput) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await createListingAction(data);
      if (res.success) {
        router.push("/dashboard/landlord");
        router.refresh();
      } else {
        setServerError(res.error);
        setStep("form");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to publish listing.";
      setServerError(msg);
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-black">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Navigation / Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/landlord"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                step === "form"
                  ? "bg-purple-700 text-white dark:bg-purple-600"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              1. Edit Details
            </span>
            <span className="text-zinc-400">→</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                step === "preview"
                  ? "bg-purple-700 text-white dark:bg-purple-600"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              2. Preview & Publish
            </span>
          </div>
        </div>

        {/* Global Server Error Alert */}
        {serverError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <span className="font-semibold">Unable to submit listing:</span>{" "}
              {serverError}
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW MODE (S1-09.1, S1-09.2) */}
        {step === "preview" ? (
          <div className="space-y-6">
            {/* Sticky Preview Header Banner */}
            <div className="sticky top-4 z-40 rounded-2xl border border-purple-200 bg-purple-50/95 p-4 shadow-lg backdrop-blur-md sm:p-5 dark:border-purple-900/50 dark:bg-purple-950/90">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-purple-950 dark:text-purple-100">
                    Listing Preview Mode
                  </h2>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Review your property details exactly as renters will see
                    them before publishing.
                  </p>
                </div>
              </div>
            </div>

            {/* Reusable Public Listing Detail View */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <ListingDetailView
                listing={getValues() as ListingInput}
                isPreview={true}
              />
            </div>

            {/* Bottom Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Pencil className="h-4 w-4" />
                Edit Listing
              </button>
              <button
                type="button"
                onClick={() => handlePublish(getValues() as ListingInput)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing Listing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish Listing Now
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: FORM MODE */
          <div className="space-y-8">
            {/* Form Header Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
                  <Home className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                    Add New Property Listing
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Post your rental property details so potential renters can
                    easily find and contact you.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Form */}
            <form
              onSubmit={handleSubmit(handlePreviewSubmit)}
              className="space-y-8"
            >
              {/* Section 1: Basic Info & Location */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  1. Basic Info & Location
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Title and address details for your property listing.
                </p>

                <div className="mt-6 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Listing Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cozy Bedspace near University & LRT Station"
                      {...register("title")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.title && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  {/* Address & City */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Street Address / Barangay{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 123 Katipunan Ave, Loyola Heights"
                        {...register("address")}
                        className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                      />
                      {errors.address && (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                          {errors.address.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        City / Municipality{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Quezon City"
                        {...register("city")}
                        className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                      />
                      {errors.city && (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                          {errors.city.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Property Type & Capacity */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  2. Classification, Capacity & Rent
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Specify property type, room numbers, occupancy format, and
                  monthly rent rate.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Property Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("property_type")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.property_type && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.property_type.message}
                      </p>
                    )}
                  </div>

                  {/* Occupancy Type */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Occupancy Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("occupancy_type")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    >
                      {OCCUPANCY_TYPES.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>
                    {errors.occupancy_type && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.occupancy_type.message}
                      </p>
                    )}
                  </div>

                  {/* Allowed Gender */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Allowed Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("allowed_gender")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    >
                      {GENDER_POLICIES.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                    {errors.allowed_gender && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.allowed_gender.message}
                      </p>
                    )}
                  </div>

                  {/* Monthly Rent */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Monthly Rent (₱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      placeholder="3000"
                      {...register("monthly_rent")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.monthly_rent && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.monthly_rent.message}
                      </p>
                    )}
                  </div>

                  {/* Total Rooms */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Total Rooms <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="1"
                      {...register("total_rooms")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.total_rooms && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.total_rooms.message}
                      </p>
                    )}
                  </div>

                  {/* Available Rooms */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Available Rooms <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="1"
                      {...register("available_rooms")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.available_rooms && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.available_rooms.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Utilities, Amenities & Safety Features */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  3. Features, Utilities & Amenities
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Select all options that apply to your rental property.
                </p>

                {/* Included Utilities */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Included Utilities
                  </label>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {AVAILABLE_UTILITIES.map((utility) => {
                      const isChecked = selectedUtilities.includes(utility);
                      return (
                        <button
                          type="button"
                          key={utility}
                          onClick={() =>
                            handleToggleArrayItem("utilities", utility)
                          }
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                            isChecked
                              ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300"
                              : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              isChecked
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-zinc-300 dark:text-zinc-600"
                            }`}
                          />
                          <span>{utility}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Property Amenities */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Property Amenities
                  </label>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {AVAILABLE_AMENITIES.map((amenity) => {
                      const isChecked = selectedAmenities.includes(amenity);
                      return (
                        <button
                          type="button"
                          key={amenity}
                          onClick={() =>
                            handleToggleArrayItem("amenities", amenity)
                          }
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                            isChecked
                              ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300"
                              : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              isChecked
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-zinc-300 dark:text-zinc-600"
                            }`}
                          />
                          <span>{amenity}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Safety & Security Features */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Safety & Security Features
                  </label>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {SAFETY_FEATURES.map((feature) => {
                      const isChecked = selectedSafety.includes(feature);
                      return (
                        <button
                          type="button"
                          key={feature}
                          onClick={() =>
                            handleToggleArrayItem("safety_features", feature)
                          }
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                            isChecked
                              ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300"
                              : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              isChecked
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-zinc-300 dark:text-zinc-600"
                            }`}
                          />
                          <span>{feature}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Contact Info, Description & House Rules */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  4. Contact & Additional Details
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Provide landlord contact information, general description, and
                  house rules.
                </p>

                <div className="mt-6 space-y-4">
                  {/* Contact Info */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Contact Information{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mobile: 0917-123-4567 | Viber: 0917-123-4567"
                      {...register("contact_info")}
                      className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.contact_info && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.contact_info.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Property Description (Optional)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe your property, nearby landmarks, transportation access..."
                      {...register("description")}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.description && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* House Rules */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      House Rules (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Curfew at 10 PM. Visitors allowed until 8 PM. No smoking or pets."
                      {...register("house_rules")}
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-sm text-zinc-900 transition-colors focus:border-purple-600 focus:bg-white focus:ring-1 focus:ring-purple-600 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-800 dark:text-white dark:focus:border-purple-500 dark:focus:bg-zinc-900"
                    />
                    {errors.house_rules && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {errors.house_rules.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Property Photos */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  5. Property Photos <span className="text-red-500">*</span>
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Upload property photos. At least 1 photo is required before
                  your listing can be published. You can preview, delete, or
                  choose which photo to set as the cover photo.
                </p>

                <div className="mt-6">
                  <ImageUploader
                    images={uploadedImages}
                    coverImage={activeCoverImage}
                    onImagesChange={(newImages, newCover) => {
                      setValue("images", newImages, { shouldValidate: true });
                      setValue("cover_image", newCover || "", {
                        shouldValidate: true,
                      });
                    }}
                    error={
                      errors.images?.message || errors.cover_image?.message
                    }
                  />
                </div>
              </div>

              {/* Form Navigation Footer */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                  href="/dashboard/landlord"
                  className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-800 active:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-700"
                >
                  <Eye className="h-4 w-4" />
                  Preview Listing
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
