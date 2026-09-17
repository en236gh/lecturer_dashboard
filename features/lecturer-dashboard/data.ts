import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import type { NavItem, View } from "./types";

export const nav: NavItem[] = [
  { id: "dashboard", label: "dashboard", icon: HomeIcon },
  { id: "exams", label: "my exams", icon: CalendarDaysIcon },
  { id: "attendance", label: "attendance overview", icon: ClipboardDocumentCheckIcon },
  { id: "reports", label: "reports", icon: ChartBarIcon },
];

export const viewTitles: Record<View, string> = {
  dashboard: "Dashboard",
  exams: "My examinations",
  attendance: "Attendance overview",
  reports: "Reports",
};
