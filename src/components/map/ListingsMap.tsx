"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft,
  Building2,
  Eye,
  MapPin,
  Navigation,
  RotateCcw,
  SearchX,
  X,
} from "lucide-react";
import {
  LARGEST_SEARCH_RADIUS_KM,
  SEARCH_RADII_KM,
  formatDistance,
  formatRadius,
  type SearchCenter,
  type SearchRadiusKm,
} from "@/lib/geo";
import type { EmptyResultsMessage } from "@/lib/empty-results";

/**
 * One listing's pin. PublicListingsView makes these from the same filtered
 * results as the cards (S2-10, #101), for the listings that have a pin.
 */
export interface MapPinItem {
  id: string;
  title: string;
  monthlyRent: number;
  propertyType: string;
  occupancyType: string;
  allowedGender: string;
  latitude: number;
  longitude: number;
  /** The cover photo, or null when the listing has none. */
  coverImage: string | null;
  /** How far it is from the search point, or null when there's no point. */
  distanceKm: number | null;
  /**
   * The listing's page for this visitor. Left out for guests: their View
   * button opens the sign-up prompt instead (onViewDetails, #86).
   */
  href?: string;
}

interface ListingsMapProps {
  listings: MapPinItem[];
  /** The radius search's point (S2-10, #102), or null when there's none. */
  searchCenter: SearchCenter | null;
  radiusKm: SearchRadiusKm;
  /**
   * A tap on the map, or a drag of the point, sets it (with no name: "the
   * pin"). Clear passes null.
   */
  onSearchCenterChange: (center: SearchCenter | null) => void;
  onRadiusChange: (radiusKm: SearchRadiusKm) => void;
  /** A guest's View button: opens the sign-up prompt for that listing. */
  onViewDetails?: (id: string) => void;
  onToggleView?: () => void;
  /**
   * Why the map has no pins, or null when it has some. It comes from
   * emptyResultsMessage, so it gives the same reason as the cards.
   */
  emptyMessage: EmptyResultsMessage | null;
  /**
   * Changes whenever the search does. A message closed with its X stays
   * closed until then.
   */
  searchKey: string;
  /** The message's "Clear search": empties the search bar. */
  onClearSearch: () => void;
  /** The message's "Reset filters": clears every filter and the search. */
  onResetFilters: () => void;
}

// Cebu City, for when there's nothing else to show.
const DEFAULT_CENTER: [number, number] = [10.3157, 123.8854];

// The purple of the search point and its circle.
const SEARCH_COLOR = "#7c3aed";

// Leaflet redraws a pin whenever it gets a different icon object, so each
// price, plain or highlighted, gets one icon, made the first time it's
// needed.
const priceIcons = new Map<string, L.DivIcon>();

