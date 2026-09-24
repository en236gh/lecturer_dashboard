"use client";

import {
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { Toaster } from "sonner";
import { getStoredEmail } from "@/lib/api";
import { nav, viewTitles } from "../data";
import { displayNameFromEmail, greetingForNow, initialsFromEmail } from "../format";
import type { View } from "../types";
import { AttendancePage } from "./attendance-page";
import { Brand } from "./brand";
import { Dashboard } from "./dashboard";
import { Exams } from "./exams";
import { Reports } from "./reports";
import { LecturerProvider } from "../lecturer-context";

export function AppShell({ onSignOut }: { onSignOut: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const email = useMemo(() => getStoredEmail(), []);
  const displayName = displayNameFromEmail(email);
  const initials = initialsFromEmail(email);

  function navigate(next: View) {
    setView(next);
    setSidebar(false);
  }

  const title = view === "dashboard" ? greetingForNow() : viewTitles[view];

  return (
    <div className="min-h-screen bg-app">
      {sidebar && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebar(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col rounded-r-[10px] bg-white px-5 py-7 shadow-sidebar transition-transform lg:translate-x-0 ${
          sidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebar(false)}
          className="absolute right-4 top-4 text-muted lg:hidden"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <Brand />
        <nav className="mt-9 space-y-1">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-sm font-medium transition ${
                view === item.id
                  ? "bg-ink text-white shadow-lg shadow-black/10"
                  : "text-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <item.icon className="h-6 w-6" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-black/6 pt-5">
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 px-3 py-3 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeftStartOnRectangleIcon className="h-5 w-5" />
            sign out
          </button>
        </div>
      </aside>
      <main className="min-h-screen p-4 lg:pl-[322px] lg:pr-8 lg:pt-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebar(true)}
              className="grid h-11 w-11 place-items-center rounded-[10px] bg-white shadow-panel lg:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink md:text-4xl">
                {title}
              </h1>
              {view === "dashboard" && (
                <p className="mt-1 hidden text-sm text-muted md:block">
                  Here is what is happening with your examinations today.
                </p>
              )}
            </div>
          </div>
          <div className="hidden h-12 max-w-md flex-1 items-center gap-3 rounded-[10px] bg-surface-muted px-4 transition focus-within:bg-white focus-within:ring-4 focus-within:ring-ink/5 md:flex">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search examinations or students"
            />
          </div>
          <div className="flex items-center gap-3 rounded-[10px] bg-white/70 p-2 pr-3 shadow-panel backdrop-blur">
            <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-gradient-to-br from-unza-gold to-amber-400 text-sm font-bold">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs capitalize text-muted">lecturer</p>
            </div>
          </div>
        </header>
        <LecturerProvider>
          {view === "dashboard" && <Dashboard go={navigate} />}
          {view === "exams" && <Exams />}
          {view === "attendance" && <AttendancePage />}
          {view === "reports" && <Reports />}
        </LecturerProvider>
      </main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
