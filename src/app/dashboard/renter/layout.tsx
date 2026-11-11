"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  Heart,
  User,
  LogOut,
  CalendarCheck,
  MessageSquare,
} from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import SignedInOnly from "@/components/SignedInOnly";
import { logOut } from "@/lib/auth/log-out";

export default function RenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // Keep window itself pinned at (0, 0) on route changes so no scroll voids appear
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const renterNavItems: NavItem[] = [
    // Top Group
    {
      label: "Find a Place",
      href: "/listings",
      icon: Search,
      description: "Search properties and explore listings",
    },
    {
      label: "Favorites",
      href: "/dashboard/renter/favorites",
      icon: Heart,
      description: "View and manage saved property listings",
    },
    {
      label: "My Viewings",
      href: "/dashboard/renter/viewings",
      icon: CalendarCheck,
      description:
        "Schedule property visits, track viewing requests, and cancel appointments.",
    },
    {
      label: "Messages",
      href: "/dashboard/renter/messages",
      icon: MessageSquare,
      badge: 1,
      description:
        "Send and receive messages from landlords regarding properties and viewings.",
    },

    // Bottom Group
    {
      label: "Profile",
      href: "/dashboard/renter/profile",
      icon: User,
      position: "bottom",
      description: "Personal and account details",
    },
    {
      label: "Log Out",
      icon: LogOut,
      onClick: () => setIsLogoutOpen(true),
      isDanger: true,
      position: "bottom",
      description: "Sign out of your account",
    },
  ];

  const isMessagesPage = pathname?.includes("/messages");
  const isFindPlacePage = pathname === "/dashboard/renter";

  return (
    <div className="bg-background fixed inset-0 flex h-dvh flex-col overflow-hidden font-sans md:flex-row">
      {/* Signed out (e.g. Back after logging out) → home page (#252) */}
      <SignedInOnly />

      {/* Sidebar (Desktop docked + Mobile drawer & trigger) */}
      <DashboardSidebar
        items={renterNavItems}
        userRoleLabel="Renter Dashboard"
      />

      {/* Main Content Area: route-aware content scrolling */}
      {/* Main Content Area: route-aware content scrolling */}
      <main
        className={`bg-background min-w-0 flex-1 ${
          isMessagesPage
            ? "overflow-hidden p-3 md:p-4"
            : isFindPlacePage
              ? "flex h-full flex-col overflow-hidden p-4 md:px-6 md:pt-6 md:pb-4"
              : "custom-scrollbar overflow-y-auto px-4 py-6 md:px-8 md:py-8"
        }`}
      >
        <div
          className={
            isMessagesPage || isFindPlacePage
              ? "flex h-full min-h-0 w-full flex-1 flex-col"
              : "mx-auto max-w-6xl"
          }
        >
          {children}
        </div>
      </main>

      {/* Logout Confirmation Dialog (completes #124) */}
      <LogoutConfirmModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={logOut}
      />
    </div>
  );
}