// A price badge pin ("₱2.8k"): darker and bigger while its preview is open.
function priceMarkerIcon(price: number, highlighted: boolean): L.DivIcon {
  const key = `${price}:${highlighted}`;
  const cached = priceIcons.get(key);
  if (cached) return cached;

  const formatted =
    price >= 1000
      ? `₱${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`
      : `₱${price}`;

  const icon = L.divIcon({
    className: "custom-renter-map-price-pin",
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        background-color: ${highlighted ? "#4c1d95" : "#6c5ce7"};
        color: white;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 11px;
        font-weight: 800;
        border-radius: 9999px;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(108, 92, 231, 0.45);
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%) scale(${highlighted ? 1.15 : 1});
      ">
        ${formatted}
      </div>
    `,
    iconSize: [40, 24],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
  priceIcons.set(key, icon);
  return icon;
}

// The search point: a ring the visitor can drag somewhere else.
const searchCenterIcon = L.divIcon({
  className: "search-center-pin",
  html: `
    <div style="
      width: 22px;
      height: 22px;
      box-sizing: border-box;
      border-radius: 9999px;
      background-color: #ffffff;
      border: 6px solid ${SEARCH_COLOR};
      box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.25), 0 4px 10px rgba(0, 0, 0, 0.3);
      cursor: grab;
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/**
 * Keeps the right part of the map in view (S2-10):
 * - with a search point, the whole circle, each time the point or the
 *   radius changes (and not when other filters change the pins, so the
 *   map doesn't jump around while someone narrows things down);
 * - without one, all the pins, each time they change.
 */
function MapFraming({
  pins,
  center,
  radiusKm,
  frameVersion,
}: {
  pins: MapPinItem[];
  center: SearchCenter | null;
  radiusKm: SearchRadiusKm;
  /** Bumped by MapSizeWatcher to frame the map again once it's shown. */
  frameVersion: number;
}) {
  const map = useMap();
  const centerLat = center?.lat;
  const centerLng = center?.lng;
  const hasCenter = center !== null;

  // (Each effect first has Leaflet measure the map, in case its box
  // changed in the same update, say the chips above it appearing. The
  // padding keeps pins clear of the map's own buttons, along its top and
  // bottom edges.)

  useEffect(() => {
    if (centerLat === undefined || centerLng === undefined) return;
    map.invalidateSize();
    // toBounds takes the side of a square around the point, in meters.
    const circleBounds = L.latLng(centerLat, centerLng).toBounds(
      radiusKm * 2 * 1000,
    );
    map.fitBounds(circleBounds, {
      paddingTopLeft: [24, 64],
      paddingBottomRight: [24, 64],
    });
  }, [centerLat, centerLng, radiusKm, map, frameVersion]);

  useEffect(() => {
    if (hasCenter) return;
    map.invalidateSize();
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 15);
    } else if (pins.length > 1) {
      const pinBounds = L.latLngBounds(
        pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]),
      );
      map.fitBounds(pinBounds, {
        paddingTopLeft: [50, 72],
        paddingBottomRight: [50, 72],
        maxZoom: 15,
      });
    }
  }, [pins, hasCenter, map, frameVersion]);

  return null;
}

/**
 * Leaflet measures the map's box only when it starts, so it has to be told
 * when the box changes size: the filter panel opening or closing beside
 * it, the chips above it coming and going, or the map starting while the
 * filter panel covers it on a narrow screen, which leaves it 0 wide.
 * Without this, the new part of the map stays gray. When the map goes from
 * hidden to shown, `onShown` has it framed again, since framing a map
 * that's 0 wide picks a useless zoom.
 */
function MapSizeWatcher({ onShown }: { onShown: () => void }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const isHidden = () =>
      container.clientWidth < 50 || container.clientHeight < 50;
    let wasHidden = isHidden();

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      const hidden = isHidden();
      if (wasHidden && !hidden) onShown();
      wasHidden = hidden;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map, onShown]);

  return null;
}

/**
 * A tap on the map sets the search point there (S2-10, #102), except a tap
 * that only closes a pin's preview. Leaflet closes the preview first and
 * then reports the same tap as a click on the map, so a click straight
 * after a preview closed is skipped.
 */
function SearchPointPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  const previewJustClosed = useRef(false);

  useMapEvents({
    popupclose() {
      previewJustClosed.current = true;
      // The click, if this tap makes one, comes in this same task: by the
      // next one, the tap is over.
      setTimeout(() => {
        previewJustClosed.current = false;
      }, 0);
    },
    click(event) {
      if (previewJustClosed.current) return;
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function ListingsMap({
  listings,
  searchCenter,
  radiusKm,
  onSearchCenterChange,
  onRadiusChange,
  onViewDetails,
  onToggleView,
  emptyMessage,
  searchKey,
  onClearSearch,
  onResetFilters,
}: ListingsMapProps) {
  // The pin whose preview is open, drawn highlighted.
  const [openPinId, setOpenPinId] = useState<string | null>(null);

  // Bumped when the map goes from hidden to shown, to frame it again.
  const [frameVersion, setFrameVersion] = useState(0);
  const handleMapShown = useCallback(
    () => setFrameVersion((version) => version + 1),
    [],
  );

  // The "no pins" message the visitor closed with its X. It stays closed
  // until the search changes, or the message does (say, a place lookup
  // for the words fails): then it's a different message, and shows again.
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  const noticeId = emptyMessage
    ? `${searchKey}|${emptyMessage.title}|${emptyMessage.hint}`
    : null;
  const showNotice = emptyMessage !== null && noticeId !== closedNotice;

  // Where the map opens. MapFraming takes over from there.
  const initialCenter: [number, number] = searchCenter
    ? [searchCenter.lat, searchCenter.lng]
    : listings.length > 0
      ? [listings[0].latitude, listings[0].longitude]
      : DEFAULT_CENTER;

  const pointName = searchCenter?.label ?? "the pin";

  // A spot picked on the map has no name: the page calls it "the pin".
  const pickPoint = (lat: number, lng: number) =>
    onSearchCenterChange({ lat, lng, label: null });

  // The map fills exactly the space the page gives it, with no minimum
  // height: a minimum taller than a phone's leftover space got cut off at
  // the bottom, hiding the radius buttons and the OpenStreetMap credit.
  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      {/* Top left: how many places are on the map (left-16 clears Leaflet's
          zoom buttons). Just "4 places" on phones, so it doesn't run into
          the List View button. */}
      <div className="absolute top-4 left-16 z-[1001] flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
        <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          <span className="hidden sm:inline">Map View (</span>
          {listings.length} {listings.length === 1 ? "place" : "places"}
          <span className="hidden sm:inline">)</span>
        </span>
      </div>

      {/* Top right: back to the cards */}
      {onToggleView && (
        <div className="absolute top-4 right-4 z-[1001] flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-xl backdrop-blur-md transition-all hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-purple-950/40"
          >
            <ArrowLeft className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Return to List View</span>
            <span className="sm:hidden">List View</span>
          </button>
        </div>
      )}

      {/* zoomSnap 0.5 lets framing stop between whole zoom levels, so the
          circle or the pins fill the map instead of leaving a wide margin. */}
      <MapContainer
        center={initialCenter}
        zoom={13}
        zoomSnap={0.5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapSizeWatcher onShown={handleMapShown} />
        <MapFraming
          pins={listings}
          center={searchCenter}
          radiusKm={radiusKm}
          frameVersion={frameVersion}
        />
        <SearchPointPicker onPick={pickPoint} />

        {/* The search point and its radius (S2-10, #102). The circle lets
            taps through to the map, so tapping inside it moves the point. */}
        {searchCenter && (
          <>
            <Circle
              center={[searchCenter.lat, searchCenter.lng]}
              radius={radiusKm * 1000}
              interactive={false}
              pathOptions={{
                color: SEARCH_COLOR,
                weight: 2,
                opacity: 0.7,
                fillColor: SEARCH_COLOR,
                fillOpacity: 0.08,
              }}
            />
            <Marker
              position={[searchCenter.lat, searchCenter.lng]}
              icon={searchCenterIcon}
              draggable={true}
              keyboard={false}
              title="Search point: drag it to move it"
              // Under the price pins, so a pin next to it can still be opened.
              zIndexOffset={-1000}
              eventHandlers={{
                dragend: (event) => {
                  const { lat, lng } = (event.target as L.Marker).getLatLng();
                  pickPoint(lat, lng);
                },
              }}
            />
          </>
        )}

        {listings.map((listing) => {
          const highlighted = listing.id === openPinId;

          return (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              icon={priceMarkerIcon(listing.monthlyRent, highlighted)}
              zIndexOffset={highlighted ? 1000 : 0}
              eventHandlers={{
                popupopen: () => setOpenPinId(listing.id),
                popupclose: () =>
                  setOpenPinId((current) =>
                    current === listing.id ? null : current,
                  ),
              }}
            >
              <Popup
                className="renter-map-popup font-sans"
                autoPan={true}
                autoPanPaddingTopLeft={[20, 90]}
                autoPanPaddingBottomRight={[20, 20]}
                autoPanPadding={[20, 90]}
                closeButton={true}
                maxWidth={280}
                minWidth={224}
              >
                <div className="w-56 overflow-hidden rounded-2xl bg-white p-0 shadow-lg dark:bg-zinc-900">
                  {/* Photo with Property Type Badge */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {listing.coverImage ? (
                      <Image
                        src={listing.coverImage}
                        alt={listing.title}
                        fill
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // Like the cards: say there's no photo, rather than
                      // show a stock one that looks like the place.
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                        <Building2 className="h-8 w-8 stroke-[1.5]" />
                        <span className="text-[11px] font-medium">
                          No photo uploaded
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 rounded-full bg-purple-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                      {listing.propertyType}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h4 className="line-clamp-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {listing.title}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {listing.occupancyType} • {listing.allowedGender}
                    </p>
                    {listing.distanceKm !== null && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(listing.distanceKm)} away
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-700 dark:text-purple-400">
                        ₱{listing.monthlyRent.toLocaleString("en-PH")} / mo
                      </span>
                      {listing.href ? (
                        <Link
                          href={listing.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[10px] font-bold !text-white text-white shadow-xs hover:bg-purple-700"
                        >
                          <Eye className="h-3 w-3 !text-white text-white" />
                          <span className="!text-white text-white">View</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onViewDetails?.(listing.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[10px] font-bold !text-white text-white shadow-xs hover:bg-purple-700"
                        >
                          <Eye className="h-3 w-3 !text-white text-white" />
                          <span className="!text-white text-white">View</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Bottom left, above the map's attribution: the radius search
          (S2-10, #102). Same setting as the filter panel's "Within". */}
      <div className="absolute right-3 bottom-7 left-3 z-[1001] sm:right-auto">
        <div className="rounded-2xl border border-zinc-200/90 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
          {searchCenter ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Within
              </span>
              <div
                role="group"
                aria-label="Search radius"
                className="inline-flex rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-800"
              >
                {SEARCH_RADII_KM.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    aria-pressed={radius === radiusKm}
                    onClick={() => onRadiusChange(radius)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                      radius === radiusKm
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-zinc-600 hover:text-purple-700 dark:text-zinc-300 dark:hover:text-purple-300"
                    }`}
                  >
                    {formatRadius(radius)}
                  </button>
                ))}
              </div>
              <span className="min-w-0 truncate text-xs text-zinc-600 dark:text-zinc-400">
                of{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {pointName}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onSearchCenterChange(null)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Navigation className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
              Tap the map to search around a spot
            </p>
          )}
        </div>
      </div>

      {/* No pins: say why, and offer a way out (plan update on #28). A
          small card on the right, under "Return to List View", so it
          doesn't cover the middle of the map; its X closes it. */}
      {showNotice && emptyMessage && (
        <div className="absolute top-16 right-4 z-[1001] w-64 max-w-[calc(100%-2rem)]">
          <div
            role="status"
            className="relative rounded-2xl border border-zinc-200 bg-white/95 p-3 pr-9 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95"
          >
            <button
              type="button"
              onClick={() => setClosedNotice(noticeId)}
              aria-label="Close this message"
              title="Close"
              className="absolute top-2 right-2 cursor-pointer rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="flex items-start gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-50">
              <SearchX className="mt-px h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="break-words">{emptyMessage.title}</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {emptyMessage.hint}
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5 empty:hidden">
              {emptyMessage.reason === "radius" &&
                radiusKm < LARGEST_SEARCH_RADIUS_KM && (
                  <button
                    type="button"
                    onClick={() => onRadiusChange(LARGEST_SEARCH_RADIUS_KM)}
                    className="cursor-pointer rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-purple-700"
                  >
                    Try {formatRadius(LARGEST_SEARCH_RADIUS_KM)}
                  </button>
                )}
              {emptyMessage.reason === "radius" && (
                <button
                  type="button"
                  onClick={() => onSearchCenterChange(null)}
                  className="cursor-pointer rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Clear the point
                </button>
              )}
              {emptyMessage.reason === "words" && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="cursor-pointer rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Clear search
                </button>
              )}
              {emptyMessage.reason === "filters" && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset filters
                </button>
              )}
              {emptyMessage.reason === "no-pins" && onToggleView && (
                <button
                  type="button"
                  onClick={onToggleView}
                  className="cursor-pointer rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  Show the list
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
