"use client";

import { useState } from "react";
import Link from "next/link";
import LandlordAuthModal from "@/components/LandlordAuthModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center justify-center space-y-8 py-12 text-center">
        {/* Branding / Header */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md dark:bg-indigo-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5-7.75-6-2.25a.75.75 0 0 0-.5 0l-6 2.25m6-2.25v2.25"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Abangers
          </h1>
          <p className="mx-auto max-w-xs text-zinc-500 dark:text-zinc-400">
            Discover the perfect boarding house or manage your rental properties
            seamlessly.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex w-full flex-col gap-4">
          <Link
            href="/listings"
            className="flex h-12 w-full items-center justify-center rounded-lg bg-indigo-600 px-6 font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:active:bg-indigo-700"
          >
            {"I'm looking for a place to rent"}
          </Link>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:active:bg-zinc-800"
          >
            I want to post my rental property
          </button>

          <div className="pt-2">
            <Link
              href="/login"
              className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Login
            </Link>
          </div>
        </div>
      </main>

      {/* Landlord Auth Modal */}
      <LandlordAuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
