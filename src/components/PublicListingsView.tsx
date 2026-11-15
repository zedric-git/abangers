"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  // Renamed so it doesn't hide JavaScript's own Map, used below.
  Map as MapIcon,
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
import {
  listingFilterSearchParams,
  type ListingFilterParams,
} from "@/lib/validations/listing-filters";
import {
  GENDER_POLICIES,
  OCCUPANCY_TYPES,
  PROPERTY_TYPES,
  type GenderPolicy,
  type OccupancyType,
  type PropertyType,
} from "@/lib/validations/listing";
import {
  AMENITIES_OPTIONS,
  FEATURE_CATEGORIES,
  HOUSE_RULES_OPTIONS,
} from "@/lib/listing-features";
import {
  matchesListingFeatures,
  matchesListingHouseRules,
} from "@/lib/filter-listings";
import { listingStatusView } from "@/lib/listing-status-view";
import { matchesListingSearch } from "@/lib/search-listings";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

// The amenity groups, as accordions: the listing form's own groups and
// options (src/lib/listing-features.ts), so every option is one a landlord
// can tick. #300 had lists of its own, and some of their options could
// never match a listing (#309). Parking ("Parking & Property") is a plain
// checkbox above the accordions.
const FEATURE_ACCORDIONS = FEATURE_CATEGORIES.filter(
  (category) => category.column !== "amenities",
);

// Tailwind's `lg` breakpoint (64rem, 1024px), for the code that can't use
// the `lg:` classes: from here up the filters are a sidebar beside the
// listings, and below it a drawer over them (#316).
const FILTER_SIDEBAR_MEDIA_QUERY = "(min-width: 64rem)";

