"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Building2, LogOut } from "lucide-react";
import type { Listing } from "@/types/listing";
import PublicListingCard from "@/components/PublicListingCard";
import LandlordAuthModal from "@/components/LandlordAuthModal";
import { createClient } from "@/lib/supabase/client";

interface PublicListingsViewProps {
  listings: Listing[];
  dashboardPath: string | null;
}

export default function PublicListingsView({
  listings,
  dashboardPath,
}: PublicListingsViewProps) {
  const router = useRouter();

  // Guest Auth Prompt Modal State (Issue #86)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");
  const [promptTitle, setPromptTitle] = useState<string | undefined>(undefined);
  const [promptDescription, setPromptDescription] = useState<
    string | undefined
  >(undefined);

  const handleOpenAuth = (mode: "login" | "signup") => {
    setModalMode(mode);
    setPromptTitle(undefined);
    setPromptDescription(undefined);
    setIsAuthModalOpen(true);
  };

  const handleViewDetails = (listing: Listing) => {
    // If the visitor is logged in, navigate straight to the listing details page
    if (dashboardPath) {
      router.push(`/listings/${listing.id}`);
      return;
    }

    // Guest Flow (Issue #86): Prompt with login/sign-up modal
    setPromptTitle("Join Abangers to View Details");
    setPromptDescription(
      "Join Abangers to use further features and view details.",
    );
    setModalMode("signup");
    setIsAuthModalOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Public Top Navbar (No Dashboard Sidebar for Guests) */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <Home className="h-5 w-5" />
            </div>
            <div className="flex items-center">
              <span className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                Abangers
              </span>
              <span className="ml-3 hidden border-l border-zinc-200 pl-3 text-xs font-semibold text-zinc-500 sm:inline-block dark:border-zinc-800 dark:text-zinc-400">
                Boarding House Search
              </span>
            </div>
          </Link>

          {/* Navigation / Auth Actions */}
          <div className="flex items-center gap-3">
            {dashboardPath ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardPath}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
                >
                  Go to my dashboard
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  title="Log out to test as a guest"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenAuth("login")}
                  className="cursor-pointer px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:text-purple-600 dark:text-zinc-300 dark:hover:text-purple-400"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth("signup")}
                  className="cursor-pointer rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Header Section */}
      <section className="border-b border-purple-100 bg-gradient-to-b from-purple-50/70 to-transparent px-4 py-8 sm:px-6 lg:px-8 dark:border-zinc-800 dark:from-purple-950/20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                <span>Public Browse</span>
                <span>•</span>
                <span>Explore without an account</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
                Boarding Houses & Rooms in Cebu
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Discover student dormitories, bed spaces, and studio rooms near
                CIT-U, USJ-R, UC, and IT Park.
              </p>
            </div>

            <div className="self-start rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-600 shadow-2xs md:self-auto dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {dashboardPath ? (
                <span>
                  Logged In • Showing{" "}
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {listings.length}
                  </span>{" "}
                  active listings
                </span>
              ) : (
                <span>
                  Guest Mode • Click{" "}
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    &quot;View Details&quot;
                  </span>{" "}
                  to prompt sign in
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              No Boarding Houses Listed Yet
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Landlords are currently uploading their properties. Check back
              soon for newly verified rooms and bed spaces!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <PublicListingCard
                key={listing.id}
                listing={listing}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </main>

      {/* Guest Login / Sign Up Modal (Issue #86) */}
      {isAuthModalOpen && (
        <LandlordAuthModal
          isOpen={isAuthModalOpen}
          initialMode={modalMode}
          initialRole="renter"
          promptTitle={promptTitle}
          promptDescription={promptDescription}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
