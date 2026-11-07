"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Plus,
  CreditCard,
  Building2,
  Calendar,
  Phone,
  Mail,
  Receipt,
  X,
} from "lucide-react";

interface Renter {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  email: string;
  phone: string;
  emergencyContact: string;
  propertyId: string;
  propertyTitle: string;
  room: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  tenancyStatus: "Active" | "Moving Out Soon" | "Terminated";
  paymentStatus: "Paid" | "Overdue" | "Unpaid";
  outstandingBalance: number;
  lastPaymentDate: string;
}

interface PaymentRecord {
  id: string;
  renterId: string;
  renterName: string;
  propertyTitle: string;
  room: string;
  billingPeriod: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: "Paid" | "Overdue" | "Unpaid";
  method: string;
  paidAt: string;
}

const initialRenters: Renter[] = [
  {
    id: "RNT-01",
    name: "Camille Prats Mendoza",
    avatar: "CM",
    avatarColor: "bg-purple-600",
    email: "camille.mendoza@ust.edu.ph",
    phone: "+63 917 204 8819",
    emergencyContact: "Roberto Mendoza (Father) • +63 917 555 0192",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 201 (Bed A)",
    leaseStart: "Aug 01, 2026",
    leaseEnd: "May 31, 2027",
    monthlyRent: 4200,
    tenancyStatus: "Active",
    paymentStatus: "Paid",
    outstandingBalance: 0,
    lastPaymentDate: "Oct 03, 2026",
  },
  {
    id: "RNT-02",
    name: "Carlo Aquino Bautista",
    avatar: "CB",
    avatarColor: "bg-blue-600",
    email: "carlo.bautista@up.edu.ph",
    phone: "+63 918 662 3104",
    emergencyContact: "Elena Bautista (Mother) • +63 918 221 9001",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    room: "Unit 2A (Solo Studio)",
    leaseStart: "Jun 15, 2026",
    leaseEnd: "Jun 14, 2027",
    monthlyRent: 8500,
    tenancyStatus: "Active",
    paymentStatus: "Overdue",
    outstandingBalance: 8500,
    lastPaymentDate: "Sep 05, 2026",
  },
  {
    id: "RNT-03",
    name: "Nadine Lustre Pascual",
    avatar: "NP",
    avatarColor: "bg-emerald-600",
    email: "nadine.pascual@feu.edu.ph",
    phone: "+63 995 441 7720",
    emergencyContact: "Liza Pascual (Sister) • +63 995 882 1143",
    propertyId: "PROP-3",
    propertyTitle: "Morayta Courtyard Dorm",
    room: "Room 101 (Bed C)",
    leaseStart: "Jul 01, 2026",
    leaseEnd: "Jun 30, 2027",
    monthlyRent: 3500,
    tenancyStatus: "Active",
    paymentStatus: "Unpaid",
    outstandingBalance: 3500,
    lastPaymentDate: "Sep 18, 2026",
  },
  {
    id: "RNT-04",
    name: "Enrique Gil Ramos",
    avatar: "ER",
    avatarColor: "bg-amber-600",
    email: "enrique.ramos@dlsu.edu.ph",
    phone: "+63 927 883 1920",
    emergencyContact: "Antonio Ramos (Father) • +63 927 110 4432",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 302 (Single)",
    leaseStart: "Jan 10, 2026",
    leaseEnd: "Nov 10, 2026",
    monthlyRent: 6000,
    tenancyStatus: "Moving Out Soon",
    paymentStatus: "Paid",
    outstandingBalance: 0,
    lastPaymentDate: "Oct 01, 2026",
  },
  {
    id: "RNT-05",
    name: "Paolo Ballesteros Cruz",
    avatar: "PC",
    avatarColor: "bg-indigo-600",
    email: "pbcruz@mapua.edu.ph",
    phone: "+63 917 114 9901",
    emergencyContact: "Lucia Cruz (Mother) • +63 917 889 0012",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 105 (Solo)",
    leaseStart: "Oct 01, 2026",
    leaseEnd: "Sep 30, 2027",
    monthlyRent: 7000,
    tenancyStatus: "Active",
    paymentStatus: "Paid",
    outstandingBalance: 0,
    lastPaymentDate: "Oct 01, 2026",
  },
];

