"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Eye, ArrowLeft } from "lucide-react";

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
  onToggleView?: () => void;
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
  onToggleView,
}: RenterFindPlaceMapProps) {
  const initialCenter: [number, number] =
    listings.length > 0
      ? [listings[0].latitude, listings[0].longitude]
      : DEFAULT_CENTER;

  return (
    <div className="relative isolate z-0 h-full min-h-[480px] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      {/* Top Left Floating Map Banner (Placed at left-16 to clear Leaflet zoom controls) */}
      <div
        style={{ zIndex: 1001 }}
        className="absolute top-4 left-16 flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95"
      >
        <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Map View ({listings.length} places)
        </span>
      </div>

      {/* Top Right: Prominent Return to List View Button */}
      {onToggleView && (
        <div
          style={{ zIndex: 1001 }}
          className="absolute top-4 right-4 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-xl backdrop-blur-md transition-all hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-purple-950/40"
          >
            <ArrowLeft className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Return to List View</span>
          </button>
        </div>
      )}

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
                className="renter-map-popup font-sans"
                maxWidth={280}
                minWidth={224}
              >
                <div className="w-56 overflow-hidden rounded-2xl bg-white p-0 shadow-lg dark:bg-zinc-900">
                  {/* Photo with Property Type Badge */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <Image
                      src={
                        listing.coverImage ||
                        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80"
                      }
                      alt={listing.title}
                      fill
                      unoptimized
                      className="h-full w-full object-cover"
                    />
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
    </div>
  );
}
