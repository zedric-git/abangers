"use client";

import { useState } from "react";
import Link from "next/link";
import LandlordAuthModal from "@/components/LandlordAuthModal";

// "I want to post my rental property" and "Go to my dashboard" (#245)
// take the same spot, so they look the same.
const SECONDARY_BUTTON =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:active:bg-zinc-800";

interface HomeActionsProps {
  /**
   * Where a signed-in user belongs (from resolvePostLoginPath, worked out
   * by the home page on the server), or null when they're signed out or
   * their role can't be worked out.
   */
  dashboardPath: string | null;
}

/**
 * The home page's buttons, and the login / sign-up popup they open. A
 * Client Component because the popup's open/closed state lives here; the
 * home page itself stays a Server Component so it can read the session.
 *
 * Signed in: "Go to my dashboard" instead of the sign-up and Login
 * buttons (#245). Signed out: sign-up and Login, which open the popup.
 */
export default function HomeActions({ dashboardPath }: HomeActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");

  return (
    <div className="flex w-full flex-col gap-4">
      <Link
        href="/listings"
        className="flex h-12 w-full items-center justify-center rounded-lg bg-purple-600 px-6 font-medium text-white transition-colors hover:bg-purple-700 active:bg-purple-800"
      >
        {"I'm looking for a place to rent"}
      </Link>

      {dashboardPath ? (
        <Link href={dashboardPath} className={SECONDARY_BUTTON}>
          Go to my dashboard
        </Link>
      ) : (
        <>
          <button
            onClick={() => {
              setModalMode("signup");
              setIsModalOpen(true);
            }}
            className={SECONDARY_BUTTON}
          >
            I want to post my rental property
          </button>

          <div className="pt-2">
            <button
              onClick={() => {
                setModalMode("login");
                setIsModalOpen(true);
              }}
              className="cursor-pointer text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Login
            </button>
          </div>
        </>
      )}

      {/*
        Landlord Auth Modal — only mounted while open, so each open starts
        fresh on `modalMode` (e.g. "post my rental property" always shows
        sign-up, even if the user switched to login last time).
      */}
      {isModalOpen && (
        <LandlordAuthModal
          isOpen
          onClose={() => setIsModalOpen(false)}
          initialMode={modalMode}
        />
      )}
    </div>
  );
}
