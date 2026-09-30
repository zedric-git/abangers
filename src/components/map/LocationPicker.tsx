"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  MapPin,
  Loader2,
  RotateCcw,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// Fix Leaflet's default marker icon paths in Next.js bundler
const createCustomIcon = () => {
  return L.divIcon({
    className: "custom-map-pin",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background-color: #7c3aed;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        color: white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-10a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

export interface LocationAddressDetails {
  address?: string;
  city?: string;
  fullDisplayName?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (
    lat: number,
    lng: number,
    addressDetails?: LocationAddressDetails,
  ) => void;
  defaultCenter?: [number, number];
}

// Reverse geocode lat/lng to get street, barangay, and city
async function fetchReverseGeocode(
  lat: number,
  lng: number,
): Promise<LocationAddressDetails | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "AbangersApp/1.0 (student-project)",
        },
      },
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    const addr = data.address || {};

    const road =
      addr.road ||
      addr.pedestrian ||
      addr.path ||
      addr.footway ||
      addr.suburb ||
      "";
    const barangay =
      addr.suburb ||
      addr.quarter ||
      addr.neighbourhood ||
      addr.village ||
      addr.hamlet ||
      "";

    let streetAddress = "";
    if (road && barangay && road.toLowerCase() !== barangay.toLowerCase()) {
      const cleanBrgy = barangay.replace(/^barangay\s+/i, "");
      streetAddress = `${road}, Brgy. ${cleanBrgy}`;
    } else if (road) {
      streetAddress = road;
    } else if (barangay) {
      const cleanBrgy = barangay.replace(/^barangay\s+/i, "");
      streetAddress = `Brgy. ${cleanBrgy}`;
    }

    const city =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      "";

    return {
      address: streetAddress,
      city: city,
      fullDisplayName: data.display_name,
    };
  } catch (err) {
    console.error("Reverse geocoding error:", err);
    return undefined;
  }
}

// Sub-component to sync map view when external position or search changes
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 1.2 });
  }, [center, map]);
  return null;
}

// Sub-component to handle click events on the map
function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  defaultCenter = [10.3157, 123.8854], // Cebu City default fallback
}: LocationPickerProps) {
  const hasValue = latitude != null && longitude != null;
  const currentPos: [number, number] = hasValue
    ? [latitude, longitude]
    : defaultCenter;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [detectedAddressInfo, setDetectedAddressInfo] = useState<string | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const customIcon = useMemo(() => createCustomIcon(), []);

  // Update pin position and reverse geocode address details
  const updateLocationWithReverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      onChange(lat, lng);
      setIsGeocoding(true);
      setDetectedAddressInfo(null);

      const details = await fetchReverseGeocode(lat, lng);
      setIsGeocoding(false);

      if (details) {
        onChange(lat, lng, details);
        const parts = [details.address, details.city].filter(Boolean);
        if (parts.length > 0) {
          setDetectedAddressInfo(parts.join(", "));
        }
      }
    },
    [onChange],
  );

  // Handle marker drag end
  const handleDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker) {
      const latLng = marker.getLatLng();
      updateLocationWithReverseGeocode(latLng.lat, latLng.lng);
    }
  }, [updateLocationWithReverseGeocode]);

  // Handle OSM Nominatim address search
  const handleExecuteSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery,
        )}&limit=5`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "AbangersApp/1.0 (student-project)",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to reach geocoding service.");
      }

      const data: SearchResult[] = await response.json();
      if (data.length === 0) {
        setSearchError("No location results found for your query.");
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setSearchError(
        "Unable to search address right now. You can click directly on the map to pin your location.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    updateLocationWithReverseGeocode(lat, lng);
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Address Search Bar - Replaced <form> with <div> to prevent nested form HTML errors */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleExecuteSearch();
                }
              }}
              placeholder="Search street, barangay, city, or landmark..."
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pr-4 pl-10 text-xs text-zinc-900 shadow-2xs focus:border-purple-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-purple-500"
            />
            <Search className="absolute top-3 left-3 h-4 w-4 text-zinc-400" />
          </div>
          <button
            type="button"
            onClick={handleExecuteSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-purple-800 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search Map"
            )}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-[1000] mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <p className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Select Search Result
            </p>
            <div className="max-h-48 overflow-y-auto">
              {searchResults.map((res) => (
                <button
                  key={res.place_id}
                  type="button"
                  onClick={() => selectSearchResult(res)}
                  className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left text-xs transition-colors hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                  <span className="line-clamp-2 text-zinc-800 dark:text-zinc-200">
                    {res.display_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Error Notice */}
        {searchError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-zinc-300 bg-zinc-100 shadow-inner sm:aspect-16/9 dark:border-zinc-700 dark:bg-zinc-950">
        <MapContainer
          center={currentPos}
          zoom={hasValue ? 16 : 13}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={currentPos} />
          <MapClickHandler onSelect={updateLocationWithReverseGeocode} />

          {hasValue && (
            <Marker
              position={[latitude, longitude]}
              draggable={true}
              icon={customIcon}
              ref={markerRef}
              eventHandlers={{
                dragend: handleDragEnd,
              }}
            />
          )}
        </MapContainer>

        {/* Map Instructions Badge Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl bg-zinc-900/80 px-3 py-1.5 text-[11px] font-medium text-white shadow-md backdrop-blur-md">
          {hasValue
            ? "📍 Drag pin or click map to adjust property location"
            : "👆 Click anywhere on map to set property pin"}
        </div>
      </div>

      {/* Selected Coordinates & Reverse Geocode Status */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <MapPin
              className={`h-4 w-4 ${hasValue ? "text-purple-600 dark:text-purple-400" : "text-zinc-400"}`}
            />
            {hasValue ? (
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Pinned Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            ) : (
              <span className="text-zinc-500 dark:text-zinc-400">
                No location pinned yet. Search or click on the map above.
              </span>
            )}
          </div>

          {hasValue && (
            <button
              type="button"
              onClick={() =>
                updateLocationWithReverseGeocode(
                  defaultCenter[0],
                  defaultCenter[1],
                )
              }
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:text-purple-700 dark:text-zinc-400 dark:hover:text-purple-400"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default
            </button>
          )}
        </div>

        {/* Reverse Geocode Auto-fill Status Banner */}
        {isGeocoding && (
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-xs text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
            <span>Detecting street, barangay & city for auto-fill...</span>
          </div>
        )}

        {!isGeocoding && detectedAddressInfo && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Auto-filled address fields: <strong>{detectedAddressInfo}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
