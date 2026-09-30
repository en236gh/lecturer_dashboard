"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, listChangeRequests, submitChangeRequest, type ChangeRequestRow, type ExamSession } from "@/lib/api";
import { useLecturer } from "../lecturer-context";

export function ChangeRequest({ exam }: { exam: ExamSession }) {
  const { denyExam } = useLecturer();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ChangeRequestRow[]>([]);
  const guard = useRef(false);
  const generation = useRef(0);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 403) {
      setRows([]);
      denyExam(exam.examSessionId, error.message);
    }
    return error instanceof Error ? error.message : "Could not load requests.";
  }, [denyExam, exam.examSessionId]);

  const load = useCallback(async (version: number) => {
    if (exam.periodId == null) return;
    const all = await listChangeRequests(exam.periodId);
    if (generation.current === version) setRows(all.filter(row => row.course_code === exam.courseCode));
  }, [exam.periodId, exam.courseCode]);

  useEffect(() => {
    const lifecycle = generation;
    const version = ++lifecycle.current;
    void load(version).catch(error => {
      if (generation.current === version) setMessage(handleError(error));
    }).finally(() => {
      if (generation.current === version) setLoading(false);
    });
    return () => { lifecycle.current++; };
  }, [load, handleError]);

  if (exam.periodId == null || !exam.schedulePublished) return null;

  async function refreshRequests() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    const version = generation.current;
    try {
      await load(version);
      if (generation.current === version) setMessage("Latest request statuses loaded.");
    } catch (error) {
      if (generation.current === version) setMessage(handleError(error));
    } finally {
      guard.current = false;
      if (generation.current === version) setBusy(false);
    }
  }

  return (
    <details className="mt-5 rounded-[10px] border border-black/10 p-4">
      <summary className="cursor-pointer font-medium">Request a timetable correction</summary>
      <p className="mt-3 text-sm text-muted">Only an Administrator can decide requests. Submission and approval do not edit the published timetable.</p>
      <form className="mt-3 space-y-3" onSubmit={async event => {
        event.preventDefault();
        if (guard.current) return;
        const element = event.currentTarget;
        const form = new FormData(element);
        const proposedChange = String(form.get("proposal") ?? "").trim();
        const reason = String(form.get("reason") ?? "").trim();
        if (!proposedChange || !reason) { setMessage("Enter a proposed correction and a reason."); return; }
        guard.current = true;
        setBusy(true);
        const version = generation.current;
        let submitted = false;
        try {
          const row = await submitChangeRequest({ periodId: exam.periodId!, courseCode: exam.courseCode, examSessionId: exam.examSessionId, proposedChange, reason });
          if (generation.current !== version) return;
          submitted = true;
          setRows(current => [row, ...current.filter(item => item.request_id !== row.request_id)]);
          element.reset();
          setMessage("Request submitted. The timetable is unchanged.");
          await load(version);
        } catch (error) {
          if (generation.current === version) {
            const detail = handleError(error);
            setMessage(submitted ? `Request submitted, but history could not refresh. ${detail}` : `${detail} Check your requests before retrying submission.`);
          }
        } finally {
          guard.current = false;
          if (generation.current === version) setBusy(false);
        }
      }}>
        <label className="block text-sm">Proposed correction<textarea className="field mt-1 w-full" name="proposal" maxLength={4000} required disabled={busy} /></label>
        <label className="block text-sm">Reason<textarea className="field mt-1 w-full" name="reason" maxLength={2000} required disabled={busy} /></label>
        <button className="rounded bg-ink px-4 py-2 text-white disabled:opacity-50" disabled={busy || loading}>Submit change request</button>
      </form>
      <button className="mt-3 text-sm font-medium text-unza-green disabled:opacity-50" disabled={busy || loading} onClick={() => void refreshRequests()}>Refresh my requests</button>
      <p className="mt-2 text-sm" role="status">{busy ? "Working…" : loading ? "Loading your requests…" : message}</p>
      {rows.map(row => (
        <div key={row.request_id} className="mt-3 rounded bg-surface-muted p-3 text-sm">
          <p>Request #{row.request_id} · {row.status} · {row.exam_session_id == null ? "Course-wide" : `Exam #${row.exam_session_id}`}</p>
          <p>{row.proposed_change}</p><p>{row.reason}</p>
          {row.decision && <p>Decision: {row.decision}</p>}
          <p className="mt-2 text-xs text-muted">Submitted: {new Date(row.created_at).toLocaleString()}</p>
          {row.decided_at && <p className="text-xs text-muted">Decided: {new Date(row.decided_at).toLocaleString()}</p>}
        </div>
      ))}
      {!loading && !message && rows.length === 0 && <p className="mt-3 text-sm text-muted">No timetable requests for this course in this period.</p>}
    </details>
  );
}
