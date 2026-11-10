"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandlordAuthModal from "@/components/LandlordAuthModal";
import type { SignUpRole } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";

/**
 * The home page's buttons, and the login / sign-up popup they open. A
 * Client Component because the popup's open/closed state lives here; the
 * home page itself stays a Server Component.
 *
 * Navigating to Home automatically logs out any active session to protect
 * the user's account and keep the landing & public listings in guest mode.
 */
export default function HomeActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");
  const [modalRole, setModalRole] = useState<SignUpRole>("landlord");

  // Automatically sign out any active session on the home page so the account
  // is protected and browsing remains guest-only until explicit login.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});

    const handleNavigation = () => {
      supabase.auth.signOut().catch(() => {});
    };

    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("pageshow", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("pageshow", handleNavigation);
    };
  }, []);

  const handleRentClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on sign-out
    } finally {
      window.location.replace("/listings");
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Link
        href="/listings"
        onClick={handleRentClick}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-purple-600 px-6 font-medium text-white transition-colors hover:bg-purple-700 active:bg-purple-800"
      >
        {"I'm looking for a place to rent"}
      </Link>

      <button
        onClick={() => {
          setModalRole("landlord");
          setModalMode("signup");
          setIsModalOpen(true);
        }}
        className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:active:bg-zinc-800"
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

      {/*
        Auth Modal — only mounted while open, so each open starts
        fresh on `modalMode` (e.g. "post my rental property" always shows
        sign-up, even if the user switched to login last time).
      */}
      {isModalOpen && (
        <LandlordAuthModal
          isOpen
          onClose={() => setIsModalOpen(false)}
          initialMode={modalMode}
          initialRole={modalRole}
        />
      )}
    </div>
  );
}
