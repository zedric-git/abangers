"use client";

import { useState } from "react";
import Link from "next/link";
import LandlordAuthModal from "@/components/LandlordAuthModal";

interface ListingsNavbarActionsProps {
  dashboardPath?: string | null;
}

export default function ListingsNavbarActions({
  dashboardPath,
}: ListingsNavbarActionsProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="flex items-center gap-2 sm:gap-3"
      >
        <Link
          href="/"
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:text-sm dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Home
        </Link>

        <button
          type="button"
          onClick={() => openAuth("signup")}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:border-purple-300 hover:bg-purple-50/60 hover:text-purple-700 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-purple-800 dark:hover:bg-purple-950/40 dark:hover:text-purple-300"
        >
          Sign-in
        </button>

        <button
          type="button"
          onClick={() => openAuth("login")}
          className="cursor-pointer rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 sm:text-sm dark:bg-purple-600 dark:hover:bg-purple-500"
        >
          Log-in
        </button>

        {dashboardPath && (
          <Link
            href={dashboardPath}
            className="rounded-xl bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 sm:text-sm dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-950"
          >
            My Dashboard
          </Link>
        )}
      </nav>

      <LandlordAuthModal
        key={authMode}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        initialRole="renter"
      />
    </>
  );
}
