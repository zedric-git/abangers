"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  MessageSquare,
  Heart,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
  CheckSquare,
  Square,
  Bell,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export interface RenterNotificationItem {
  id: string;
  category: "viewing" | "message" | "saved" | "system";
  title: string;
  description: string;
  time: string;
  unread: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const initialNotifications: RenterNotificationItem[] = [
  {
    id: "NOTIF-R1",
    category: "viewing",
    title: "Viewing Visit Confirmed!",
    description:
      "Landlord Rodrigo D. Alonzo confirmed your viewing appointment for Sampaloc Scholar Suites on Oct 23 at 2:00 PM.",
    time: "15 mins ago",
    unread: true,
    actionUrl: "/dashboard/renter",
    actionLabel: "View Details",
  },
  {
    id: "NOTIF-R2",
    category: "message",
    title: "New Message from Landlord",
    description:
      "Teresa Ramos Castro replied: 'Hello! Yes, high-speed 300Mbps fiber Wi-Fi is included in all studio units.'",
    time: "2 hours ago",
    unread: true,
    actionUrl: "/dashboard/renter",
    actionLabel: "Reply to Chat",
  },
  {
    id: "NOTIF-R3",
    category: "saved",
    title: "Price Drop on Saved Boarding House",
    description:
      "Sampaloc Scholar Suites reduced monthly rent from ₱4,500 to ₱4,200 for Bedspace Room 204.",
    time: "1 day ago",
    unread: false,
    actionUrl: "/dashboard/renter/favorites",
    actionLabel: "View Favorite",
  },
  {
    id: "NOTIF-R4",
    category: "system",
    title: "Student Verification Status",
    description:
      "Your uploaded student ID (UST BS Nursing) was successfully verified. You now enjoy fast-track viewing approvals!",
    time: "3 days ago",
    unread: false,
    actionUrl: "/dashboard/renter/profile",
    actionLabel: "View Profile",
  },
];

export default function RenterNotificationsView() {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<RenterNotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<
    "all" | "viewing" | "message" | "saved" | "system"
  >("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filtered = notifications.filter(
    (n) => filter === "all" || n.category === filter,
  );

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Mark selected as read
  const handleMarkSelectedAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.includes(n.id) ? { ...n, unread: false } : n,
      ),
    );
    setSelectedIds([]);
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
    setSelectedIds([]);
  };

  // Clear/delete selected notifications
  const handleClearSelected = () => {
    setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
    setSelectedIds([]);
  };

  // Toggle selection for a single item
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Toggle select all filtered items
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((n) => n.id));
    }
  };

  // Notification click: marks as read and redirects
  const handleNotificationClick = (item: RenterNotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)),
    );
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const getCategoryIcon = (category: RenterNotificationItem["category"]) => {
    switch (category) {
      case "viewing":
        return <CalendarCheck className="h-5 w-5" />;
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "saved":
        return <Heart className="h-5 w-5" />;
      case "system":
        return <ShieldCheck className="h-5 w-5" />;
    }
  };

  const getCategoryStyle = (category: RenterNotificationItem["category"]) => {
    switch (category) {
      case "viewing":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
      case "message":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
      case "saved":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
      case "system":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 dark:text-zinc-500">Renter</span>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Notifications
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Notifications & Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                {unreadCount} Unread
              </span>
            )}
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/40 px-3 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-100/60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "All Notifications" },
          { id: "viewing", label: "Viewing Requests" },
          { id: "message", label: "Messages" },
          { id: "saved", label: "Saved Properties" },
          { id: "system", label: "System Alerts" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id as typeof filter);
              setSelectedIds([]);
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filter === f.id
                ? "bg-purple-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Selection Toolbar (Shown when items are selected or available) */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-700 hover:text-purple-600 dark:text-zinc-300"
            >
              {selectedIds.length === filtered.length && filtered.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-purple-600" />
              ) : (
                <Square className="h-4 w-4 text-zinc-400" />
              )}
              <span>Select all ({filtered.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                • {selectedIds.length} selected
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkSelectedAsRead}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Read selected
              </button>
              <button
                type="button"
                onClick={handleClearSelected}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-medium text-rose-600 shadow-2xs hover:bg-rose-50 dark:border-rose-900/40 dark:bg-zinc-800 dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete selected
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notifications List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4.5 transition-all sm:flex-row sm:items-center sm:justify-between ${
                  isSelected
                    ? "border-purple-500 bg-purple-50/30 dark:border-purple-600 dark:bg-purple-950/25"
                    : item.unread
                      ? "border-purple-200 bg-purple-50/20 hover:border-purple-300 dark:border-purple-900/40 dark:bg-purple-950/15 dark:hover:border-purple-800"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Select Checkbox */}
                  <div
                    onClick={(e) => toggleSelect(item.id, e)}
                    className="mt-1 flex shrink-0 cursor-pointer items-center justify-center text-zinc-400 hover:text-purple-600"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-purple-600" />
                    ) : (
                      <Square className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getCategoryStyle(
                      item.category,
                    )}`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {item.title}
                      </h3>
                      {item.unread && (
                        <span className="h-2 w-2 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </div>
                  </div>
                </div>

                {/* Action Link & Arrow */}
                {item.actionUrl && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors group-hover:bg-purple-700">
                      {item.actionLabel || "View"}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No notifications found
          </h3>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {filter === "all"
              ? "You're all caught up! New updates will appear here."
              : "No notifications in this filter category."}
          </p>
          {notifications.length === 0 && (
            <button
              type="button"
              onClick={() => setNotifications(initialNotifications)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-purple-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-purple-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Reset demo notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