// A rent box's limit: "4500" gives 4500. Empty, zero, negative or not a
// number gives undefined, which means no limit.
function rentLimit(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) && num > 0 ? num : undefined;
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
  // The filters show in one of two places (#316): from lg (1024px) up, a
  // sidebar beside the listings, open at first; below lg, a drawer over
  // them, closed at first, so a phone or a tablet opens on the listings.
  // Each has its own open state.
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  // The button that opened the drawer, and the toolbar's Filters button:
  // where the focus goes back to when the drawer closes.
  const filterDrawerOpenerRef = useRef<HTMLButtonElement | null>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);

  const openFilterDrawer = (event: React.MouseEvent<HTMLButtonElement>) => {
    filterDrawerOpenerRef.current = event.currentTarget;
    setIsFilterDrawerOpen(true);
  };

  // The drawer is only for screens under lg. If the window is widened to
  // lg or more while it's open, close it, and the sidebar takes over
  // rather than the filters showing twice.
  useEffect(() => {
    const sidebarWidth = window.matchMedia(FILTER_SIDEBAR_MEDIA_QUERY);
    const closeDrawer = () => {
      if (sidebarWidth.matches) setIsFilterDrawerOpen(false);
    };
    sidebarWidth.addEventListener("change", closeDrawer);
    return () => sidebarWidth.removeEventListener("change", closeDrawer);
  }, []);

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

  // Rent Range: what's in the two boxes
  const [minRent, setMinRent] = useState<string>(
    initialFilters?.min_rent !== undefined
      ? String(initialFilters.min_rent)
      : "",
  );
  const [maxRent, setMaxRent] = useState<string>(
    initialFilters?.max_rent !== undefined
      ? String(initialFilters.max_rent)
      : "",
  );
  const minRentLimit = rentLimit(minRent);
  const maxRentLimit = rentLimit(maxRent);

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

  // Amenities (#18): the ticked options of every group, Parking included,
  // named as the listing form saves them (src/lib/listing-features.ts).
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    initialFilters?.features ?? [],
  );
  const [selectedHouseRules, setSelectedHouseRules] = useState<string[]>(
    initialFilters?.rules ?? [],
  );
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<
    PropertyType[]
  >(initialFilters?.property_type ? [initialFilters.property_type] : []);
  const [selectedOccupancyTypes, setSelectedOccupancyTypes] = useState<
    OccupancyType[]
  >(initialFilters?.occupancy ? [initialFilters.occupancy] : []);
  const [selectedGenders, setSelectedGenders] = useState<GenderPolicy[]>(
    initialFilters?.gender ? [initialFilters.gender] : [],
  );

  // Open/Closed state for the accordion sections in Filters, by key. A
  // section starts open when the URL ticked something in it.
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    () => ({
      ...Object.fromEntries(
        FEATURE_ACCORDIONS.map((category) => [
          category.id,
          category.options.some((option) =>
            (initialFilters?.features ?? []).includes(option),
          ),
        ]),
      ),
      propertyType: Boolean(initialFilters?.property_type),
      occupancyType: Boolean(initialFilters?.occupancy),
      allowedGender: Boolean(initialFilters?.gender),
      houseRules: (initialFilters?.rules ?? []).length > 0,
    }),
  );

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

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Ticks or unticks one option of a filter. The list's own type decides
  // what goes in it (NoInfer), so "Has Parking" can go in a string[].
  const toggleItem = <T extends string>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    item: NoInfer<T>,
  ) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  // The URL keeps the whole search, and follows every change, so a reload
  // or a shared link opens the same search (#309: the checkboxes used to
  // reach it only when Search was pressed, and the amenities never did).
  // It uses the browser's History API, which Next 16 supports, rather than
  // router.replace: the filtering all happens here in the browser, so
  // there's no need to re-run the page's server query on every change,
  // like each tap on the map (S2-10).
  useEffect(() => {
    const params = listingFilterSearchParams({
      q: searchQuery,
      min_rent: minRentLimit,
      max_rent: maxRentLimit,
      // The URL holds one of each. With two or more ticked, they stay on
      // this page only, as before.
      property_type:
        selectedPropertyTypes.length === 1
          ? selectedPropertyTypes[0]
          : undefined,
      occupancy:
        selectedOccupancyTypes.length === 1
          ? selectedOccupancyTypes[0]
          : undefined,
      gender: selectedGenders.length === 1 ? selectedGenders[0] : undefined,
      features: selectedFeatures,
      rules: selectedHouseRules,
      ...(searchCenter && {
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        radius_km: radiusKm,
        near: searchCenter.label ?? undefined,
      }),
    });
    const queryString = params.toString();
    window.history.replaceState(
      null,
      "",
      queryString ? `${pathname}?${queryString}` : pathname,
    );
  }, [
    pathname,
    searchQuery,
    minRentLimit,
    maxRentLimit,
    selectedPropertyTypes,
    selectedOccupancyTypes,
    selectedGenders,
    selectedFeatures,
    selectedHouseRules,
    searchCenter,
    radiusKm,
  ]);

  // The radius search (S2-10, #102): the point comes from the "Near" box, a
  // tap on the map or a drag of the point, and null clears it.
  const changeSearchCenter = (center: SearchCenter | null) => {
    setSearchCenter(center);
  };

  const changeRadius = (radius: SearchRadiusKm) => {
    setRadiusKm(radius);
  };

  // Empties the search bar: its X, and the map message's "Clear search".
  const clearSearchWords = () => {
    placeLookupIdRef.current += 1;
    setPlaceLookup(null);
    setSearchQuery("");
  };

  // Search, or Enter in the search bar. Words that some listing's name,
  // address or description has just filter the listings, as they already
  // do while typing. Words that no listing has are looked up as a place,
  // with one Nominatim lookup per press, and the search becomes "within
  // the radius of that place" (plan update on #28).
  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const words = searchQuery.trim();
    if (!wordsMatchNoListing) return;
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
        return;
      }

      // Found it: search around the place instead. The words go, since
      // they'd hide every listing near it that doesn't mention them.
      setPlaceLookup(null);
      setSearchQuery("");
      setSearchCenter({
        lat: place.lat,
        lng: place.lng,
        label: place.shortName,
      });
    } catch (error) {
      console.error("Place lookup failed:", error);
      if (lookupId !== placeLookupIdRef.current) return;
      setPlaceLookup({ words, status: "failed" });
    }
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minRentLimit !== undefined) count++;
    if (maxRentLimit !== undefined) count++;
    if (searchCenter) count++;
    count += selectedFeatures.length;
    count += selectedPropertyTypes.length;
    count += selectedOccupancyTypes.length;
    count += selectedGenders.length;
    count += selectedHouseRules.length;
    return count;
  }, [
    minRentLimit,
    maxRentLimit,
    searchCenter,
    selectedFeatures,
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
    setSelectedFeatures([]);
    setSelectedPropertyTypes([]);
    setSelectedOccupancyTypes([]);
    setSelectedGenders([]);
    setSelectedHouseRules([]);
  };

  // The listings that pass every filter except the radius search
  const listingsMatchingFilters = useMemo(() => {
    return listings.filter((listing) => {
      // 1. Search bar words
      if (
        searchQuery.trim() !== "" &&
        !matchesListingSearch(listing, searchQuery)
      ) {
        return false;
      }

      // 2. Rent Range
      if (minRentLimit !== undefined && listing.monthly_rent < minRentLimit) {
        return false;
      }
      if (maxRentLimit !== undefined && listing.monthly_rent > maxRentLimit) {
        return false;
      }

      // 3. Location: the radius search, applied below (S2-10). The "Near"
      // box used to be a second text search; the search bar does that.

      // 4. Amenities, Parking included: every ticked option, also when the
      // listing words it differently, like the seed's "WiFi"
      // (src/lib/filter-listings.ts, #309).
      if (!matchesListingFeatures(listing, selectedFeatures)) {
        return false;
      }

      // 5. Property type, room type and gender: any of the ticked ones
      if (
        selectedPropertyTypes.length > 0 &&
        !selectedPropertyTypes.some((type) => type === listing.property_type)
      ) {
        return false;
      }
      if (
        selectedOccupancyTypes.length > 0 &&
        !selectedOccupancyTypes.some((type) => type === listing.occupancy_type)
      ) {
        return false;
      }
      if (
        selectedGenders.length > 0 &&
        !selectedGenders.some((gender) => gender === listing.allowed_gender)
      ) {
        return false;
      }

      // 6. House rules: every ticked rule, and only rules the landlord
      // ticked in the form, never free text (parseHouseRules, #309).
      if (!matchesListingHouseRules(listing, selectedHouseRules)) {
        return false;
      }

      return true;
    });
  }, [
    listings,
    searchQuery,
    minRentLimit,
    maxRentLimit,
    selectedFeatures,
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
    minRentLimit,
    maxRentLimit,
    searchCenter,
    radiusKm,
    selectedFeatures,
    selectedPropertyTypes,
    selectedOccupancyTypes,
    selectedGenders,
    selectedHouseRules,
  ]);

  // The filters themselves, written once for the two places they show
  // (#316): the sidebar beside the listings from lg up, and the drawer
  // over them below lg.
  const filterControls = (
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

      {/* Amenities Section: the listing form's options (#309) */}
      <div className="border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
        <p className="mb-2.5 text-xs font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
          Amenities
        </p>

        {/* Parking & Property: plain checkboxes */}
        {AMENITIES_OPTIONS.map((option) => (
          <label
            key={option}
            className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <input
              type="checkbox"
              checked={selectedFeatures.includes(option)}
              onChange={() => toggleItem(setSelectedFeatures, option)}
              className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <span>{option}</span>
          </label>
        ))}

        {/* Accordion Categories */}
        <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
          {/* Utilities, Room Features, Bathroom, Kitchen, Laundry,
              Safety & Security */}
          {FEATURE_ACCORDIONS.map((category) => (
            <FilterAccordion
              key={category.id}
              label={category.title}
              count={
                category.options.filter((option) =>
                  selectedFeatures.includes(option),
                ).length
              }
              isOpen={Boolean(openAccordions[category.id])}
              onToggle={() => toggleAccordion(category.id)}
            >
              {category.options.map((option) => (
                <CheckboxOption
                  key={option}
                  label={option}
                  checked={selectedFeatures.includes(option)}
                  onChange={() => toggleItem(setSelectedFeatures, option)}
                />
              ))}
            </FilterAccordion>
          ))}

          {/* Property Type */}
          <FilterAccordion
            label="Property Type"
            count={selectedPropertyTypes.length}
            isOpen={Boolean(openAccordions.propertyType)}
            onToggle={() => toggleAccordion("propertyType")}
          >
            {PROPERTY_TYPES.map((item) => (
              <CheckboxOption
                key={item}
                label={item}
                checked={selectedPropertyTypes.includes(item)}
                onChange={() => toggleItem(setSelectedPropertyTypes, item)}
              />
            ))}
          </FilterAccordion>

          {/* Room/Occupancy Type */}
          <FilterAccordion
            label="Room/Occupancy Type"
            count={selectedOccupancyTypes.length}
            isOpen={Boolean(openAccordions.occupancyType)}
            onToggle={() => toggleAccordion("occupancyType")}
          >
            {OCCUPANCY_TYPES.map((item) => (
              <CheckboxOption
                key={item}
                label={item}
                checked={selectedOccupancyTypes.includes(item)}
                onChange={() => toggleItem(setSelectedOccupancyTypes, item)}
              />
            ))}
          </FilterAccordion>

          {/* Allowed Gender */}
          <FilterAccordion
            label="Allowed Gender"
            count={selectedGenders.length}
            isOpen={Boolean(openAccordions.allowedGender)}
            onToggle={() => toggleAccordion("allowedGender")}
          >
            {GENDER_POLICIES.map((item) => (
              <CheckboxOption
                key={item}
                label={item}
                checked={selectedGenders.includes(item)}
                onChange={() => toggleItem(setSelectedGenders, item)}
              />
            ))}
          </FilterAccordion>

          {/* House Rules: the ones landlords tick in the form */}
          <FilterAccordion
            label="House Rules"
            count={selectedHouseRules.length}
            isOpen={Boolean(openAccordions.houseRules)}
            onToggle={() => toggleAccordion("houseRules")}
          >
            {HOUSE_RULES_OPTIONS.map((item) => (
              <CheckboxOption
                key={item}
                label={item}
                checked={selectedHouseRules.includes(item)}
                onChange={() => toggleItem(setSelectedHouseRules, item)}
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
          disabled={activeFilterCount === 0 && searchQuery.trim() === ""}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-bold text-zinc-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear Filters
        </button>
      </div>
    </div>
  );

  // The rest of the filters' header, after its title: how many filters are
  // on, and Reset. The sidebar and the drawer both show them (#316).
  const filterCountBadge = activeFilterCount > 0 && (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1.5 text-[11px] font-bold text-white">
      {activeFilterCount}
    </span>
  );
  const filterResetButton = activeFilterCount > 0 && (
    <button
      type="button"
      onClick={clearAllFilters}
      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
    >
      Reset
    </button>
  );

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
          {/* Filter buttons on the LEFT side (#316). Below lg: opens the
              filters drawer. */}
          <button
            ref={filtersButtonRef}
            type="button"
            onClick={openFilterDrawer}
            aria-haspopup="dialog"
            aria-expanded={isFilterDrawerOpen}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:border-purple-300 hover:bg-purple-50/70 hover:text-purple-700 lg:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:bg-purple-950/20"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {filterCountBadge}
          </button>
          {/* From lg up: shows and hides the sidebar */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            aria-expanded={isFilterPanelOpen}
            className={`hidden h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-xs font-semibold shadow-2xs transition-all lg:inline-flex ${
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
              {(minRentLimit !== undefined || maxRentLimit !== undefined) && (
                <FilterPill
                  label={`Rent: ₱${minRentLimit ?? 0} - ₱${maxRentLimit ?? "Any"}`}
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
              {selectedPropertyTypes.map((t) => (
                <FilterPill
                  key={t}
                  label={t}
                  onRemove={() => toggleItem(setSelectedPropertyTypes, t)}
                />
              ))}
              {selectedOccupancyTypes.map((t) => (
                <FilterPill
                  key={t}
                  label={t}
                  onRemove={() => toggleItem(setSelectedOccupancyTypes, t)}
                />
              ))}
              {selectedGenders.map((g) => (
                <FilterPill
                  key={g}
                  label={g}
                  onRemove={() => toggleItem(setSelectedGenders, g)}
                />
              ))}
              {selectedFeatures.map((feature) => (
                <FilterPill
                  key={`feature:${feature}`}
                  label={feature}
                  onRemove={() => toggleItem(setSelectedFeatures, feature)}
                />
              ))}
              {selectedHouseRules.map((rule) => (
                <FilterPill
                  key={`rule:${rule}`}
                  label={rule}
                  onRemove={() => toggleItem(setSelectedHouseRules, rule)}
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
              {/* Below lg: opens the filters drawer (#316) */}
              <button
                type="button"
                onClick={openFilterDrawer}
                aria-haspopup="dialog"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 lg:hidden dark:text-purple-400 dark:hover:bg-purple-950/40"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Open Filters
              </button>
              {/* From lg up: shows and hides the sidebar */}
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                className="hidden cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 lg:inline-flex dark:text-purple-400 dark:hover:bg-purple-950/40"
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
        {/* Area 2: Collapsible Filters Sidebar (Independent Scroll, Fixed
            Width, Fixed Height), from lg (1024px) up only. Below lg the
            filters are in the drawer after it, so the listings get the
            whole width (#316). */}
        {isFilterPanelOpen && (
          <aside
            id="renter-filter-sidebar"
            aria-label="Property filters"
            className="hidden h-full shrink-0 flex-col self-stretch overflow-hidden lg:flex lg:w-72 xl:w-80"
          >
            {/* Outer Card: owns rounded-3xl border and clips inner scrollbar cleanly inside */}
            <div className="flex h-full max-h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              {/* Panel Header with Title, Count, Reset, and Collapse Icon (Pinned at top of card) */}
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Filters
                  </h2>
                  {filterCountBadge}
                </div>
                <div className="flex items-center gap-1.5">
                  {filterResetButton}
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

              {filterControls}
            </div>
          </aside>
        )}

        {/* Below lg: the filters drawer, over the listings (#316). The
            Filters buttons open it; its X, Escape, a tap outside it and
            Show N listings close it. */}
        <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
          <SheetContent
            side="left"
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              // Focus the drawer itself, not its first box: on a phone,
              // focusing the rent box would open the keyboard over the
              // filters. Screen readers still start at the drawer.
              event.preventDefault();
              (event.currentTarget as HTMLElement | null)?.focus();
            }}
            onCloseAutoFocus={(event) => {
              // Radix gives the focus back to a SheetTrigger, and our
              // buttons aren't one. Give it to the button that opened the
              // drawer, or to the toolbar's Filters if that one is gone
              // (the "Filters active" bar goes when the filters are reset).
              event.preventDefault();
              const opener = filterDrawerOpenerRef.current;
              const focusTarget = opener?.isConnected
                ? opener
                : filtersButtonRef.current;
              focusTarget?.focus();
            }}
            className="w-[85vw] max-w-sm gap-0 border-zinc-200 bg-white p-0 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* pr-12 leaves room for the drawer's own X, top right */}
            <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-zinc-100 py-3.5 pr-12 pl-5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Filters
                </SheetTitle>
                {filterCountBadge}
              </div>
              {filterResetButton}
            </SheetHeader>

            {filterControls}

            <SheetFooter className="border-t border-zinc-100 p-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full cursor-pointer rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 dark:hover:bg-purple-500"
              >
                Show {filteredListings.length}{" "}
                {filteredListings.length === 1 ? "listing" : "listings"}
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

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
                // The availability badge, in listingStatusView's colours
                // (#232). Almost-full listings show here too, and used to
                // say "Fully Occupied" (#309).
                const statusView = listingStatusView(
                  listing.availability_status,
                );
                const roomsLeft = `${listing.available_rooms} ${
                  listing.available_rooms === 1 ? "room" : "rooms"
                } left`;
                const isFull =
                  statusView.group === "occupied" ||
                  listing.available_rooms <= 0;
                const isAlmostFull =
                  !isFull && statusView.status === "almost_full";
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
                            isFull
                              ? "bg-zinc-900/85 text-zinc-200"
                              : isAlmostFull
                                ? statusView.badgeClassName
                                : "bg-emerald-500/90 text-white"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isFull
                                ? "bg-rose-400"
                                : isAlmostFull
                                  ? "bg-amber-950"
                                  : "animate-pulse bg-white"
                            }`}
                          />
                          {isFull
                            ? "Fully Occupied"
                            : isAlmostFull
                              ? `${statusView.label} · ${roomsLeft}`
                              : roomsLeft}
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
                            {/* No "Verified Landlord" badge: it was on every
                                card. Guests and renters can't read the
                                landlords' verifications, so a real badge
                                needs a story of its own (#309). */}
                            <span className="text-xs font-semibold tracking-wide text-purple-600 uppercase dark:text-purple-400">
                              {listing.property_type} • {listing.occupancy_type}
                            </span>

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
                      <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
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
