"use client";

import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  allocateStudents,
  getAllocationStats,
  listExamVenues,
  ApiError,
  listRegisteredStudents,
  type AllocationStats,
  type ExamVenue,
  type RegisteredStudent,
} from "@/lib/api";
import { allocationPercent, formatDate, formatExamType, formatTime } from "../format";
import { useLecturer } from "../lecturer-context";
import { curriculumLevels, curriculumOptions, filterCurriculum } from "../course-filters";
import { Badge } from "./badge";
import { MiniStat } from "./mini-stat";
import { Panel } from "./panel";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { StudentRows } from "./student-rows";

export function Exams() {
  const { exams, hierarchy, refresh, denyExam } = useLecturer();
  const [filters, setFilters] = useState<string[]>(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [requestedId, setSelectedId] = useState<number | null>(null);
  const courseCodes = new Set(filterCurriculum(hierarchy, filters).map(row => row.course_code));
  const filteredExams = filters.some(Boolean) ? exams.filter(exam => courseCodes.has(exam.courseCode)) : exams;
  const selectedId = filteredExams.find(exam => exam.examSessionId === requestedId)?.examSessionId ?? filteredExams[0]?.examSessionId ?? null;
  return <div className="space-y-5">
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold">Find your examination</h2><p className="mt-1 text-sm text-muted">Browse your assigned courses by curriculum, then choose an examination session.</p></div>
        <button disabled={busy || !filters.some(Boolean)} onClick={() => { setFilters(["", "", "", "", ""]); setSelectedId(null); }} className="shrink-0 text-sm font-medium text-unza-green disabled:opacity-40">Clear filters</button>
      </div>
      {hierarchy.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {curriculumLevels.map((label, level) => <label key={label} className="min-w-0 text-xs font-semibold text-muted">
          {label}
          <select value={filters[level]} disabled={busy} onChange={event => { setFilters(current => current.map((value, index) => index < level ? value : index === level ? event.target.value : "")); setSelectedId(null); }} className="field mt-2 h-11 w-full text-ink disabled:opacity-50">
            <option value="">All {label.toLowerCase() === "year / semester" ? "years / semesters" : label.toLowerCase() === "major" ? "majors / no major" : `${label.toLowerCase()}s`}</option>
            {curriculumOptions(hierarchy, filters, level).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
        </label>)}
      </div> : <p className="mt-4 text-sm text-muted">No active curriculum rows are available. Your assigned examination sessions are listed below.</p>}
      <p className="mt-4 rounded-[10px] bg-unza-green/5 p-3 text-sm text-unza-green">Curriculum filters help you find a course. Seat allocation includes all registered students for the selected examination’s course, academic year and semester, across majors.</p>
    </Panel>
    {filteredExams.length === 0 ? <Panel><EmptyState message="No examinations available for the selected curriculum or course. Try clearing the filters." /></Panel> : <ExamDetails key={selectedId ?? "none"} selectedId={selectedId} examIds={filteredExams.map(exam => exam.examSessionId)} onSelect={setSelectedId} onBusy={setBusy} refresh={refresh} denyExam={denyExam} />}
  </div>;
}

function ExamDetails({ selectedId, examIds, onSelect, onBusy, refresh, denyExam }: { selectedId: number | null; examIds: number[]; onSelect: (id: number) => void; onBusy: (busy: boolean) => void; refresh: () => Promise<void>; denyExam: (id: number, message: string) => void }) {
  const { exams: allExams, hierarchy } = useLecturer();
  const exams = allExams.filter(exam => examIds.includes(exam.examSessionId));
  const active = useRef(true);
  const allocationPending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const [tab, setTab] = useState<"overview" | "students" | "venues" | "allocation">(
    "overview",
  );
  const [confirm, setConfirm] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [venues, setVenues] = useState<ExamVenue[]>([]);
  const [allocation, setAllocation] = useState<AllocationStats | null>(null);
  const [reloadDetailKey, setReloadDetailKey] = useState(0);

  const selected = exams.find((exam) => exam.examSessionId === selectedId) ?? null;

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;

    async function loadDetail() {
      setLoadingDetail(true);
      setDetailError("");
      setConfirm(false);
      setStudents([]);
      setVenues([]);
      setAllocation(null);
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
          if (reason instanceof ApiError && reason.status === 403) denyExam(selectedId!, reason.message);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadDetailKey, denyExam]);

  async function allocate() {
    if (!selected || allocationPending.current || loadingDetail || detailError) return;
    if (!confirm) return setConfirm(true);
    allocationPending.current = true;
    onBusy(true);
    setAllocating(true);
    try {
      await allocateStudents(selected.examSessionId);
      await refresh();
      if (!active.current) return;
      toast.success("Students allocated successfully");
      setReloadDetailKey((key) => key + 1);
    } catch (reason) {
      if (!active.current) return;
      toast.error(reason instanceof Error ? reason.message : "Allocation failed");
      if (reason instanceof ApiError && reason.status === 403) {
        setStudents([]); setVenues([]); setAllocation(null);
        setDetailError(reason.message);
        denyExam(selectedId!, reason.message);
      }
    } finally {
      allocationPending.current = false;
      onBusy(false);
      if (active.current) { setAllocating(false); setConfirm(false); }
    }
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
              onClick={() => onSelect(exam.examSessionId)}
              aria-pressed={selected?.examSessionId === exam.examSessionId}
              disabled={allocating}
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
                {formatTime(exam.startTime)}–{formatTime(exam.endTime)} · {formatExamType(exam.examType)} · Sem {exam.semester}
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
                  {hierarchy.find(row => row.course_code === selected.courseCode)?.course_name ?? formatExamType(selected.examType)}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(selected.examDate)} · {formatTime(selected.startTime)}–
                  {formatTime(selected.endTime)} · {selected.academicYear} · Semester {selected.semester} · {formatExamType(selected.examType)}
                </p>
              </div>
              <button
                onClick={allocate}
                disabled={allocating || students.length === 0 || venues.length === 0}
                className={`h-11 rounded-[10px] px-4 text-sm font-medium text-white transition disabled:opacity-50 ${
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
            {(students.length === 0 || venues.length === 0) && <p role="status" className="mt-4 rounded-[10px] bg-unza-gold/10 p-3 text-sm">{students.length === 0 ? "No registered students found for this examination. " : ""}{venues.length === 0 ? "No venues linked to this examination. " : ""}Allocation is available once registrations and venues are ready.</p>}
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
