"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ShieldCheck,
  Building2,
  X,
  RotateCcw,
  Eye,
  Check,
  PanelLeft,
  ChevronDown,
  LayoutGrid,
  Heart,
} from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import type { ListingFilterParams } from "@/lib/validations/listing-filters";
import { matchesListingSearch } from "@/lib/search-listings";
import { parseHouseRules } from "@/lib/house-rules";
import { createClient } from "@/lib/supabase/client";
import LandlordAuthModal from "@/components/LandlordAuthModal";
import type { MapPinItem } from "@/components/RenterFindPlaceMap";

const RenterFindPlaceMapDynamic = dynamic(
  () => import("@/components/RenterFindPlaceMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] w-full items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-100 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Loading interactive map...
      </div>
    ),
  },
);

// Filter option constants matching .Abangers UI & database schema
const UTILITY_OPTIONS = [
  "Wi-Fi",
  "Electric Sub-meter",
  "Water Sub-meter",
] as const;

const ROOM_OPTIONS = [
  "Air Conditioning",
  "Electric Fan",
  "Bed & Mattress",
  "Study Desk",
  "Closet / Cabinet",
  "Balcony",
] as const;

const BATHROOM_OPTIONS = [
  "Private CR",
  "Shared CR",
  "Water Heater",
  "Bidet",
] as const;

const KITCHEN_OPTIONS = [
  "Shared Kitchen",
  "Private Kitchen",
  "Refrigerator",
  "Drinking Water",
] as const;

const LAUNDRY_OPTIONS = ["Laundry Area", "Washing Machine"] as const;

const SAFETY_OPTIONS = [
  "CCTV",
  "24/7 Security / Guard",
  "Biometric / Keycard Access",
  "Fire Extinguisher",
  "Fire Alarm / Sprinkler",
] as const;

const PROPERTY_TYPES = [
  "Boarding House",
  "Dormitory",
  "Apartment",
  "Condo",
  "House",
] as const;

const OCCUPANCY_TYPES = [
  "Bedspace",
  "Single Room",
  "Shared Room",
  "Studio",
] as const;

const GENDER_OPTIONS = ["Male Only", "Female Only", "Any / Co-ed"] as const;

const HOUSE_RULE_OPTIONS = [
  "Cooking Allowed",
  "Visitors Allowed",
  "Pets Allowed",
  "No Curfew",
  "Smoking Allowed",
] as const;

const DISTANCE_OPTIONS = [
  { value: "", label: "Select distance" },
  { value: "0.5", label: "Within 500m" },
  { value: "1", label: "Within 1 km" },
  { value: "2", label: "Within 2 km" },
  { value: "5", label: "Within 5 km" },
] as const;

function getMapThumbnailPhoto(locationText: string = ""): string {
  const q = locationText.trim().toLowerCase();
  if (
    q.includes("cebu") ||
    q.includes("lahug") ||
    q.includes("talamban") ||
    q.includes("apas") ||
    q.includes("banilad") ||
    q.includes("usc") ||
    q.includes("mandaue") ||
    q.includes("lapu")
  ) {
    return "/maps/cebu.png";
  }

  if (
    q.includes("manila") ||
    q.includes("ust") ||
    q.includes("españa") ||
    q.includes("espana") ||
    q.includes("sampaloc") ||
    q.includes("taft") ||
    q.includes("malate") ||
    q.includes("katipunan") ||
    q.includes("ateneo") ||
    q.includes("miriam") ||
    q.includes("qc") ||
    q.includes("quezon") ||
    q.includes("u-belt") ||
    q.includes("ubelt") ||
    q.includes("dlsu")
  ) {
    return "/maps/manila.png";
  }

  return "/maps/cebu.png";
}

type AccordionCategoryKey =
  | "utilities"
  | "room"
  | "bathroom"
  | "kitchen"
  | "laundry"
  | "safety"
  | "propertyType"
  | "occupancyType"
  | "allowedGender"
  | "houseRules";

