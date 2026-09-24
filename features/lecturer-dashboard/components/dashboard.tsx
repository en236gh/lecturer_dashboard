"use client";

import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useLecturer } from "../lecturer-context";
import type { View } from "../types";
import { ExamCard } from "./exam-card";
import { StatTile } from "./stat-tile";

export function Dashboard({ go }: { go: (view: View) => void }) {
  const { totals, exams: allExams } = useLecturer();
  const exams = allExams.filter(exam => exam.status !== "COMPLETED").slice(0, 3);

  const allocatedPercent =
    totals.registeredStudents > 0
      ? ((totals.allocatedStudents / totals.registeredStudents) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="animate-fade-up space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          title="Total examinations"
          value={String(totals.totalExaminations).padStart(2, "0")}
          note="Across your assigned courses"
          icon={<AcademicCapIcon className="h-6 w-6" />}
        />
        <StatTile
          title="Exam registrations"
          value={String(totals.registeredStudents)}
          note="Counted per examination session"
          icon={<UsersIcon className="h-6 w-6" />}
          accent="green"
        />
        <StatTile
          title="Seat allocations"
          value={String(totals.allocatedStudents)}
          note={`${allocatedPercent} percent`}
          icon={<MapPinIcon className="h-6 w-6" />}
          accent="gold"
        />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <p className="mt-1 text-sm text-muted">Move directly to your current examination tasks.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Manage examinations",
              copy: "Review schedules, venues and student allocation.",
              icon: CalendarDaysIcon,
              view: "exams" as View,
            },
            {
              title: "Monitor attendance",
              copy: "Follow live check-ins and script collection.",
              icon: ClipboardDocumentCheckIcon,
              view: "attendance" as View,
            },
            {
              title: "Generate a report",
              copy: "Download combined attendance and incident records.",
              icon: ArrowDownTrayIcon,
              view: "reports" as View,
            },
          ].map((item) => (
            <button
              key={item.title}
              onClick={() => go(item.view)}
              className="group min-h-36 rounded-[10px] border border-transparent bg-white p-5 text-left shadow-panel transition hover:border-unza-gold/50"
            >
              <div className="flex items-start justify-between">
                <item.icon className="h-6 w-6" />
                <ChevronRightIcon className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-ink" />
              </div>
              <h3 className="mt-5 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted">{item.copy}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Upcoming and active examinations</h2>
            <p className="mt-1 text-sm text-muted">Your next scheduled examination sessions.</p>
          </div>
          <button onClick={() => go("exams")} className="hidden text-sm font-medium sm:block">
            View all
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {exams.length === 0 ? (
            <p className="text-sm text-muted">No upcoming examinations.</p>
          ) : (
            exams.map((exam) => (
              <ExamCard key={exam.examSessionId} exam={exam} onOpen={() => go("exams")} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
