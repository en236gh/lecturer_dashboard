import { Badge } from "./badge";
import { EmptyState } from "./states";

type StudentRow = {
  computerNumber: string;
  name: string;
  meta?: string;
  venueName?: string;
  seat?: string;
};

export function StudentRows({
  students,
  allocation = false,
  emptyMessage = "No students to display.",
}: {
  students: StudentRow[];
  allocation?: boolean;
  emptyMessage?: string;
}) {
  if (students.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="mt-6 divide-y divide-black/6">
      {students.map((student) => (
        <div
          key={student.computerNumber}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-surface-muted text-xs font-semibold">
              {student.name
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{student.name}</p>
              <p className="font-mono text-xs text-muted">{student.computerNumber}</p>
              {student.meta && <p className="mt-0.5 text-xs text-muted">{student.meta}</p>}
            </div>
          </div>
          {allocation ? (
            <div className="text-right">
              <p className="text-sm font-medium">{student.venueName ?? "Unassigned"}</p>
              <p className="font-mono text-xs text-muted">
                {student.seat ? `Seat ${student.seat}` : "No seat"}
              </p>
            </div>
          ) : (
            <Badge status="Registered" />
          )}
        </div>
      ))}
    </div>
  );
}
