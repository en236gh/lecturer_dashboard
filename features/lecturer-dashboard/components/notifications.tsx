"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, listNotifications, markNotificationRead, type ExaminationNotification } from "@/lib/api";

export function Notifications() {
  const [rows, setRows] = useState<ExaminationNotification[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const generation = useRef(0);
  const guard = useRef(false);

  const load = useCallback(async (version: number) => {
    const inbox = await listNotifications();
    if (generation.current === version) { setRows(inbox); setError(""); }
  }, []);

  useEffect(() => {
    const lifecycle = generation;
    const version = ++lifecycle.current;
    void load(version).catch(reason => {
      if (generation.current === version) setError(reason instanceof Error ? reason.message : "Could not load notices.");
    }).finally(() => {
      if (generation.current === version) setBusy(false);
    });
    return () => { lifecycle.current++; };
  }, [load]);

  async function update(id?: number) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    const version = generation.current;
    try {
      if (id !== undefined) await markNotificationRead(id);
      if (generation.current === version) await load(version);
    } catch (reason) {
      if (generation.current === version) {
        if (reason instanceof ApiError && reason.status === 403) setRows([]);
        setError(reason instanceof Error ? reason.message : "Could not update notices.");
      }
    } finally {
      guard.current = false;
      if (generation.current === version) setBusy(false);
    }
  }

  return <details className="mb-5 rounded-[10px] bg-white p-5 shadow-panel">
    <summary className="cursor-pointer font-semibold">Timetable notices ({rows.filter(row => !row.read_at).length} unread)</summary>
    <button className="mt-3 text-sm font-medium text-unza-green disabled:opacity-50" disabled={busy} onClick={() => void update()}>Refresh notices</button>
    {busy && <p className="mt-3 text-sm" role="status">Loading notices…</p>}
    {error && <p className="mt-3 text-sm text-unza-red" role="alert">{error}</p>}
    {!busy && !error && rows.length === 0 && <p className="mt-3 text-sm text-muted">No timetable amendment notices.</p>}
    {rows.map(row => <article key={row.notification_id} className="mt-3 rounded-[10px] bg-surface-muted p-4 text-sm">
      <p className="whitespace-pre-wrap">{row.message}</p>
      <p className="mt-2 text-xs text-muted">Available: {new Date(row.available_at).toLocaleString()}</p>
      {row.read_at ? <p className="mt-2 text-xs text-muted">Read: {new Date(row.read_at).toLocaleString()}</p> : <button className="mt-3 font-medium text-unza-green disabled:opacity-50" disabled={busy} onClick={() => void update(row.notification_id)}>Mark as read</button>}
    </article>)}
  </details>;
}
