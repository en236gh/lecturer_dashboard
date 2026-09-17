"use client";

import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  allocateStudents,
  getAllocationStats,
  listExamVenues,
  listExams,
  listRegisteredStudents,
  type AllocationStats,
  type ExamSession,
  type ExamVenue,
  type RegisteredStudent,
} from "@/lib/api";
import { allocationPercent, formatDate, formatExamType, formatTime } from "../format";
import { Badge } from "./badge";
import { MiniStat } from "./mini-stat";
import { Panel } from "./panel";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { StudentRows } from "./student-rows";

export function Exams() {
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"overview" | "students" | "venues" | "allocation">(
    "overview",
  );
  const [confirm, setConfirm] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [venues, setVenues] = useState<ExamVenue[]>([]);
  const [allocation, setAllocation] = useState<AllocationStats | null>(null);
  const [reloadListKey, setReloadListKey] = useState(0);
  const [reloadDetailKey, setReloadDetailKey] = useState(0);

  const selected = exams.find((exam) => exam.examSessionId === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadExams() {
      setLoadingList(true);
      setListError("");
      try {
        const data = await listExams();
        if (cancelled) return;
        setExams(data);
        setSelectedId((current) => current ?? data[0]?.examSessionId ?? null);
      } catch (reason) {
        if (!cancelled) {
          setListError(reason instanceof Error ? reason.message : "Could not load examinations.");
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }

    void loadExams();
    return () => {
      cancelled = true;
    };
  }, [reloadListKey]);

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;

    async function loadDetail() {
      setLoadingDetail(true);
      setDetailError("");
      setConfirm(false);
      try {
        const [registered, examVenues, stats] = await Promise.all([
          listRegisteredStudents(selectedId!),
          listExamVenues(selectedId!),
          getAllocationStats(selectedId!),
        ]);
        if (cancelled) return;
        setStudents(registered);
        setVenues(examVenues);
        setAllocation(stats);
      } catch (reason) {
        if (!cancelled) {
          setDetailError(
            reason instanceof Error ? reason.message : "Could not load examination details.",
          );
          setStudents([]);
          setVenues([]);
          setAllocation(null);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadDetailKey]);

  async function allocate() {
    if (!selected) return;
    if (!confirm) return setConfirm(true);
    setAllocating(true);
    try {
      await allocateStudents(selected.examSessionId);
      toast.success("Students allocated successfully");
      setReloadDetailKey((key) => key + 1);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Allocation failed");
    } finally {
      setAllocating(false);
      setConfirm(false);
    }
  }

  if (loadingList) return <LoadingState label="Loading examinations…" />;
  if (listError) {
    return <ErrorState message={listError} onRetry={() => setReloadListKey((k) => k + 1)} />;
  }
  if (exams.length === 0) {
    return <EmptyState message="No examination sessions are available." />;
  }

  const registeredCount = allocation?.registeredStudents ?? students.length;
  const allocatedCount = allocation?.allocatedStudents ?? 0;
  const capacity = allocation?.totalVenueCapacity ?? 0;

  return (
    <div className="animate-fade-up grid gap-5 xl:grid-cols-[360px_1fr]">
      <Panel>
        <h2 className="text-lg font-semibold">Examination sessions</h2>
        <p className="mt-1 text-sm text-muted">Select a session to review its preparation.</p>
        <div className="mt-5 space-y-2">
          {exams.map((exam) => (
            <button
              key={exam.examSessionId}
              onClick={() => setSelectedId(exam.examSessionId)}
              className={`w-full rounded-[10px] p-4 text-left transition ${
                selected?.examSessionId === exam.examSessionId
                  ? "bg-ink text-white"
                  : "bg-surface-muted hover:bg-gray-200"
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{exam.courseCode}</span>
                <span
                  className={`text-[10px] ${
                    selected?.examSessionId === exam.examSessionId
                      ? "text-white/60"
                      : "text-muted"
                  }`}
                >
                  {formatDate(exam.examDate)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-medium">
                {formatExamType(exam.examType)} · Sem {exam.semester}
              </p>
            </button>
          ))}
        </div>
      </Panel>
      <Panel>
        {!selected ? (
          <EmptyState message="Select an examination session." />
        ) : loadingDetail ? (
          <LoadingState label="Loading examination details…" />
        ) : detailError ? (
          <ErrorState message={detailError} onRetry={() => setReloadDetailKey((k) => k + 1)} />
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-semibold text-unza-green">
                    {selected.courseCode}
                  </p>
                  <Badge status={selected.status} />
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  {formatExamType(selected.examType)}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(selected.examDate)} · {formatTime(selected.startTime)}–
                  {formatTime(selected.endTime)} · {selected.academicYear}
                </p>
              </div>
              <button
                onClick={allocate}
                disabled={allocating}
                className={`h-11 rounded-[10px] px-4 text-sm font-medium text-white transition ${
                  confirm ? "bg-[#b91c1c]" : "bg-ink"
                }`}
              >
                {allocating
                  ? "Allocating…"
                  : confirm
                    ? "Confirm reallocation"
                    : "Run automatic allocation"}
              </button>
            </div>
            {confirm && (
              <p className="mt-3 rounded-[10px] bg-unza-red/5 p-3 text-sm text-unza-red">
                This replaces every existing seat allocation. Select the button again to confirm.
              </p>
            )}
            <div className="mt-6 flex gap-1 overflow-x-auto border-b border-black/8">
              {(["overview", "students", "venues", "allocation"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`border-b-2 px-4 py-3 text-sm font-medium capitalize ${
                    tab === item ? "border-ink text-ink" : "border-transparent text-muted"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {tab === "overview" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <MiniStat label="Registered" value={registeredCount} />
                <MiniStat label="Allocated" value={allocatedCount} good />
                <MiniStat
                  label="Unallocated"
                  value={Math.max(registeredCount - allocatedCount, 0)}
                  warn
                />
              </div>
            )}
            {tab === "students" && (
              <StudentRows
                students={students.map((student) => ({
                  computerNumber: student.computerNumber,
                  name: student.fullName,
                  meta: `${student.program} · Year ${student.yearOfStudy}`,
                }))}
                emptyMessage="No students are registered for this examination."
              />
            )}
            {tab === "venues" && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {venues.length === 0 ? (
                  <EmptyState message="No venues are assigned to this examination." />
                ) : (
                  venues.map((venue) => {
                    const fill = allocation?.venueFills.find((item) => item.venueId === venue.venueId);
                    return (
                      <div key={venue.venueId} className="rounded-[10px] bg-surface-muted p-4">
                        <BuildingOffice2Icon className="h-6 w-6" />
                        <p className="mt-4 font-semibold">{venue.venueName}</p>
                        <p className="mt-1 text-sm text-muted">
                          {venue.building} · {venue.capacity} seats
                        </p>
                        {fill && (
                          <p className="mt-2 text-xs text-muted">
                            Allocated {fill.allocated} / {fill.capacity}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {tab === "allocation" && (
              <div className="mt-6">
                <div className="mb-5">
                  <div className="flex justify-between text-sm">
                    <span>Venue capacity used</span>
                    <span className="font-semibold">
                      {allocatedCount} / {capacity}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-unza-green"
                      style={{ width: `${allocationPercent(allocatedCount, capacity)}%` }}
                    />
                  </div>
                </div>
                <StudentRows
                  allocation
                  students={(allocation?.allocations ?? []).map((row) => ({
                    computerNumber: row.computerNumber,
                    name: row.studentName,
                    venueName: row.venueName,
                    seat: row.seatNumber,
                  }))}
                  emptyMessage="No students have been allocated yet."
                />
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
