"use client";

import { useState } from "react";
import { Search, AlertTriangle, Trash2, MapPin } from "lucide-react";

interface ListingItem {
  id: string;
  title: string;
  landlordName: string;
  propertyType: string;
  monthlyRent: number;
  address: string;
  status: "active" | "flagged" | "suspended";
  roomsCount: number;
  reportsCount: number;
  createdAt: string;
}

const initialListings: ListingItem[] = [
  {
    id: "LIST-101",
    title: "Sampaloc Scholar Suites",
    landlordName: "Rodrigo D. Alonzo",
    propertyType: "Boarding House / Bedspace",
    monthlyRent: 4200,
    address: "842 España Blvd, Sampaloc, Manila",
    status: "active",
    roomsCount: 8,
    reportsCount: 0,
    createdAt: "Aug 12, 2026",
  },
  {
    id: "LIST-102",
    title: "Katipunan Prime Studio",
    landlordName: "Teresa Ramos Castro",
    propertyType: "Solo Studio & Twin",
    monthlyRent: 8500,
    address: "123 Katipunan Ave, Loyola Heights, QC",
    status: "active",
    roomsCount: 4,
    reportsCount: 0,
    createdAt: "Sep 05, 2026",
  },
  {
    id: "LIST-103",
    title: "Morayta Courtyard Dorm",
    landlordName: "Mateo S. Bernardo",
    propertyType: "Female Student Dorm",
    monthlyRent: 3500,
    address: "45 Nicanor Reyes St, Sampaloc, Manila",
    status: "flagged",
    roomsCount: 6,
    reportsCount: 2,
    createdAt: "Sep 20, 2026",
  },
  {
    id: "LIST-104",
    title: "Taft Avenue Budget Bedspace",
    landlordName: "Antonio Luna",
    propertyType: "Co-ed Bedspace",
    monthlyRent: 3000,
    address: "1890 Taft Ave, Pasay City",
    status: "active",
    roomsCount: 12,
    reportsCount: 0,
    createdAt: "Oct 01, 2026",
  },
  {
    id: "LIST-105",
    title: "Suspicious Property Fake Photos",
    landlordName: "Bad Actor Landlord",
    propertyType: "Single Room",
    monthlyRent: 1500,
    address: "Unknown St, Manila",
    status: "suspended",
    roomsCount: 1,
    reportsCount: 5,
    createdAt: "Oct 15, 2026",
  },
];

export default function AdminListingManagementView() {
  const [listings, setListings] = useState<ListingItem[]>(initialListings);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "flagged" | "suspended"
  >("all");

  const handleToggleStatus = (
    id: string,
    newStatus: "active" | "flagged" | "suspended",
  ) => {
    setListings((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item,
      ),
    );
  };

  const handleRemoveListing = (id: string) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = listings.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.landlordName.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-zinc-400 dark:text-zinc-500">Admin</span>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            Listing Management
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Listing Management
          </h1>
          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
            {listings.length} Total Properties
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by listing title, landlord, or address..."
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-sm shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "active" | "flagged" | "suspended",
              )
            }
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-medium shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value="all">All Listings</option>
            <option value="active">Active</option>
            <option value="flagged">Reported / Flagged</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Listings Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Property & Landlord</th>
              <th className="px-4 py-3">Type & Rooms</th>
              <th className="px-4 py-3">Monthly Rent</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Moderation Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
              >
                <td className="px-4 py-3.5">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <MapPin className="h-3 w-3" />
                    {item.address}
                  </div>
                  <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                    Owner: {item.landlordName}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="font-medium text-zinc-700 dark:text-zinc-300">
                    {item.propertyType}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {item.roomsCount} rooms registered
                  </div>
                </td>
                <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                  ₱{item.monthlyRent.toLocaleString()}
                </td>
                <td className="px-4 py-3.5">
                  {item.reportsCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" />
                      {item.reportsCount} Reports
                    </span>
                  ) : (
                    <span className="text-zinc-400">0 reports</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      item.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : item.status === "flagged"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {item.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id, "suspended")}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id, "active")}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        Re-activate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveListing(item.id)}
                      className="rounded-lg border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      title="Remove Listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
