import type { ExamStatus } from "@/lib/api";

export function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  if (value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
  }
  return value.slice(0, 5);
}

export function formatExamType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatVerificationMethod(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function statusLabel(status: ExamStatus) {
  return status.replaceAll("_", " ");
}

export function initialsFromEmail(email: string | null | undefined) {
  if (!email) return "LC";
  const local = email.split("@")[0] ?? "lecturer";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function displayNameFromEmail(email: string | null | undefined) {
  if (!email) return "Lecturer";
  const local = email.split("@")[0] ?? "lecturer";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function allocationPercent(allocated: number, capacity: number) {
  if (capacity <= 0) return 0;
  return Math.min((allocated / capacity) * 100, 100);
}
