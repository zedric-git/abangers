"use client";

import { useState } from "react";
import { AlertCircle, Loader2, MapPin, Search, X } from "lucide-react";
import {
  SEARCH_RADII_KM,
  formatRadius,
  isSearchRadiusKm,
  type SearchCenter,
  type SearchRadiusKm,
} from "@/lib/geo";
import {
  RENTAL_PLACE_SEARCH,
  searchPlaces,
  type PlaceResult,
} from "@/lib/nominatim";

interface NearbySearchProps {
  /** The radius search's point, or null when there's none. */
  center: SearchCenter | null;
  radiusKm: SearchRadiusKm;
  onCenterChange: (center: SearchCenter | null) => void;
  onRadiusChange: (radiusKm: SearchRadiusKm) => void;
}

// Up to 5 places to pick from: in the Philippines, Metro Cebu first.
const PLACE_SEARCH_OPTIONS = { ...RENTAL_PLACE_SEARCH, limit: 5 };

type LookupStatus = "idle" | "searching" | "no-results" | "failed";

/**
 * The filter panel's Location section (S2-10, #102): look a place up to
 * search around it, and pick how far around. A tap on the map sets the
 * point too; both end up in PublicListingsView's `searchCenter`.
 */
export default function NearbySearch({
  center,
  radiusKm,
  onCenterChange,
  onRadiusChange,
}: NearbySearchProps) {
  const [query, setQuery] = useState(center?.label ?? "");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<LookupStatus>("idle");

  // One Nominatim request per press of Find (or Enter), never while
  // typing, and none while one is on its way (AGENTS.md, "Maps and
  // location").
  const findPlaces = async () => {
    if (!query.trim() || status === "searching") return;

    setStatus("searching");
    setPlaces([]);
    try {
      const found = await searchPlaces(query, PLACE_SEARCH_OPTIONS);
      setPlaces(found);
      setStatus(found.length > 0 ? "idle" : "no-results");
    } catch (error) {
      console.error("Place lookup failed:", error);
      setStatus("failed");
    }
  };

  const pickPlace = (place: PlaceResult) => {
    onCenterChange({ lat: place.lat, lng: place.lng, label: place.shortName });
    setPlaces([]);
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label
          htmlFor="filter-location-near"
          className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          Near:
        </label>
        <div className="flex items-center gap-2">
          <input
            id="filter-location-near"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void findPlaces();
              }
            }}
            placeholder="University, street, landmark..."
            className="w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => void findPlaces()}
            disabled={!query.trim() || status === "searching"}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-purple-500"
          >
            {status === "searching" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Find
          </button>
        </div>

        {places.length > 0 && (
          <ul
            aria-label="Places found"
            className="mt-1.5 space-y-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
          >
            {places.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => pickPlace(place)}
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-700 transition-colors hover:bg-purple-50 hover:text-purple-800 dark:text-zinc-300 dark:hover:bg-purple-950/40 dark:hover:text-purple-200"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                  <span className="line-clamp-2">{place.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {status === "no-results" && (
          <p
            role="status"
            className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400"
          >
            No places found. Try another name, or tap a spot on the map.
          </p>
        )}
        {status === "failed" && (
          <p
            role="alert"
            className="mt-1.5 flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            Couldn&apos;t look that up right now. You can tap the map instead.
          </p>
        )}
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
          value={radiusKm}
          onChange={(e) => {
            const radius = Number(e.target.value);
            if (isSearchRadiusKm(radius)) onRadiusChange(radius);
          }}
          className="w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-medium text-zinc-700 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
        >
          {SEARCH_RADII_KM.map((radius) => (
            <option key={radius} value={radius}>
              {formatRadius(radius)}
            </option>
          ))}
        </select>
      </div>

      {center ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-purple-200/80 bg-purple-50/70 px-3 py-2 text-xs dark:border-purple-900/50 dark:bg-purple-950/30">
          <span className="flex min-w-0 items-center gap-1.5 text-purple-900 dark:text-purple-200">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="truncate">
              Around <strong>{center.label ?? "the pin on the map"}</strong>
            </span>
          </span>
          <button
            type="button"
            onClick={() => onCenterChange(null)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/40"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Find a place above, or open the map and tap a spot, to see what&apos;s
          within reach.
        </p>
      )}
    </div>
  );
}
