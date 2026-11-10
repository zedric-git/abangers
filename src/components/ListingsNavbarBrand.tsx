"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { logOut } from "@/lib/auth/log-out";

export default function ListingsNavbarBrand() {
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    await logOut();
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="flex items-center gap-2.5 text-lg font-bold tracking-tight transition-opacity hover:opacity-85"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-500/20">
        <Home className="h-4.5 w-4.5" />
      </div>
      <span>Abangers</span>
    </Link>
  );
}