// Aliases so seed listings (which store some items in `amenities`) and form-created listings both match
const FEATURE_ALIASES: Record<string, string[]> = {
  "Wi-Fi": ["wi-fi", "wifi", "free wi-fi", "high-speed wi-fi"],
  "Electric Sub-meter": ["electric sub-meter", "own electric sub-meter"],
  "Water Sub-meter": ["water sub-meter", "own water sub-meter"],
  "Air Conditioning": ["air conditioning", "aircon", "a/c"],
  "Electric Fan": ["electric fan", "fan"],
  "Bed & Mattress": ["bed & mattress", "bed frame & mattress", "mattress"],
  "Study Desk": ["study desk", "study desk & chair", "study area"],
  "Closet / Cabinet": ["closet / cabinet", "cabinet / locker", "closet"],
  Balcony: ["balcony", "window / balcony"],
  "Private CR": ["private cr", "private bathroom (en-suite)", "own cr"],
  "Shared CR": ["shared cr", "shared bathroom"],
  "Water Heater": ["water heater", "hot & cold shower"],
  Bidet: ["bidet"],
  "Shared Kitchen": ["shared kitchen", "common kitchen"],
  "Private Kitchen": ["private kitchen", "kitchenette", "kitchen sink"],
  Refrigerator: ["refrigerator", "shared refrigerator", "fridge"],
  "Drinking Water": [
    "drinking water",
    "water dispenser",
    "free drinking water",
  ],
  "Laundry Area": [
    "laundry area",
    "laundry / drying area",
    "roof deck drying area",
  ],
  "Washing Machine": ["washing machine"],
  CCTV: ["cctv", "24/7 cctv"],
  "24/7 Security / Guard": [
    "24/7 security / guard",
    "24/7 security",
    "security guard",
  ],
  "Biometric / Keycard Access": [
    "biometric / keycard access",
    "biometric access",
    "RFID / keycard entry",
    "keycard access",
  ],
  "Fire Extinguisher": ["fire extinguisher", "fire extinguishers"],
  "Fire Alarm / Sprinkler": [
    "fire alarm / sprinkler",
    "fire alarm & emergency lights",
    "smoke detector",
  ],
};

function matchesFeature(
  targetOption: string,
  categoryValues: string[] | null | undefined,
  amenitiesValues: string[] | null | undefined,
): boolean {
  const pool = [...(categoryValues ?? []), ...(amenitiesValues ?? [])].map(
    (item) => item.toLowerCase().trim(),
  );
  if (pool.length === 0) return false;

  const aliases = FEATURE_ALIASES[targetOption] ?? [targetOption.toLowerCase()];
  return aliases.some((alias) =>
    pool.some((item) => item === alias || item.includes(alias)),
  );
}

function matchesHouseRuleOption(
  ruleOption: string,
  rawHouseRules: string | null | undefined,
): boolean {
  if (!rawHouseRules) return false;
  const parsed = parseHouseRules(rawHouseRules);
  if (parsed.rules.some((r) => r.toLowerCase() === ruleOption.toLowerCase())) {
    return true;
  }
  const lowerRaw = rawHouseRules.toLowerCase();
  const lowerRule = ruleOption.toLowerCase();
  if (lowerRaw.includes(`no ${lowerRule}`)) {
    return false;
  }
  return lowerRaw.includes(lowerRule);
}

function getFallbackCoordinates(
  listing: ListingPreview,
  index: number,
): [number, number] {
  if (
    typeof listing.latitude === "number" &&
    Number.isFinite(listing.latitude) &&
    typeof listing.longitude === "number" &&
    Number.isFinite(listing.longitude)
  ) {
    return [listing.latitude, listing.longitude];
  }
  // Deterministic offsets around Cebu City center so every listing appears on the map
  const offsets: [number, number][] = [
    [10.3051, 123.8907],
    [10.3268, 123.9062],
    [10.3541, 123.9115],
    [10.2983, 123.8984],
    [10.3321, 123.9098],
    [10.2966, 123.8969],
  ];
  return offsets[index % offsets.length];
}

interface PublicListingsViewProps {
  listings: ListingPreview[];
  initialSearchQuery?: string;
  initialFilters?: ListingFilterParams;
  favoritedIds?: string[] | Set<string>;
  userRole?: string | null;
  isAuthenticated?: boolean;
  /**
   * "public" renders the centered "Find Your Next Home in Cebu" hero (2nd Pic).
   * "dashboard" renders the "Renter / Find a Place" dashboard header (1st Pic).
   */
  variant?: "public" | "dashboard";
}

