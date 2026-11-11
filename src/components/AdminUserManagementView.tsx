"use client";

import { useState } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Check,
  X,
  Building2,
  Mail,
  Phone,
  Ban,
  RotateCcw,
} from "lucide-react";

interface VerificationItem {
  id: string;
  landlordName: string;
  avatar: string;
  email: string;
  phone: string;
  propertyTitle: string;
  propertyAddress: string;
  submittedAt: string;
  documents: { name: string; type: string }[];
  status: "pending" | "approved" | "rejected";
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "landlord" | "renter";
  joinedDate: string;
  verified: boolean;
  status: "active" | "suspended";
  propertyOrRentals: string;
}

const initialVerifications: VerificationItem[] = [
  {
    id: "VER-891",
    landlordName: "Rodrigo D. Alonzo",
    avatar: "RA",
    email: "rodrigo.alonzo@gmail.com",
    phone: "+63 917 842 1109",
    propertyTitle: "España Student Residences",
    propertyAddress: "842 España Blvd, Sampaloc, Manila",
    submittedAt: "Oct 21, 2026 • 45 mins ago",
    documents: [
      { name: "Barangay_Business_Permit_2026.pdf", type: "PDF" },
      { name: "DTI_Registration_Cert.pdf", type: "PDF" },
      { name: "Landlords_Passport_ID.jpg", type: "IMAGE" },
    ],
    status: "pending",
  },
  {
    id: "VER-890",
    landlordName: "Teresa Ramos Castro",
    avatar: "TC",
    email: "teresa.castro@yahoo.com",
    phone: "+63 918 339 4021",
    propertyTitle: "Katipunan Heights Dormitory",
    propertyAddress: "123 Katipunan Ave, Loyola Heights, QC",
    submittedAt: "Oct 21, 2026 • 3 hours ago",
    documents: [
      { name: "Mayors_Permit_QC_2026.pdf", type: "PDF" },
      { name: "Proof_of_Ownership_TCT.pdf", type: "PDF" },
    ],
    status: "pending",
  },
  {
    id: "VER-889",
    landlordName: "Mateo S. Bernardo",
    avatar: "MB",
    email: "mateo.bernardo@gmail.com",
    phone: "+63 995 214 8832",
    propertyTitle: "Taft Avenue Scholar Hub",
    propertyAddress: "2450 Taft Ave, Malate, Manila",
    submittedAt: "Oct 21, 2026 • 5 hours ago",
    documents: [
      { name: "Business_License_Manila.pdf", type: "PDF" },
      { name: "UMID_Card_Front_Back.jpg", type: "IMAGE" },
    ],
    status: "pending",
  },
];

const initialAccounts: UserAccount[] = [
  {
    id: "USR-01",
    name: "Rodrigo D. Alonzo",
    email: "rodrigo.alonzo@gmail.com",
    role: "landlord",
    joinedDate: "Oct 12, 2026",
    verified: false,
    status: "active",
    propertyOrRentals: "1 Property Listed",
  },
  {
    id: "USR-02",
    name: "Maria Elena Reyes",
    email: "maria.reyes@gmail.com",
    role: "landlord",
    joinedDate: "Aug 15, 2026",
    verified: true,
    status: "active",
    propertyOrRentals: "3 Properties Listed",
  },
  {
    id: "USR-03",
    name: "Camille Prats Mendoza",
    email: "camille.mendoza@ust.edu.ph",
    role: "renter",
    joinedDate: "Sep 01, 2026",
    verified: true,
    status: "active",
    propertyOrRentals: "Renting at Sampaloc Scholar Suites",
  },
  {
    id: "USR-04",
    name: "Carlo Aquino Bautista",
    email: "carlo.bautista@up.edu.ph",
    role: "renter",
    joinedDate: "Jun 10, 2026",
    verified: false,
    status: "active",
    propertyOrRentals: "Renting at Katipunan Prime Studio",
  },
  {
    id: "USR-05",
    name: "Bad Actor Landlord (Spam)",
    email: "spam.landlord@fake.com",
    role: "landlord",
    joinedDate: "Oct 02, 2026",
    verified: false,
    status: "suspended",
    propertyOrRentals: "0 Listings (Suspended)",
  },
];

export default function AdminUserManagementView() {
  const [activeTab, setActiveTab] = useState<"verifications" | "accounts">(
    "verifications",
  );
  const [verifications, setVerifications] =
    useState<VerificationItem[]>(initialVerifications);
  const [accounts, setAccounts] = useState<UserAccount[]>(initialAccounts);
  const [selectedVerification, setSelectedVerification] =
    useState<VerificationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "landlord" | "renter">(
    "all",
  );

  const pendingCount = verifications.filter(
    (v) => v.status === "pending",
  ).length;

  const handleApproveVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "approved" } : v)),
    );
    setSelectedVerification(null);
  };

  const handleRejectVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "rejected" } : v)),
    );
    setSelectedVerification(null);
  };

  const handleToggleSuspend = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? {
              ...acc,
              status: acc.status === "active" ? "suspended" : "active",
            }
          : acc,
      ),
    );
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole = roleFilter === "all" || acc.role === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 dark:text-zinc-500">Admin</span>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              User Management
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              User Management & Verification
            </h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"></span>
                {pendingCount} Pending Review
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("verifications")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "verifications"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Landlord Verifications ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "accounts"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Users className="h-4 w-4" />
          User Accounts Directory ({accounts.length})
        </button>
      </div>

      {/* TAB 1: VERIFICATIONS */}
      {activeTab === "verifications" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {verifications.map((v) => (
              <div
                key={v.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-sm font-bold text-white shadow-xs">
                    {v.avatar}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        {v.landlordName}
                      </h3>
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {v.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          v.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : v.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {v.status === "pending"
                          ? "Pending Review"
                          : v.status === "approved"
                            ? "Approved"
                            : "Rejected"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-purple-500" />
                        {v.propertyTitle}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {v.email}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {v.phone}
                      </span>
                    </div>

                    <div className="pt-1 text-xs text-zinc-400">
                      Submitted: {v.submittedAt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedVerification(v)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                    Inspect Documents ({v.documents.length})
                  </button>

                  {v.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApproveVerification(v.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectVerification(v.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNTS DIRECTORY */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name or email..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-sm shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as "all" | "landlord" | "renter")
                }
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-medium shadow-2xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="all">All Roles</option>
                <option value="landlord">Landlords</option>
                <option value="renter">Renters</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 uppercase dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">User & Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {acc.email}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          acc.role === "landlord"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {acc.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {acc.verified ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-zinc-400">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400">
                      {acc.joinedDate}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          acc.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {acc.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(acc.id)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${
                          acc.status === "active"
                            ? "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        }`}
                      >
                        {acc.status === "active" ? (
                          <>
                            <Ban className="h-3 w-3" /> Suspend
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3" /> Reactivate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Inspection Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <h3 className="text-lg font-bold">
                Review Documents: {selectedVerification.landlordName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedVerification(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedVerification.propertyTitle}
                </div>
                <div className="text-zinc-500 dark:text-zinc-400">
                  {selectedVerification.propertyAddress}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Uploaded Verification Files:
                </h4>
                <div className="space-y-2">
                  {selectedVerification.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 p-2.5 text-xs dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {doc.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">
                        {doc.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() =>
                    handleRejectVerification(selectedVerification.id)
                  }
                  className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                >
                  Reject Verification
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApproveVerification(selectedVerification.id)
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  Approve & Grant Badge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