const initialPayments: PaymentRecord[] = [
  {
    id: "INV-2026-101",
    renterId: "RNT-01",
    renterName: "Camille Prats Mendoza",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 201 (Bed A)",
    billingPeriod: "October 2026",
    dueDate: "Oct 05, 2026",
    amountDue: 4200,
    amountPaid: 4200,
    balance: 0,
    status: "Paid",
    method: "GCash",
    paidAt: "Oct 03, 2026",
  },
  {
    id: "INV-2026-102",
    renterId: "RNT-02",
    renterName: "Carlo Aquino Bautista",
    propertyTitle: "Katipunan Prime Studio",
    room: "Unit 2A (Solo Studio)",
    billingPeriod: "October 2026",
    dueDate: "Oct 05, 2026",
    amountDue: 8500,
    amountPaid: 0,
    balance: 8500,
    status: "Overdue",
    method: "Pending",
    paidAt: "—",
  },
  {
    id: "INV-2026-103",
    renterId: "RNT-03",
    renterName: "Nadine Lustre Pascual",
    propertyTitle: "Morayta Courtyard Dorm",
    room: "Room 101 (Bed C)",
    billingPeriod: "October 2026",
    dueDate: "Oct 20, 2026",
    amountDue: 3500,
    amountPaid: 0,
    balance: 3500,
    status: "Unpaid",
    method: "Pending",
    paidAt: "—",
  },
  {
    id: "INV-2026-104",
    renterId: "RNT-04",
    renterName: "Enrique Gil Ramos",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 302 (Single)",
    billingPeriod: "October 2026",
    dueDate: "Oct 05, 2026",
    amountDue: 6000,
    amountPaid: 6000,
    balance: 0,
    status: "Paid",
    method: "Maya Transfer",
    paidAt: "Oct 01, 2026",
  },
  {
    id: "INV-2026-105",
    renterId: "RNT-05",
    renterName: "Paolo Ballesteros Cruz",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 105 (Solo)",
    billingPeriod: "October 2026",
    dueDate: "Oct 01, 2026",
    amountDue: 7000,
    amountPaid: 7000,
    balance: 0,
    status: "Paid",
    method: "Bank Transfer (BDO)",
    paidAt: "Oct 01, 2026",
  },
];

