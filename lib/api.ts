export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ExamStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export type ExamSession = {
  examSessionId: number;
  courseCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: number;
  examType: string;
  status: ExamStatus;
};

export type LecturerDashboardTotals = {
  totalExaminations: number;
  registeredStudents: number;
  allocatedStudents: number;
  message?: string;
};

export type RegisteredStudent = {
  computerNumber: string;
  fullName: string;
  program: string;
  yearOfStudy: number;
  photoPath: string | null;
  status: string;
};

export type ExamVenue = {
  venueId: number;
  venueName: string;
  building: string;
  capacity: number;
};

export type VenueFill = {
  venueId: number;
  venueName: string;
  capacity: number;
  allocated: number;
};

export type StudentAllocation = {
  computerNumber: string;
  studentName: string;
  venueId: number;
  venueName: string;
  seatNumber: string;
};

export type AllocationStats = {
  examSessionId: number;
  registeredStudents: number;
  allocatedStudents: number;
  totalVenueCapacity: number;
  venueFills: VenueFill[];
  allocations: StudentAllocation[];
};

export type AttendanceRecord = {
  attendanceId: number;
  computerNumber: string;
  studentName: string;
  examSessionId: number;
  venueId: number | null;
  venueName: string | null;
  verifiedByStaffId: number | null;
  verifiedByName: string | null;
  checkInTime: string | null;
  verificationMethod: string | null;
  attendanceStatus: "PRESENT" | "ABSENT" | "LATE" | "WRONG_VENUE";
  scriptsSubmitted: boolean;
  alertMessage: string | null;
};

export type AttendanceSummary = {
  checkedIn: number;
  absent: number;
  scriptsCollected: number;
  incidents: number;
};

const ACCESS_TOKEN_KEY = "unza-lecturer-access-token";
const REFRESH_TOKEN_KEY = "unza-lecturer-refresh-token";
const ACCESS_EXPIRES_AT_KEY = "unza-lecturer-access-expires-at";
const EMAIL_KEY = "unza-lecturer-email";

/** Access tokens expire after 5 minutes; refresh well before the window closes. */
const ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 90 * 1000;
const KEEP_ALIVE_INTERVAL_MS = 30 * 1000;

let refreshPromise: Promise<string> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

function getTokenExpiryMs(accessToken: string): number | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function getAccessExpiresAt(): number | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(ACCESS_EXPIRES_AT_KEY);
  if (stored) return Number(stored);

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) return null;

  const expiresAt = getTokenExpiryMs(accessToken) ?? Date.now() + ACCESS_TOKEN_TTL_MS;
  localStorage.setItem(ACCESS_EXPIRES_AT_KEY, String(expiresAt));
  return expiresAt;
}

function shouldRefreshAccessToken() {
  const expiresAt = getAccessExpiresAt();
  if (!expiresAt) return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  return Date.now() + REFRESH_THRESHOLD_MS >= expiresAt;
}

function runProactiveRefresh() {
  if (!hasSession() || !shouldRefreshAccessToken()) return;
  refreshSession().catch(() => undefined);
}

function scheduleProactiveRefresh() {
  if (typeof window === "undefined") return;

  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const expiresAt = getAccessExpiresAt();
  if (!expiresAt || !localStorage.getItem(REFRESH_TOKEN_KEY)) return;

  const refreshAt = expiresAt - REFRESH_THRESHOLD_MS;
  const delay = Math.max(0, refreshAt - Date.now());
  refreshTimer = setTimeout(runProactiveRefresh, delay);
}

function startSessionKeepAlive() {
  if (typeof window === "undefined" || keepAliveInterval) return;

  keepAliveInterval = setInterval(runProactiveRefresh, KEEP_ALIVE_INTERVAL_MS);
  window.addEventListener("visibilitychange", onVisibilityChange);
}

function stopSessionKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("visibilitychange", onVisibilityChange);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    runProactiveRefresh();
  }
}

export function hasSession() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
}

