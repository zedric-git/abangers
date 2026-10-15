"use client";

import { Building2, User, LogOut } from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import { createClient } from "@/lib/supabase/client";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Not router.push: that keeps the dashboard in browser history and
      // in Next's client-side cache, so pressing Back would show it again
      // without asking the server. A full replace drops the history entry
      // and the cache, so any later visit hits the guard in the proxy.
      window.location.replace("/");
    }
  };

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
      onClick: handleLogout,
      isDanger: true,
      position: "bottom",
    },
  ];

  return (
    // bg-background (not bg-white/dark:bg-black + transition-colors): it
    // fades via the single shared --background transition in globals.css,
    // so it always matches the sidebar's active tab exactly.
    <div className="bg-background flex h-dvh h-screen flex-col overflow-hidden font-sans md:flex-row">
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