export default function LandlordRentersView() {
  const [renters, setRenters] = useState<Renter[]>(initialRenters);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [activeTab, setActiveTab] = useState<"renters" | "payments">("renters");
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // New assignment form state
  const [newRenterName, setNewRenterName] = useState("");
  const [newRenterEmail, setNewRenterEmail] = useState("");
  const [newRenterPhone, setNewRenterPhone] = useState("");
  const [newRenterRoom, setNewRenterRoom] = useState("Room 202");
  const [newRenterRent, setNewRenterRent] = useState("4500");

  const totalCollected = payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const totalOutstanding = payments.reduce((acc, p) => acc + p.balance, 0);
  const paidCount = payments.filter((p) => p.status === "Paid").length;

  const handleAssignRenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRenterName) return;

    const newRenter: Renter = {
      id: `RNT-0${renters.length + 1}`,
      name: newRenterName,
      avatar: newRenterName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      avatarColor: "bg-purple-600",
      email: newRenterEmail || "renter@email.com",
      phone: newRenterPhone || "+63 917 000 0000",
      emergencyContact: "Family Contact",
      propertyId: "PROP-1",
      propertyTitle: "Sampaloc Scholar Suites",
      room: newRenterRoom,
      leaseStart: "Nov 01, 2026",
      leaseEnd: "Oct 31, 2027",
      monthlyRent: Number(newRenterRent) || 4500,
      tenancyStatus: "Active",
      paymentStatus: "Paid",
      outstandingBalance: 0,
      lastPaymentDate: "Nov 01, 2026",
    };

    setRenters([newRenter, ...renters]);
    setShowAssignModal(false);
    setNewRenterName("");
    setNewRenterEmail("");
    setNewRenterPhone("");
  };

  const handleRecordPayment = (renterId: string) => {
    setRenters((prev) =>
      prev.map((r) =>
        r.id === renterId
          ? {
              ...r,
              paymentStatus: "Paid",
              outstandingBalance: 0,
              lastPaymentDate: "Today",
            }
          : r,
      ),
    );
    setPayments((prev) =>
      prev.map((p) =>
        p.renterId === renterId
          ? {
              ...p,
              status: "Paid",
              amountPaid: p.amountDue,
              balance: 0,
              paidAt: "Today",
              method: "GCash",
            }
          : p,
      ),
    );
    setShowPaymentModal(false);
  };

  const filteredRenters = renters.filter((r) => {
    const matchesProp =
      propertyFilter === "all" || r.propertyId === propertyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.propertyTitle.toLowerCase().includes(q) ||
      r.room.toLowerCase().includes(q);
    return matchesProp && matchesSearch;
  });

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      p.renterName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.propertyTitle.toLowerCase().includes(q)
    );
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
              Renter Management
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Renter Management
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
              {renters.length} Active Tenants
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-bold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Assign Renter
          </button>
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Current Renters
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {renters.length}
            </span>
            <span className="text-xs font-semibold text-emerald-500">
              active tenants
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Collected (Oct 2026)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-500">
              ₱{totalCollected.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400">
              {paidCount}/{payments.length} paid
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Outstanding Balance
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                totalOutstanding > 0 ? "text-rose-500" : "text-zinc-400"
              }`}
            >
              ₱{totalOutstanding.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400">unpaid / overdue</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Assigned Rooms
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {renters.length}
            </span>
            <span className="text-xs text-zinc-400">of 8 rooms filled</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("renters")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "renters"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Renters Directory ({renters.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "payments"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Payments & Invoices ({payments.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "renters"
                ? "Search renter name, property, or room..."
                : "Search invoice ID, renter, or property..."
            }
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-sm shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        {activeTab === "renters" && (
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
        )}
      </div>

      {/* Tab A: Renters Directory */}
      {activeTab === "renters" && (
        <div className="space-y-3.5">
          {filteredRenters.map((renter) => (
            <div
              key={renter.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all hover:border-purple-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${renter.avatarColor}`}
                  >
                    {renter.avatar}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        {renter.name}
                      </h3>
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {renter.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          renter.tenancyStatus === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {renter.tenancyStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-purple-500" />
                        {renter.propertyTitle} — {renter.room}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {renter.leaseStart} to {renter.leaseEnd}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {renter.phone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {renter.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap">
                  <div className="text-left lg:text-right">
                    <div className="text-xs text-zinc-400">Monthly Rent</div>
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      ₱{renter.monthlyRent.toLocaleString()}
                    </div>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        renter.paymentStatus === "Paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : renter.paymentStatus === "Overdue"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {renter.paymentStatus} (₱
                      {renter.outstandingBalance.toLocaleString()})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {renter.paymentStatus !== "Paid" && (
                      <button
                        type="button"
                        onClick={() => handleRecordPayment(renter.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Collect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {renter.emergencyContact && (
                <div className="mt-3 border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-400 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-500 dark:text-zinc-300">
                    Emergency Contact:
                  </span>{" "}
                  {renter.emergencyContact}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab B: Payments Ledger */}
      {activeTab === "payments" && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Tenant & Property</th>
                <th className="px-4 py-3">Period & Due</th>
                <th className="px-4 py-3">Amount Due</th>
                <th className="px-4 py-3">Paid / Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3.5 font-bold text-purple-600 dark:text-purple-400">
                    {p.id}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {p.renterName}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {p.propertyTitle} • {p.room}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">
                      {p.billingPeriod}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Due: {p.dueDate}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                    ₱{p.amountDue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₱{p.amountPaid.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {p.method} {p.paidAt !== "—" ? `(${p.paidAt})` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        p.status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : p.status === "Overdue"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Renter Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <h3 className="text-lg font-bold">Assign Renter to Room</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignRenter} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tenant Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan dela Cruz"
                  value={newRenterName}
                  onChange={(e) => setNewRenterName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. juan@gmail.com"
                  value={newRenterEmail}
                  onChange={(e) => setNewRenterEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="+63 9XX XXX XXXX"
                  value={newRenterPhone}
                  onChange={(e) => setNewRenterPhone(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Assigned Room
                  </label>
                  <input
                    type="text"
                    value={newRenterRoom}
                    onChange={(e) => setNewRenterRoom(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Monthly Rent (₱)
                  </label>
                  <input
                    type="number"
                    value={newRenterRent}
                    onChange={(e) => setNewRenterRent(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
                >
                  Assign Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <h3 className="text-lg font-bold">Record Renter Payment</h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select a tenant with outstanding balance to mark payment as
                received:
              </p>
              {renters
                .filter((r) => r.outstandingBalance > 0)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {r.room} • Due: ₱{r.outstandingBalance.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRecordPayment(r.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Mark Paid
                    </button>
                  </div>
                ))}
              {renters.filter((r) => r.outstandingBalance > 0).length === 0 && (
                <div className="py-6 text-center text-xs text-zinc-500">
                  All current renters have fully settled their dues!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
