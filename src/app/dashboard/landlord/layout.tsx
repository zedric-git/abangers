"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Building2,
  CalendarCheck,
  Users,
  MessageSquare,
  Bell,
  User,
  LogOut,
} from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import SignedInOnly from "@/components/SignedInOnly";
import { createClient } from "@/lib/supabase/client";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // Keep window itself pinned at (0, 0) on route changes so no scroll voids appear
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const handleLogout = async () => {
    setTheme("light");
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Hard navigation home, dropping client cache and history entry
      window.location.replace("/");
    }
  };

  const landlordNavItems: NavItem[] = [
    // Top Group
    {
      label: "My Listings",
      href: "/dashboard/landlord",
      icon: Building2,
      description: "Manage properties and listings",
    },
    {
      label: "Viewing Requests",
      href: "/dashboard/landlord/viewing-requests",
      icon: CalendarCheck,
      description: "Scheduled visits and inquiries",
    },
    {
      label: "Renter Management",
      href: "/dashboard/landlord/renter-management",
      icon: Users,
      description: "Current and prospective tenants",
    },
    {
      label: "Messages",
      href: "/dashboard/landlord/messages",
      icon: MessageSquare,
      description: "Direct chat with renters",
    },

    // Bottom Group
    {
      label: "Notifications",
      href: "/dashboard/landlord/notifications",
      icon: Bell,
      badge: 3,
      position: "bottom",
      description: "Recent updates and alerts",
    },
    {
      label: "Profile",
      href: "/dashboard/landlord/profile",
      icon: User,
      position: "bottom",
      description: "Personal and verification details",
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

  const isMessagesRoute = pathname.startsWith("/dashboard/landlord/messages");

  return (
    // Fixed viewport lock: container pinned to viewport bounds so the desktop
    // window itself never scrolls and never reveals blank space below the sidebar.
    <div className="bg-background fixed inset-0 flex h-dvh h-screen w-screen flex-col overflow-hidden font-sans md:flex-row">
      {/* Signed out (e.g. Back after logging out) → home page (#252) */}
      <SignedInOnly />

      {/* Sidebar (Desktop docked + Mobile drawer & trigger) */}
      <DashboardSidebar
        items={landlordNavItems}
        userRoleLabel="Landlord Dashboard"
      />

      {/* Main Content Area: route-aware content scrolling */}
      <main
        className={`custom-scrollbar bg-background min-w-0 flex-1 ${
          isMessagesRoute
            ? "overflow-hidden p-3 md:p-4"
            : "overflow-y-auto px-4 py-6 md:px-8 md:py-8"
        }`}
      >
        {children}
      </main>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
