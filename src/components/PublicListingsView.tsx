"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  // Renamed so it doesn't hide JavaScript's own Map, used below.
  Map as MapIcon,
  ShieldCheck,
  Building2,
  X,
  RotateCcw,
  Eye,
  Check,
  PanelLeft,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { ListingPreview } from "@/types/listing";
import type { ListingFilterParams } from "@/lib/validations/listing-filters";
import { matchesListingSearch } from "@/lib/search-listings";
import { parseHouseRules } from "@/lib/house-rules";
import {
  DEFAULT_SEARCH_RADIUS_KM,
  formatDistance,
  formatRadius,
  listingCoordinates,
  listingsWithinRadius,
  type SearchCenter,
  type SearchRadiusKm,
} from "@/lib/geo";
import { RENTAL_PLACE_SEARCH, searchPlaces } from "@/lib/nominatim";
import {
  emptyResultsMessage,
  type PlaceLookupStatus,
} from "@/lib/empty-results";
import FavoriteButton from "@/components/FavoriteButton";
import LandlordAuthModal from "@/components/LandlordAuthModal";
import NearbySearch from "@/components/NearbySearch";
import { ListingsMap } from "@/components/map";
import type { MapPinItem } from "@/components/map/ListingsMap";

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

// A listing's page for whoever is browsing. Renters have their own, inside
// their dashboard (#291); everyone else uses /listings/<id>. Linking renters
// straight there saves the redirect from /listings/<id> (#309).
function listingPagePath(listingId: string, userRole: string | null): string {
  return userRole === "renter"
    ? `/dashboard/renter/listings/${listingId}`
    : `/listings/${listingId}`;
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
  const pathname = usePathname();
  // The sign-up prompt a guest gets instead of the listing page (#86) or
  // instead of saving it (#96): which listing, and what they tried to do
  // with it. Null while the prompt is closed.
  const [signUpPrompt, setSignUpPrompt] = useState<{
    listing: ListingPreview;
    reason: "view" | "save";
  } | null>(null);

  // The prompt names the listing, and logging in from it opens that
  // listing.
  const openListingPrompt = (
    listing: ListingPreview,
    reason: "view" | "save" = "view",
  ) => {
    setSignUpPrompt({ listing, reason });
  };

  const handleListingLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    listing: ListingPreview,
  ) => {
    if (isAuthenticated) return;
    event.preventDefault();
    openListingPrompt(listing);
  };

  const resolvedInitialQuery = initialFilters?.q ?? initialSearchQuery;

  // Search & Filter Panel States
  const [searchQuery, setSearchQuery] = useState(resolvedInitialQuery);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  // The search bar's place lookup (plan update on #28): Search with words
  // that no listing has looks them up as a place. `words` says which words
  // the status belongs to.
  const [placeLookup, setPlaceLookup] = useState<{
    words: string;
    status: PlaceLookupStatus;
  } | null>(null);
  // Bumped whenever the words change, so a lookup that answers after the
  // visitor typed something else is ignored.
  const placeLookupIdRef = useRef(0);

  // True when the words in the search bar are in no listing's name,
  // address or description (#14's matching), whatever the other filters.
  const wordsMatchNoListing = useMemo(() => {
    const words = searchQuery.trim();
    return (
      words !== "" &&
      !listings.some((listing) => matchesListingSearch(listing, words))
    );
  }, [listings, searchQuery]);

  // How the place lookup went, but only for the words in the box now.
  const lookupStatus =
    placeLookup && placeLookup.words === searchQuery.trim()
      ? placeLookup.status
      : null;

  // Rent Range
  const [minRent, setMinRent] = useState<string>("");
  const [maxRent, setMaxRent] = useState<string>(
    initialFilters?.max_rent !== undefined
      ? String(initialFilters.max_rent)
      : "",
  );

  // The radius search (S2-10, #102): the point to measure from (null until
  // one is picked) and how far around it to look. Both come from the URL
  // when it has them, so a reload or a shared link keeps the search.
  const [searchCenter, setSearchCenter] = useState<SearchCenter | null>(() =>
    initialFilters?.lat !== undefined && initialFilters?.lng !== undefined
      ? {
          lat: initialFilters.lat,
          lng: initialFilters.lng,
          label: initialFilters.near ?? null,
        }
      : null,
  );
  const [radiusKm, setRadiusKm] = useState<SearchRadiusKm>(
    initialFilters?.radius_km ?? DEFAULT_SEARCH_RADIUS_KM,
  );
  // Bumped by "Reset", to start the Location section's "Near" box afresh.
  const [filtersResetCount, setFiltersResetCount] = useState(0);

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

  // The listings the renter has saved. Each heart is a FavoriteButton
  // (#96), which saves on its own, shows an error and puts the heart back
  // if that fails (#309), and reports the result through onToggle. Keeping
  // track here means a card that's filtered out and comes back shows the
  // right heart.
  const [savedListingIds, setSavedListingIds] = useState<ReadonlySet<string>>(
    () => new Set(favoritedIds),
  );

  const rememberFavorite = (listingId: string, favorited: boolean) => {
    setSavedListingIds((prev) => {
      const next = new Set(prev);
      if (favorited) {
        next.add(listingId);
      } else {
        next.delete(listingId);
      }
      return next;
    });
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

  // Puts the search in the URL, so a reload or a shared link opens the same
  // search. It uses the browser's History API, which Next 16 supports,
  // rather than router.replace: the filtering all happens here in the
  // browser, so there's no need to re-run the page's server query on every
  // change, like each tap on the map (S2-10).
  const syncUrlParams = (overrides?: {
    q?: string;
    max_rent?: string;
    propertyTypes?: string[];
    occupancyTypes?: string[];
    genders?: string[];
    center?: SearchCenter | null;
    radiusKm?: SearchRadiusKm;
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

    // The radius search (S2-10): only with a point, since a radius on its
    // own means nothing. Five decimals is about a meter.
    const center =
      overrides && "center" in overrides ? overrides.center : searchCenter;
    if (center) {
      params.set("lat", center.lat.toFixed(5));
      params.set("lng", center.lng.toFixed(5));
      params.set("radius_km", String(overrides?.radiusKm ?? radiusKm));
      if (center.label) params.set("near", center.label);
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(null, "", targetUrl);
  };

  // The radius search (S2-10, #102): the point comes from the "Near" box, a
  // tap on the map or a drag of the point, and null clears it.
  const changeSearchCenter = (center: SearchCenter | null) => {
    setSearchCenter(center);
    syncUrlParams({ center });
  };

  const changeRadius = (radius: SearchRadiusKm) => {
    setRadiusKm(radius);
    syncUrlParams({ radiusKm: radius });
  };

  // Empties the search bar: its X, and the map message's "Clear search".
  const clearSearchWords = () => {
    placeLookupIdRef.current += 1;
    setPlaceLookup(null);
    setSearchQuery("");
    syncUrlParams({ q: "" });
  };

  // Search, or Enter in the search bar. Words that some listing's name,
  // address or description has just filter the listings, as before. Words
  // that no listing has are looked up as a place, with one Nominatim
  // lookup per press, and the search becomes "within the radius of that
  // place" (plan update on #28).
  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const words = searchQuery.trim();
    if (!wordsMatchNoListing) {
      syncUrlParams();
      return;
    }
    if (lookupStatus === "searching") return;

    const lookupId = ++placeLookupIdRef.current;
    setPlaceLookup({ words, status: "searching" });
    try {
      // The best match only: in the Philippines, Metro Cebu first.
      const [place] = await searchPlaces(words, {
        ...RENTAL_PLACE_SEARCH,
        limit: 1,
      });
      // The visitor changed the words while this was on its way.
      if (lookupId !== placeLookupIdRef.current) return;

      if (!place) {
        setPlaceLookup({ words, status: "not-found" });
        syncUrlParams();
        return;
      }

      // Found it: search around the place instead. The words go, since
      // they'd hide every listing near it that doesn't mention them.
      const center: SearchCenter = {
        lat: place.lat,
        lng: place.lng,
        label: place.shortName,
      };
      setPlaceLookup(null);
      setSearchQuery("");
      setSearchCenter(center);
      syncUrlParams({ q: "", center });
    } catch (error) {
      console.error("Place lookup failed:", error);
      if (lookupId !== placeLookupIdRef.current) return;
      setPlaceLookup({ words, status: "failed" });
      syncUrlParams();
    }
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minRent.trim() !== "") count++;
    if (maxRent.trim() !== "") count++;
    if (searchCenter) count++;
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
    searchCenter,
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
    placeLookupIdRef.current += 1;
    setPlaceLookup(null);
    setSearchQuery("");
    setMinRent("");
    setMaxRent("");
    setSearchCenter(null);
    setRadiusKm(DEFAULT_SEARCH_RADIUS_KM);
    setFiltersResetCount((count) => count + 1);
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
    window.history.replaceState(null, "", pathname);
  };

  // The listings that pass every filter except the radius search
  const listingsMatchingFilters = useMemo(() => {
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

      // 3. Location: the radius search, applied below (S2-10). The "Near"
      // box used to be a second text search; the search bar does that.

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

  // The radius search (S2-10, #102): with a point, only the listings within
  // the radius stay, nearest first, and each one's distance is kept for the
  // cards and the map. Without one, nothing changes (newest first).
  const { filteredListings, distanceById } = useMemo(() => {
    if (!searchCenter) {
      return { filteredListings: listingsMatchingFilters, distanceById: null };
    }
    const nearby = listingsWithinRadius(
      listingsMatchingFilters,
      searchCenter,
      radiusKm,
    );
    return {
      filteredListings: nearby.map(({ listing }) => listing),
      distanceById: new Map(
        nearby.map(({ listing, distanceKm }) => [listing.id, distanceKm]),
      ),
    };
  }, [listingsMatchingFilters, searchCenter, radiusKm]);

  // The map's pins: the same listings as the cards (#101), minus any
  // without a pin of their own, which can't be placed. (They used to be
  // pinned at made-up spots around Cebu City, #309.)
  const mapPins = useMemo<MapPinItem[]>(() => {
    const pins: MapPinItem[] = [];
    for (const listing of filteredListings) {
      const point = listingCoordinates(listing);
      if (!point) continue;

      pins.push({
        id: listing.id,
        title: listing.title,
        monthlyRent: listing.monthly_rent,
        propertyType: listing.property_type ?? "Boarding House",
        occupancyType: listing.occupancy_type ?? "Room",
        allowedGender: listing.allowed_gender ?? "Any / Co-ed",
        latitude: point.lat,
        longitude: point.lng,
        coverImage: listing.cover_image || listing.images?.[0] || null,
        distanceKm: distanceById?.get(listing.id) ?? null,
        // No link for guests: the pin's View button opens the sign-up
        // prompt instead (onViewDetails below, #86).
        href: isAuthenticated
          ? listingPagePath(listing.id, userRole)
          : undefined,
      });
    }
    return pins;
  }, [filteredListings, distanceById, isAuthenticated, userRole]);

  // What to say when nothing is left to show (plan update on #28). The
  // cards and the map get their reason from the same helper, so they agree.
  const emptyMessageInput = {
    totalListings: listings.length,
    searchWords: searchQuery.trim(),
    wordsMatchNoListing,
    placeLookup: lookupStatus,
    center: searchCenter,
    radiusKm,
  };
  const listEmptyMessage = emptyResultsMessage(emptyMessageInput);
  // The map can be empty while the cards aren't: results without a pin.
  const mapEmptyMessage =
    mapPins.length === 0
      ? emptyResultsMessage({
          ...emptyMessageInput,
          resultsWithoutPins: filteredListings.length,
        })
      : null;

  // Changes whenever the search does, so a map message closed with its X
  // comes back for a new search.
  const searchSignature = JSON.stringify([
    searchQuery.trim(),
    minRent,
    maxRent,
    searchCenter,
    radiusKm,
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

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Area 1: Top Header & Search Bar (Shrink-0, Fixed at Top, Solid Background, Never Scrolls) */}
      <div className="shrink-0 space-y-4 pb-4">
        {/* Header & Title (Matches Pic 2 & Pic 4 from .Abangers UI) */}
        {variant === "public" ? (
          <div className="mx-auto max-w-4xl pb-1 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
              Find Your Next Home in Cebu
            </h1>
            <p className="mt-1.5 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
              Search boarding houses, bedspaces, and rooms near your university
              or workplace.
            </p>
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
              onChange={(e) => {
                // New words: a lookup still on its way is for the old ones.
                placeLookupIdRef.current += 1;
                setSearchQuery(e.target.value);
              }}
              aria-label="Search by university, street, or boarding house name"
              placeholder="Search by university, street, or boarding house name (e.g. UST, Katipunan, Taft)..."
              className="flex h-11 w-full rounded-2xl border border-zinc-200 bg-white py-2 pr-10 pl-10 text-xs shadow-2xs transition-colors placeholder:text-zinc-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-purple-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearchWords}
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
            disabled={lookupStatus === "searching"}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-purple-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 dark:bg-purple-600 dark:hover:bg-purple-500"
          >
            {lookupStatus === "searching" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
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
              {searchCenter && (
                <FilterPill
                  label={`Within ${formatRadius(radiusKm)} of ${searchCenter.label ?? "the pin"}`}
                  onRemove={() => changeSearchCenter(null)}
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

                {/* Location Section: the radius search (S2-10, #102) */}
                <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
                  <p className="mb-2.5 text-xs font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                    Location
                  </p>
                  <NearbySearch
                    key={filtersResetCount}
                    center={searchCenter}
                    radiusKm={radiusKm}
                    onCenterChange={changeSearchCenter}
                    onRadiusChange={changeRadius}
                  />
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
              <ListingsMap
                listings={mapPins}
                searchCenter={searchCenter}
                radiusKm={radiusKm}
                onSearchCenterChange={changeSearchCenter}
                onRadiusChange={changeRadius}
                onViewDetails={(id) => {
                  const listing = filteredListings.find((l) => l.id === id);
                  if (listing) openListingPrompt(listing);
                }}
                onToggleView={() => setViewMode("grid")}
                emptyMessage={mapEmptyMessage}
                searchKey={searchSignature}
                onClearSearch={clearSearchWords}
                onResetFilters={clearAllFilters}
              />
            </div>
          ) : filteredListings.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Building2 className="h-7 w-7" />
              </div>
              {/* Same reason as the map gives (src/lib/empty-results.ts) */}
              <h3 className="mt-4 text-lg font-bold break-words text-zinc-900 dark:text-zinc-50">
                {listEmptyMessage.title}
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                {listEmptyMessage.hint}
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

                // How far it is from the search point, if there is one.
                const distance = distanceById?.get(listing.id);
                const listingPage = listingPagePath(listing.id, userRole);

                return (
                  <article
                    key={listing.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300/80 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-purple-900/60"
                  >
                    {/* Card Image Header */}
                    <div className="relative h-52 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <Link
                        href={listingPage}
                        onClick={(e) => handleListingLinkClick(e, listing)}
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

                      {/* Top-right Favorite Heart: the same FavoriteButton
                          as Favorites (#96). It saves for renters, opens
                          the sign-up prompt for guests, and isn't shown to
                          landlords and admins. */}
                      <div className="absolute top-3 right-3 z-10">
                        <FavoriteButton
                          listingId={listing.id}
                          initialFavorited={savedListingIds.has(listing.id)}
                          userRole={userRole}
                          onRequireAuth={() =>
                            openListingPrompt(listing, "save")
                          }
                          onToggle={(favorited) =>
                            rememberFavorite(listing.id, favorited)
                          }
                        />
                      </div>

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
                                href={listingPage}
                                onClick={(e) =>
                                  handleListingLinkClick(e, listing)
                                }
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
                          {distance !== undefined && (
                            <span className="shrink-0 font-semibold whitespace-nowrap text-purple-700 dark:text-purple-300">
                              · {formatDistance(distance)} away
                            </span>
                          )}
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
                            href={listingPage}
                            onClick={(e) => handleListingLinkClick(e, listing)}
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

      {/* Floating Google Maps Style Thumbnail Switcher - Shown only in Grid
          Mode. z-30 keeps it under the sign-up prompt (z-50); it used to sit
          on top of it (#309). */}
      {viewMode === "grid" && (
        <div className="fixed right-6 bottom-6 z-30 md:right-8">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            title="View in Maps"
            className="group relative flex h-[80px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-zinc-900 shadow-2xl ring-1 shadow-black/35 ring-black/10 transition-all duration-300 ease-out hover:h-[160px] hover:w-[176px] hover:shadow-2xl hover:ring-2 hover:shadow-purple-500/25 hover:ring-purple-500/50 active:scale-95 dark:border-zinc-700"
          >
            {/* Background image preview - Philippines default or chosen location */}
            <Image
              src={getMapThumbnailPhoto(searchCenter?.label || searchQuery)}
              alt="Map View preview"
              fill
              sizes="(max-width: 768px) 180px, 180px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />

            {/* Vignette overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent transition-opacity group-hover:opacity-90" />

            {/* Bottom Badge - Text stays fixed at normal size, matches Pic 1 */}
            <div className="absolute right-2.5 bottom-2.5 left-2.5 z-10 flex items-center justify-center gap-1.5 px-1">
              <MapIcon className="h-4 w-4 shrink-0 text-white drop-shadow-xs" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-extrabold tracking-tight text-white drop-shadow-xs">
                  View in
                </span>
                <span className="text-[10px] font-extrabold tracking-tight text-white drop-shadow-xs">
                  Maps
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Guest sign-up prompt, with Renter picked: from a listing (#86)
          or from its heart (#96, #309). Mounted only while open, so each
          opening starts with its own text. Logging in from it opens the
          listing; /listings/<id> sends renters on to their own page. */}
      {signUpPrompt && (
        <LandlordAuthModal
          isOpen
          onClose={() => setSignUpPrompt(null)}
          initialMode="signup"
          initialRole="renter"
          promptTitle={
            signUpPrompt.reason === "save"
              ? "Create an account to save favorites"
              : "Create an account to view details"
          }
          promptDescription={
            signUpPrompt.reason === "save"
              ? `Sign up or log in as a renter to save "${signUpPrompt.listing.title}" to your favorites.`
              : `Sign up or log in to view full photos, rules, and contact information for "${signUpPrompt.listing.title}".`
          }
          redirectTo={`/listings/${signUpPrompt.listing.id}`}
        />
      )}
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
