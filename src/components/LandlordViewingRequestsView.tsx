"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Settings,
  Calendar,
  Sparkles,
} from "lucide-react";

interface ViewingRequest {
  id: string;
  renterName: string;
  renterAvatar: string;
  avatarColor: string;
  renterRole: string;
  renterPhone: string;
  renterEmail: string;
  verifiedRenter: boolean;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  roomLabel: string;
  monthlyRent: number;
  requestedDate: string;
  requestedTime: string;
  status: "pending" | "confirmed" | "completed" | "declined";
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
    verifiedRenter: true,
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
    verifiedRenter: true,
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
    verifiedRenter: false,
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
    renterName: "Kevin Tan",
    renterAvatar: "KT",
    avatarColor: "bg-amber-600",
    renterRole: "CPA Reviewee • CPAR",
    renterPhone: "+63 927 551 0923",
    renterEmail: "kevintan.cpa@yahoo.com",
    verifiedRenter: true,
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    propertyAddress: "842 España Blvd, Sampaloc, Manila",
    roomLabel: "Room 301 • Single Room",
    monthlyRent: 6000,
    requestedDate: "Oct 19, 2026 (Tomorrow)",
    requestedTime: "10:00 AM – 10:30 AM",
    status: "confirmed",
    submittedAt: "Yesterday",
    notes:
      "Confirmed via phone call. Will bring 1 valid ID for security logbook.",
  },
  {
    id: "VR-105",
    renterName: "Bea Alonzo Gomez",
    renterAvatar: "BG",
    avatarColor: "bg-pink-600",
    renterRole: "2nd Year Med Tech • FEU",
    renterPhone: "+63 915 778 2310",
    renterEmail: "beagomez@feu.edu.ph",
    verifiedRenter: true,
    propertyId: "PROP-3",
    propertyTitle: "Morayta Courtyard Dorm",
    propertyAddress: "45 Nicanor Reyes St, Manila",
    roomLabel: "Room 102 • 4-Bed Female Dorm",
    monthlyRent: 3500,
    requestedDate: "Oct 19, 2026 (Tomorrow)",
    requestedTime: "3:00 PM – 3:30 PM",
    status: "confirmed",
    submittedAt: "2 days ago",
    notes: "Excited to see the study lounge and laundry area.",
  },
  {
    id: "VR-106",
    renterName: "Paolo Ballesteros Cruz",
    renterAvatar: "PC",
    avatarColor: "bg-indigo-600",
    renterRole: "Civil Eng Graduate • Mapúa",
    renterPhone: "+63 917 114 9901",
    renterEmail: "pbcruz@mapua.edu.ph",
    verifiedRenter: true,
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

export default function LandlordViewingRequestsView() {
  const [requests, setRequests] = useState<ViewingRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<
    "pending" | "confirmed" | "completed" | "declined" | "availability"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    confirmed: requests.filter((r) => r.status === "confirmed").length,
    completed: requests.filter((r) => r.status === "completed").length,
    declined: requests.filter((r) => r.status === "declined").length,
  };

  const handleUpdateStatus = (
    id: string,
    newStatus: "confirmed" | "declined" | "completed",
  ) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
  };

  const filtered = requests.filter((r) => {
    const matchesTab =
      activeTab === "declined"
        ? r.status === "declined"
        : r.status === activeTab;
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
              {counts.pending} Pending
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              activeTab === "availability" ? "pending" : "availability",
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          {activeTab === "availability"
            ? "Back to Appointments"
            : "Configure Viewing Slots"}
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div
          onClick={() => setActiveTab("pending")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === "pending"
              ? "border-amber-500/50 bg-amber-50/50 ring-2 ring-amber-500/20 dark:bg-amber-950/20"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Pending
            </span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {counts.pending}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Needs response
          </span>
        </div>

        <div
          onClick={() => setActiveTab("confirmed")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === "confirmed"
              ? "border-purple-500/50 bg-purple-50/50 ring-2 ring-purple-500/20 dark:bg-purple-950/20"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Confirmed
            </span>
            <CalendarCheck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {counts.confirmed}
          </div>
          <span className="text-[11px] text-purple-600 dark:text-purple-400">
            Upcoming schedules
          </span>
        </div>

        <div
          onClick={() => setActiveTab("completed")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === "completed"
              ? "border-emerald-500/50 bg-emerald-50/50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Completed
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {counts.completed}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Toured properties
          </span>
        </div>

        <div
          onClick={() => setActiveTab("declined")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            activeTab === "declined"
              ? "border-rose-500/50 bg-rose-50/50 ring-2 ring-rose-500/20 dark:bg-rose-950/20"
              : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Declined
            </span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {counts.declined}
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400">
            Archived
          </span>
        </div>
      </div>

      {activeTab === "availability" ? (
        /* Availability Settings Section */
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2.5 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold">Viewing Availability Settings</h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Available Days for Physical Viewings
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (d, i) => (
                    <label
                      key={d}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 p-3 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={i < 6}
                        className="rounded accent-purple-600"
                      />
                      <span>{d}</span>
                    </label>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Daily Visiting Hours
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  defaultValue="09:00"
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-800"
                />
                <span className="text-xs text-zinc-400">to</span>
                <input
                  type="time"
                  defaultValue="17:30"
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-800"
                />
              </div>

              <div className="pt-2">
                <h4 className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Slot Duration & Advance Notice
                </h4>
                <div className="flex gap-3">
                  <select
                    defaultValue="30"
                    className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-800"
                  >
                    <option value="15">15 minutes per viewing</option>
                    <option value="30">30 minutes per viewing</option>
                    <option value="45">45 minutes per viewing</option>
                  </select>
                  <select
                    defaultValue="24"
                    className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-800"
                  >
                    <option value="12">12 hours notice</option>
                    <option value="24">24 hours advance notice</option>
                    <option value="48">48 hours notice</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Requests List & Filters */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search renter name, property, or room..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-sm shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-medium shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="all">All Properties</option>
                <option value="PROP-1">Sampaloc Scholar Suites</option>
                <option value="PROP-2">Katipunan Prime Studio</option>
                <option value="PROP-3">Morayta Courtyard Dorm</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {filtered.length > 0 ? (
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
                          {req.verifiedRenter && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              Verified Renter
                            </span>
                          )}
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
                            onClick={() =>
                              handleUpdateStatus(req.id, "declined")
                            }
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
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(req.id, "completed")
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            Mark Completed
                          </button>
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
                    <div className="mt-3.5 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Renter Note:
                      </span>{" "}
                      {req.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold">
                No viewing requests found
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Switch tabs above or adjust your search filter to see other
                appointments.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
