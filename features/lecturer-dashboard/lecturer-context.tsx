"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getLecturerDashboard, listAssignedCourses, listCourseHierarchy, listExams, type CourseHierarchyRow, type ExamSession, type LecturerDashboardTotals } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "./components/states";

type LecturerData = {
  courses: string[];
  hierarchy: CourseHierarchyRow[];
  exams: ExamSession[];
  totals: LecturerDashboardTotals;
};
const LecturerContext = createContext<(LecturerData & {
  refresh: () => Promise<void>;
  denyExam: (id: number, message: string) => void;
}) | null>(null);

// Account-scoped memory only: the provider is remounted on logout/account change.
export function LecturerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LecturerData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const denied = useRef(new Set<number>());

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const [courses, exams, totals, hierarchy] = await Promise.all([
        listAssignedCourses(), listExams(), getLecturerDashboard(), listCourseHierarchy(),
      ]);
      if (request !== generation.current) return;
      setData({ courses, hierarchy, exams: exams.filter(exam => !denied.current.has(exam.examSessionId)), totals });
      setError("");
    } catch (reason) {
      if (request === generation.current) {
        setError(reason instanceof Error ? reason.message : "Could not load your courses.");
      }
    }
  }, []);

  useEffect(() => {
    const lifecycle = generation;
    void refresh();
    return () => { lifecycle.current++; };
  }, [refresh]);

  const denyExam = useCallback((id: number, message: string) => {
    denied.current.add(id);
    setNotice(message);
    setData(current => current && ({ ...current, exams: current.exams.filter(exam => exam.examSessionId !== id) }));
    void refresh();
  }, [refresh]);

  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (!data) return <LoadingState label="Loading your courses and examinations…" />;

  return (
    <LecturerContext.Provider value={{ ...data, refresh, denyExam }}>
      {notice && <p role="alert" className="mb-5 rounded-[10px] bg-unza-red/5 p-4 text-sm text-unza-red">{notice}</p>}
      {data.courses.length === 0 ? (
        <EmptyState message="No courses assigned. Contact the administrator." />
      ) : <>
        <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Assigned courses">
          <span className="mr-1 text-sm text-muted">My courses</span>
          {data.courses.map(code => <span key={code} className="rounded-full border border-unza-green/15 bg-unza-green/5 px-3 py-1 font-mono text-xs font-semibold text-unza-green">{code}</span>)}
        </div>
        {data.exams.length === 0 ? <EmptyState message="No examinations available for your assigned courses." /> : children}
      </>}
    </LecturerContext.Provider>
  );
}

export function useLecturer() {
  const value = useContext(LecturerContext);
  if (!value) throw new Error("LecturerProvider is required.");
  return value;
}
