"use client";

import { useState } from "react";
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  canMarkCompleted,
  canTransitionViewingStatus,
  type ViewingStatus,
} from "@/lib/viewing-status";

export interface ViewingRequest {
  id: string;
  renterName: string;
  renterAvatar: string;
  avatarColor: string;
  renterRole: string;
  renterPhone: string;
  renterEmail: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  roomLabel: string;
  monthlyRent: number;
  requestedDate: string;
  requestedTime: string;
  status: ViewingStatus;
  submittedAt: string;
  notes: string;
}

const initialRequests: ViewingRequest[] = [
  {
    id: "VR-101",
    renterName: "Maria Clara Santos",
    renterAvatar: "MS",
    avatarColor: "bg-purple-600",
    renterRole: "3rd Year BS Nursing • UST",
    renterPhone: "+63 917 842 1109",
    renterEmail: "mariaclara.santos@ust.edu.ph",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    propertyAddress: "842 España Blvd, Sampaloc, Manila",
    roomLabel: "Room 204 • Female Bedspace",
    monthlyRent: 4200,
    requestedDate: "Oct 20, 2026 (Tuesday)",
    requestedTime: "2:00 PM – 2:30 PM",
    status: "pending",
    submittedAt: "25 mins ago",
    notes:
      "Hi po! Looking for a quiet study-friendly room near UST Hospital. My mother will join me during the viewing.",
  },
  {
    id: "VR-102",
    renterName: "Joshua Dela Cruz",
    renterAvatar: "JD",
    avatarColor: "bg-blue-600",
    renterRole: "Software Engineer • BGC / Hybrid",
    renterPhone: "+63 918 339 4021",
    renterEmail: "joshua.dc@gmail.com",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    propertyAddress: "123 Katipunan Ave, Loyola Heights, QC",
    roomLabel: "Unit 3B • Solo Studio",
    monthlyRent: 8500,
    requestedDate: "Oct 21, 2026 (Wednesday)",
    requestedTime: "10:30 AM – 11:00 AM",
    status: "pending",
    submittedAt: "2 hours ago",
    notes:
      "Would like to check fiber internet speed and parking space availability for a motorcycle.",
  },
  {
    id: "VR-103",
    renterName: "Angela Mae Villanueva",
    renterAvatar: "AV",
    avatarColor: "bg-emerald-600",
    renterRole: "BS Architecture • UP Diliman",
    renterPhone: "+63 995 214 8832",
    renterEmail: "amvillanueva@up.edu.ph",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    propertyAddress: "123 Katipunan Ave, Loyola Heights, QC",
    roomLabel: "Unit 1A • Shared Twin Room",
    monthlyRent: 5000,
    requestedDate: "Oct 22, 2026 (Thursday)",
    requestedTime: "4:00 PM – 4:30 PM",
    status: "pending",
    submittedAt: "5 hours ago",
    notes: "Checking if drafting table can fit inside the room.",
  },
  {
    id: "VR-104",
    renterName: "Rafael Gabriel Tan",
    renterAvatar: "RT",
    avatarColor: "bg-indigo-600",
    renterRole: "Accountancy Intern • SGV",
    renterPhone: "+63 920 551 2290",
    renterEmail: "rafael.tan@outlook.com",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    propertyAddress: "842 España Blvd, Sampaloc, Manila",
    roomLabel: "Room 302 • Solo Room",
    monthlyRent: 6500,
    requestedDate: "Oct 19, 2026 (Monday)",
    requestedTime: "1:00 PM – 1:30 PM",
    status: "confirmed",
    submittedAt: "Yesterday",
    notes:
      "Scheduled physical viewing. Contacted security lobby for visitor pass.",
  },
  {
    id: "VR-105",
    renterName: "Bea Lorraine Mendoza",
    renterAvatar: "BM",
    avatarColor: "bg-pink-600",
    renterRole: "Medical Intern • FEU-NRMF",
    renterPhone: "+63 927 618 9043",
    renterEmail: "bea.mendoza@feu.edu.ph",
    propertyId: "PROP-3",
    propertyTitle: "Morayta Courtyard Dorm",
    propertyAddress: "455 Morayta St, Sampaloc, Manila",
    roomLabel: "Upper Bed 4 • 4-Pax Dorm",
    monthlyRent: 3800,
    requestedDate: "Oct 19, 2026 (Monday)",
    requestedTime: "3:30 PM – 4:00 PM",
    status: "confirmed",
    submittedAt: "2 days ago",
    notes: "Confirmed slot. Ready for room inspection.",
  },
  {
    id: "VR-106",
    renterName: "Christian Paul Ramos",
    renterAvatar: "CR",
    avatarColor: "bg-zinc-600",
    renterRole: "Civil Engineering Grad • CIT-U",
    renterPhone: "+63 939 123 7765",
    renterEmail: "cpaul.ramos@gmail.com",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    propertyAddress: "842 España Blvd, Sampaloc, Manila",
    roomLabel: "Room 105 • Solo Room",
    monthlyRent: 7000,
    requestedDate: "Oct 15, 2026",
    requestedTime: "11:00 AM",
    status: "completed",
    submittedAt: "Last week",
    notes: "Completed viewing successfully and signed tenancy agreement.",
  },
];

