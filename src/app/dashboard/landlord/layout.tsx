"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Building2, User, LogOut } from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import SignedInOnly from "@/components/SignedInOnly";
import { logOut } from "@/lib/auth/log-out";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Pin the desktop window itself to (0, 0) so window scrolling never reveals blank voids below the layout
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0 || window.scrollX > 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      {/* Main Content Area: snug padding so content fits on standard desktop screens */}
      <main className="custom-scrollbar bg-background min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:px-8 md:py-6">
        {children}
      </main>
    </div>
  );
}
