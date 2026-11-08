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
 * Collapsible discovery filter controls with persistent active badges (S2-05, #15, #89, #90).
 */
export default function ListingFilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  className = "",
}: ListingFilterControlsProps) {
  // Closed by default so listings immediately appear above the fold
  const [isOpen, setIsOpen] = useState(false);
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

  // Reusable active badge pills
  const renderActiveBadgePills = () => (
    <>
      {filters.min_rent !== undefined && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
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
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.max_rent !== undefined && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
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
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.property_type && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
          {filters.property_type}
          <button
            type="button"
            onClick={() => onFilterChange("property_type", undefined)}
            className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
            aria-label={`Remove property type ${filters.property_type} filter`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.occupancy && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
          {filters.occupancy}
          <button
            type="button"
            onClick={() => onFilterChange("occupancy", undefined)}
            className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
            aria-label={`Remove occupancy type ${filters.occupancy} filter`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.gender && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
          {filters.gender}
          <button
            type="button"
            onClick={() => onFilterChange("gender", undefined)}
            className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
            aria-label={`Remove gender policy ${filters.gender} filter`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.near && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
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
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.distance && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
          {filters.distance}
          <button
            type="button"
            onClick={() => onFilterChange("distance", undefined)}
            className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
            aria-label="Remove distance filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {filters.parking && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300">
          Parking
          <button
            type="button"
            onClick={() => onFilterChange("parking", undefined)}
            className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
            aria-label="Remove parking filter"
          >
            <X className="h-3.5 w-3.5" />
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
            className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300"
          >
            {val}
            <button
              type="button"
              onClick={() => toggleArrayItem(key, val)}
              className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
              aria-label={`Remove filter ${val}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )),
      )}
    </>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Sleek Filters Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex cursor-pointer items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-semibold shadow-2xs transition-all sm:text-sm ${
            isOpen
              ? "border-purple-600 bg-purple-600 text-white shadow-xs"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:bg-purple-950/20"
          }`}
          aria-expanded={isOpen}
          aria-controls="filters-expanded-panel"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{isOpen ? "Hide Filters" : "Filters"}</span>
          {activeCount > 0 && (
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                isOpen ? "bg-white text-purple-700" : "bg-purple-600 text-white"
              }`}
            >
              {activeCount}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline sm:text-sm dark:text-purple-400 dark:hover:text-purple-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Filters ({activeCount})</span>
          </button>
        )}
      </div>

      {/* 2. Always-Visible Active Badges (When Filter Panel is Closed) */}
      {!isOpen && activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/80 p-3 shadow-2xs backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Active:
          </span>
          {renderActiveBadgePills()}
        </div>
      )}

      {/* 3. Collapsible Filter Card (Smoothly revealed when open) */}
      {isOpen && (
        <div
          id="filters-expanded-panel"
          className="mt-3.5 rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/80"
        >
          {/* Row 1: Primary Discovery Controls */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Rent Range (Min - Max) */}
            <div>
              <label
                htmlFor="filter-min-rent"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 sm:text-sm dark:text-zinc-300"
              >
                <Banknote className="h-4 w-4 text-zinc-400" />
                <span>Rent Range</span>
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-zinc-400 sm:text-sm">
                    ₱
                  </span>
                  <input
                    id="filter-min-rent"
                    type="number"
                    min={1}
                    step={100}
                    placeholder="Min ₱2,500"
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
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-2.5 pl-6 text-center text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none sm:text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>

                <span className="text-xs font-bold text-zinc-400 sm:text-sm">
                  -
                </span>

                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-zinc-400 sm:text-sm">
                    ₱
                  </span>
                  <input
                    id="filter-max-rent"
                    type="number"
                    min={1}
                    step={100}
                    placeholder="Max ₱5,000"
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
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-2.5 pl-6 text-center text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none sm:text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>

              {/* Quick Preset Pills */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
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
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 sm:text-sm dark:text-zinc-300"
              >
                <Building className="h-4 w-4 text-zinc-400" />
                <span>Property Type</span>
              </label>
              <div className="mt-2">
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
                    className="h-10 rounded-xl text-xs sm:text-sm"
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
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 sm:text-sm dark:text-zinc-300"
              >
                <Users className="h-4 w-4 text-zinc-400" />
                <span>Room / Occupancy</span>
              </label>
              <div className="mt-2">
                <Select
                  value={filters.occupancy ?? "all"}
                  onValueChange={(val) => {
                    onFilterChange(
                      "occupancy",
                      val === "all" ? undefined : (val as OccupancyType),
                    );
                  }}
                >
                  <SelectTrigger
                    id="filter-occupancy"
                    className="h-10 rounded-xl text-xs sm:text-sm"
                  >
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
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 sm:text-sm dark:text-zinc-300"
              >
                <UserCheck className="h-4 w-4 text-zinc-400" />
                <span>Allowed Gender</span>
              </label>
              <div className="mt-2">
                <Select
                  value={filters.gender ?? "all"}
                  onValueChange={(val) => {
                    onFilterChange(
                      "gender",
                      val === "all" ? undefined : (val as GenderPolicy),
                    );
                  }}
                >
                  <SelectTrigger
                    id="filter-gender"
                    className="h-10 rounded-xl text-xs sm:text-sm"
                  >
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

          {/* Toggle Button for More Detailed Filters */}
          <div className="mt-4 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsMoreFiltersOpen((prev) => !prev)}
              className="dark:bg-zinc-850 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 sm:text-sm dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>
                {isMoreFiltersOpen
                  ? "Hide Detailed Filters"
                  : "More Filters (Location, Utilities, Amenities, Rules)"}
              </span>
              {isMoreFiltersOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>
          </div>

          {/* Expandable Section: Full .Abangers UI Filter Content */}
          {isMoreFiltersOpen && (
            <div className="mt-4 space-y-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
              {/* 1. Location & Amenities */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="filter-near"
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200"
                  >
                    <MapPin className="h-4 w-4 text-zinc-400" />
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
                    className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:outline-none sm:text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="filter-distance"
                    className="block text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200"
                  >
                    Within Distance
                  </label>
                  <div className="mt-2">
                    <Select
                      value={filters.distance ?? "all"}
                      onValueChange={(val) => {
                        onFilterChange(
                          "distance",
                          val === "all" ? undefined : val,
                        );
                      }}
                    >
                      <SelectTrigger
                        id="filter-distance"
                        className="h-10 rounded-xl text-xs sm:text-sm"
                      >
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
                  <label className="block text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                    Amenities
                  </label>
                  <div className="mt-3">
                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-medium text-zinc-700 sm:text-sm dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={Boolean(filters.parking)}
                        onChange={(e) =>
                          onFilterChange(
                            "parking",
                            e.target.checked ? true : undefined,
                          )
                        }
                        className="h-4.5 w-4.5 rounded border-zinc-300 text-purple-600 accent-purple-600"
                      />
                      <span>Parking</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Utilities Included */}
              <div>
                <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                  Utilities Included
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {FILTER_UTILITIES_OPTIONS.map((item) => {
                    const active = filters.utilities?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("utilities", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Room Features */}
              <div>
                <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                  Room Features
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {FILTER_ROOM_FEATURES_OPTIONS.map((item) => {
                    const active = filters.room_features?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("room_features", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Bathroom & Kitchen & Laundry Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                    Bathroom
                  </span>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {FILTER_BATHROOM_OPTIONS.map((item) => {
                      const active = filters.bathroom?.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayItem("bathroom", item)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                          }`}
                        >
                          {active && (
                            <Check className="h-3.5 w-3.5 text-purple-600" />
                          )}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                    Kitchen & Food
                  </span>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {FILTER_KITCHEN_OPTIONS.map((item) => {
                      const active = filters.kitchen?.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayItem("kitchen", item)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                          }`}
                        >
                          {active && (
                            <Check className="h-3.5 w-3.5 text-purple-600" />
                          )}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                    Laundry
                  </span>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {FILTER_LAUNDRY_OPTIONS.map((item) => {
                      const active = filters.laundry?.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayItem("laundry", item)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                            active
                              ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                          }`}
                        >
                          {active && (
                            <Check className="h-3.5 w-3.5 text-purple-600" />
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
                <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                  Safety & Security
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {FILTER_SAFETY_OPTIONS.map((item) => {
                    const active = filters.safety?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("safety", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. House Rules */}
              <div>
                <span className="text-xs font-bold text-zinc-800 sm:text-sm dark:text-zinc-200">
                  House Rules
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {FILTER_HOUSE_RULES_OPTIONS.map((item) => {
                    const active = filters.house_rules?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem("house_rules", item)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                          active
                            ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {active && (
                          <Check className="h-3.5 w-3.5 text-purple-600" />
                        )}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Badges Bar inside the open card */}
          {activeCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3.5 dark:border-zinc-800/80">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Active filters:
              </span>
              {renderActiveBadgePills()}
              <button
                type="button"
                onClick={handleResetAll}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
