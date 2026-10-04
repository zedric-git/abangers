"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isDanger?: boolean;
  position?: "top" | "bottom";
  isActive?: boolean;
}

interface DashboardSidebarProps {
  items: NavItem[];
  userRoleLabel?: string;
}

const emptySubscribe = () => () => {};

export default function DashboardSidebar({
  items,
  userRoleLabel = "Landlord Dashboard",
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = isMounted ? resolvedTheme === "dark" : true;
  const ThemeIcon = isDark ? Sun : Moon;
  const themeLabel = isDark ? "Light Mode" : "Dark Mode";

  const topItems = items.filter((item) => item.position !== "bottom");
  const bottomItems = items.filter((item) => item.position === "bottom");
  const bottomNavItems = bottomItems.filter((item) => !item.isDanger);
  const dangerBottomItems = bottomItems.filter((item) => item.isDanger);

  // Dynamically identify the single active page
  const activeHref = (() => {
    const itemsWithHref = items.filter(
      (item): item is NavItem & { href: string } => Boolean(item.href),
    );

    // 1. Exact match takes precedence
    const exactMatch = itemsWithHref.find((item) => item.href === pathname);
    if (exactMatch) return exactMatch.href;

    // 2. Longest prefix match for nested routes (e.g. /dashboard/landlord/listings/new)
    const prefixMatches = itemsWithHref
      .filter((item) => pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);

    if (prefixMatches.length > 0) {
      return prefixMatches[0].href;
    }

    return null;
  })();

  const renderItem = (item: NavItem, index: number) => {
    const Icon = item.icon;
    const isActive =
      typeof item.isActive === "boolean"
        ? item.isActive
        : item.href
          ? item.href === activeHref
          : false;

    const baseClasses = `flex items-center gap-3 py-3 text-sm font-medium transition-colors ${
      isCollapsed ? "justify-center px-0" : "px-4"
    }`;

    const activeClasses = isActive
      ? "relative z-20 w-[calc(100%+0.875rem+1px)] -mr-[calc(0.875rem+1px)] rounded-l-2xl bg-white text-[#6C5CE7] font-bold duration-300 dark:bg-black dark:text-[#A78BFA]"
      : `w-full rounded-xl duration-150 ${
          item.isDanger
            ? "text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`;

    const content = (
      <>
        {isActive && (
          <>
            {/* Top concave transition curve */}
            <svg
              className="pointer-events-none absolute -top-[19px] right-0 h-5 w-5 fill-white transition-colors duration-300 dark:fill-black"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M 20 0 A 20 20 0 0 1 0 20 H 20 Z" />
            </svg>

            {/* Bottom concave transition curve */}
            <svg
              className="pointer-events-none absolute right-0 -bottom-[19px] h-5 w-5 fill-white transition-colors duration-300 dark:fill-black"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M 0 0 A 20 20 0 0 1 20 20 V 0 Z" />
            </svg>
          </>
        )}
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </>
    );

    if (item.href) {
      return (
        <Link
          key={index}
          href={item.href}
          className={`${baseClasses} ${activeClasses}`}
          title={isCollapsed ? item.label : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={index}
        onClick={item.onClick}
        className={`${baseClasses} ${activeClasses}`}
        title={isCollapsed ? item.label : undefined}
      >
        {content}
      </button>
    );
  };

  const renderThemeToggle = () => {
    const baseClasses = `flex items-center gap-3 py-3 text-sm font-medium transition-colors duration-150 ${
      isCollapsed ? "justify-center px-0" : "px-4"
    }`;

    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`w-full ${baseClasses} rounded-xl text-white/80 hover:bg-white/10 hover:text-white`}
        title={isCollapsed ? themeLabel : undefined}
        aria-label={`Switch to ${themeLabel}`}
      >
        <ThemeIcon className="h-5 w-5 shrink-0 text-amber-300 transition-transform duration-300" />
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-between">
            <span>{themeLabel}</span>
            <span className="rounded-md border border-white/20 bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
              {isDark ? "Dark" : "Light"}
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col bg-[#6C5CE7] text-white transition-all duration-300 dark:bg-[#1E1736] ${
        isCollapsed ? "w-20" : "w-60"
      }`}
    >
      {/* Header / Brand */}
      <div className="flex h-20 shrink-0 items-center justify-between px-4 pt-2">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6C5CE7] shadow-sm">
            <Home className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-base font-extrabold tracking-tight text-white">
                Abangers
              </span>
              <span className="text-[9px] font-bold tracking-wider text-white/70 uppercase">
                {userRoleLabel}
              </span>
            </div>
          )}
        </Link>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
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
      <nav className="flex flex-1 flex-col justify-between px-3.5 py-3.5">
        <div className="space-y-2">
          {topItems.map((item, index) => renderItem(item, index))}
        </div>

        <div className="space-y-1.5 pb-2">
          {bottomNavItems.map((item, index) =>
            renderItem(item, index + topItems.length),
          )}

          {/* Theme Toggle Button placed directly between Profile and Log Out */}
          {renderThemeToggle()}

          {dangerBottomItems.map((item, index) =>
            renderItem(
              item,
              index + topItems.length + bottomNavItems.length + 1,
            ),
          )}
        </div>
      </nav>
    </aside>
  );
}
