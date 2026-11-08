"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Building,
  Users,
  UserCheck,
  Banknote,
  ChevronDown,
  ChevronUp,
  MapPin,
  Check,
} from "lucide-react";
import {
  PROPERTY_TYPES,
  OCCUPANCY_TYPES,
  GENDER_POLICIES,
  type PropertyType,
  type OccupancyType,
  type GenderPolicy,
} from "@/lib/validations/listing";
import {
  type ListingFilterParams,
  FILTER_DISTANCE_OPTIONS,
  FILTER_UTILITIES_OPTIONS,
  FILTER_ROOM_FEATURES_OPTIONS,
  FILTER_BATHROOM_OPTIONS,
  FILTER_KITCHEN_OPTIONS,
  FILTER_LAUNDRY_OPTIONS,
  FILTER_SAFETY_OPTIONS,
  FILTER_HOUSE_RULES_OPTIONS,
} from "@/lib/validations/listing-filters";
import { countActiveAttributeFilters } from "@/lib/filter-listings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ListingFilterControlsProps {
  filters: ListingFilterParams;
  onFilterChange: <K extends keyof ListingFilterParams>(
    key: K,
    value: ListingFilterParams[K] | undefined,
  ) => void;
  onResetFilters: () => void;
  className?: string;
}

const RENT_BUDGET_PRESETS = [
  { label: "Up to ₱3,000", value: 3000 },
  { label: "Up to ₱5,000", value: 5000 },
  { label: "Up to ₱8,000", value: 8000 },
  { label: "Up to ₱12,000", value: 12000 },
];

/**
 * Discovery filter controls matching .Abangers UI content specification (S2-05, #15, #89, #90).
 */
