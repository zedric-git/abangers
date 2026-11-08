"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logOut } from "@/lib/auth/log-out";
import LandlordAuthModal from "@/components/LandlordAuthModal";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

interface HeaderAuthButtonsProps {
  isAuthenticated: boolean;
  dashboardPath: string | null;
}

export default function HeaderAuthButtons({
  isAuthenticated,
  dashboardPath,
}: HeaderAuthButtonsProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("login");
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  if (isAuthenticated) {
    return (
      <>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {dashboardPath && (
            <Link
              href={dashboardPath}
              className="rounded-xl bg-purple-50 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-purple-700 transition-colors hover:bg-purple-100 sm:px-3.5 sm:py-2 sm:text-sm dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
            >
              My Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3 sm:py-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>

        <LogoutConfirmModal
          isOpen={isLogoutOpen}
          onClose={() => setIsLogoutOpen(false)}
          onConfirm={logOut}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            setModalMode("login");
            setIsAuthModalOpen(true);
          }}
          className="cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:px-3.5 sm:py-2 sm:text-sm dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => {
            setModalMode("signup");
            setIsAuthModalOpen(true);
          }}
          className="cursor-pointer rounded-xl bg-purple-600 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800 sm:px-3.5 sm:py-2 sm:text-sm"
        >
          Sign Up
        </button>
      </div>

      {isAuthModalOpen && (
        <LandlordAuthModal
          isOpen
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={modalMode}
          initialRole="renter"
        />
      )}
    </>
  );
}
