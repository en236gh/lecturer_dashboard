import type { ExamSession } from "@/lib/api";
import { formatDate, formatTime } from "../format";
import { Badge } from "./badge";

export function ExamCard({ exam, onOpen }: { exam: ExamSession; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group rounded-[10px] bg-white p-5 text-left shadow-panel transition hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold text-unza-green">{exam.courseCode}</p>
          <h3 className="mt-1 font-semibold">
            {formatDate(exam.examDate)} · {formatTime(exam.startTime)}–{formatTime(exam.endTime)}
          </h3>
        </div>
        <Badge status={exam.status} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/6 pt-4 text-sm">
        <div>
          <p className="text-xs text-muted">Academic year</p>
          <p className="mt-1 font-medium">{exam.academicYear}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Exam type</p>
          <p className="mt-1 truncate font-medium capitalize">
            {exam.examType.toLowerCase().replaceAll("_", " ")}
          </p>
        </div>
      </div>
    </button>
  );
}
