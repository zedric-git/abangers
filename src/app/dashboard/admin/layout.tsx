"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Building2,
  Bell,
  User,
  LogOut,
} from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import SignedInOnly from "@/components/SignedInOnly";
import { logOut } from "@/lib/auth/log-out";

/**
 * The admin dashboard layout. The proxy only lets admins in
 * (src/lib/auth/route-guard.ts). A Client Component, like the landlord
 * layout, for Log Out's click handler.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const adminNavItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
      description:
        "Overview of users, listings, pending verifications, and system activity.",
    },
    {
      label: "Verifications",
      href: "/dashboard/admin/verifications",
      icon: ShieldCheck,
      badge: 3,
      description:
        "Review landlord verification requests, government IDs, and live selfies.",
    },
    {
      label: "User Management",
      href: "/dashboard/admin/users",
      icon: Users,
      description:
        "Manage landlord/renter accounts, review verification requests, and suspend/reactivate users.",
    },
    {
      label: "Listing Management",
      href: "/dashboard/admin/listings",
      icon: Building2,
      description:
        "Monitor, review, and remove property listings when necessary.",
    },
    {
      label: "Notifications",
      href: "/dashboard/admin/notifications",
      icon: Bell,
      badge: 3,
      description: "View verification requests and important system alerts.",
      position: "bottom",
    },
    {
      label: "Profile",
      href: "/dashboard/admin/profile",
      icon: User,
      description: "Manage admin profile and account settings.",
      position: "bottom",
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
    <div className="bg-background flex h-dvh flex-col overflow-hidden font-sans md:flex-row">
      {/* These pages show landlords' ID photos: a signed-out browser
          (e.g. Back after logging out) goes home (#252) */}
      <SignedInOnly />

      <DashboardSidebar items={adminNavItems} userRoleLabel="Admin Dashboard" />

      <main className="custom-scrollbar bg-background flex-1 overflow-y-auto p-4 md:px-6 md:pt-6 md:pb-8">
        <div className="w-full">{children}</div>
      </main>

      <LogoutConfirmModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={logOut}
      />
    </div>
  );
}
