"use client";

import dynamic from "next/dynamic";
import { MapPin, Loader2 } from "lucide-react";

const LoadingSkeleton = ({
  label = "Loading map...",
  // The map's own size and corners, so nothing jumps when it arrives.
  shape = "aspect-16/10 rounded-2xl sm:aspect-16/9",
}: {
  label?: string;
  shape?: string;
}) => (
  <div
    className={`flex w-full flex-col items-center justify-center border border-zinc-200 bg-zinc-100 p-6 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 ${shape}`}
  >
    <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
      <MapPin className="h-4 w-4" />
      <span>{label}</span>
    </div>
  </div>
);

export const LocationPickerDynamic = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <LoadingSkeleton label="Loading interactive map..." />,
});

export const ReadOnlyMapDynamic = dynamic(() => import("./ReadOnlyMap"), {
  ssr: false,
  loading: () => <LoadingSkeleton label="Loading property location map..." />,
});

// Find a Place and /listings: the listings' pins and the radius search
// (S2-10). It fills the space it's given, like the cards beside it.
export const ListingsMapDynamic = dynamic(() => import("./ListingsMap"), {
  ssr: false,
  loading: () => (
    <LoadingSkeleton
      label="Loading interactive map..."
      shape="h-full rounded-3xl"
    />
  ),
});
