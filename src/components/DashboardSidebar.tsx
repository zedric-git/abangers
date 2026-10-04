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

  // Auto-close mobile drawer on route changes
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

  // Render items inside the mobile slide-over drawer (clean inset capsule style)
  const renderMobileItem = (
    item: NavItem,
    index: number,
    onSelect?: () => void,
  ) => {
    const Icon = item.icon;
    const isActive =
      typeof item.isActive === "boolean"
        ? item.isActive
        : item.href
          ? item.href === activeHref
          : false;

    const baseClasses =
      "flex items-center gap-3 w-full px-3.5 py-3 text-sm font-medium transition-colors duration-150 rounded-xl";

    const activeClasses = isActive
      ? "bg-white text-[#6C5CE7] font-bold shadow-xs dark:bg-purple-600 dark:text-white dark:shadow-sm"
      : item.isDanger
        ? "text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
        : "text-white/80 hover:bg-white/10 hover:text-white";

    const content = (
      <>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.label}</span>
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
      >
        {content}
      </button>
    );
  };

  const renderMobileThemeToggle = () => (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
      aria-label={themeTooltip}
    >
      <ThemeIcon className="h-5 w-5 shrink-0 text-amber-300 transition-transform duration-300" />
      <div className="flex flex-1 items-center justify-between">
        <span>Theme</span>
        <span className="rounded-md border border-white/20 bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
          {isDark ? "Dark" : "Light"}
        </span>
      </div>
    </button>
  );

  // Render items on desktop sidebar (seamless active tab merging into main content)
  const renderDesktopItem = (
    item: NavItem,
    index: number,
    collapsed: boolean,
  ) => {
    const Icon = item.icon;
    const isActive =
      typeof item.isActive === "boolean"
        ? item.isActive
        : item.href
          ? item.href === activeHref
          : false;

    // Seamless active tab merging cleanly into the main content
    if (isActive) {
      const activeClasses = collapsed
        ? "relative z-20 flex h-11 w-[calc(100%+2px)] -mr-[2px] items-center pl-4 text-[#6C5CE7] font-bold dark:text-[#A78BFA]"
        : "relative z-20 flex h-11 w-[calc(100%+2px)] -mr-[2px] items-center gap-3 pl-4 pr-3 text-sm font-bold text-[#6C5CE7] dark:text-[#A78BFA]";

      const content = (
        <>
          {/*
            Active tab background, drawn as one SVG so every piece shares a
            single fill color (and a single theme transition).

            The SVG is `w-full`, so it follows the link's width while the
            sidebar animates between collapsed and expanded. There is no
            viewBox: 1 SVG unit = 1 CSS pixel, and shapes are positioned with
            percentages instead of a hard-coded width.

            Vertical layout (84px tall, link sits in the middle 44px):
              y 0–20   top concave curve
              y 20–64  tab body (same height as the h-11 link)
              y 64–84  bottom concave curve
          */}
          <svg
            className="pointer-events-none absolute -top-5 right-0 h-[84px] w-full fill-white transition-colors duration-300 dark:fill-black"
            aria-hidden="true"
          >
            {/* Tab body, rounded on the left */}
            <rect y="20" width="100%" height="44" rx="16" />
            {/* Squares off the right-hand corners so the body meets main flush */}
            <rect x="50%" y="20" width="50%" height="44" />
            {/*
              Concave curves, anchored to the right edge: this nested SVG's
              origin sits at x = 100%, so the paths draw leftwards using
              negative x. To hide subpixel seams, each curve reaches 2px into
              the tab body (V 22 / V 62) instead of stopping exactly at its
              edge, and includes a 2px strip at the right edge that overlaps
              main (the link is 2px wider than the nav, see -mr-[2px]).
            */}
            <svg x="100%" overflow="visible">
              <path d="M 0 0 H -2 A 20 20 0 0 1 -22 20 V 22 H 0 Z" />
              <path d="M 0 84 H -2 A 20 20 0 0 0 -22 64 V 62 H 0 Z" />
            </svg>
          </svg>

          <Icon className="relative z-10 h-5 w-5 shrink-0" />
          {!collapsed && (
            <span className="relative z-10 truncate">{item.label}</span>
          )}
        </>
      );

      if (item.href) {
        return (
          <Link
            key={item.href || index}
            href={item.href}
            className={activeClasses}
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
          onClick={item.onClick}
          className={activeClasses}
          title={collapsed ? item.label : undefined}
        >
          {content}
        </button>
      );
    }

    // Inactive desktop items: inset with mr-5 so hover rectangles do not collide with curves
    const inactiveClasses = collapsed
      ? `flex h-10 w-10 mr-5 ml-auto items-center justify-center rounded-xl transition-colors duration-150 ${
          item.isDanger
            ? "text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`
      : `flex items-center gap-3 mr-5 px-4 py-3 text-sm font-medium rounded-xl transition-colors duration-150 ${
          item.isDanger
            ? "text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`;

    const content = (
      <>
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </>
    );

    if (item.href) {
      return (
        <Link
          key={item.href || index}
          href={item.href}
          className={inactiveClasses}
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
        onClick={item.onClick}
        className={inactiveClasses}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </button>
    );
  };

  const renderDesktopThemeToggle = (collapsed: boolean) => {
    if (collapsed) {
      return (
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="mr-5 ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          title={themeTooltip}
          aria-label={themeTooltip}
        >
          <ThemeIcon className="h-5 w-5 shrink-0 text-amber-300 transition-transform duration-300" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="mr-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
        title={themeTooltip}
        aria-label={themeTooltip}
      >
        <ThemeIcon className="h-5 w-5 shrink-0 text-amber-300 transition-transform duration-300" />
        <div className="flex flex-1 items-center justify-between">
          <span>Theme</span>
          <span className="rounded-md border border-white/20 bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase">
            {isDark ? "Dark" : "Light"}
          </span>
        </div>
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
                renderMobileItem(item, index, () => setIsMobileOpen(false)),
              )}
            </div>

            <div className="mt-auto shrink-0 space-y-1.5 border-t border-white/15 pt-3">
              {bottomNavItems.map((item, index) =>
                renderMobileItem(item, index + topItems.length, () =>
                  setIsMobileOpen(false),
                ),
              )}

              {renderMobileThemeToggle()}

              {dangerBottomItems.map((item, index) =>
                renderMobileItem(
                  item,
                  index + topItems.length + bottomNavItems.length + 1,
                  () => setIsMobileOpen(false),
                ),
              )}
            </div>
          </nav>
        </aside>
      </div>

      {/* Desktop Persistent Sidebar with Seamless Active Tab */}
      <aside
        className={`relative hidden h-full shrink-0 flex-col bg-[#6C5CE7] text-white transition-all duration-300 md:flex dark:bg-[#1E1736] ${
          isCollapsed ? "w-20" : "w-60"
        }`}
      >
        {/*
          Header / Brand. Collapsed, the sidebar is only 80px wide, so the
          logo (36px) and a smaller chevron (24px) sit centered with a 4px
          gap (64px total) instead of the expanded layout's px-4 spacing.
        */}
        <div
          className={`flex h-20 shrink-0 items-center pt-2 ${
            isCollapsed ? "justify-center gap-1 px-2" : "justify-between px-4"
          }`}
        >
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 overflow-hidden"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6C5CE7] shadow-sm">
              <Home className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              // nowrap: while the sidebar is still widening, clip the text instead of wrapping it
              <div className="flex flex-col leading-tight whitespace-nowrap">
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
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white ${
              isCollapsed ? "h-6 w-6" : "h-8 w-8"
            }`}
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

        {/* Navigation Items: right boundary flush to edge so active tab seamlessly merges into main */}
        <nav className="flex flex-1 flex-col justify-between pt-5 pr-0 pb-5 pl-3.5">
          <div className="space-y-1.5">
            {topItems.map((item, index) =>
              renderDesktopItem(item, index, isCollapsed),
            )}
          </div>

          <div className="mt-auto shrink-0 space-y-1.5 pt-3">
            <div
              className={`border-t border-white/15 pb-1.5 ${
                isCollapsed ? "mr-5 ml-auto w-10" : "mr-5"
              }`}
            />

            {bottomNavItems.map((item, index) =>
              renderDesktopItem(item, index + topItems.length, isCollapsed),
            )}

            {renderDesktopThemeToggle(isCollapsed)}

            {dangerBottomItems.map((item, index) =>
              renderDesktopItem(
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
