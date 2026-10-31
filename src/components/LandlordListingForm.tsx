"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import ListingSaveErrorModal, {
  type ListingSaveError,
} from "@/components/ListingSaveErrorModal";
import { LocationPicker } from "@/components/map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createListingAction,
  updateListingAction,
} from "@/app/dashboard/landlord/listings/actions";
import {
  parseHouseRules,
  formatHouseRules,
  STANDARD_HOUSE_RULES,
} from "@/lib/house-rules";

const PROPERTY_TYPES = [
  "Boarding House",
  "Apartment",
  "Dormitory",
  "House",
  "Condo",
];

const OCCUPANCY_TYPES = ["Bedspace", "Single Room", "Shared Room", "Studio"];

const GENDER_POLICIES = ["Any / Co-ed", "Male Only", "Female Only"];

// 7 checklist categories from prototype specification
const AMENITIES_OPTIONS = ["Has Parking"];

const UTILITIES_OPTIONS = [
  "Wi-Fi Included",
  "Water Included",
  "Electricity Included",
];

const ROOM_FEATURES_OPTIONS = [
  "Air Conditioning",
  "Electric Fan",
  "Bed Provided",
  "Cabinet/Wardrobe",
  "Table/Desk",
  "Chair",
];

const BATHROOM_FEATURES_OPTIONS = ["Private Bathroom/CR", "Shared Bathroom/CR"];

const KITCHEN_FEATURES_OPTIONS = ["Has Kitchen", "Cooking Allowed"];

const LAUNDRY_FEATURES_OPTIONS = ["Has Laundry Area", "Has Washing Machine"];

const SAFETY_FEATURES_OPTIONS = [
  "CCTV",
  "Gated Property",
  "Security Guard",
  "Secure/Individual Door Lock",
];

// 5 House Rules pills from prototype specification
const HOUSE_RULES_PILLS = STANDARD_HOUSE_RULES;

/** Parse combined contact info into separate name and phone */
function parseContactInfo(
  contactInfo?: string,
  defaultName?: string,
  defaultPhone?: string,
) {
  if (!contactInfo || contactInfo.trim() === "") {
    return {
      name: defaultName || "",
      phone: defaultPhone || "",
    };
  }
  const pipeParts = contactInfo.split("|").map((s) => s.trim());
  if (pipeParts.length >= 2) {
    return { name: pipeParts[0], phone: pipeParts.slice(1).join(" | ") };
  }
  const dashParts = contactInfo.split(" - ").map((s) => s.trim());
  if (dashParts.length >= 2) {
    return { name: dashParts[0], phone: dashParts.slice(1).join(" - ") };
  }
  const parenMatch = contactInfo.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), phone: parenMatch[2].trim() };
  }
  if (/^(\+?63|0)9\d{9}$/.test(contactInfo.replace(/[\s-]/g, ""))) {
    return { name: defaultName || "", phone: contactInfo };
  }
  return { name: contactInfo, phone: defaultPhone || "" };
}

interface LandlordListingFormProps {
  initialValues?: Partial<ListingInput>;
  listingId?: string;
  isEditing?: boolean;
  defaultContactName?: string;
  defaultContactPhone?: string;
}

