"use client";
import { useEffect, useRef, useState } from "react";
import { apiRequest, type ExamSession } from "@/lib/api";

type RequestRow = {
  request_id: number;
  exam_session_id: number | null;
  course_code: string;
  proposed_change: string;
  reason: string;
  status: string;
  decision: string | null;
};

export function ChangeRequest({ exam }: { exam: ExamSession }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestRows, setRequestRows] = useState<{ key: string; rows: RequestRow[] }>({ key: "", rows: [] });
  const guard = useRef(false);
  const requestKey = `${exam.periodId}:${exam.courseCode}`;
  const rows = requestRows.key === requestKey ? requestRows.rows : [];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!exam.periodId) return;
      setLoading(true);
      try {
        const all = await apiRequest<RequestRow[]>(`/api/examination-change-requests?periodId=${exam.periodId}`);
        if (!cancelled) {
          setRequestRows({ key: requestKey, rows: all.filter(row => row.course_code === exam.courseCode) });
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [exam.courseCode, exam.periodId, requestKey]);

  if (!exam.periodId) return null;

  async function load() {
    const all = await apiRequest<RequestRow[]>(`/api/examination-change-requests?periodId=${exam.periodId}`);
    setRequestRows({ key: requestKey, rows: all.filter(row => row.course_code === exam.courseCode) });
  }

  async function refreshRequests() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    try {
      await load();
      setMessage("Latest request statuses loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load requests.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="mt-5 rounded-[10px] border border-black/10 p-4">
      <summary className="cursor-pointer font-medium">Request a timetable correction</summary>
      <p className="mt-3 text-sm text-muted">The coordinator reviews requests. Submission does not change the published timetable.</p>
      <form className="mt-3 space-y-3" onSubmit={async event => {
        event.preventDefault();
        if (guard.current) return;
        guard.current = true;
        setBusy(true);
        const form = new FormData(event.currentTarget);
        try {
          await apiRequest("/api/examination-change-requests", {
            method: "POST",
            body: JSON.stringify({
              periodId: exam.periodId,
              courseCode: exam.courseCode,
              examSessionId: exam.examSessionId,
              proposedChange: form.get("proposal"),
              reason: form.get("reason"),
            }),
          }, false);
          setMessage("Request submitted. The timetable is unchanged.");
          await load();
        } catch (error) {
          setMessage(`${error instanceof Error ? error.message : "Could not confirm submission."} Check your requests before explicitly retrying.`);
        } finally {
          guard.current = false;
          setBusy(false);
        }
      }}>
        <label className="block text-sm">Proposed correction<textarea className="field mt-1 w-full" name="proposal" maxLength={4000} required /></label>
        <label className="block text-sm">Reason<textarea className="field mt-1 w-full" name="reason" maxLength={2000} required /></label>
        <button className="rounded bg-ink px-4 py-2 text-white disabled:opacity-50" disabled={busy}>Submit change request</button>
      </form>
      <button className="mt-3 text-sm font-medium text-unza-green disabled:opacity-50" disabled={busy} onClick={() => void refreshRequests()}>
        Refresh my requests
      </button>
      <p className="mt-2 text-sm" role="status">{busy ? "Working…" : loading ? "Loading your requests…" : message}</p>
      {rows.map(row => (
        <div key={row.request_id} className="mt-3 rounded bg-surface-muted p-3 text-sm">
          <p>Request #{row.request_id} · {row.status}</p>
          <p>{row.proposed_change}</p>
          <p>{row.reason}</p>
          {row.decision && <p>Decision: {row.decision}</p>}
        </div>
      ))}
      {!loading && rows.length === 0 && <p className="mt-3 text-sm text-muted">No timetable requests for this course in this period.</p>}
    </details>
  );
}
