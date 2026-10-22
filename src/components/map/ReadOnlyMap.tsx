"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createReadOnlyIcon = () => {
  return L.divIcon({
    className: "custom-map-pin-readonly",
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

interface ReadOnlyMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
}

export default function ReadOnlyMap({
  latitude,
  longitude,
  title,
  address,
}: ReadOnlyMapProps) {
  const readOnlyIcon = useMemo(() => createReadOnlyIcon(), []);

  return (
    <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-inner sm:aspect-16/9 dark:border-zinc-800 dark:bg-zinc-950">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={readOnlyIcon}>
          {(title || address) && (
            <Popup className="font-sans text-xs">
              <div className="p-1">
                {title && <p className="font-bold text-zinc-900">{title}</p>}
                {address && <p className="mt-0.5 text-zinc-600">{address}</p>}
              </div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
