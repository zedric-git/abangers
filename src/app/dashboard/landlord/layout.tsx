"use client";

import { Building2, User, LogOut } from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import SignedInOnly from "@/components/SignedInOnly";
import { logOut } from "@/lib/auth/log-out";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const landlordNavItems: NavItem[] = [
    {
      label: "My Listings",
      href: "/dashboard/landlord",
      icon: Building2,
    },
    {
      label: "Profile",
      href: "/dashboard/landlord/profile",
      icon: User,
      position: "bottom",
    },
    {
      label: "Log Out",
      icon: LogOut,
      // A hard navigation home, not router.push (src/lib/auth/log-out.ts).
      onClick: logOut,
      isDanger: true,
      position: "bottom",
    },
  ];

  return (
    // bg-background (not bg-white/dark:bg-black + transition-colors): it
    // fades via the single shared --background transition in globals.css,
    // so it always matches the sidebar's active tab exactly.
    // h-dvh (not h-screen): on a phone 100vh is the height with the
    // browser's address bar hidden, so the bottom of the dashboard would
    // sit under the bar while it shows (#245).
    <div className="bg-background flex h-dvh flex-col overflow-hidden font-sans md:flex-row">
      {/* Signed out (e.g. Back after logging out) → home page (#252) */}
      <SignedInOnly />

      {/* Sidebar (Desktop docked + Mobile drawer & trigger) */}
      <DashboardSidebar
        items={landlordNavItems}
        userRoleLabel="Landlord Dashboard"
      />

      {/* Main Content Area */}
      <main className="custom-scrollbar bg-background flex-1 overflow-y-auto p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
