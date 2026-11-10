"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Building2,
  Calendar,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Receipt,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TenantRecord {
  id: string;
  renterName: string;
  avatar: string;
  avatarColor: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyTitle: string;
  room: string;
  monthlyRent: number;
  bookedAt: string;
  status: "confirmed";
  paymentStatus: "paid" | "overdue";
  nextDueDate: string;
  depositsHeld: number;
  depositsCoverage: string;
  leaseDuration: string;
  leasePeriod: string;
  lastPayment?: {
    amount: number;
    method: string;
    date: string;
    refNumber: string;
  };
}

export interface InterestedRenterRecord {
  id: string;
  renterName: string;
  avatar: string;
  avatarColor: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyTitle: string;
  room: string;
  requestedDate: string;
  requestedTime: string;
  status: "pending" | "confirmed";
  notes?: string;
}

const sampleTenants: TenantRecord[] = [
  {
    id: "TNT-01",
    renterName: "Camille Prats Mendoza",
    avatar: "CM",
    avatarColor: "bg-purple-600",
    email: "camille.mendoza@ust.edu.ph",
    phone: "+63 917 204 8819",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 201 (Bed A)",
    monthlyRent: 4200,
    bookedAt: "Aug 01, 2026",
    status: "confirmed",
    paymentStatus: "paid",
    nextDueDate: "Nov 05, 2026",
    depositsHeld: 8400,
    depositsCoverage: "1 Mo. Advance + 1 Mo. Deposit",
    leaseDuration: "10 Months Active",
    leasePeriod: "Aug 2026 – May 2027",
    lastPayment: {
      amount: 4200,
      method: "GCash",
      date: "Oct 03, 2026 at 2:15 PM",
      refNumber: "Ref #9028144",
    },
  },
  {
    id: "TNT-02",
    renterName: "Carlo Aquino Bautista",
    avatar: "CB",
    avatarColor: "bg-blue-600",
    email: "carlo.bautista@up.edu.ph",
    phone: "+63 918 662 3104",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    room: "Unit 2A (Solo Studio)",
    monthlyRent: 8500,
    bookedAt: "Jun 15, 2026",
    status: "confirmed",
    paymentStatus: "overdue",
    nextDueDate: "Oct 05, 2026",
    depositsHeld: 17000,
    depositsCoverage: "2 Months Security Deposit",
    leaseDuration: "1 Year Contract",
    leasePeriod: "Jun 2026 – Jun 2027",
  },
  {
    id: "TNT-03",
    renterName: "Nadine Lustre Pascual",
    avatar: "NP",
    avatarColor: "bg-emerald-600",
    email: "nadine.pascual@feu.edu.ph",
    phone: "+63 995 441 7720",
    propertyId: "PROP-3",
    propertyTitle: "Morayta Courtyard Dorm",
    room: "Room 101 (Bed C)",
    monthlyRent: 3500,
    bookedAt: "Jul 01, 2026",
    status: "confirmed",
    paymentStatus: "paid",
    nextDueDate: "Nov 01, 2026",
    depositsHeld: 7000,
    depositsCoverage: "1 Mo. Advance + 1 Mo. Deposit",
    leaseDuration: "1 Year Contract",
    leasePeriod: "Jul 2026 – Jun 2027",
    lastPayment: {
      amount: 3500,
      method: "Maya",
      date: "Oct 01, 2026 at 10:45 AM",
      refNumber: "Ref #8821034",
    },
  },
  {
    id: "TNT-04",
    renterName: "Enrique Gil Ramos",
    avatar: "ER",
    avatarColor: "bg-amber-600",
    email: "enrique.ramos@dlsu.edu.ph",
    phone: "+63 920 114 9901",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 302 (Single)",
    monthlyRent: 6000,
    bookedAt: "Sep 01, 2026",
    status: "confirmed",
    paymentStatus: "paid",
    nextDueDate: "Nov 01, 2026",
    depositsHeld: 12000,
    depositsCoverage: "1 Mo. Advance + 1 Mo. Deposit",
    leaseDuration: "1 Year Contract",
    leasePeriod: "Sep 2026 – Aug 2027",
    lastPayment: {
      amount: 6000,
      method: "Bank Transfer",
      date: "Oct 01, 2026 at 3:30 PM",
      refNumber: "Ref #7190245",
    },
  },
];

