"use client";

import { ArrowDownTrayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  downloadReport,
  getAttendanceSummary,
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
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    registered: number;
    venue: string;
    attendanceRecords: number;
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
        const [allocation, venues, summary] = await Promise.all([
          getAllocationStats(selectedId!),
          listExamVenues(selectedId!),
          getAttendanceSummary(selectedId!),
        ]);
        if (cancelled) return;
        setPreview({
          registered: allocation.registeredStudents,
          venue: venues[0]?.venueName ?? "No venue assigned",
          attendanceRecords: summary.checkedIn + summary.absent,
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
    if (selectedId == null) return;
    setDownloading(true);
    try {
      await downloadReport(selectedId);
      toast.success("Report downloaded");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not download report");
      if (reason instanceof ApiError && reason.status === 403) denyExam(selectedId!, reason.message);
    } finally {
      setDownloading(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (exams.length === 0) {
    return <EmptyState message="No examination sessions are available." />;
  }

  return (
    <div className="animate-fade-up grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1.2fr)]">
      <Panel>
        <h2 className="text-lg font-semibold">Generate examination report</h2>
        <p className="mt-1 text-sm text-muted">
          Download a combined attendance and incident report.
        </p>
        <label className="mt-6 block text-sm font-medium">
          Examination
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="field mt-2 w-full"
          >
            {exams.map((exam) => (
              <option key={exam.examSessionId} value={exam.examSessionId}>
                {exam.courseCode} — {formatDate(exam.examDate)} {formatTime(exam.startTime)}–{formatTime(exam.endTime)} · {formatExamType(exam.examType)}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-6 rounded-[10px] bg-unza-gold/10 p-4 text-sm leading-6 text-amber-900">
          <ExclamationTriangleIcon className="mb-2 h-5 w-5" />
          Absent students are excluded from the PDF attendance table. Recorded incidents are
          included.
        </div>
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
            <h2 className="text-lg font-semibold">Report preview</h2>
            <p className="mt-1 text-sm text-muted">Summary of the selected examination.</p>
          </div>
          <span className="rounded-[10px] bg-surface-muted px-3 py-1.5 font-mono text-xs">
            PDF
          </span>
        </div>
        {selected ? (
          <>
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
                <dt className="text-xs text-muted">Primary venue</dt>
                <dd className="mt-1 font-medium">{preview?.venue ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Attendance records</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {preview?.attendanceRecords ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Report includes</dt>
                <dd className="mt-1 font-medium">Attendance + incidents</dd>
              </div>
            </dl>
          </>
        ) : (
          <EmptyState message="Select an examination to preview the report." />
        )}
      </Panel>
    </div>
  );
}