export default function ListingFilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  className = "",
}: ListingFilterControlsProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);

  const [minRentInput, setMinRentInput] = useState(
    filters.min_rent ? String(filters.min_rent) : "",
  );
  const [maxRentInput, setMaxRentInput] = useState(
    filters.max_rent ? String(filters.max_rent) : "",
  );
  const [nearInput, setNearInput] = useState(filters.near || "");

  // Sync inputs with external resets or updates
  const [prevMinRent, setPrevMinRent] = useState(filters.min_rent);
  if (prevMinRent !== filters.min_rent) {
    setPrevMinRent(filters.min_rent);
    setMinRentInput(filters.min_rent ? String(filters.min_rent) : "");
  }

  const [prevMaxRent, setPrevMaxRent] = useState(filters.max_rent);
  if (prevMaxRent !== filters.max_rent) {
    setPrevMaxRent(filters.max_rent);
    setMaxRentInput(filters.max_rent ? String(filters.max_rent) : "");
  }

  const [prevNear, setPrevNear] = useState(filters.near);
  if (prevNear !== filters.near) {
    setPrevNear(filters.near);
    setNearInput(filters.near || "");
  }

  const activeCount = countActiveAttributeFilters(filters);

  const toggleArrayItem = (
    key:
      | "utilities"
      | "room_features"
      | "bathroom"
      | "kitchen"
      | "laundry"
      | "safety"
      | "house_rules",
    item: string,
  ) => {
    const current = filters[key] || [];
    if (current.includes(item)) {
      const updated = current.filter((i) => i !== item);
      onFilterChange(key, updated.length > 0 ? updated : undefined);
    } else {
      onFilterChange(key, [...current, item]);
    }
  };

  const handleResetAll = () => {
    setMinRentInput("");
    setMaxRentInput("");
    setNearInput("");
    onResetFilters();
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Toggle Button */}
      <div className="flex items-center justify-between sm:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-expanded={isMobileOpen}
          aria-controls="mobile-filters-panel"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
              isMobileOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Filter Toolbar */}
      <div
        id="mobile-filters-panel"
        className={`${
          isMobileOpen ? "block" : "hidden"
        } mt-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:mt-0 sm:block dark:border-zinc-800 dark:bg-zinc-900/70`}
      >
        {/* Row 1: Primary Discovery Controls */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Rent Range (Min - Max) */}
          <div>
            <label
              htmlFor="filter-min-rent"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <Banknote className="h-3.5 w-3.5 text-zinc-400" />
              <span>Rent</span>
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-zinc-400">
                  ₱
                </span>
                <input
                  id="filter-min-rent"
                  type="number"
                  min={1}
                  step={100}
                  placeholder="Min (₱2,500)"
                  value={minRentInput}
                  onChange={(e) => {
                    setMinRentInput(e.target.value);
                    const val = e.target.value.trim();
                    if (!val) {
                      onFilterChange("min_rent", undefined);
                    } else {
                      const num = Number(val);
                      if (Number.isFinite(num) && num > 0) {
                        onFilterChange("min_rent", num);
                      }
                    }
                  }}
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-white pr-2 pl-5 text-center text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>

              <span className="text-xs font-bold text-zinc-400">-</span>

              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-zinc-400">
                  ₱
                </span>
                <input
                  id="filter-max-rent"
                  type="number"
                  min={1}
                  step={100}
                  placeholder="Max (₱5,000)"
                  value={maxRentInput}
                  onChange={(e) => {
                    setMaxRentInput(e.target.value);
                    const val = e.target.value.trim();
                    if (!val) {
                      onFilterChange("max_rent", undefined);
                    } else {
                      const num = Number(val);
                      if (Number.isFinite(num) && num > 0) {
                        onFilterChange("max_rent", num);
                      }
                    }
                  }}
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-white pr-2 pl-5 text-center text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* Quick Preset Pills */}
            <div className="mt-2 flex flex-wrap gap-1">
              {RENT_BUDGET_PRESETS.map((preset) => {
                const isSelected = filters.max_rent === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={preset.label}
                    onClick={() => {
                      if (isSelected) {
                        setMaxRentInput("");
                        onFilterChange("max_rent", undefined);
                      } else {
                        setMaxRentInput(String(preset.value));
                        onFilterChange("max_rent", preset.value);
                      }
                    }}
                    className={`cursor-pointer rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    ₱{(preset.value / 1000).toFixed(0)}k
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Property Type */}
          <div>
            <label
              htmlFor="filter-property-type"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <Building className="h-3.5 w-3.5 text-zinc-400" />
              <span>Property Type</span>
            </label>
            <div className="mt-1.5">
              <Select
                value={filters.property_type ?? "all"}
                onValueChange={(val) => {
                  onFilterChange(
                    "property_type",
                    val === "all" ? undefined : (val as PropertyType),
                  );
                }}
              >
                <SelectTrigger
                  id="filter-property-type"
                  className="h-9 text-xs"
                >
                  <SelectValue placeholder="All Property Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Property Types</SelectItem>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Room / Occupancy Type */}
          <div>
            <label
              htmlFor="filter-occupancy"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <Users className="h-3.5 w-3.5 text-zinc-400" />
              <span>Room / Occupancy</span>
            </label>
            <div className="mt-1.5">
              <Select
                value={filters.occupancy ?? "all"}
                onValueChange={(val) => {
                  onFilterChange(
                    "occupancy",
                    val === "all" ? undefined : (val as OccupancyType),
                  );
                }}
              >
                <SelectTrigger id="filter-occupancy" className="h-9 text-xs">
                  <SelectValue placeholder="All Room Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Room Types</SelectItem>
                  {OCCUPANCY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Allowed Gender Policy */}
          <div>
            <label
              htmlFor="filter-gender"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span>Allowed Gender</span>
            </label>
            <div className="mt-1.5">
              <Select
                value={filters.gender ?? "all"}
                onValueChange={(val) => {
                  onFilterChange(
                    "gender",
                    val === "all" ? undefined : (val as GenderPolicy),
                  );
                }}
              >
                <SelectTrigger id="filter-gender" className="h-9 text-xs">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  {GENDER_POLICIES.map((policy) => (
                    <SelectItem key={policy} value={policy}>
                      {policy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Toggle Button for More Filters */}
        <div className="mt-3.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsMoreFiltersOpen((prev) => !prev)}
            className="dark:bg-zinc-850 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              {isMoreFiltersOpen
                ? "Hide Detailed Filters"
                : "More Filters (Location, Utilities, Amenities, Rules)"}
            </span>
            {isMoreFiltersOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Expandable Section: Full .Abangers UI Filter Content */}
        {isMoreFiltersOpen && (
          <div className="mt-4 space-y-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            {/* 1. Location & Amenities */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="filter-near"
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Location Near</span>
                </label>
                <input
                  id="filter-near"
                  type="text"
                  placeholder="University, street, landmark..."
                  value={nearInput}
                  onChange={(e) => {
                    setNearInput(e.target.value);
                    const val = e.target.value.trim();
                    onFilterChange("near", val || undefined);
                  }}
                  className="mt-1.5 h-9 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="filter-distance"
                  className="block text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  Within Distance
                </label>
                <div className="mt-1.5">
                  <Select
                    value={filters.distance ?? "all"}
                    onValueChange={(val) => {
                      onFilterChange(
                        "distance",
                        val === "all" ? undefined : val,
                      );
                    }}
                  >
                    <SelectTrigger id="filter-distance" className="h-9 text-xs">
                      <SelectValue placeholder="Select distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any distance</SelectItem>
                      {FILTER_DISTANCE_OPTIONS.map((dist) => (
                        <SelectItem key={dist} value={dist}>
                          {dist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Amenities
                </label>
                <div className="mt-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={Boolean(filters.parking)}
                      onChange={(e) =>
                        onFilterChange(
                          "parking",
                          e.target.checked ? true : undefined,
                        )
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-purple-600 accent-purple-600"
                    />
                    <span>Parking</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Utilities Included */}
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Utilities Included
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {FILTER_UTILITIES_OPTIONS.map((item) => {
                  const active = filters.utilities?.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("utilities", item)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 text-purple-600" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Room Features */}
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Room Features
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {FILTER_ROOM_FEATURES_OPTIONS.map((item) => {
                  const active = filters.room_features?.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("room_features", item)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 text-purple-600" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Bathroom & Kitchen & Laundry Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Bathroom
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FILTER_BATHROOM_OPTIONS.map((item) => {
                    const active = filters.bathroom?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("bathroom", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3 w-3 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Kitchen & Food
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FILTER_KITCHEN_OPTIONS.map((item) => {
                    const active = filters.kitchen?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("kitchen", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3 w-3 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Laundry
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FILTER_LAUNDRY_OPTIONS.map((item) => {
                    const active = filters.laundry?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("laundry", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3 w-3 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 5. Safety & Security */}
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Safety & Security
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {FILTER_SAFETY_OPTIONS.map((item) => {
                  const active = filters.safety?.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("safety", item)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 text-purple-600" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. House Rules */}
            <div>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                House Rules
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {FILTER_HOUSE_RULES_OPTIONS.map((item) => {
                  const active = filters.house_rules?.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("house_rules", item)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 text-purple-600" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Badges Bar */}
        {activeCount > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Active filters:
            </span>

            {filters.min_rent !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                ≥ ₱{filters.min_rent.toLocaleString()}
                <button
                  type="button"
                  onClick={() => {
                    setMinRentInput("");
                    onFilterChange("min_rent", undefined);
                  }}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label="Remove min rent filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.max_rent !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                ≤ ₱{filters.max_rent.toLocaleString()}
                <button
                  type="button"
                  onClick={() => {
                    setMaxRentInput("");
                    onFilterChange("max_rent", undefined);
                  }}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label="Remove max rent filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.property_type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {filters.property_type}
                <button
                  type="button"
                  onClick={() => onFilterChange("property_type", undefined)}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label={`Remove property type ${filters.property_type} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.occupancy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {filters.occupancy}
                <button
                  type="button"
                  onClick={() => onFilterChange("occupancy", undefined)}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label={`Remove occupancy type ${filters.occupancy} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.gender && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {filters.gender}
                <button
                  type="button"
                  onClick={() => onFilterChange("gender", undefined)}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label={`Remove gender policy ${filters.gender} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.near && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                Near: {filters.near}
                <button
                  type="button"
                  onClick={() => {
                    setNearInput("");
                    onFilterChange("near", undefined);
                  }}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label="Remove near location filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.distance && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {filters.distance}
                <button
                  type="button"
                  onClick={() => onFilterChange("distance", undefined)}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label="Remove distance filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.parking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                Parking
                <button
                  type="button"
                  onClick={() => onFilterChange("parking", undefined)}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label="Remove parking filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(
              [
                "utilities",
                "room_features",
                "bathroom",
                "kitchen",
                "laundry",
                "safety",
                "house_rules",
              ] as const
            ).flatMap((key) =>
              (filters[key] || []).map((val) => (
                <span
                  key={`${key}-${val}`}
                  className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                >
                  {val}
                  <button
                    type="button"
                    onClick={() => toggleArrayItem(key, val)}
                    className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                    aria-label={`Remove filter ${val}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )),
            )}

            <button
              type="button"
              onClick={handleResetAll}
              className="ml-auto inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <RotateCcw className="h-3 w-3" />
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
