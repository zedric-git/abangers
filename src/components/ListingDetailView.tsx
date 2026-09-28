"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Building,
  Users,
  Home,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Phone,
  FileText,
  AlertCircle,
  Star,
} from "lucide-react";
import { ListingInput } from "@/lib/validations/listing";

interface ListingDetailViewProps {
  listing: ListingInput;
  isPreview?: boolean;
}

export default function ListingDetailView({ listing }: ListingDetailViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    listing.cover_image || listing.images?.[0] || "",
  );

  const imagesList = listing.images || [];
  const activeCover = listing.cover_image || imagesList[0] || "";

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100">
      {/* Photo Gallery Hero */}
      <div className="space-y-4">
        {/* Featured Large Photo Display */}
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-md sm:aspect-16/9 dark:border-zinc-800 dark:bg-zinc-900">
          {selectedPhoto || activeCover ? (
            <Image
              src={selectedPhoto || activeCover}
              alt={listing.title}
              fill
              className="object-cover transition-all duration-300"
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
              <Home className="h-16 w-16" />
              <p className="mt-2 text-sm">No photo available</p>
            </div>
          )}

          {/* Status Badge Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-700/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md dark:bg-purple-600/90">
              <Star className="h-3.5 w-3.5 fill-current text-yellow-300" />
              Cover Photo
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-600/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md">
              {listing.availability_status === "available"
                ? "Available Now"
                : listing.availability_status === "almost_full"
                  ? "Almost Full"
                  : "Fully Occupied"}
            </span>
          </div>
        </div>

        {/* Photo Thumbnails Strip */}
        {imagesList.length > 1 && (
          <div className="flex scrollbar-thin items-center gap-3 overflow-x-auto pb-2">
            {imagesList.map((imgUrl, idx) => {
              const isSelected = (selectedPhoto || activeCover) === imgUrl;
              return (
                <button
                  type="button"
                  key={`${imgUrl}-${idx}`}
                  onClick={() => setSelectedPhoto(imgUrl)}
                  className={`relative aspect-4/3 h-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-purple-600 ring-2 ring-purple-600/30 dark:border-purple-500"
                      : "border-zinc-200 opacity-70 hover:opacity-100 dark:border-zinc-800"
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`Photo thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Title, Badges & Address Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            {listing.property_type || "Boarding House"}
          </span>
          <span className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {listing.occupancy_type || "Bedspace"}
          </span>
          <span className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            {listing.allowed_gender || "Any / Co-ed"}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {listing.title || "Untitled Property Listing"}
        </h1>

        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <MapPin className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
          <span>
            {listing.address}
            {listing.city ? `, ${listing.city}` : ""}
          </span>
        </div>
      </div>

      {/* Pricing & Key Capacity Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5 dark:border-purple-900/30 dark:bg-purple-950/20">
          <p className="text-xs font-semibold tracking-wider text-purple-700 uppercase dark:text-purple-400">
            Monthly Rent
          </p>
          <p className="mt-1.5 text-2xl font-black text-purple-950 dark:text-purple-200">
            ₱{Number(listing.monthly_rent || 0).toLocaleString()}
            <span className="text-xs font-normal text-zinc-500"> / month</span>
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Total Rooms
          </div>
          <p className="mt-1.5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {listing.total_rooms || 1} Rooms
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Available Now
          </div>
          <p className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {listing.available_rooms || 0} Rooms Left
          </p>
        </div>
      </div>

      {/* Features, Utilities & Amenities */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Features, Utilities & Amenities
        </h2>

        {/* Included Utilities */}
        {listing.utilities && listing.utilities.length > 0 && (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <Zap className="h-4 w-4 text-amber-500" />
              Included Utilities
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.utilities.map((util) => (
                <span
                  key={util}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  {util}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Property Amenities */}
        {listing.amenities && listing.amenities.length > 0 && (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <Home className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Property Amenities
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Safety Features */}
        {listing.safety_features && listing.safety_features.length > 0 && (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Safety & Security Features
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.safety_features.map((safety) => (
                <span
                  key={safety}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  {safety}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Description & House Rules */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Description */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Property Description
          </h2>
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-400">
            {listing.description || "No description provided."}
          </p>
        </div>

        {/* House Rules */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            House Rules
          </h2>
          <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-zinc-600 dark:text-zinc-400">
            {listing.house_rules || "No specific house rules listed."}
          </p>
        </div>
      </div>

      {/* Landlord Contact Info Card */}
      <div className="rounded-3xl border border-purple-200 bg-purple-50/60 p-6 shadow-xs sm:p-8 dark:border-purple-900/40 dark:bg-purple-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-purple-950 dark:text-purple-100">
              Landlord Contact Details
            </h3>
            <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
              Renters will reach out to you via the contact info below.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-purple-950 shadow-xs dark:bg-purple-900 dark:text-purple-100">
            <Phone className="h-4 w-4 text-purple-700 dark:text-purple-300" />
            <span>{listing.contact_info || "Contact info not provided"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
