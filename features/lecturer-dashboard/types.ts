import type { ComponentType } from "react";
import type { ExamSession, ExamStatus } from "@/lib/api";

export type View = "dashboard" | "exams" | "attendance" | "reports";

export type { ExamSession, ExamStatus };

export type NavItem = {
  id: View;
  label: string;
  icon: ComponentType<{ className?: string }>;
};
