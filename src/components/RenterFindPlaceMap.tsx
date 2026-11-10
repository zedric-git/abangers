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

// Custom Google Maps / Airbnb style price badge marker matching .Abangers UI & Pic 2
function createPriceMarkerIcon(price: number) {
  const formatted =
    price >= 1000
      ? `₱${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`
      : `₱${price}`;

  return L.divIcon({
    className: "custom-renter-map-price-pin",
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        background-color: #6c5ce7;
        color: white;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: 11px;
        font-weight: 800;
        border-radius: 9999px;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(108, 92, 231, 0.45);
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease;
      ">
        ${formatted}
      </div>
    `,
    iconSize: [40, 24],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

function MapBoundsUpdater({ listings }: { listings: MapPinItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 1) {
      map.setView([listings[0].latitude, listings[0].longitude], 15);
    } else if (listings.length > 1) {
      const bounds = L.latLngBounds(
        listings.map((l) => [l.latitude, l.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [listings, map]);

  return null;
}

export default function RenterFindPlaceMap({
  listings,
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

        <MapBoundsUpdater listings={listings} />

        {listings.map((listing) => {
          const icon = createPriceMarkerIcon(listing.monthlyRent);

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