export default function LandlordListingForm({
  initialValues,
  listingId,
  isEditing = false,
  defaultContactName,
  defaultContactPhone,
}: LandlordListingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [submitting, setSubmitting] = useState(false);
  // Why Publish / Save failed, shown in ListingSaveErrorModal (#221).
  const [saveError, setSaveError] = useState<ListingSaveError | null>(null);
  // The Publish / Save button, which gets the focus back when the card closes.
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Split contact person name and phone
  const initialContact = parseContactInfo(
    initialValues?.contact_info,
    defaultContactName,
    defaultContactPhone,
  );
  const [contactName, setContactName] = useState(initialContact.name);
  const [contactPhone, setContactPhone] = useState(initialContact.phone);

  const initialParsedRules = parseHouseRules(initialValues?.house_rules);
  const [selectedRules, setSelectedRules] = useState<string[]>(
    initialParsedRules.rules,
  );
  const [customNotes, setCustomNotes] = useState<string>(
    initialParsedRules.notes,
  );

  const initialCombinedContact =
    initialValues?.contact_info ||
    (initialContact.name && initialContact.phone
      ? `${initialContact.name} | ${initialContact.phone}`
      : initialContact.name || initialContact.phone || "");

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
      monthly_rent: initialValues?.monthly_rent ?? 3000,
      total_rooms: initialValues?.total_rooms ?? 1,
      available_rooms: initialValues?.available_rooms ?? 1,
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
      contact_info: initialCombinedContact,
      availability_status: initialValues?.availability_status || "available",
      images: initialValues?.images || [],
      cover_image: initialValues?.cover_image || "",
      latitude:
        initialValues?.latitude != null ? initialValues.latitude : undefined,
      longitude:
        initialValues?.longitude != null ? initialValues.longitude : undefined,
    },
  });

  const selectedAmenities = useWatch({ control, name: "amenities" }) || [];
  const selectedUtilities = useWatch({ control, name: "utilities" }) || [];
  const selectedRoomFeatures =
    useWatch({ control, name: "room_features" }) || [];
  const selectedBathroomFeatures =
    useWatch({ control, name: "bathroom_features" }) || [];
  const selectedKitchenFeatures =
    useWatch({ control, name: "kitchen_features" }) || [];
  const selectedLaundryFeatures =
    useWatch({ control, name: "laundry_features" }) || [];
  const selectedSafety = useWatch({ control, name: "safety_features" }) || [];
  const uploadedImages = useWatch({ control, name: "images" }) || [];
  const activeCoverImage = useWatch({ control, name: "cover_image" }) || "";
  const latitude = useWatch({ control, name: "latitude" });
  const longitude = useWatch({ control, name: "longitude" });
  const propertyTypeValue = useWatch({ control, name: "property_type" });
  const occupancyTypeValue = useWatch({ control, name: "occupancy_type" });
  const allowedGenderValue = useWatch({ control, name: "allowed_gender" });
  const availabilityStatusValue = useWatch({
    control,
    name: "availability_status",
  });

  const updateContactInfo = (name: string, phone: string) => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    let combined = "";
    if (trimmedName && trimmedPhone) {
      combined = `${trimmedName} | ${trimmedPhone}`;
    } else {
      combined = trimmedName || trimmedPhone;
    }
    setValue("contact_info", combined, { shouldValidate: true });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setContactName(newName);
    updateContactInfo(newName, contactPhone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setContactPhone(newPhone);
    updateContactInfo(contactName, newPhone);
  };

  const handleToggleArrayItem = (
    fieldName:
      | "amenities"
      | "utilities"
      | "room_features"
      | "bathroom_features"
      | "kitchen_features"
      | "laundry_features"
      | "safety_features",
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

  const toggleHouseRule = (rule: string) => {
    const nextRules = selectedRules.includes(rule)
      ? selectedRules.filter((r) => r !== rule)
      : [...selectedRules, rule];
    setSelectedRules(nextRules);
    setValue("house_rules", formatHouseRules(nextRules, customNotes), {
      shouldValidate: true,
    });
  };

  const handleCustomNotesChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const nextNotes = e.target.value;
    setCustomNotes(nextNotes);
    setValue("house_rules", formatHouseRules(selectedRules, nextNotes), {
      shouldValidate: true,
    });
  };

  const isRuleActive = (rule: string) => selectedRules.includes(rule);

  // Switches between the form and the preview, and starts the new step at
  // the top of the page (#223).
  const showStep = (nextStep: "form" | "preview") => {
    flushSync(() => setStep(nextStep));
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
  };

  const handlePreviewSubmit = () => {
    showStep("preview");
  };

  const handleSave = async (data: ListingInput) => {
    setSubmitting(true);

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
        setSaveError({
          message: res.error,
          fixOnProfilePage: res.fixOnProfilePage ?? false,
        });
      }
    } catch (err) {
      console.error("Form submit error:", err);
      setSaveError({
        message: err instanceof Error ? err.message : "Failed to save listing.",
        fixOnProfilePage: false,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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

      {/* Publish / Save Error Card */}
      <ListingSaveErrorModal
        error={saveError}
        isEditing={isEditing}
        onClose={() => setSaveError(null)}
        returnFocusRef={saveButtonRef}
      />

      {/* STEP 2: PREVIEW MODE */}
      {step === "preview" ? (
        <div className="space-y-4">
          {/* Sticky Preview Header Banner */}
          <div className="sticky top-0 z-50 rounded-2xl border border-purple-200 bg-purple-50/95 p-2.5 shadow-md backdrop-blur-md sm:top-1 sm:px-4 sm:py-2.5 dark:border-purple-900/50 dark:bg-purple-950/90">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-700 text-white dark:bg-purple-600">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-purple-950 sm:text-sm dark:text-purple-100">
                  Listing Preview Mode
                </h2>
                <p className="text-[11px] text-purple-700 sm:text-xs dark:text-purple-300">
                  Review your property details exactly as renters will see them
                  before saving.
                </p>
              </div>
            </div>
          </div>

          {/* Shared Detail Component */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xs sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ListingDetailView listing={getValues() as ListingInput} />
          </div>

          {/* Bottom Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => showStep("form")}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-4 w-4" />
              Edit Listing
            </button>
            <button
              ref={saveButtonRef}
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
        <div className="space-y-6">
          {/* Header Banner with compact size & snug spacing */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-2xs sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50">
                  {isEditing
                    ? "Edit Property Listing"
                    : "Add New Property Listing"}
                </h1>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Update property details so potential renters can easily find
                  and contact you.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(handlePreviewSubmit)}
            className="space-y-6"
          >
            {/* Section 1: Basic Info & Location */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                1. Basic Info & Location
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Title and address details for your property listing.
              </p>

              <div className="mt-5 space-y-4">
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

                <div className="pt-2">
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Pin Property Location on Map *
                  </label>
                  <p className="mb-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Search your property address or click/drag the pin on the
                    map to set its exact location.
                  </p>
                  <LocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng, addressDetails) => {
                      setValue("latitude", lat, { shouldValidate: true });
                      setValue("longitude", lng, { shouldValidate: true });
                      if (addressDetails) {
                        if (addressDetails.address) {
                          setValue("address", addressDetails.address, {
                            shouldValidate: true,
                          });
                        }
                        if (addressDetails.city) {
                          setValue("city", addressDetails.city, {
                            shouldValidate: true,
                          });
                        }
                      }
                    }}
                    onClear={() => {
                      setValue("latitude", undefined as unknown as number);
                      setValue("longitude", undefined as unknown as number);
                    }}
                  />
                  {(errors.latitude || errors.longitude) && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errors.latitude?.message || errors.longitude?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Property Type & Pricing */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                2. Property Specifications & Rent Pricing
              </h2>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Property Type *
                  </label>
                  <Select
                    value={propertyTypeValue}
                    onValueChange={(val) =>
                      setValue("property_type", val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Occupancy Type *
                  </label>
                  <Select
                    value={occupancyTypeValue}
                    onValueChange={(val) =>
                      setValue("occupancy_type", val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select occupancy type" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPANCY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Allowed Gender *
                  </label>
                  <Select
                    value={allowedGenderValue}
                    onValueChange={(val) =>
                      setValue("allowed_gender", val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select allowed gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_POLICIES.map((policy) => (
                        <SelectItem key={policy} value={policy}>
                          {policy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    {...register("total_rooms", {
                      deps: "available_rooms",
                    })}
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
                <Select
                  value={availabilityStatusValue}
                  onValueChange={(val) =>
                    setValue(
                      "availability_status",
                      val as "available" | "almost_full" | "fully_occupied",
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select availability status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">
                      Available (🟢 Rooms Available)
                    </SelectItem>
                    <SelectItem value="almost_full">
                      Almost Full (🟡 Few Rooms Left)
                    </SelectItem>
                    <SelectItem value="fully_occupied">
                      Fully Occupied / Unavailable (🔴 Occupied)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 3: Features & Amenities Checklist (7 categories matching Picture 3) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                3. Features &amp; Amenities Checklist
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Select all features included with your property. These match
                renter search filters directly.
              </p>

              <div className="mt-6 space-y-5">
                {/* 1. Amenities */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Amenities
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {AMENITIES_OPTIONS.map((item) => {
                      const active = selectedAmenities.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("amenities", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Utilities Included */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Utilities Included
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {UTILITIES_OPTIONS.map((item) => {
                      const active = selectedUtilities.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("utilities", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Room Features */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Room Features
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {ROOM_FEATURES_OPTIONS.map((item) => {
                      const active = selectedRoomFeatures.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("room_features", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Bathroom */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Bathroom
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {BATHROOM_FEATURES_OPTIONS.map((item) => {
                      const active = selectedBathroomFeatures.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("bathroom_features", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Kitchen & Food */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Kitchen &amp; Food
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {KITCHEN_FEATURES_OPTIONS.map((item) => {
                      const active = selectedKitchenFeatures.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("kitchen_features", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Laundry */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Laundry
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {LAUNDRY_FEATURES_OPTIONS.map((item) => {
                      const active = selectedLaundryFeatures.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("laundry_features", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Safety & Security Features */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Safety &amp; Security Features
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {SAFETY_FEATURES_OPTIONS.map((item) => {
                      const active = selectedSafety.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            handleToggleArrayItem("safety_features", item)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Property Photos */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                4. Property Photos &amp; Cover Image
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Upload photos of your property. Choose one photo as the main
                cover photo.
              </p>

              <div className="mt-5">
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

            {/* Section 5: Contact Details & Description (Split contact + 5 House Rules pills) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                5. Contact Details &amp; Description
              </h2>

              <div className="mt-5 space-y-4">
                {/* Split Contact Info: Name & Phone */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Contact Person&apos;s Name *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={handleNameChange}
                      placeholder="e.g. Juan Dela Cruz"
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Contact Person&apos;s Number *
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={handlePhoneChange}
                      placeholder="e.g. 09171234567"
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                    />
                  </div>
                </div>

                {errors.contact_info && (
                  <p className="text-xs text-rose-500">
                    {errors.contact_info.message}
                  </p>
                )}

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
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      House Rules &amp; Policies
                    </label>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Click to toggle standard policies
                    </span>
                  </div>

                  {/* 5 Rule Pills */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {HOUSE_RULES_PILLS.map((rule) => {
                      const active = isRuleActive(rule);
                      return (
                        <button
                          key={rule}
                          type="button"
                          onClick={() => toggleHouseRule(rule)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-30"}`}
                          />
                          {rule}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dedicated Additional Guidelines & Custom Notes */}
                  <div className="mt-3.5">
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Additional Guidelines &amp; Custom Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customNotes}
                      onChange={handleCustomNotesChange}
                      placeholder="e.g. Visitors allowed until 9 PM only, please clean up the kitchen after cooking..."
                      className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
                    />
                  </div>
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
