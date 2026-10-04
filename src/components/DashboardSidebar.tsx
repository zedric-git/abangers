"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = isMounted ? resolvedTheme === "dark" : true;
  const ThemeIcon = isDark ? Sun : Moon;
  const themeTooltip = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

  // Auto-close mobile drawer on route changes (React recommended pattern for state adjustment based on prop/pathname)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => setIsMobileOpen(false);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Lock body scroll and handle Escape key while mobile drawer is open
  useEffect(() => {
    if (!isMobileOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobileOpen]);

  const topItems = items.filter((item) => item.position !== "bottom");
  const bottomItems = items.filter((item) => item.position === "bottom");
  const bottomNavItems = bottomItems.filter((item) => !item.isDanger);
  const dangerBottomItems = bottomItems.filter((item) => item.isDanger);

  // Dynamically identify the single active page
  const activeHref = (() => {
    const itemsWithHref = items.filter(
      (item): item is NavItem & { href: string } => Boolean(item.href),
    );

    const normalizedCurrent = pathname.replace(/\/+$/, "") || "/";

    // 1. Exact match takes precedence
    const exactMatch = itemsWithHref.find((item) => {
      const normalizedHref = item.href.replace(/\/+$/, "") || "/";
      return normalizedHref === normalizedCurrent;
    });
    if (exactMatch) return exactMatch.href;

    // 2. Longest prefix match for nested routes
    const prefixMatches = itemsWithHref
      .filter((item) => {
        const normalizedHref = item.href.replace(/\/+$/, "");
        return (
          normalizedHref !== "" &&
          normalizedCurrent.startsWith(normalizedHref + "/")
        );
      })
      .sort((a, b) => b.href.length - a.href.length);

    if (prefixMatches.length > 0) {
      return prefixMatches[0].href;
    }

    return null;
  })();

  const renderItem = (
    item: NavItem,
    index: number,
    collapsed: boolean,
    onSelect?: () => void,
  ) => {
    const Icon = item.icon;
    const isActive =
      typeof item.isActive === "boolean"
        ? item.isActive
        : item.href
          ? item.href === activeHref
          : false;

    const baseClasses = `flex items-center gap-3 text-sm font-medium transition-all duration-150 rounded-xl ${
      collapsed ? "justify-center p-0 w-11 h-11 mx-auto" : "px-3.5 py-3 w-full"
    }`;

    const activeClasses = isActive
      ? "bg-white text-[#6C5CE7] font-bold shadow-xs dark:bg-purple-600 dark:text-white dark:shadow-sm"
      : item.isDanger
        ? "text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
        : "text-white/80 hover:bg-white/10 hover:text-white";

    const content = (
      <>
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </>
    );

    const handleClick = () => {
      if (item.onClick) item.onClick();
      if (onSelect) onSelect();
    };

    if (item.href) {
      return (
        <Link
          key={item.href || index}
          href={item.href}
          onClick={() => {
            if (onSelect) onSelect();
          }}
          className={`${baseClasses} ${activeClasses}`}
          title={collapsed ? item.label : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.label || index}
        type="button"
        onClick={handleClick}
        className={`${baseClasses} ${activeClasses}`}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </button>
    );
  };

  const renderThemeToggle = (collapsed: boolean) => {
    const baseClasses = `flex items-center gap-3 text-sm font-medium transition-all duration-150 rounded-xl ${
      collapsed ? "justify-center p-0 w-11 h-11 mx-auto" : "px-3.5 py-3 w-full"
    }`;

    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`${baseClasses} text-white/80 hover:bg-white/10 hover:text-white`}
        title={collapsed ? themeTooltip : undefined}
        aria-label={themeTooltip}
      >
        <ThemeIcon className="h-5 w-5 shrink-0 text-amber-300 transition-transform duration-300" />
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between">
            <span>Theme</span>
            <span className="rounded-md border border-white/20 bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
              {isDark ? "Dark" : "Light"}
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-purple-800/20 bg-[#6C5CE7] px-4 text-white md:hidden dark:border-white/10 dark:bg-[#1E1736]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Open navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#6C5CE7] shadow-sm">
              <Home className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-extrabold tracking-tight text-white">
                Abangers
              </span>
              <span className="text-[9px] font-bold tracking-wider text-white/70 uppercase">
                {userRoleLabel}
              </span>
            </div>
          </Link>
        </div>

        {/* Quick mobile theme toggle on header right */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          aria-label={themeTooltip}
          title={themeTooltip}
        >
          <ThemeIcon className="h-4.5 w-4.5 text-amber-300" />
        </button>
      </header>

      {/* Mobile Backdrop & Slide-Over Drawer */}
      <div
        id="mobile-navigation-drawer"
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 md:hidden ${
          isMobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Backdrop Overlay */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer Sidebar */}
        <aside
          className={`relative flex h-full w-72 flex-col bg-[#6C5CE7] text-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-[#1E1736] ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-4">
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#6C5CE7] shadow-sm">
                <Home className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-extrabold tracking-tight text-white">
                  Abangers
                </span>
                <span className="text-[9px] font-bold tracking-wider text-white/70 uppercase">
                  {userRoleLabel}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Navigation Items */}
          <nav className="custom-scrollbar flex flex-1 flex-col overflow-y-auto px-3.5 py-4">
            <div className="space-y-1.5">
              {topItems.map((item, index) =>
                renderItem(item, index, false, () => setIsMobileOpen(false)),
              )}
            </div>

            <div className="mt-auto shrink-0 space-y-1.5 border-t border-white/15 pt-3">
              {bottomNavItems.map((item, index) =>
                renderItem(item, index + topItems.length, false, () =>
                  setIsMobileOpen(false),
                ),
              )}

              {renderThemeToggle(false)}

              {dangerBottomItems.map((item, index) =>
                renderItem(
                  item,
                  index + topItems.length + bottomNavItems.length + 1,
                  false,
                  () => setIsMobileOpen(false),
                ),
              )}
            </div>
          </nav>
        </aside>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`relative hidden h-full shrink-0 flex-col border-r border-purple-800/30 bg-[#6C5CE7] text-white transition-all duration-300 md:flex dark:border-white/10 dark:bg-[#1E1736] ${
          isCollapsed ? "w-20" : "w-60"
        }`}
      >
        {/* Header / Brand */}
        {isCollapsed ? (
          <div className="flex shrink-0 flex-col items-center gap-2.5 px-2 pt-4 pb-2">
            <Link
              href="/"
              className="flex items-center justify-center transition-opacity hover:opacity-90"
              title="Abangers"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6C5CE7] shadow-sm">
                <Home className="h-5 w-5" />
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 shrink-0 items-center justify-between px-4 pt-2">
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6C5CE7] shadow-sm">
                <Home className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-extrabold tracking-tight text-white">
                  Abangers
                </span>
                <span className="text-[9px] font-bold tracking-wider text-white/70 uppercase">
                  {userRoleLabel}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Navigation Items with auto-scroll */}
        <nav className="custom-scrollbar flex flex-1 flex-col overflow-y-auto px-3.5 py-3.5">
          <div className="space-y-1.5">
            {topItems.map((item, index) =>
              renderItem(item, index, isCollapsed),
            )}
          </div>

          <div className="mt-auto shrink-0 space-y-1.5 border-t border-white/15 pt-3">
            {bottomNavItems.map((item, index) =>
              renderItem(item, index + topItems.length, isCollapsed),
            )}

            {renderThemeToggle(isCollapsed)}

            {dangerBottomItems.map((item, index) =>
              renderItem(
                item,
                index + topItems.length + bottomNavItems.length + 1,
                isCollapsed,
              ),
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
