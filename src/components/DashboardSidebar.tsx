"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronLeft, ChevronRight } from "lucide-react";

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isDanger?: boolean;
  position?: "top" | "bottom";
}

interface DashboardSidebarProps {
  items: NavItem[];
  userRoleLabel?: string;
}

export default function DashboardSidebar({
  items,
  userRoleLabel = "Landlord Dashboard",
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const topItems = items.filter((item) => item.position !== "bottom");
  const bottomItems = items.filter((item) => item.position === "bottom");

  const renderItem = (item: NavItem, index: number) => {
    const Icon = item.icon;
    const isActive = item.href
      ? pathname === item.href ||
        (item.href !== "/dashboard/landlord" && pathname.startsWith(item.href))
      : false;

    const baseClasses = `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
      isCollapsed ? "justify-center px-0" : ""
    }`;

    const activeClasses = isActive
      ? "border border-purple-500/60 bg-[#191124] text-purple-300 font-medium shadow-sm"
      : item.isDanger
        ? "text-red-500 hover:bg-red-950/20"
        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200";

    if (item.href) {
      return (
        <Link
          key={index}
          href={item.href}
          className={`${baseClasses} ${activeClasses}`}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>{item.label}</span>}
        </Link>
      );
    }

    return (
      <button
        key={index}
        onClick={item.onClick}
        className={`w-full ${baseClasses} ${activeClasses}`}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-zinc-900 bg-black transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-60"
      }`}
    >
      {/* Header / Brand */}
      <div className="flex h-20 shrink-0 items-center justify-between px-4 pt-2">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
            <Home className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-white">
                Abangers
              </span>
              <span className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase">
                {userRoleLabel}
              </span>
            </div>
          )}
        </Link>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-1 flex-col justify-between p-3.5">
        <div className="space-y-2">
          {topItems.map((item, index) => renderItem(item, index))}
        </div>

        {bottomItems.length > 0 && (
          <div className="space-y-1.5 pb-2">
            {bottomItems.map((item, index) =>
              renderItem(item, index + topItems.length),
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
