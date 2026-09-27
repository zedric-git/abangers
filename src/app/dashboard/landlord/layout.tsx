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
    },
    {
      label: "Log Out",
      icon: LogOut,
      onClick: handleLogout,
      isDanger: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      {/* Sidebar */}
      <DashboardSidebar
        items={landlordNavItems}
        userRoleLabel="Landlord Dashboard"
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">{children}</main>
    </div>
  );
}
