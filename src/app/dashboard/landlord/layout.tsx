"use client";

import { useRouter } from "next/navigation";
import { Building2, User, LogOut } from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import { createClient } from "@/lib/supabase/client";

export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.push("/");
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
    <div className="flex h-dvh h-screen flex-col overflow-hidden bg-white font-sans transition-colors duration-300 md:flex-row dark:bg-black">
      {/* Sidebar (Desktop docked + Mobile drawer & trigger) */}
      <DashboardSidebar
        items={landlordNavItems}
        userRoleLabel="Landlord Dashboard"
      />

      {/* Main Content Area */}
      <main className="custom-scrollbar flex-1 overflow-y-auto bg-white p-6 transition-colors duration-300 md:p-10 dark:bg-black">
        {children}
      </main>
    </div>
  );
}
