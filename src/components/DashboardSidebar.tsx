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

  return (
    <aside
      className={`relative flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900 ${
        isCollapsed ? "w-20" : "w-64"
      } min-h-screen`}
    >
      {/* Header & Collapse Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-800/80">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white dark:bg-purple-600">
            <Home className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-purple-950 dark:text-zinc-50">
                BoardingHub
              </span>
              <span className="text-[10px] font-medium text-zinc-400">
                {userRoleLabel}
              </span>
            </div>
          )}
        </Link>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
      <nav className="flex flex-1 flex-col justify-between space-y-1 p-3">
        <div className="space-y-1">
          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.href
              ? pathname === item.href ||
                (item.href !== "/dashboard/landlord" &&
                  pathname.startsWith(item.href))
              : false;

            const baseClasses = `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
              isCollapsed ? "justify-center px-0" : ""
            }`;

            const activeClasses = isActive
              ? "bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/50 dark:text-purple-300 border-r-4 border-purple-700 dark:border-purple-500"
              : item.isDanger
                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

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
          })}
        </div>
      </nav>
    </aside>
  );
}
