"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  ShieldCheck,
  Navigation,
  ExternalLink,
  LocateFixed,
} from "lucide-react";

export interface MapPinItem {
  id: string;
  title: string;
  address: string;
  city: string;
  monthlyRent: number;
  propertyType: string;
  occupancyType: string;
  allowedGender: string;
  availableRooms: number;
  latitude: number;
  longitude: number;
  coverImage: string;
  landlordVerified?: boolean;
  href?: string;
}

interface RenterFindPlaceMapProps {
  listings: MapPinItem[];
  selectedId?: string | null;
  onSelectListing?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

// Default center: Cebu City
const DEFAULT_CENTER: [number, number] = [10.3157, 123.8854];

function createPricePinIcon(
  monthlyRent: number,
  isSelected: boolean,
  isAvailable: boolean,
) {
  const formattedPrice = `₱${monthlyRent.toLocaleString("en-PH")}`;
  const bgColor = isSelected ? "#7c3aed" : isAvailable ? "#18181b" : "#71717a";
  const borderColor = isSelected ? "#f5f3ff" : "#ffffff";
  const scale = isSelected ? "scale(1.12)" : "scale(1)";
  const shadow = isSelected
    ? "0 8px 20px rgba(124, 58, 237, 0.45)"
    : "0 4px 12px rgba(0, 0, 0, 0.25)";

  return L.divIcon({
    className: "abangers-price-pin",
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        background-color: ${bgColor};
        color: #ffffff;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 12px;
        font-weight: 800;
        border-radius: 9999px;
        border: 2.5px solid ${borderColor};
        box-shadow: ${shadow};
        white-space: nowrap;
        transform: ${scale};
        transition: transform 0.15s ease, background-color 0.15s ease;
        cursor: pointer;
      ">
        <span style="
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background-color: ${isAvailable ? "#10b981" : "#f43f5e"};
          display: inline-block;
        "></span>
        <span>${formattedPrice}</span>
      </div>
    `,
    iconSize: [90, 32],
    iconAnchor: [45, 16],
    popupAnchor: [0, -18],
  });
}

function MapBoundsUpdater({
  listings,
  selectedId,
}: {
  listings: MapPinItem[];
  selectedId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedId) {
      const target = listings.find((l) => l.id === selectedId);
      if (target) {
        map.flyTo([target.latitude, target.longitude], 16, {
          animate: true,
          duration: 0.8,
        });
        return;
      }
    }

    if (listings.length === 1) {
      map.flyTo([listings[0].latitude, listings[0].longitude], 15, {
        animate: true,
        duration: 0.8,
      });
    } else if (listings.length > 1) {
      const bounds = L.latLngBounds(
        listings.map((l) => [l.latitude, l.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [listings, selectedId, map]);

  return null;
}

export default function RenterFindPlaceMap({
  listings,
  selectedId,
  onSelectListing,
  onViewDetails,
}: RenterFindPlaceMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

  const initialCenter: [number, number] =
    listings.length > 0
      ? [listings[0].latitude, listings[0].longitude]
      : DEFAULT_CENTER;

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="relative isolate z-0 h-135 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-xs sm:h-155 dark:border-zinc-800 dark:bg-zinc-950">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater listings={listings} selectedId={selectedId} />

        {listings.map((listing) => {
          const isSelected = selectedId === listing.id;
          const isAvailable = listing.availableRooms > 0;
          const icon = createPricePinIcon(
            listing.monthlyRent,
            isSelected,
            isAvailable,
          );

          return (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectListing?.(listing.id),
              }}
            >
              <Popup
                className="abangers-map-popup"
                maxWidth={280}
                minWidth={250}
              >
                <div className="overflow-hidden rounded-xl font-sans">
                  <div className="relative h-32 w-full overflow-hidden rounded-lg bg-zinc-100">
                    {listing.coverImage ? (
                      <Image
                        src={listing.coverImage}
                        alt={listing.title}
                        fill
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">
                        No Cover Image
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-xs ${
                        isAvailable ? "bg-emerald-600/95" : "bg-rose-600/95"
                      }`}
                    >
                      {isAvailable
                        ? `${listing.availableRooms} rooms left`
                        : "Fully Occupied"}
                    </span>
                    <span className="absolute right-2 bottom-2 rounded-lg bg-zinc-950/90 px-2 py-0.5 text-xs font-extrabold text-white">
                      ₱{listing.monthlyRent.toLocaleString("en-PH")}/mo
                    </span>
                  </div>

                  <div className="pt-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase">
                        {listing.propertyType} • {listing.occupancyType}
                      </span>
                      {listing.landlordVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 line-clamp-1 text-sm font-bold text-zinc-900">
                      {listing.title}
                    </p>

                    <p className="mt-1 flex items-start gap-1 text-[11px] text-zinc-600">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-purple-600" />
                      <span className="line-clamp-1">
                        {listing.address}, {listing.city}
                      </span>
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                        {listing.allowedGender}
                      </span>
                      {listing.href ? (
                        <Link
                          href={listing.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-purple-700"
                        >
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onViewDetails?.(listing.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-purple-700"
                        >
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              className: "abangers-user-pin",
              html: `
                <div style="
                  width: 18px;
                  height: 18px;
                  border-radius: 9999px;
                  background-color: #2563eb;
                  border: 3px solid #ffffff;
                  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25);
                "></div>
              `,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })}
          >
            <Popup>
              <p className="font-sans text-xs font-semibold text-zinc-900">
                Your current location
              </p>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Map Controls Overlay */}
      <div className="pointer-events-none absolute top-3 right-3 left-3 z-400 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200">
          <Navigation className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>
            Showing <strong>{listings.length}</strong>{" "}
            {listings.length === 1 ? "pin" : "pins"} on map
          </span>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-md backdrop-blur-md transition-colors hover:border-purple-300 hover:text-purple-600 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200"
        >
          <LocateFixed className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          {locating ? "Locating..." : "Near My Location"}
        </button>
      </div>
    </div>
  );
}
