"use client";

import { Calendar } from "lucide-react";

/**
 * Dedicated component for landlord viewing availability settings (S3-01.2 / #105).
 * Kept in its own file to avoid collisions with viewing requests (#110, #122, #118).
 */
export function ViewingAvailabilityForm() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2.5 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h2 className="text-lg font-bold">Viewing Availability Settings</h2>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Available Days for Physical Viewings
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 p-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <input
                  type="checkbox"
                  defaultChecked={i < 6}
                  className="rounded accent-purple-600"
                />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Daily Visiting Hours
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Earliest Start Time
              </label>
              <input
                type="time"
                defaultValue="09:00"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Latest End Time
              </label>
              <input
                type="time"
                defaultValue="17:00"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-800"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