const VIEWING_TABS = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
] as const;

type ViewingTab = (typeof VIEWING_TABS)[number]["value"];

export default function LandlordViewingRequestsView() {
  const [requests, setRequests] = useState<ViewingRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<ViewingTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [completingRequest, setCompletingRequest] =
    useState<ViewingRequest | null>(null);

  const tabCounts: Record<ViewingTab, number> = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    confirmed: requests.filter((r) => r.status === "confirmed").length,
    completed: requests.filter((r) => r.status === "completed").length,
    declined: requests.filter((r) => r.status === "declined").length,
  };

  const currentTabObj =
    VIEWING_TABS.find((t) => t.value === activeTab) ?? VIEWING_TABS[0];

  const handleUpdateStatus = (id: string, newStatus: ViewingStatus) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (!canTransitionViewingStatus(r.status, newStatus)) return r;
        return { ...r, status: newStatus };
      }),
    );
  };

  const handleConfirmCompleted = () => {
    if (!completingRequest) return;
    handleUpdateStatus(completingRequest.id, "completed");
    setCompletingRequest(null);
  };

  const filtered = requests.filter((r) => {
    const matchesTab = activeTab === "all" ? true : r.status === activeTab;
    const matchesProp =
      propertyFilter === "all" || r.propertyId === propertyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.renterName.toLowerCase().includes(q) ||
      r.propertyTitle.toLowerCase().includes(q) ||
      r.roomLabel.toLowerCase().includes(q);
    return matchesTab && matchesProp && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 dark:text-zinc-500">Landlord</span>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Viewing Requests
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Viewing Requests
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"></span>
              {tabCounts.pending} Pending
            </span>
          </div>
        </div>
      </div>

      {/* FILTER BY STATUS / METRIC & Search (Exact Match to LandlordListingsView format) */}
      <div className="space-y-3">
        {/* Header & Viewing indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            FILTER BY STATUS / METRIC
          </span>
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            Viewing: {currentTabObj.label} ({tabCounts[activeTab]})
          </span>
        </div>

        {/* 5 Pill Buttons spanning grid width */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {VIEWING_TABS.map((tab) => {
            const isSelected = activeTab === tab.value;
            const count = tabCounts[tab.value];

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex h-11 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-xs"
                    : "border-2 border-purple-500/30 bg-white text-purple-700 hover:border-purple-500/50 hover:bg-purple-50/50 dark:border-purple-500/30 dark:bg-zinc-900 dark:text-purple-300 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold transition-all ${
                    isSelected
                      ? "bg-white text-purple-700 shadow-2xs"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Property Filter Bar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by renter name, property title, or unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-purple-400"
            />
          </div>

          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-medium text-zinc-700 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus-visible:ring-purple-400"
          >
            <option value="all">All Properties</option>
            <option value="PROP-1">Sampaloc Scholar Suites</option>
            <option value="PROP-2">Katipunan Prime Studio</option>
            <option value="PROP-3">Morayta Courtyard Dorm</option>
          </select>
        </div>
      </div>

      {/* Main Viewing Requests List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              No viewing requests found
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {searchQuery
                ? "No appointments match your search criteria."
                : `There are currently no ${activeTab === "all" ? "" : activeTab} viewing requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all hover:border-purple-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Renter & Property Details */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${req.avatarColor}`}
                    >
                      {req.renterAvatar}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                          {req.renterName}
                        </h3>
                        <span className="text-xs text-zinc-400">
                          • {req.renterRole}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-purple-500" />
                          {req.propertyTitle} ({req.roomLabel})
                        </span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          ₱{req.monthlyRent.toLocaleString()} / mo
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {req.requestedDate} • {req.requestedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions and Status */}
                  <div className="flex items-center gap-2.5 self-end lg:self-center">
                    {req.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(req.id, "confirmed")
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Confirm Slot
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, "declined")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-500" />
                          Decline
                        </button>
                      </>
                    )}

                    {req.status === "confirmed" && (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                          Confirmed
                        </span>
                        {canMarkCompleted(req.status) && (
                          <button
                            type="button"
                            onClick={() => setCompletingRequest(req)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:text-purple-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Mark Completed
                          </button>
                        )}
                      </>
                    )}

                    {req.status === "completed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed
                      </span>
                    )}

                    {req.status === "declined" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <XCircle className="h-3.5 w-3.5" />
                        Declined
                      </span>
                    )}
                  </div>
                </div>

                {req.notes && (
                  <div className="mt-3.5 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      Renter Note:
                    </strong>{" "}
                    &ldquo;{req.notes}&rdquo;
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Completed Modal (#122: Confirmation step to prevent misclicks) */}
      {completingRequest && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Mark Viewing as Completed?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Confirm that the property tour with{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {completingRequest.renterName}
                  </strong>{" "}
                  for{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {completingRequest.propertyTitle}
                  </strong>{" "}
                  has concluded. Completed appointments cannot be reverted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCompletingRequest(null)}
                className="h-9 rounded-xl px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleted}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Yes, Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
