"use client";

import Link from "next/link";
import {
  Users,
  Building2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Clock,
} from "lucide-react";

export default function AdminDashboardView() {
  const stats = [
    {
      label: "Total Users",
      value: "1,248",
      subtext: "+14% from last month",
      icon: Users,
      color:
        "text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300",
    },
    {
      label: "Active Listings",
      value: "382",
      subtext: "94 boarding houses & dorms",
      icon: Building2,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300",
    },
    {
      label: "Pending Verifications",
      value: "3",
      subtext: "Requires admin document review",
      icon: ShieldAlert,
      color:
        "text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300",
      highlight: true,
    },
    {
      label: "System Health",
      value: "99.9%",
      subtext: "Database & APIs operational",
      icon: ShieldCheck,
      color:
        "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
  ];

  const recentVerifications = [
    {
      id: "VER-891",
      landlord: "Rodrigo D. Alonzo",
      property: "España Student Residences",
      documentType: "Barangay Clearance & DTI Permit",
      submittedTime: "45 mins ago",
      status: "Pending Review",
    },
    {
      id: "VER-890",
      landlord: "Teresa Ramos Castro",
      property: "Katipunan Heights Dormitory",
      documentType: "Mayor's Permit & Land Title",
      submittedTime: "3 hours ago",
      status: "Pending Review",
    },
    {
      id: "VER-889",
      landlord: "Mateo S. Bernardo",
      property: "Taft Avenue Scholar Hub",
      documentType: "Business Permit & Valid Gov ID",
      submittedTime: "5 hours ago",
      status: "Pending Review",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "user",
      title: "New Landlord Registration",
      desc: "Antonio Luna registered account (antonio.luna@gmail.com)",
      time: "15 mins ago",
    },
    {
      id: 2,
      type: "listing",
      title: "New Property Published",
      desc: "Morayta Green Suites added 4 new bedspace rooms",
      time: "1 hour ago",
    },
    {
      id: 3,
      type: "verified",
      title: "Landlord Verified",
      desc: "Verified Maria Elena Reyes with verified badge enabled",
      time: "2 hours ago",
    },
    {
      id: 4,
      type: "alert",
      title: "Listing Flagged by Renter",
      desc: "Listing #402 reported for inaccurate room photo",
      time: "6 hours ago",
    },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-zinc-400 dark:text-zinc-500">Admin</span>
            <span className="text-zinc-400 dark:text-zinc-500">/</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Overview
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Admin Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
              Operational
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/users"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-purple-700"
          >
            Review Verifications (3)
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-2xl border p-5 shadow-xs transition-all ${
                stat.highlight
                  ? "border-amber-400/50 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-950/15"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </span>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {stat.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Pending Verifications & Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Verifications Attention Card */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Action Required: Landlord Verifications
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Review submitted business permits and government identification
                documents.
              </p>
            </div>
            <Link
              href="/dashboard/admin/users"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentVerifications.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {item.landlord}
                    </span>
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.property} •{" "}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {item.documentType}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {item.submittedTime}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={`/dashboard/admin/verifications/${item.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700"
                  >
                    Inspect & Approve
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Platform Activity */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              System Activity
            </h2>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>

          <div className="mt-4 space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {act.desc}
                  </div>
                  <div className="text-[10px] text-zinc-400">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
