"use client";

import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import {
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
  const { exams, hierarchy, denyExam } = useLecturer();
  const [filters, setFilters] = useState<string[]>(["", "", "", "", ""]);
  const [requestedId, setSelectedId] = useState<number | null>(null);
  const courseCodes = new Set(filterCurriculum(hierarchy, filters).map(row => row.course_code));
  const filteredExams = filters.some(Boolean) ? exams.filter(exam => courseCodes.has(exam.courseCode)) : exams;
  const selectedId = filteredExams.find(exam => exam.examSessionId === requestedId)?.examSessionId ?? filteredExams[0]?.examSessionId ?? null;
  return <div className="space-y-5">
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-semibold">Find your examination</h2><p className="mt-1 text-sm text-muted">Browse your assigned courses by curriculum, then choose an examination session.</p></div>
        <button disabled={!filters.some(Boolean)} onClick={() => { setFilters(["", "", "", "", ""]); setSelectedId(null); }} className="shrink-0 text-sm font-medium text-unza-green disabled:opacity-40">Clear filters</button>
      </div>
      {hierarchy.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {curriculumLevels.map((label, level) => <label key={label} className="min-w-0 text-xs font-semibold text-muted">
          {label}
          <select value={filters[level]} onChange={event => { setFilters(current => current.map((value, index) => index < level ? value : index === level ? event.target.value : "")); setSelectedId(null); }} className="field mt-2 h-11 w-full text-ink">
            <option value="">All {label.toLowerCase() === "year / semester" ? "years / semesters" : label.toLowerCase() === "major" ? "majors / no major" : `${label.toLowerCase()}s`}</option>
            {curriculumOptions(hierarchy, filters, level).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
        </label>)}
      </div> : <p className="mt-4 text-sm text-muted">No active curriculum rows are available. Your assigned examination sessions are listed below.</p>}
      <p className="mt-4 rounded-[10px] bg-unza-green/5 p-3 text-sm text-unza-green">Curriculum filters help you find a course. Venue allocation includes all registered students for the selected examination’s course, academic year and semester, across majors.</p>
    </Panel>
    {filteredExams.length === 0 ? <Panel><EmptyState message="No examinations available for the selected curriculum or course. Try clearing the filters." /></Panel> : <ExamDetails key={selectedId ?? "none"} selectedId={selectedId} examIds={filteredExams.map(exam => exam.examSessionId)} onSelect={setSelectedId} denyExam={denyExam} />}
  </div>;
}

function ExamDetails({ selectedId, examIds, onSelect, denyExam }: { selectedId: number | null; examIds: number[]; onSelect: (id: number) => void; denyExam: (id: number, message: string) => void }) {
  const { exams: allExams, hierarchy } = useLecturer();
  const exams = allExams.filter(exam => examIds.includes(exam.examSessionId));
  const [tab, setTab] = useState<"overview" | "students" | "venues" | "allocation">(
    "overview",
  );
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
            </div>
            {(students.length === 0 || venues.length === 0) && <p role="status" className="mt-4 rounded-[10px] bg-unza-gold/10 p-3 text-sm">{students.length === 0 ? "No registered students found for this examination. " : ""}{venues.length === 0 ? "No venues linked to this examination. " : ""}</p>}
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
