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
} from "lucide-react";
import {
  PROPERTY_TYPES,
  OCCUPANCY_TYPES,
  GENDER_POLICIES,
  type PropertyType,
  type OccupancyType,
  type GenderPolicy,
} from "@/lib/validations/listing";
import type { ListingFilterParams } from "@/lib/validations/listing-filters";
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
 * Filter controls for public listing discovery (S2-05, #15, #89).
 *
 * Provides responsive controls for:
 * - Maximum rent (quick presets + custom input)
 * - Property type
 * - Room / occupancy type
 * - Allowed gender policy
 * - Active filter badges with one-click dismiss and "Reset all"
 */
export default function ListingFilterControls({
  filters,
  onFilterChange,
  onResetFilters,
  className = "",
}: ListingFilterControlsProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [customRentInput, setCustomRentInput] = useState(
    filters.max_rent ? String(filters.max_rent) : "",
  );
  const [prevMaxRent, setPrevMaxRent] = useState(filters.max_rent);

  // Synchronize custom input text if max_rent is cleared externally (e.g. Reset all, remove badge)
  if (prevMaxRent !== filters.max_rent) {
    setPrevMaxRent(filters.max_rent);
    setCustomRentInput(filters.max_rent ? String(filters.max_rent) : "");
  }

  const activeCount = countActiveAttributeFilters(filters);

  const handleCustomRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customRentInput.trim();
    if (!trimmed) {
      onFilterChange("max_rent", undefined);
      return;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num) && num > 0) {
      onFilterChange("max_rent", num);
    } else {
      setCustomRentInput("");
      onFilterChange("max_rent", undefined);
    }
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
            onClick={() => {
              setCustomRentInput("");
              onResetFilters();
            }}
            className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Main Filter Toolbar (Always visible on sm+, expandable on mobile) */}
      <div
        id="mobile-filters-panel"
        className={`${
          isMobileOpen ? "block" : "hidden"
        } mt-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:mt-0 sm:block dark:border-zinc-800 dark:bg-zinc-900/70`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Max Rent Filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Banknote className="h-3.5 w-3.5 text-zinc-400" />
              <span>Max Monthly Rent</span>
            </label>
            <form
              onSubmit={handleCustomRentSubmit}
              className="mt-1.5 flex gap-1.5"
            >
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-zinc-400">
                  ₱
                </span>
                <input
                  type="number"
                  min={1}
                  step={100}
                  placeholder="Any budget"
                  value={customRentInput}
                  onChange={(e) => {
                    setCustomRentInput(e.target.value);
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
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-white pr-7 pl-6 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                {filters.max_rent !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomRentInput("");
                      onFilterChange("max_rent", undefined);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label="Clear max rent filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Quick Preset Pills */}
            <div className="mt-2 flex flex-wrap gap-1">
              {RENT_BUDGET_PRESETS.map((preset) => {
                const isSelected = filters.max_rent === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setCustomRentInput("");
                        onFilterChange("max_rent", undefined);
                      } else {
                        setCustomRentInput(String(preset.value));
                        onFilterChange("max_rent", preset.value);
                      }
                    }}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      isSelected
                        ? "bg-purple-600 text-white dark:bg-purple-600"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    ₱{(preset.value / 1000).toFixed(0)}k
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Property Type Filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                <SelectTrigger className="h-9 text-xs">
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

          {/* 3. Occupancy Type Filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                <SelectTrigger className="h-9 text-xs">
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

          {/* 4. Allowed Gender Policy Filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                <SelectTrigger className="h-9 text-xs">
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

        {/* Active Filter Badges Bar */}
        {activeCount > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Active filters:
            </span>

            {filters.max_rent !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                ≤ ₱{filters.max_rent.toLocaleString()}
                <button
                  type="button"
                  onClick={() => {
                    setCustomRentInput("");
                    onFilterChange("max_rent", undefined);
                  }}
                  className="rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
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
                  className="rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
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
                  className="rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
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
                  className="rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
                  aria-label={`Remove gender policy ${filters.gender} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setCustomRentInput("");
                onResetFilters();
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
