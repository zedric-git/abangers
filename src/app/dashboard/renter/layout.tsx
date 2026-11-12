"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Heart, User, LogOut, Bell } from "lucide-react";
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

    // Bottom Group
    {
      label: "Notifications",
      href: "/dashboard/renter/notifications",
      icon: Bell,
      badge: 2,
      position: "bottom",
      description: "Recent updates and alerts",
    },
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
      <main className="custom-scrollbar bg-background min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
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