export function getStoredEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function saveSession(accessToken: string, refreshToken: string, email?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  const expiresAt = getTokenExpiryMs(accessToken) ?? Date.now() + ACCESS_TOKEN_TTL_MS;
  localStorage.setItem(ACCESS_EXPIRES_AT_KEY, String(expiresAt));
  if (email) localStorage.setItem(EMAIL_KEY, email);
  scheduleProactiveRefresh();
  startSessionKeepAlive();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  localStorage.removeItem(EMAIL_KEY);
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  stopSessionKeepAlive();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("unza-session-cleared"));
  }
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearSession();
      throw new Error("Your session has expired. Please sign in again.");
    }

    let response: Response;
    try {
      response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      throw new Error("Could not reach the server to refresh your session.");
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearSession();
        throw new Error("Your session has expired. Please sign in again.");
      }
      throw new Error("Could not refresh your session. Will retry automatically.");
    }

    const result = (await response.json()) as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>;
    saveSession(result.data.accessToken, result.data.refreshToken);
    return result.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function ensureValidAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!refreshToken && !accessToken) return null;
  if (!accessToken || shouldRefreshAccessToken()) return refreshSession();
  return accessToken;
}

/** Refresh tokens on load so a returning user stays signed in. */
export async function bootstrapSession() {
  if (!hasSession()) return false;

  startSessionKeepAlive();
  scheduleProactiveRefresh();

  if (shouldRefreshAccessToken()) {
    await refreshSession();
  }

  return hasSession();
}

async function authorizedFetch(path: string, init: RequestInit = {}, retry = true) {
  const accessToken = await ensureValidAccessToken();
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  if (response.status === 401 && retry && hasSession()) {
    const nextToken = await refreshSession();
    headers.set("Authorization", `Bearer ${nextToken}`);
    return authorizedFetch(path, { ...init, headers }, false);
  }

  return response;
}

if (typeof window !== "undefined" && hasSession()) {
  startSessionKeepAlive();
  scheduleProactiveRefresh();
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, init);

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Request failed (${response.status})`);
  }

  const result = (await response.json()) as ApiEnvelope<T>;
  return result.data;
}

export function login(email: string, password: string) {
  return apiRequest<{ accessToken: string; refreshToken: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function activateAccount(identifier: string, password: string, confirmPassword: string) {
  return apiRequest<unknown>("/api/auth/activate", {
    method: "POST",
    body: JSON.stringify({ identifier, password, confirmPassword }),
  });
}

export function getLecturerDashboard(examSessionId?: number) {
  const query = examSessionId ? `?examSessionId=${examSessionId}` : "";
  return apiRequest<LecturerDashboardTotals | { examSessionId: number; allocation: AllocationStats }>(
    `/api/dashboard/lecturer${query}`,
  );
}

export function listExams() {
  return apiRequest<ExamSession[]>("/api/exams");
}

export function listRegisteredStudents(examSessionId: number) {
  return apiRequest<RegisteredStudent[]>(`/api/exams/${examSessionId}/registered-students`);
}

export function listExamVenues(examSessionId: number) {
  return apiRequest<ExamVenue[]>(`/api/exams/${examSessionId}/venues`);
}

export function getAllocationStats(examSessionId: number) {
  return apiRequest<AllocationStats>(`/api/allocation/exam-session/${examSessionId}`);
}

export function allocateStudents(examSessionId: number) {
  return apiRequest<{ computerNumber: string; examSessionId: number; venueId: number; seatNumber: string }[]>(
    `/api/allocation/exam-session/${examSessionId}`,
    { method: "POST" },
  );
}

export function getAttendance(examSessionId: number) {
  return apiRequest<AttendanceRecord[]>(`/api/attendance/exam/${examSessionId}`);
}

export function getAttendanceSummary(examSessionId: number) {
  return apiRequest<AttendanceSummary>(`/api/attendance/exam/${examSessionId}/summary`);
}

export async function downloadReport(examSessionId: number) {
  const response = await authorizedFetch(`/api/reports/exam-session/${examSessionId}/pdf`, {
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "Could not generate the report");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] ??
    `attendance-report-${examSessionId}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