const sampleInterestedRenters: InterestedRenterRecord[] = [
  {
    id: "INT-01",
    renterName: "Maria Clara Santos",
    avatar: "MS",
    avatarColor: "bg-purple-600",
    email: "mariaclara.santos@ust.edu.ph",
    phone: "+63 917 842 1109",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 204 • Female Bedspace",
    requestedDate: "Oct 20, 2026",
    requestedTime: "2:00 PM – 2:30 PM",
    status: "pending",
    notes: "Inquired about quiet study environment near UST Hospital.",
  },
  {
    id: "INT-02",
    renterName: "Joshua Dela Cruz",
    avatar: "JD",
    avatarColor: "bg-blue-600",
    email: "joshua.dc@gmail.com",
    phone: "+63 918 339 4021",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    room: "Unit 3B • Solo Studio",
    requestedDate: "Oct 21, 2026",
    requestedTime: "10:30 AM – 11:00 AM",
    status: "pending",
    notes: "Checking fiber internet speed and motorcycle parking.",
  },
  {
    id: "INT-03",
    renterName: "Rafael Gabriel Tan",
    avatar: "RT",
    avatarColor: "bg-indigo-600",
    email: "rafael.tan@outlook.com",
    phone: "+63 920 551 2290",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 302 • Solo Room",
    requestedDate: "Oct 19, 2026",
    requestedTime: "1:00 PM – 1:30 PM",
    status: "confirmed",
    notes: "Confirmed physical viewing slot.",
  },
];

