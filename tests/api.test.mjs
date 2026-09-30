import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function client(fetch, browser = {}) {
  const values = new Map();
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, fetch, localStorage, Headers, Response, atob, Event,
    window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
    setInterval: () => 1, setTimeout: () => 1, clearInterval() {}, clearTimeout() {},
    ...browser,
  });
  exports.saveSession("access", "refresh", "lecturer@example.com");
  return { api: exports, localStorage };
}

const response = (data, status = 200, message = "OK") => Response.json({ success: status === 200, message, data }, { status });

test("report download saves raw PDF bytes with the backend filename", async () => {
  let savedBlob;
  let clicked = false;
  let revoked;
  const link = { click() { clicked = true; }, remove() {} };
  const { api } = client(async (url, init) => {
    assert.equal(url, "/api/reports/exam-session/22/pdf");
    assert.equal(init.headers.get("Authorization"), "Bearer access");
    assert.equal(init.headers.get("Accept"), "application/pdf");
    return new Response("%PDF-1.7", { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="attendance-incidents-CS401-2026-08-23.pdf"' } });
  }, {
    document: { createElement: () => link, body: { appendChild() {} } },
    URL: { createObjectURL(blob) { savedBlob = blob; return "blob:report"; }, revokeObjectURL(url) { revoked = url; } },
  });
  await api.downloadReport(22);
  assert.equal(await savedBlob.text(), "%PDF-1.7");
  assert.equal(link.download, "attendance-incidents-CS401-2026-08-23.pdf");
  assert.equal(clicked, true);
  assert.equal(revoked, "blob:report");
});

test("report ownership rejection never saves a file", async () => {
  const { api } = client(async () => response(null, 403, "You are not assigned to this examination's course"), {
    document: { createElement() { assert.fail("Must not create a download for an error response"); } },
  });
  await assert.rejects(api.downloadReport(22), error => error.status === 403 && /not assigned/.test(error.message));
});

test("backend connection failures show a friendly service message", async () => {
  const { api } = client(async () => { throw new TypeError("fetch failed"); });
  await assert.rejects(api.listExams(), error =>
    error.status === 0 && error.message === "The service is temporarily unavailable. Please try again shortly.",
  );
});

test("backend server errors show a friendly service message", async () => {
  const { api } = client(async () => response(null, 503, "upstream unavailable"));
  await assert.rejects(api.listExams(), error =>
    error.status === 503 && error.message === "The service is temporarily unavailable. Please try again shortly.",
  );
});

test("a report finishing after its screen is closed is not saved", async () => {
  const controller = new AbortController();
  const { api } = client(async () => {
    controller.abort();
    return new Response("%PDF-1.7");
  }, { document: { createElement() { assert.fail("Must not save an abandoned report"); } } });
  await assert.rejects(api.downloadReport(22, controller.signal), error => error.name === "AbortError");
});

test("curriculum hierarchy uses the token and preserves nullable major fields", async () => {
  const rows = [{ school_id: 1, programme_id: 2, major_id: null, course_code: "CSC1202" }];
  const { api } = client(async (url, init) => {
    assert.equal(url, "/api/exams/my-course-hierarchy");
    assert.equal(init.headers.get("Authorization"), "Bearer access");
    return response(rows);
  });
  assert.deepEqual(await api.listCourseHierarchy(), rows);
});

test("curriculum filters retain shared courses and support programmes without majors", () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../features/lecturer-dashboard/course-filters.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports });
  const base = { school_id: 1, school_name: "Science", programme_id: 2, programme_code: "CS", programme_name: "Computing", year_of_study: 1, semester: 2, course_code: "CSC1202", course_name: "Programming" };
  const rows = [{ ...base, major_id: null, major_name: null }, { ...base, major_id: 3, major_name: "Software" }, { ...base, major_id: 4, major_name: "Networks" }];
  assert.equal(exports.curriculumOptions(rows, [], 4).length, 1);
  assert.equal(exports.curriculumOptions(rows, ["1", "2"], 2).length, 3);
  assert.equal(exports.filterCurriculum(rows, ["1", "2", "no-major"])[0].major_id, null);
  assert.equal(exports.filterCurriculum(rows, ["1", "2", "3", "1/2"])[0].course_code, "CSC1202");
  assert.equal(exports.filterCurriculum(rows, ["99"]).length, 0);
});

test("assigned courses use the current token without lecturer identity parameters", async () => {
  const { api } = client(async (url, init) => {
    assert.equal(url, "/api/exams/my-courses");
    assert.equal(init.headers.get("Authorization"), "Bearer access");
    assert.equal(init.cache, "no-store");
    return response(["CSC1202", "MAT1100"]);
  });
  assert.deepEqual(await api.listAssignedCourses(), ["CSC1202", "MAT1100"]);
});

test("read requests retain the existing refresh-and-retry behavior", async () => {
  const urls = [];
  const { api } = client(async (url, init) => {
    urls.push(url);
    if (url === "/api/auth/refresh") return response({ accessToken: "renewed", refreshToken: "renewed-refresh" });
    if (urls.length === 1) return response(null, 401);
    assert.equal(init.headers.get("Authorization"), "Bearer renewed");
    return response([]);
  });
  await api.listExams();
  assert.deepEqual(urls, ["/api/exams", "/api/auth/refresh", "/api/exams"]);
});

test("bootstrap refreshes a missing access token before accepting the session", async () => {
  const urls = [];
  const { api, localStorage } = client(async url => {
    urls.push(url);
    return response({ accessToken: "renewed", refreshToken: "renewed-refresh" });
  });
  localStorage.removeItem("unza-lecturer-access-token");
  localStorage.removeItem("unza-lecturer-access-expires-at");

  assert.equal(await api.bootstrapSession(), true);
  assert.deepEqual(urls, ["/api/auth/refresh"]);
  assert.equal(localStorage.getItem("unza-lecturer-access-token"), "renewed");
});

test("bootstrap rejects an unavailable refresh without discarding the refresh token", async () => {
  const { api, localStorage } = client(async () => response(null, 503, "upstream unavailable"));
  localStorage.setItem("unza-lecturer-access-expires-at", "1");

  await assert.rejects(api.bootstrapSession(), /temporarily unavailable/);
  assert.equal(api.hasSession(), true);
  assert.equal(localStorage.getItem("unza-lecturer-refresh-token"), "refresh");
});

test("bootstrap clears the session when the refresh token is rejected", async () => {
  const { api, localStorage } = client(async () => response(null, 401, "expired"));
  localStorage.setItem("unza-lecturer-access-expires-at", "1");

  await assert.rejects(api.bootstrapSession(), /session has expired/i);
  assert.equal(api.hasSession(), false);
  assert.equal(localStorage.getItem("unza-lecturer-refresh-token"), null);
});

for (const status of [200, 401]) {
  test(`an old account's pending refresh (${status}) cannot overwrite or clear a new login`, async () => {
    let finish;
    const { api, localStorage } = client(() => new Promise(resolve => { finish = resolve; }));
    localStorage.setItem("unza-lecturer-access-expires-at", "1");
    const pending = api.listExams();
    api.saveSession("new-access", "new-refresh", "other@example.com");
    finish(response({ accessToken: "old-access", refreshToken: "old-refresh" }, status));
    await assert.rejects(pending, /account changed/);
    assert.equal(localStorage.getItem("unza-lecturer-access-token"), "new-access");
    assert.equal(localStorage.getItem("unza-lecturer-email"), "other@example.com");
  });
}
