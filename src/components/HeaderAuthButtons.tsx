"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logOut } from "@/lib/auth/log-out";
import LandlordAuthModal from "@/components/LandlordAuthModal";

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

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2.5">
        {dashboardPath && (
          <Link
            href={dashboardPath}
            className="rounded-xl bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100"
          >
            My Dashboard
          </Link>
        )}
        <button
          type="button"
          onClick={() => logOut()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          title="Log out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setModalMode("login");
            setIsAuthModalOpen(true);
          }}
          className="cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => {
            setModalMode("signup");
            setIsAuthModalOpen(true);
          }}
          className="cursor-pointer rounded-xl bg-purple-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 active:bg-purple-800"
        >
          Sign Up
        </button>
      </div>

      <LandlordAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={modalMode}
        initialRole="renter"
      />
    </>
  );
}
