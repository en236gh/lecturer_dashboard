import type { ReactNode } from "react";
import { Panel } from "./panel";

export function StatTile({
  title,
  value,
  note,
  icon,
  accent = "ink",
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  accent?: "ink" | "green" | "gold" | "red";
}) {
  const colors = {
    ink: "text-ink",
    green: "text-unza-green",
    gold: "text-amber-700",
    red: "text-unza-red",
  };

  return (
    <Panel className="min-h-44 border border-transparent transition hover:border-unza-gold/40">
      <div className="mb-8 flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-surface-muted text-ink">
          {icon}
        </span>
        <span className="rounded-[10px] bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
          {note}
        </span>
      </div>
      <p className="text-sm text-muted">{title}</p>
      <p className={`mt-1 text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${colors[accent]}`}>
        {value}
      </p>
    </Panel>
  );
}
