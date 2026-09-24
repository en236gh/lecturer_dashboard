import type { CourseHierarchyRow } from "@/lib/api";

export const curriculumLevels = ["School", "Programme", "Major", "Year / semester", "Course"] as const;

export function curriculumValue(row: CourseHierarchyRow, level: number): string {
  return [String(row.school_id), String(row.programme_id), row.major_id == null ? "no-major" : String(row.major_id), `${row.year_of_study}/${row.semester}`, row.course_code][level];
}

export function filterCurriculum(rows: CourseHierarchyRow[], selections: string[]) {
  return rows.filter(row => selections.every((value, level) => !value || curriculumValue(row, level) === value));
}

export function curriculumOptions(rows: CourseHierarchyRow[], selections: string[], level: number) {
  const options = new Map<string, string>();
  for (const row of filterCurriculum(rows, selections.slice(0, level))) {
    const label = [row.school_name, `${row.programme_code} · ${row.programme_name}`, row.major_name ? `${row.major_code ? `${row.major_code} · ` : ""}${row.major_name}` : "No major", `Year ${row.year_of_study} · Semester ${row.semester}`, `${row.course_code} · ${row.course_name}`][level];
    options.set(curriculumValue(row, level), label);
  }
  return [...options].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }));
}
