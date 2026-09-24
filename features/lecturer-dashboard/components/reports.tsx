"use client";

import { ArrowDownTrayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  downloadReport,
  getAttendanceSummary,
  getAttendance,
  getAllocationStats,
  listExamVenues,
  ApiError,
} from "@/lib/api";
import { formatDate, formatExamType, formatTime } from "../format";
import { useLecturer } from "../lecturer-context";
import { Panel } from "./panel";
import { EmptyState, ErrorState } from "./states";

export function Reports() {
  const { exams } = useLecturer();
  const [requestedId, setSelectedId] = useState<number | null>(null);
  const selectedId = exams.find(exam => exam.examSessionId === requestedId)?.examSessionId ?? exams[0]?.examSessionId ?? null;
  return <ReportsDetails key={selectedId ?? "none"} selectedId={selectedId} setSelectedId={setSelectedId} />;
}

function ReportsDetails({ selectedId, setSelectedId }: { selectedId: number | null; setSelectedId: (id: number) => void }) {
  const { exams, denyExam } = useLecturer();
  const [downloading, setDownloading] = useState(false);
  const downloadController = useRef<AbortController | null>(null);
  useEffect(() => () => { downloadController.current?.abort(); }, []);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    registered: number;
    venues: string;
    attending: number;
    absent: number;
    incidents: number;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selected = exams.find((exam) => exam.examSessionId === selectedId) ?? null;

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;

    async function loadPreview() {
      setPreview(null);
      setError("");
      try {
        const [allocation, venues, summary, attendance] = await Promise.all([
          getAllocationStats(selectedId!),
          listExamVenues(selectedId!),
          getAttendanceSummary(selectedId!),
          getAttendance(selectedId!),
        ]);
        if (cancelled) return;
        setPreview({
          registered: allocation.registeredStudents,
          venues: venues.map(venue => venue.venueName).join(", ") || "No venues assigned",
          attending: attendance.filter(row => ["PRESENT", "LATE", "WRONG_VENUE"].includes(row.attendanceStatus)).length,
          absent: attendance.filter(row => row.attendanceStatus === "ABSENT").length,
          incidents: summary.incidents,
        });
      } catch (reason) {
        if (!cancelled) {
          setPreview(null);
          setError(reason instanceof Error ? reason.message : "Could not load report details.");
          if (reason instanceof ApiError && reason.status === 403) denyExam(selectedId!, reason.message);
        }
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey, denyExam]);

  async function download() {
    if (selectedId == null || downloadController.current) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloading(true);
    try {
      await downloadReport(selectedId, controller.signal);
      if (controller.signal.aborted) return;
      toast.success("Report downloaded");
    } catch (reason) {
      if (controller.signal.aborted) return;
      toast.error(reason instanceof Error ? reason.message : "Could not download report");
      if (reason instanceof ApiError && reason.status === 403) denyExam(selectedId!, reason.message);
    } finally {
      downloadController.current = null;
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (exams.length === 0) {
    return <EmptyState message="No examination sessions are available." />;
  }

  return (
    <div className="animate-fade-up grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel>
        <h2 className="text-lg font-semibold">Attendance and incident report</h2>
        <p className="mt-1 text-sm text-muted">
          One PDF covering attending students, absent students and incidents across all examination venues.
        </p>
        <label className="mt-6 block text-sm font-medium">
          Examination
          <select
            value={selectedId ?? ""}
            disabled={downloading}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="field mt-2 h-11 w-full disabled:opacity-60"
          >
            {exams.map((exam) => (
              <option key={exam.examSessionId} value={exam.examSessionId}>
                {exam.courseCode} — {formatDate(exam.examDate)} {formatTime(exam.startTime)}–{formatTime(exam.endTime)} · {formatExamType(exam.examType)}
              </option>
            ))}
          </select>
        </label>
        <div className={`mt-6 rounded-[10px] p-4 text-sm leading-6 ${selected?.status === "COMPLETED" ? "bg-unza-green/5 text-unza-green" : "bg-unza-gold/10 text-amber-900"}`}>
          <ExclamationTriangleIcon className="mb-2 h-5 w-5" />
          {selected?.status === "COMPLETED" ? "Examination completed. The report includes recorded attendance, absences and incidents." : "This examination is not completed. Complete it before downloading the final report; the absence list may still be incomplete."}
          <p className="mt-2">Downloading does not mark students absent. The end-examination process marks allocated students without attendance records as absent.</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">Students with neither an attendance record nor a venue assignment are not automatically listed as absent.</p>
        <button
          onClick={download}
          disabled={downloading || selectedId == null || preview == null}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {downloading ? "Generating report…" : "Download PDF report"}
        </button>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Report summary</h2>
            <p className="mt-1 text-sm text-muted">Summary of the selected examination.</p>
          </div>
          <span className="rounded-[10px] bg-surface-muted px-3 py-1.5 font-mono text-xs">
            PDF
          </span>
        </div>
        {selected ? (
          <>
            <div className="mt-6 flex items-center gap-3 border-b border-black/8 pb-5">
              <Image src="/UNZA.png" alt="UNZA crest" width={56} height={56} className="shrink-0 object-contain" />
              <div><p className="text-sm font-bold tracking-wide">UNIVERSITY OF ZAMBIA</p><p className="mt-1 text-xs text-muted">Attendance and incident report · All venues</p></div>
            </div>
            <div className="mt-8 border-l-4 border-ink pl-5">
              <p className="font-mono text-xs font-semibold text-unza-green">
                {selected.courseCode}
              </p>
              <h3 className="mt-1 text-2xl font-bold">{formatExamType(selected.examType)}</h3>
              <p className="mt-2 text-sm text-muted">
                {formatDate(selected.examDate)} · {formatTime(selected.startTime)}–
                {formatTime(selected.endTime)}
              </p>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-black/8 pt-6">
              <div>
                <dt className="text-xs text-muted">Registered</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {preview?.registered ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Linked venues</dt>
                <dd className="mt-1 font-medium">{preview?.venues ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Recorded attendance entries</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {preview ? preview.attending + preview.absent : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Report includes</dt>
                <dd className="mt-1 font-medium">Attending + absent + incidents</dd>
              </div>
            </dl>
            <div className="mt-6 space-y-3">
              {[
                { title: "Students in attendance", count: preview?.attending, description: "Present, late and wrong-venue records; includes check-in and script submission.", empty: "No attending students recorded." },
                { title: "Absent students", count: preview?.absent, description: "Recorded absences with programme and assigned venue.", empty: "No absences recorded." },
                { title: "Incident report", count: preview?.incidents, description: "Occurrence time, type, severity, student, venue, reporter and description.", empty: "No incidents recorded." },
              ].map(section => <div key={section.title} className="rounded-[10px] bg-surface-muted p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{section.title}</h3><span className="font-mono text-sm font-semibold">{section.count ?? "—"}</span></div>
                <p className="mt-1 text-xs leading-5 text-muted">{section.count === 0 ? section.empty : section.description}</p>
              </div>)}
            </div>
          </>
        ) : (
          <EmptyState message="Select an examination to preview the report." />
        )}
      </Panel>
    </div>
  );
}
