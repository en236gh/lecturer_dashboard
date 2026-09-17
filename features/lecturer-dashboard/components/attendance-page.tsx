"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import {
  getAttendance,
  getAttendanceSummary,
  listExams,
  type AttendanceRecord,
  type AttendanceSummary,
  type ExamSession,
} from "@/lib/api";
import {
  formatDate,
  formatExamType,
  formatTime,
  formatVerificationMethod,
} from "../format";
import { Badge } from "./badge";
import { MiniStat } from "./mini-stat";
import { Panel } from "./panel";
import { EmptyState, ErrorState, LoadingState } from "./states";

const POLL_MS = 15000;

export function AttendancePage() {
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [examsError, setExamsError] = useState("");
  const [dataError, setDataError] = useState("");
  const [reloadExamsKey, setReloadExamsKey] = useState(0);
  const [reloadDataKey, setReloadDataKey] = useState(0);

  const selected = exams.find((exam) => exam.examSessionId === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadExams() {
      setLoadingExams(true);
      setExamsError("");
      try {
        const data = await listExams();
        if (cancelled) return;
        setExams(data);
        const preferred =
          data.find((exam) => exam.status === "IN_PROGRESS") ??
          data.find((exam) => exam.status === "SCHEDULED") ??
          data[0];
        setSelectedId((current) => current ?? preferred?.examSessionId ?? null);
      } catch (reason) {
        if (!cancelled) {
          setExamsError(reason instanceof Error ? reason.message : "Could not load examinations.");
        }
      } finally {
        if (!cancelled) setLoadingExams(false);
      }
    }

    void loadExams();
    return () => {
      cancelled = true;
    };
  }, [reloadExamsKey]);

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function loadAttendance(silent = false) {
      if (!silent) {
        setLoadingData(true);
        setDataError("");
      }
      try {
        const [attendance, attendanceSummary] = await Promise.all([
          getAttendance(selectedId!),
          getAttendanceSummary(selectedId!),
        ]);
        if (cancelled) return;
        setRecords(attendance);
        setSummary(attendanceSummary);
      } catch (reason) {
        if (!cancelled && !silent) {
          setDataError(
            reason instanceof Error ? reason.message : "Could not load attendance.",
          );
          setRecords([]);
          setSummary(null);
        }
      } finally {
        if (!cancelled && !silent) setLoadingData(false);
      }
    }

    void loadAttendance();

    if (selected?.status === "IN_PROGRESS") {
      timer = setInterval(() => {
        void loadAttendance(true);
      }, POLL_MS);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [selectedId, selected?.status, reloadDataKey]);

  const list = useMemo(
    () =>
      records.filter(
        (row) =>
          (filter === "ALL" || row.attendanceStatus === filter) &&
          `${row.studentName} ${row.computerNumber}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [records, query, filter],
  );

  if (loadingExams) return <LoadingState label="Loading examinations…" />;
  if (examsError) {
    return <ErrorState message={examsError} onRetry={() => setReloadExamsKey((k) => k + 1)} />;
  }
  if (exams.length === 0) {
    return <EmptyState message="No examination sessions are available." />;
  }

  const scriptsPending = summary
    ? Math.max(summary.checkedIn - summary.scriptsCollected, 0)
    : 0;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block text-sm font-medium">
          Examination
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="field mt-2 w-full sm:min-w-[320px]"
          >
            {exams.map((exam) => (
              <option key={exam.examSessionId} value={exam.examSessionId}>
                {exam.courseCode} — {formatDate(exam.examDate)} ({exam.status.replaceAll("_", " ")})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadingData ? (
        <LoadingState label="Loading attendance…" />
      ) : dataError ? (
        <ErrorState message={dataError} onRetry={() => setReloadDataKey((k) => k + 1)} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Checked in" value={summary?.checkedIn ?? 0} good />
            <MiniStat label="Absent" value={summary?.absent ?? 0} warn />
            <MiniStat label="Scripts collected" value={summary?.scriptsCollected ?? 0} good />
            <MiniStat label="Scripts pending" value={scriptsPending} warn />
          </div>
          <Panel>
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">Live attendance</h2>
                  {selected?.status === "IN_PROGRESS" && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-unza-green">
                      <span className="h-2 w-2 rounded-full bg-unza-green" />
                      Live
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {selected
                    ? `${selected.courseCode} · ${formatExamType(selected.examType)} · ${formatDate(selected.examDate)}`
                    : "Select an examination"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="field h-10 pl-10"
                    placeholder="Search student"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="field h-10"
                >
                  <option value="ALL">All statuses</option>
                  <option>PRESENT</option>
                  <option>LATE</option>
                  <option>ABSENT</option>
                  <option>WRONG_VENUE</option>
                </select>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-black/8 text-xs text-muted">
                  <tr>
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Venue</th>
                    <th className="pb-3 font-medium">Check-in</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Script</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {list.map((row) => (
                    <tr key={`${row.attendanceId}-${row.computerNumber}`}>
                      <td className="py-4">
                        <p className="font-medium">{row.studentName}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted">
                          {row.computerNumber}
                        </p>
                      </td>
                      <td className="py-4">
                        <p>{row.venueName ?? "—"}</p>
                      </td>
                      <td className="py-4">
                        {row.checkInTime ? formatTime(row.checkInTime) : "Not checked in"}
                        <p className="text-xs text-muted">
                          {formatVerificationMethod(row.verificationMethod)}
                        </p>
                      </td>
                      <td className="py-4">
                        <Badge status={row.attendanceStatus} />
                      </td>
                      <td className="py-4">
                        {row.scriptsSubmitted ? (
                          <CheckCircleIcon className="h-5 w-5 text-unza-green" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-muted" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <p className="py-14 text-center text-sm text-muted">
                  No attendance records match your search.
                </p>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
