"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  MapPin,
  XCircle,
  MessageSquare,
} from "lucide-react";

interface ViewingItem {
  id: string;
  propertyTitle: string;
  roomLabel: string;
  monthlyRent: number;
  landlordName: string;
  landlordPhone: string;
  address: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  meetingNotes: string;
}

const initialViewings: ViewingItem[] = [
  {
    id: "VR-101",
    propertyTitle: "Sampaloc Scholar Suites",
    roomLabel: "Room 204 • Female Bedspace",
    monthlyRent: 4200,
    landlordName: "Rodrigo D. Alonzo",
    landlordPhone: "+63 917 842 1109",
    address: "842 España Blvd, Sampaloc, Manila (Near UST)",
    scheduledDate: "Tomorrow (Oct 23, 2026)",
    scheduledTime: "2:00 PM – 2:30 PM",
    status: "confirmed",
    meetingNotes:
      "Look for building guard Kuya Ben at the reception lobby. Bring 1 valid ID.",
  },
  {
    id: "VR-102",
    propertyTitle: "Katipunan Prime Studio",
    roomLabel: "Unit 3B • Solo Studio",
    monthlyRent: 8500,
    landlordName: "Teresa Ramos Castro",
    landlordPhone: "+63 918 339 4021",
    address: "123 Katipunan Ave, QC (Near Ateneo & Miriam)",
    scheduledDate: "Oct 25, 2026 (Saturday)",
    scheduledTime: "10:30 AM – 11:00 AM",
    status: "pending",
    meetingNotes: "Awaiting landlord slot confirmation.",
  },
  {
    id: "VR-103",
    propertyTitle: "Morayta Courtyard Dorm",
    roomLabel: "Room 102 • 4-Bed Dorm",
    monthlyRent: 3500,
    landlordName: "Mateo S. Bernardo",
    landlordPhone: "+63 995 214 8832",
    address: "45 Nicanor Reyes St, Manila",
    scheduledDate: "Oct 15, 2026",
    scheduledTime: "11:00 AM",
    status: "completed",
    meetingNotes:
      "Room inspection completed. Renter decided to compare with UST suites.",
  },
];

export default function RenterViewingsView() {
  const [viewings, setViewings] = useState<ViewingItem[]>(initialViewings);
  const [activeTab, setActiveTab] = useState<
    "confirmed" | "pending" | "completed" | "cancelled"
  >("confirmed");
  const [cancellingViewing, setCancellingViewing] =
    useState<ViewingItem | null>(null);

  const handleCancelAppointment = (id: string) => {
    setViewings((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "cancelled" } : v)),
    );
    setCancellingViewing(null);
  };

  const filtered = viewings.filter((v) => v.status === activeTab);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-zinc-400 dark:text-zinc-500">Renter</span>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            My Viewings
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            My Viewing Appointments
          </h1>
          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
            {viewings.filter((v) => v.status === "confirmed").length} Confirmed
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: "confirmed", label: "Confirmed Visits" },
          { id: "pending", label: "Pending Requests" },
          { id: "completed", label: "Completed" },
          { id: "cancelled", label: "Cancelled" },
        ].map((tab) => {
          const count = viewings.filter((v) => v.status === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as "confirmed" | "pending" | "completed" | "cancelled",
                )
              }
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors sm:text-sm ${
                activeTab === tab.id
                  ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xs transition-all hover:border-purple-200 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {item.propertyTitle}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        item.status === "confirmed"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          : item.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : item.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {item.roomLabel} • ₱{item.monthlyRent.toLocaleString()} / mo
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>
                      {item.scheduledDate} • {item.scheduledTime}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{item.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end lg:self-center">
                  <Link
                    href="/dashboard/renter/messages"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                    Message Landlord
                  </Link>

                  {item.status !== "cancelled" &&
                    item.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => setCancellingViewing(item)}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel Visit
                      </button>
                    )}
                </div>
              </div>

              {item.meetingNotes && (
                <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Meeting Details:
                  </span>{" "}
                  {item.meetingNotes}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              No appointments in this tab
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Find a place you like and book a room viewing visit anytime.
            </p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancellingViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Cancel Viewing Appointment?
            </h3>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Are you sure you want to cancel your visit to{" "}
              <strong>{cancellingViewing.propertyTitle}</strong> on{" "}
              {cancellingViewing.scheduledDate}?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancellingViewing(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={() => handleCancelAppointment(cancellingViewing.id)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                Yes, Cancel Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