export default function PublicListingsView({
  listings,
  initialSearchQuery = "",
  initialFilters,
  favoritedIds = [],
  userRole = null,
  isAuthenticated = false,
  variant = "public",
}: PublicListingsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const resolvedInitialQuery = initialFilters?.q ?? initialSearchQuery;

  // Search & Filter Panel States
  const [searchQuery, setSearchQuery] = useState(resolvedInitialQuery);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // Rent Range
  const [minRent, setMinRent] = useState<string>("");
  const [maxRent, setMaxRent] = useState<string>(
    initialFilters?.max_rent !== undefined
      ? String(initialFilters.max_rent)
      : "",
  );

  // Location Filter
  const [locationNear, setLocationNear] = useState<string>("");
  const [locationWithin, setLocationWithin] = useState<string>("");

  // Amenities (Parking)
  const [hasParking, setHasParking] = useState<boolean>(false);

  // Accordion Category States
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string[]>([]);
  const [selectedBathroom, setSelectedBathroom] = useState<string[]>([]);
  const [selectedKitchen, setSelectedKitchen] = useState<string[]>([]);
  const [selectedLaundry, setSelectedLaundry] = useState<string[]>([]);
  const [selectedSafety, setSelectedSafety] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    initialFilters?.property_type ? [initialFilters.property_type] : [],
  );
  const [selectedOccupancyTypes, setSelectedOccupancyTypes] = useState<
    string[]
  >(initialFilters?.occupancy ? [initialFilters.occupancy] : []);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(
    initialFilters?.gender ? [initialFilters.gender] : [],
  );
  const [selectedHouseRules, setSelectedHouseRules] = useState<string[]>([]);

  // Open/Closed state for the 10 accordion sections in Filters
  const [openAccordions, setOpenAccordions] = useState<
    Record<AccordionCategoryKey, boolean>
  >({
    utilities: false,
    room: false,
    bathroom: false,
    kitchen: false,
    laundry: false,
    safety: false,
    propertyType: Boolean(initialFilters?.property_type),
    occupancyType: Boolean(initialFilters?.occupancy),
    allowedGender: Boolean(initialFilters?.gender),
    houseRules: false,
  });

  // View Mode: Grid vs Map
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedMapListingId, setSelectedMapListingId] = useState<
    string | null
  >(null);

  // Favorites tracking (optimistic + Postgres sync)
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(
    () => new Set(favoritedIds),
  );

  const handleToggleFavorite = async (listingId: string) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    if (userRole === "landlord" || userRole === "admin") {
      return;
    }

    const isSaved = savedListingIds.has(listingId);

    // Optimistic UI update
    setSavedListingIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthModalOpen(true);
        return;
      }

      if (isSaved) {
        await supabase
          .from("favorites")
          .delete()
          .eq("renter_id", user.id)
          .eq("listing_id", listingId);
      } else {
        await supabase
          .from("favorites")
          .insert({ renter_id: user.id, listing_id: listingId });
      }
    } catch {
      // Rollback on failure
      setSavedListingIds((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
    }
  };

  const toggleAccordion = (key: AccordionCategoryKey) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleArrayItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const syncUrlParams = (overrides?: {
    q?: string;
    max_rent?: string;
    propertyTypes?: string[];
    occupancyTypes?: string[];
    genders?: string[];
  }) => {
    const params = new URLSearchParams();
    const qVal = (overrides?.q ?? searchQuery).trim();
    const maxRentVal = (overrides?.max_rent ?? maxRent).trim();
    const propTypes = overrides?.propertyTypes ?? selectedPropertyTypes;
    const occTypes = overrides?.occupancyTypes ?? selectedOccupancyTypes;
    const genTypes = overrides?.genders ?? selectedGenders;

    if (qVal) params.set("q", qVal);
    if (maxRentVal && Number(maxRentVal) > 0) {
      params.set("max_rent", maxRentVal);
    }
    if (propTypes.length === 1) {
      params.set("property_type", propTypes[0]);
    }
    if (occTypes.length === 1) {
      params.set("occupancy", occTypes[0]);
    }
    if (genTypes.length === 1) {
      params.set("gender", genTypes[0]);
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(targetUrl, { scroll: false });
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    syncUrlParams();
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minRent.trim() !== "") count++;
    if (maxRent.trim() !== "") count++;
    if (locationNear.trim() !== "") count++;
    if (locationWithin !== "") count++;
    if (hasParking) count++;
    count += selectedUtilities.length;
    count += selectedRoom.length;
    count += selectedBathroom.length;
    count += selectedKitchen.length;
    count += selectedLaundry.length;
    count += selectedSafety.length;
    count += selectedPropertyTypes.length;
    count += selectedOccupancyTypes.length;
    count += selectedGenders.length;
    count += selectedHouseRules.length;
    return count;
  }, [
    minRent,
    maxRent,
    locationNear,
    locationWithin,
    hasParking,
    selectedUtilities,
    selectedRoom,
    selectedBathroom,
    selectedKitchen,
    selectedLaundry,
    selectedSafety,
    selectedPropertyTypes,
    selectedOccupancyTypes,
    selectedGenders,
    selectedHouseRules,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setMinRent("");
    setMaxRent("");
    setLocationNear("");
    setLocationWithin("");
    setHasParking(false);
    setSelectedUtilities([]);
    setSelectedRoom([]);
    setSelectedBathroom([]);
    setSelectedKitchen([]);
    setSelectedLaundry([]);
    setSelectedSafety([]);
    setSelectedPropertyTypes([]);
    setSelectedOccupancyTypes([]);
    setSelectedGenders([]);
    setSelectedHouseRules([]);
    router.replace(pathname, { scroll: false });
  };

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      // 1. Search bar query
      if (searchQuery.trim() !== "") {
        if (!matchesListingSearch(listing, searchQuery)) return false;
      }

      // 2. Rent Range
      const parsedMin = minRent.trim() !== "" ? Number(minRent) : null;
      const parsedMax = maxRent.trim() !== "" ? Number(maxRent) : null;
      if (
        parsedMin !== null &&
        !Number.isNaN(parsedMin) &&
        listing.monthly_rent < parsedMin
      ) {
        return false;
      }
      if (
        parsedMax !== null &&
        !Number.isNaN(parsedMax) &&
        parsedMax > 0 &&
        listing.monthly_rent > parsedMax
      ) {
        return false;
      }

      // 3. Location Near
      if (locationNear.trim() !== "") {
        if (!matchesListingSearch(listing, locationNear)) {
          return false;
        }
      }

      // 4. Parking
      if (hasParking) {
        const hasParkingAmenity = (listing.amenities ?? []).some((a) =>
          a.toLowerCase().includes("parking"),
        );
        if (!hasParkingAmenity) return false;
      }

      // 5. Utilities (must match all selected)
      if (
        selectedUtilities.length > 0 &&
        !selectedUtilities.every((u) =>
          matchesFeature(u, listing.utilities, listing.amenities),
        )
      ) {
        return false;
      }

      // 6. Room features
      if (
        selectedRoom.length > 0 &&
        !selectedRoom.every((r) =>
          matchesFeature(r, listing.room_features, listing.amenities),
        )
      ) {
        return false;
      }

      // 7. Bathroom features
      if (
        selectedBathroom.length > 0 &&
        !selectedBathroom.every((b) =>
          matchesFeature(b, listing.bathroom_features, listing.amenities),
        )
      ) {
        return false;
      }

      // 8. Kitchen features
      if (
        selectedKitchen.length > 0 &&
        !selectedKitchen.every((k) =>
          matchesFeature(k, listing.kitchen_features, listing.amenities),
        )
      ) {
        return false;
      }

      // 9. Laundry features
      if (
        selectedLaundry.length > 0 &&
        !selectedLaundry.every((l) =>
          matchesFeature(l, listing.laundry_features, listing.amenities),
        )
      ) {
        return false;
      }

      // 10. Safety features
      if (
        selectedSafety.length > 0 &&
        !selectedSafety.every((s) =>
          matchesFeature(s, listing.safety_features, listing.amenities),
        )
      ) {
        return false;
      }

      // 11. Property Type (OR within category)
      if (
        selectedPropertyTypes.length > 0 &&
        !selectedPropertyTypes.includes(listing.property_type ?? "")
      ) {
        return false;
      }

      // 12. Room / Occupancy Type (OR within category)
      if (
        selectedOccupancyTypes.length > 0 &&
        !selectedOccupancyTypes.includes(listing.occupancy_type ?? "")
      ) {
        return false;
      }

      // 13. Allowed Gender (OR within category)
      if (
        selectedGenders.length > 0 &&
        !selectedGenders.includes(listing.allowed_gender ?? "")
      ) {
        return false;
      }

      // 14. House Rules (AND within category)
      if (
        selectedHouseRules.length > 0 &&
        !selectedHouseRules.every((hr) =>
          matchesHouseRuleOption(hr, listing.house_rules),
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    listings,
    searchQuery,
    minRent,
    maxRent,
    locationNear,
    hasParking,
    selectedUtilities,
    selectedRoom,
    selectedBathroom,
    selectedKitchen,
    selectedLaundry,
    selectedSafety,
    selectedPropertyTypes,
    selectedOccupancyTypes,
    selectedGenders,
    selectedHouseRules,
  ]);

  // Map pin items derived from filteredListings
  const mapPins = useMemo<MapPinItem[]>(() => {
    return filteredListings.map((listing, idx) => {
      const [lat, lng] = getFallbackCoordinates(listing, idx);
      const cover =
        listing.cover_image ||
        (listing.images && listing.images.length > 0 ? listing.images[0] : "");
      return {
        id: listing.id,
        title: listing.title,
        address: listing.address,
        city: listing.city ?? "Cebu City",
        monthlyRent: listing.monthly_rent,
        propertyType: listing.property_type ?? "Boarding House",
        occupancyType: listing.occupancy_type ?? "Room",
        allowedGender: listing.allowed_gender ?? "Any / Co-ed",
        availableRooms: listing.available_rooms,
        latitude: lat,
        longitude: lng,
        coverImage: cover,
        landlordVerified: true,
        href: `/listings/${listing.id}`,
      };
    });
  }, [filteredListings]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Area 1: Top Header & Search Bar (Shrink-0, Fixed at Top, Solid Background, Never Scrolls) */}
      <div className="shrink-0 space-y-4 pb-4">
        {/* Header & Title (Matches Pic 2 from .Abangers UI) */}
        {variant === "public" ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className="text-zinc-400 dark:text-zinc-500">
                  Boarding Houses
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">/</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  Find Your Next Home in Cebu
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Find Your Next Home in Cebu
                </h1>
                {viewMode === "map" && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    Map View
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className="text-zinc-400 dark:text-zinc-500">Renter</span>
                <span className="text-zinc-400 dark:text-zinc-500">/</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  Find a Place
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Find a Place
                </h1>
                {viewMode === "map" && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    Map View
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar + Filter Button (Left Side) */}
        <form
          role="search"
          aria-label="Search and filter boarding houses"
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-3"
        >
          {/* Toggle Filter Button on the LEFT side */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            aria-expanded={isFilterPanelOpen}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-xs font-semibold shadow-2xs transition-all ${
              isFilterPanelOpen
                ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:bg-purple-950/20"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{isFilterPanelOpen ? "Hide Filters" : "Filters"}</span>
            {activeFilterCount > 0 && (
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  isFilterPanelOpen
                    ? "bg-white text-purple-700"
                    : "bg-purple-600 text-white"
                }`}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search by university, street, or boarding house name"
              placeholder="Search by university, street, or boarding house name (e.g. UST, Katipunan, Taft)..."
              className="flex h-11 w-full rounded-2xl border border-zinc-200 bg-white py-2 pr-10 pl-10 text-xs shadow-2xs transition-colors placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-purple-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  syncUrlParams({ q: "" });
                }}
                aria-label="Clear search query"
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Separate Search Button on the right side */}
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-purple-700 active:scale-[0.99] dark:bg-purple-600 dark:hover:bg-purple-500"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>
        </form>

        {/* 2nd Pic: This part of the UI ONLY appears if and only if there are active filters */}
        {activeFilterCount > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200/80 bg-white px-4 py-2.5 shadow-2xs dark:border-purple-900/50 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Filters active ({activeFilterCount}) • Showing{" "}
                {filteredListings.length}{" "}
                {filteredListings.length === 1 ? "match" : "matches"}:
              </span>
              {(minRent || maxRent) && (
                <FilterPill
                  label={`Rent: ₱${minRent || "0"} - ₱${maxRent || "Any"}`}
                  onRemove={() => {
                    setMinRent("");
                    setMaxRent("");
                  }}
                />
              )}
              {locationNear && (
                <FilterPill
                  label={`Near: ${locationNear}`}
                  onRemove={() => setLocationNear("")}
                />
              )}
              {locationWithin && (
                <FilterPill
                  label={`Within ${locationWithin} km`}
                  onRemove={() => setLocationWithin("")}
                />
              )}
              {hasParking && (
                <FilterPill
                  label="Parking"
                  onRemove={() => setHasParking(false)}
                />
              )}
              {selectedPropertyTypes.map((t) => (
                <FilterPill
                  key={t}
                  label={t}
                  onRemove={() => toggleArrayItem(setSelectedPropertyTypes, t)}
                />
              ))}
              {selectedOccupancyTypes.map((t) => (
                <FilterPill
                  key={t}
                  label={t}
                  onRemove={() => toggleArrayItem(setSelectedOccupancyTypes, t)}
                />
              ))}
              {selectedGenders.map((g) => (
                <FilterPill
                  key={g}
                  label={g}
                  onRemove={() => toggleArrayItem(setSelectedGenders, g)}
                />
              ))}
              {[
                ...selectedUtilities,
                ...selectedRoom,
                ...selectedBathroom,
                ...selectedKitchen,
                ...selectedLaundry,
                ...selectedSafety,
                ...selectedHouseRules,
              ].map((item) => (
                <FilterPill
                  key={item}
                  label={item}
                  onRemove={() => {
                    setSelectedUtilities((p) => p.filter((x) => x !== item));
                    setSelectedRoom((p) => p.filter((x) => x !== item));
                    setSelectedBathroom((p) => p.filter((x) => x !== item));
                    setSelectedKitchen((p) => p.filter((x) => x !== item));
                    setSelectedLaundry((p) => p.filter((x) => x !== item));
                    setSelectedSafety((p) => p.filter((x) => x !== item));
                    setSelectedHouseRules((p) => p.filter((x) => x !== item));
                  }}
                />
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 cursor-pointer text-xs font-bold text-purple-600 underline-offset-2 hover:underline dark:text-purple-400"
              >
                Reset all
              </button>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === "map" && (
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:border-purple-300 hover:text-purple-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Back to List
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {isFilterPanelOpen
                  ? "Hide Filters Panel"
                  : "Open Filters Panel"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout: 2 Fixed-Height Panels with Independent Scrolling */}
      <div className="flex min-h-0 w-full flex-1 items-stretch gap-6 overflow-hidden">
        {/* Area 2: Collapsible Filters Sidebar (Independent Scroll, Fixed Width, Fixed Height) */}
        {isFilterPanelOpen && (
          <aside
            id="renter-filter-sidebar"
            aria-label="Property filters"
            className="flex h-full w-full shrink-0 flex-col self-stretch overflow-hidden lg:w-72 xl:w-80"
          >
            {/* Outer Card: owns rounded-3xl border and clips inner scrollbar cleanly inside */}
            <div className="flex h-full max-h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              {/* Panel Header with Title, Count, Reset, and Collapse Icon (Pinned at top of card) */}
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1.5 text-[11px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterPanelOpen(false)}
                    title="Collapse filter panel"
                    aria-label="Collapse filter panel"
                    className="cursor-pointer rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Filter Body: scrolls smoothly inside the card, never cutting rounded corners */}
              <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 pr-3">
                {/* Rent Section */}
                <div>
                  <p className="mb-2 text-xs font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                    Rent
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={minRent}
                      onChange={(e) => setMinRent(e.target.value)}
                      aria-label="Minimum monthly rent"
                      placeholder="Min (₱2,500)"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                    <span className="text-xs font-bold text-zinc-400">-</span>
                    <input
                      type="number"
                      min={0}
                      value={maxRent}
                      onChange={(e) => setMaxRent(e.target.value)}
                      aria-label="Maximum monthly rent"
                      placeholder="Max (₱5,000)"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Location Section */}
                <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
                  <p className="mb-2.5 text-xs font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                    Location
                  </p>
                  <div className="space-y-2.5">
                    <div>
                      <label
                        htmlFor="filter-location-near"
                        className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                      >
                        Near:
                      </label>
                      <input
                        id="filter-location-near"
                        type="text"
                        value={locationNear}
                        onChange={(e) => setLocationNear(e.target.value)}
                        placeholder="University, street, landmark..."
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="filter-location-within"
                        className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                      >
                        Within:
                      </label>
                      <select
                        id="filter-location-within"
                        value={locationWithin}
                        onChange={(e) => setLocationWithin(e.target.value)}
                        className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-700 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        {DISTANCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Amenities Section */}
                <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
                  <p className="mb-2.5 text-xs font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                    Amenities
                  </p>

                  {/* Parking Checkbox */}
                  <label className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60">
                    <input
                      type="checkbox"
                      checked={hasParking}
                      onChange={(e) => setHasParking(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Parking</span>
                  </label>

                  {/* Accordion Categories */}
                  <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
                    {/* 1. Utilities */}
                    <FilterAccordion
                      label="Utilities"
                      count={selectedUtilities.length}
                      isOpen={openAccordions.utilities}
                      onToggle={() => toggleAccordion("utilities")}
                    >
                      {UTILITY_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedUtilities.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedUtilities, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 2. Room */}
                    <FilterAccordion
                      label="Room"
                      count={selectedRoom.length}
                      isOpen={openAccordions.room}
                      onToggle={() => toggleAccordion("room")}
                    >
                      {ROOM_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedRoom.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedRoom, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 3. Bathroom */}
                    <FilterAccordion
                      label="Bathroom"
                      count={selectedBathroom.length}
                      isOpen={openAccordions.bathroom}
                      onToggle={() => toggleAccordion("bathroom")}
                    >
                      {BATHROOM_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedBathroom.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedBathroom, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 4. Kitchen & Food */}
                    <FilterAccordion
                      label="Kitchen & Food"
                      count={selectedKitchen.length}
                      isOpen={openAccordions.kitchen}
                      onToggle={() => toggleAccordion("kitchen")}
                    >
                      {KITCHEN_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedKitchen.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedKitchen, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 5. Laundry */}
                    <FilterAccordion
                      label="Laundry"
                      count={selectedLaundry.length}
                      isOpen={openAccordions.laundry}
                      onToggle={() => toggleAccordion("laundry")}
                    >
                      {LAUNDRY_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedLaundry.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedLaundry, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 6. Safety & Security */}
                    <FilterAccordion
                      label="Safety & Security"
                      count={selectedSafety.length}
                      isOpen={openAccordions.safety}
                      onToggle={() => toggleAccordion("safety")}
                    >
                      {SAFETY_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedSafety.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedSafety, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 7. Property Type */}
                    <FilterAccordion
                      label="Property Type"
                      count={selectedPropertyTypes.length}
                      isOpen={openAccordions.propertyType}
                      onToggle={() => toggleAccordion("propertyType")}
                    >
                      {PROPERTY_TYPES.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedPropertyTypes.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedPropertyTypes, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 8. Room/Occupancy Type */}
                    <FilterAccordion
                      label="Room/Occupancy Type"
                      count={selectedOccupancyTypes.length}
                      isOpen={openAccordions.occupancyType}
                      onToggle={() => toggleAccordion("occupancyType")}
                    >
                      {OCCUPANCY_TYPES.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedOccupancyTypes.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedOccupancyTypes, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 9. Allowed Gender */}
                    <FilterAccordion
                      label="Allowed Gender"
                      count={selectedGenders.length}
                      isOpen={openAccordions.allowedGender}
                      onToggle={() => toggleAccordion("allowedGender")}
                    >
                      {GENDER_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedGenders.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedGenders, item)
                          }
                        />
                      ))}
                    </FilterAccordion>

                    {/* 10. House Rules */}
                    <FilterAccordion
                      label="House Rules"
                      count={selectedHouseRules.length}
                      isOpen={openAccordions.houseRules}
                      onToggle={() => toggleAccordion("houseRules")}
                    >
                      {HOUSE_RULE_OPTIONS.map((item) => (
                        <CheckboxOption
                          key={item}
                          label={item}
                          checked={selectedHouseRules.includes(item)}
                          onChange={() =>
                            toggleArrayItem(setSelectedHouseRules, item)
                          }
                        />
                      ))}
                    </FilterAccordion>
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    disabled={
                      activeFilterCount === 0 && searchQuery.trim() === ""
                    }
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Area 3: Right Panel (Independent Scroll, Map View or Cards Grid + Message) */}
        <div
          className={`flex h-full min-w-0 flex-1 flex-col gap-4 pr-1 ${
            viewMode === "map"
              ? "overflow-hidden"
              : "custom-scrollbar overflow-y-auto overscroll-contain"
          }`}
        >
          {/* MAIN CONTENT: MAP VIEW OR CARDS GRID */}
          {viewMode === "map" ? (
            <div className="relative isolate z-0 min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <RenterFindPlaceMapDynamic
                listings={mapPins}
                selectedId={selectedMapListingId}
                onSelectListing={(id) => setSelectedMapListingId(id)}
                onToggleView={() => setViewMode("grid")}
              />
            </div>
          ) : filteredListings.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {listings.length === 0
                  ? "No available listings right now"
                  : "No boarding houses match your filters"}
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                {listings.length === 0
                  ? "Check back soon as verified landlords post new boarding houses and rooms."
                  : "Try broadening your rent range, removing a few amenity filters, or searching for a different street or university."}
              </p>
              {(activeFilterCount > 0 || searchQuery.trim() !== "") && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            /* Listing Cards Grid (.Abangers UI style) */
            <div
              className={`grid grid-cols-1 gap-5 ${
                isFilterPanelOpen
                  ? "md:grid-cols-2"
                  : "md:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {filteredListings.map((listing) => {
                const isAvailable =
                  listing.availability_status === "available" &&
                  listing.available_rooms > 0;
                const coverImage =
                  listing.cover_image ||
                  (listing.images && listing.images.length > 0
                    ? listing.images[0]
                    : null);

                // Feature tags for the card
                const featureTags = [
                  listing.allowed_gender,
                  ...(listing.utilities ?? []).slice(0, 2),
                  ...(listing.room_features ?? []).slice(0, 1),
                  ...(listing.amenities ?? []).slice(0, 2),
                ].filter((tag, idx, self) => tag && self.indexOf(tag) === idx);

                const isSaved = savedListingIds.has(listing.id);

                return (
                  <article
                    key={listing.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300/80 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-purple-900/60"
                  >
                    {/* Card Image Header */}
                    <div className="relative h-52 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <Link
                        href={`/listings/${listing.id}`}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="block h-full w-full"
                      >
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={listing.title}
                            fill
                            unoptimized
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
                            <Building2 className="h-10 w-10 stroke-[1.5]" />
                            <span className="text-xs font-medium">
                              No photo uploaded
                            </span>
                          </div>
                        )}
                      </Link>
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />

                      {/* Top-left Status Badge */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md ${
                            isAvailable
                              ? "bg-emerald-500/90 text-white"
                              : "bg-zinc-900/85 text-zinc-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable
                                ? "animate-pulse bg-white"
                                : "bg-rose-400"
                            }`}
                          />
                          {isAvailable
                            ? `${listing.available_rooms} ${
                                listing.available_rooms === 1 ? "room" : "rooms"
                              } left`
                            : "Fully Occupied"}
                        </span>
                      </div>

                      {/* Top-right Favorite Heart Button */}
                      {userRole !== "landlord" && userRole !== "admin" && (
                        <div className="absolute top-3 right-3 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleFavorite(listing.id);
                            }}
                            title={
                              isSaved
                                ? "Remove from Favorites"
                                : "Save to Favorites"
                            }
                            aria-label={
                              isSaved
                                ? "Remove from Favorites"
                                : "Save to Favorites"
                            }
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-white/80 text-zinc-600 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-white hover:text-rose-600 dark:border-zinc-700/60 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-rose-500"
                          >
                            <Heart
                              className={`h-4.5 w-4.5 transition-colors ${
                                isSaved
                                  ? "fill-rose-500 text-rose-500"
                                  : "text-zinc-700 dark:text-zinc-200"
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      {/* Bottom-right Price Tag */}
                      <div className="pointer-events-none absolute right-3 bottom-3 rounded-xl bg-zinc-950/85 px-3 py-1.5 text-right backdrop-blur-md">
                        <p className="text-base font-extrabold text-white">
                          ₱{listing.monthly_rent.toLocaleString("en-PH")}
                          <span className="text-xs font-normal text-zinc-300">
                            {" "}
                            / mo
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold tracking-wide text-purple-600 uppercase dark:text-purple-400">
                                {listing.property_type} •{" "}
                                {listing.occupancy_type}
                              </span>
                              <span
                                title="Verified Landlord"
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Verified Landlord
                              </span>
                            </div>

                            <h2 className="mt-1 line-clamp-1 text-lg font-bold text-zinc-900 transition-colors group-hover:text-purple-600 dark:text-zinc-50 dark:group-hover:text-purple-400">
                              <Link
                                href={`/listings/${listing.id}`}
                                className="focus:outline-none"
                              >
                                {listing.title}
                              </Link>
                            </h2>
                          </div>
                        </div>

                        <p className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                          <span className="line-clamp-1">
                            {listing.address}, {listing.city}
                          </span>
                        </p>

                        {/* Quick Feature Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {featureTags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 flex items-center justify-between gap-2 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Landlord:{" "}
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            Verified Host
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/listings/${listing.id}`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Clean end-of-results indicator when listings are found (Last part of the page) */}
          {viewMode === "grid" && filteredListings.length > 0 && (
            <div className="mt-2 flex flex-col items-center justify-center gap-1 border-t border-zinc-200/80 pt-3 pb-3 text-center dark:border-zinc-800">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/70 bg-purple-50/60 px-3.5 py-1 text-xs font-semibold text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>
                  Showing all {filteredListings.length}{" "}
                  {filteredListings.length === 1
                    ? "boarding house"
                    : "boarding houses"}{" "}
                  in Cebu
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                You&apos;ve reached the end of the results. Try adjusting your
                filters if you haven&apos;t found what you need.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Google Maps Style Thumbnail Switcher - Shown only in Grid Mode */}
      {viewMode === "grid" && (
        <div
          style={{ zIndex: 1001 }}
          className="fixed right-6 bottom-6 z-30 md:right-8"
        >
          <button
            type="button"
            onClick={() => setViewMode("map")}
            title="View in Maps"
            className="group relative flex h-[70px] w-[130px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-zinc-900 shadow-2xl ring-1 shadow-black/35 ring-black/10 transition-all duration-300 ease-out hover:scale-105 active:scale-95 dark:border-zinc-700"
          >
            {/* Background image preview - Philippines default or chosen location */}
            <Image
              src={getMapThumbnailPhoto(locationNear || searchQuery)}
              alt="Map View preview"
              fill
              sizes="(max-width: 768px) 180px, 180px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />

            {/* Vignette overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent transition-opacity group-hover:opacity-80" />

            {/* Center white pill matching .Abangers UI */}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-white/95 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-zinc-900 shadow-md backdrop-blur-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                <span className="whitespace-nowrap">View in Maps</span>
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Guest Login / Sign-up Modal when clicking Favorite while signed out */}
      <LandlordAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
        initialRole="renter"
      />
    </div>
  );
}

/* --- Subcomponents --- */

function FilterAccordion({
  label,
  count,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
      >
        <span className="flex items-center gap-2">
          <span>{label}</span>
          {count > 0 && (
            <span className="py-0.2 rounded-full bg-purple-100 px-1.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-purple-600" : ""
          }`}
        />
      </button>
      {isOpen && <div className="mt-1 space-y-1 pb-2 pl-2">{children}</div>}
    </div>
  );
}

function CheckboxOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
      />
      <span>{label}</span>
    </label>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2.5 py-0.5 text-xs font-medium text-purple-800 shadow-2xs dark:border-purple-800 dark:bg-zinc-900 dark:text-purple-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="cursor-pointer rounded-full p-0.5 text-purple-500 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-950"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
