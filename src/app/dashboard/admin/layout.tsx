"use client";

import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";
import SignedInOnly from "@/components/SignedInOnly";
import { logOut } from "@/lib/auth/log-out";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-review-view";

/**
 * The admin dashboard (S2-11.2, #256). The proxy only lets admins in
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
      label: "Verifications",
      href: ADMIN_DASHBOARD_PATH,
      icon: ShieldCheck,
    },
    {
      label: "Log Out",
      icon: LogOut,
      // Opens the confirmation dialog, which then calls logOut() for a
      // hard navigation home (src/lib/auth/log-out.ts).
      onClick: () => setIsLogoutOpen(true),
      isDanger: true,
      position: "bottom",
    },
  ];

  return (
    // The same frame as the landlord layout: see its comments for
    // bg-background and h-dvh.
    <div className="bg-background flex h-dvh flex-col overflow-hidden font-sans md:flex-row">
      {/* These pages show landlords' ID photos: a signed-out browser
          (e.g. Back after logging out) goes home (#252) */}
      <SignedInOnly />

      <DashboardSidebar items={adminNavItems} userRoleLabel="Admin Dashboard" />

      <main className="custom-scrollbar bg-background flex-1 overflow-y-auto p-6 md:p-10">
        {children}
      </main>

      <LogoutConfirmModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={logOut}
      />
    </div>
  );
}