export default function LandlordRentersView() {
  const [tenants] = useState<TenantRecord[]>(sampleTenants);
  const [interestedRenters] = useState<InterestedRenterRecord[]>(
    sampleInterestedRenters,
  );
  const [activeTab, setActiveTab] = useState<"tenants" | "interested">(
    "tenants",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [expandedTenantIds, setExpandedTenantIds] = useState<string[]>([]);

  const toggleTenantDetails = (id: string) => {
    setExpandedTenantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesProp =
      propertyFilter === "all" || t.propertyId === propertyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.renterName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.propertyTitle.toLowerCase().includes(q) ||
      t.room.toLowerCase().includes(q);
    return matchesProp && matchesSearch;
  });

  const filteredInterested = interestedRenters.filter((r) => {
    const matchesProp =
      propertyFilter === "all" || r.propertyId === propertyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.renterName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.propertyTitle.toLowerCase().includes(q) ||
      r.room.toLowerCase().includes(q);
    return matchesProp && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-zinc-400 dark:text-zinc-500">Landlord</span>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            Renter Management
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Renter Management
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
            <Users className="h-3.5 w-3.5" />
            {tenants.length} Active Tenants
          </span>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Two Main Tabs */}
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-xs font-semibold dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "tenants"
                  ? "bg-white text-purple-700 shadow-xs dark:bg-zinc-900 dark:text-purple-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Current Tenants</span>
              <span className="py-0.2 rounded-full bg-purple-100 px-1.5 text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                {tenants.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("interested")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "interested"
                  ? "bg-white text-purple-700 shadow-xs dark:bg-zinc-900 dark:text-purple-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Interested Renters</span>
              <span className="py-0.2 rounded-full bg-zinc-200 px-1.5 text-[11px] font-bold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                {interestedRenters.length}
              </span>
            </button>
          </div>

          {/* Property Selector */}
          <div className="w-full sm:w-56">
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-10 rounded-xl border-zinc-200 bg-white text-xs font-medium text-zinc-700 shadow-xs focus-visible:ring-purple-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="PROP-1">Sampaloc Scholar Suites</SelectItem>
                <SelectItem value="PROP-2">Katipunan Prime Studio</SelectItem>
                <SelectItem value="PROP-3">Morayta Courtyard Dorm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={
              activeTab === "tenants"
                ? "Search tenants by name, email, property, or room..."
                : "Search interested renters by name, email, or property..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-purple-400"
          />
        </div>
      </div>

      {/* Tab 1: Current Tenants */}
      {activeTab === "tenants" && (
        <div className="space-y-3.5">
          {filteredTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Users className="h-8 w-8 text-zinc-400" />
              <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No tenants found
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? "No current tenants match your search filter."
                  : "You do not have any confirmed tenants yet."}
              </p>
            </div>
          ) : (
            filteredTenants.map((t) => {
              const isExpanded = expandedTenantIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all hover:border-purple-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${t.avatarColor}`}
                      >
                        {t.avatar}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                            {t.renterName}
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Confirmed Tenant
                          </span>
                          {t.paymentStatus === "paid" ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Paid for October
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Payment Overdue (₱{t.monthlyRent.toLocaleString()}
                              )
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-purple-500" />
                            {t.propertyTitle} ({t.room})
                          </span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            ₱{t.monthlyRent.toLocaleString()} / mo
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {t.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {t.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Booked: {t.bookedAt}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => toggleTenantDetails(t.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>
                          {isExpanded ? "Hide Details" : "View Payment Details"}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          alert(`Message window for ${t.renterName} (#116)`)
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message Tenant
                      </button>
                    </div>
                  </div>

                  {/* Expandable Payment & Lease Panel */}
                  {isExpanded && (
                    <div className="dark:bg-zinc-850/60 mt-4 space-y-3.5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* Monthly Dues & Next Due */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                          <span className="block text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                            Monthly Dues
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span
                              className={`text-lg font-bold ${
                                t.paymentStatus === "overdue"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              ₱{t.monthlyRent.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              / month
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>
                              {t.paymentStatus === "overdue"
                                ? "Was Due On:"
                                : "Next Due:"}
                            </span>
                            <span
                              className={`font-semibold ${
                                t.paymentStatus === "overdue"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              {t.nextDueDate}
                            </span>
                          </div>
                        </div>

                        {/* Deposits on Hold */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                          <span className="block text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                            Deposits on Hold
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              ₱{t.depositsHeld.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              (Held)
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>Coverage:</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {t.depositsCoverage}
                            </span>
                          </div>
                        </div>

                        {/* Lease Agreement */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                          <span className="block text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                            Lease Agreement
                          </span>
                          <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {t.leaseDuration}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>Period:</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {t.leasePeriod}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Payment or Due Status Row */}
                      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
                        {t.paymentStatus === "paid" && t.lastPayment ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <Check className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">
                                Latest Payment: ₱
                                {t.lastPayment.amount.toLocaleString()} via{" "}
                                {t.lastPayment.method}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {t.lastPayment.refNumber} • Received{" "}
                                {t.lastPayment.date}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">
                                October Rent Unsettled (Due {t.nextDueDate})
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                Tenant promised payment via GCash.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              alert(`Record payment for ${t.renterName}`)
                            }
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Record Payment
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              alert(`Send receipt/reminder for ${t.renterName}`)
                            }
                            className="rounded-lg bg-purple-600 px-3 py-1.5 font-semibold text-white shadow-2xs hover:bg-purple-700"
                          >
                            {t.paymentStatus === "paid"
                              ? "Send Receipt"
                              : "Send Due Reminder"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Interested Renters */}
      {activeTab === "interested" && (
        <div className="space-y-3.5">
          {filteredInterested.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Clock className="h-8 w-8 text-zinc-400" />
              <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No interested renters found
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? "No viewing inquiries match your search filter."
                  : "You have no active viewing requests from interested renters."}
              </p>
            </div>
          ) : (
            filteredInterested.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all hover:border-purple-200 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${r.avatarColor}`}
                  >
                    {r.avatar}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        {r.renterName}
                      </h3>
                      {r.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Viewing Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" />
                          Pending Request
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-purple-500" />
                        {r.propertyTitle} ({r.room})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        Requested: {r.requestedDate} • {r.requestedTime}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {r.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {r.phone}
                      </span>
                    </div>

                    {r.notes && (
                      <p className="pt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <strong className="text-zinc-700 dark:text-zinc-300">
                          Inquiry Note:
                        </strong>{" "}
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      alert(`Message window for ${r.renterName} (#116)`)
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message Renter
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
