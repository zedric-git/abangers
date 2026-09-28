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
import {
  createListingAction,
  updateListingAction,
} from "@/app/dashboard/landlord/listings/actions";

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

interface LandlordListingFormProps {
  initialValues?: Partial<ListingInput>;
  listingId?: string;
  isEditing?: boolean;
}

export default function LandlordListingForm({
  initialValues,
  listingId,
  isEditing = false,
}: LandlordListingFormProps) {
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
      title: initialValues?.title || "",
      address: initialValues?.address || "",
      city: initialValues?.city || "",
      monthly_rent: initialValues?.monthly_rent || 3000,
      total_rooms: initialValues?.total_rooms || 1,
      available_rooms: initialValues?.available_rooms || 1,
      property_type: initialValues?.property_type || "Boarding House",
      occupancy_type: initialValues?.occupancy_type || "Bedspace",
      allowed_gender: initialValues?.allowed_gender || "Any / Co-ed",
      amenities: initialValues?.amenities || [],
      utilities: initialValues?.utilities || [],
      room_features: initialValues?.room_features || [],
      bathroom_features: initialValues?.bathroom_features || [],
      kitchen_features: initialValues?.kitchen_features || [],
      laundry_features: initialValues?.laundry_features || [],
      safety_features: initialValues?.safety_features || [],
      description: initialValues?.description || "",
      house_rules: initialValues?.house_rules || "",
      contact_info: initialValues?.contact_info || "",
      availability_status: initialValues?.availability_status || "available",
      images: initialValues?.images || [],
      cover_image: initialValues?.cover_image || "",
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

  const handleSave = async (data: ListingInput) => {
    setSubmitting(true);
    setServerError(null);

    if (data.available_rooms <= 0) {
      data.availability_status = "fully_occupied";
    }

    try {
      let res;
      if (isEditing && listingId) {
        res = await updateListingAction(listingId, data);
      } else {
        res = await createListingAction(data);
      }

      if (res.success) {
        router.push("/dashboard/landlord/listings");
        router.refresh();
      } else {
        setServerError(res.error);
        setStep("form");
      }
    } catch (err) {
      console.error("Form submit error:", err);
      setServerError(
        err instanceof Error ? err.message : "Failed to save listing.",
      );
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header & Back Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard/landlord"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Step Indicator Tabs */}
        <div className="flex items-center gap-2 rounded-xl bg-zinc-200/80 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setStep("form")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              step === "form"
                ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            1. {isEditing ? "Edit Form" : "Listing Form"}
          </button>
          <button
            type="button"
            onClick={handleSubmit(handlePreviewSubmit)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              step === "preview"
                ? "bg-purple-700 text-white shadow-2xs dark:bg-purple-600"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            2. Preview & Publish
          </button>
        </div>
      </div>

      {/* Global Server Error Alert */}
      {serverError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <p>{serverError}</p>
        </div>
      )}

      {/* STEP 2: PREVIEW MODE */}
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
                  Review your property details exactly as renters will see them
                  before saving.
                </p>
              </div>
            </div>
          </div>

          {/* Shared Detail Component */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <ListingDetailView listing={getValues() as ListingInput} />
          </div>

          {/* Bottom Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setStep("form");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-4 w-4" />
              Edit Listing
            </button>
            <button
              type="button"
              onClick={() => handleSave(getValues() as ListingInput)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isEditing ? "Save Listing Changes" : "Publish Listing Now"}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* STEP 1: FORM MODE */
        <div className="space-y-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                  {isEditing
                    ? "Edit Property Listing"
                    : "Add New Property Listing"}
                </h1>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Update property details so potential renters can easily find
                  and contact you.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(handlePreviewSubmit)}
            className="space-y-8"
          >
            {/* Section 1: Basic Info & Location */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                1. Basic Info & Location
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Title and address details for your property listing.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Property Listing Title *
                  </label>
                  <input
                    type="text"
                    {...register("title")}
                    placeholder="e.g. Spacious Bedspace near University Gateway"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-rose-500">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Street Address / Barangay *
                    </label>
                    <input
                      type="text"
                      {...register("address")}
                      placeholder="e.g. 123 Katipunan Ave, Brgy. Loyola"
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                    />
                    {errors.address && (
                      <p className="mt-1 text-xs text-rose-500">
                        {errors.address.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      City / Municipality *
                    </label>
                    <input
                      type="text"
                      {...register("city")}
                      placeholder="e.g. Quezon City"
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-rose-500">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Property Type & Pricing */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                2. Property Specifications & Rent Pricing
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Property Type *
                  </label>
                  <select
                    {...register("property_type")}
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Occupancy Type *
                  </label>
                  <select
                    {...register("occupancy_type")}
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  >
                    {OCCUPANCY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Allowed Gender *
                  </label>
                  <select
                    {...register("allowed_gender")}
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  >
                    {GENDER_POLICIES.map((policy) => (
                      <option key={policy} value={policy}>
                        {policy}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Monthly Rent (₱) *
                  </label>
                  <input
                    type="number"
                    {...register("monthly_rent")}
                    placeholder="3000"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                  {errors.monthly_rent && (
                    <p className="mt-1 text-xs text-rose-500">
                      {errors.monthly_rent.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Total Rooms *
                  </label>
                  <input
                    type="number"
                    {...register("total_rooms")}
                    placeholder="1"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                  {errors.total_rooms && (
                    <p className="mt-1 text-xs text-rose-500">
                      {errors.total_rooms.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Available Rooms *
                  </label>
                  <input
                    type="number"
                    {...register("available_rooms", {
                      onChange: (e) => {
                        const val = Number(e.target.value);
                        if (val <= 0) {
                          setValue("availability_status", "fully_occupied", {
                            shouldValidate: true,
                          });
                        }
                      },
                    })}
                    placeholder="1"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                  {errors.available_rooms && (
                    <p className="mt-1 text-xs text-rose-500">
                      {errors.available_rooms.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Availability Status *
                </label>
                <select
                  {...register("availability_status")}
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                >
                  <option value="available">
                    Available (🟢 Rooms Available)
                  </option>
                  <option value="almost_full">
                    Almost Full (🟡 Few Rooms Left)
                  </option>
                  <option value="fully_occupied">
                    Fully Occupied / Unavailable (🔴 Occupied)
                  </option>
                </select>
              </div>
            </div>

            {/* Section 3: Features & Amenities */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                3. Features & Amenities Checklist
              </h2>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Utilities Included
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {AVAILABLE_UTILITIES.map((utility) => {
                      const active = selectedUtilities.includes(utility);
                      return (
                        <button
                          key={utility}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("utilities", utility)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {utility}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Room & Property Amenities
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {AVAILABLE_AMENITIES.map((amenity) => {
                      const active = selectedAmenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("amenities", amenity)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Safety & Security Features
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {SAFETY_FEATURES.map((feature) => {
                      const active = selectedSafety.includes(feature);
                      return (
                        <button
                          key={feature}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("safety_features", feature)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {feature}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Property Photos */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                4. Property Photos & Cover Image
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Upload photos of your property. Choose one photo as the main
                cover photo.
              </p>

              <div className="mt-6">
                <ImageUploader
                  images={uploadedImages}
                  coverImage={activeCoverImage}
                  onImagesChange={(images: string[], coverImage?: string) => {
                    setValue("images", images, { shouldValidate: true });
                    if (coverImage) {
                      setValue("cover_image", coverImage, {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
                {errors.images && (
                  <p className="mt-2 text-xs text-rose-500">
                    {errors.images.message}
                  </p>
                )}
                {errors.cover_image && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.cover_image.message}
                  </p>
                )}
              </div>
            </div>

            {/* Section 5: Contact & Details */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                5. Contact Details & Description
              </h2>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Contact Information *
                  </label>
                  <input
                    type="text"
                    {...register("contact_info")}
                    placeholder="e.g. Phone: 0917-123-4567 | Email: landlord@example.com"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                  {errors.contact_info && (
                    <p className="mt-1 text-xs text-rose-500">
                      {errors.contact_info.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Property Description
                  </label>
                  <textarea
                    rows={4}
                    {...register("description")}
                    placeholder="Describe the atmosphere, nearby landmarks, curfew, environment..."
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    House Rules & Policies
                  </label>
                  <textarea
                    rows={3}
                    {...register("house_rules")}
                    placeholder="e.g. No smoking, visitors allowed until 9 PM..."
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-purple-800 active:bg-purple-900 dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                <Eye className="h-4 w-4" />
                Preview Listing
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
