"use client";

import { useState } from "react";
import { Shield, CheckCircle2, Save } from "lucide-react";

export default function AdminProfileView() {
  const [name, setName] = useState("System Administrator");
  const [email, setEmail] = useState("admin@abangers.ph");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-zinc-400 dark:text-zinc-500">Admin</span>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            Profile
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Admin Profile & Settings
        </h1>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-xl font-bold text-white shadow-md">
            AD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {name}
              </h2>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                Super Administrator
              </span>
            </div>
            <p className="text-xs text-zinc-400">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Admin Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs focus:border-purple-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {saved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Profile changes saved!
              </span>
            )}
            <button
              type="submit"
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
            >
              <Save className="h-3.5 w-3.5" />
              Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Security Card */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <Shield className="h-5 w-5 text-purple-600" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            System Security & Permissions
          </h3>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 py-2 dark:border-zinc-800">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Two-Factor Authentication (2FA)
              </div>
              <div className="text-zinc-400">
                Requires authenticator code on admin sign-in
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
              Enabled
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Admin Audit Logging
              </div>
              <div className="text-zinc-400">
                All approval, reject, and suspension actions are tracked in
                system logs
              </div>
            </div>
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-600">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
