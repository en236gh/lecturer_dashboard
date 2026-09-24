import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function client(fetch) {
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
  });
  exports.saveSession("access", "refresh", "lecturer@example.com");
  return { api: exports, localStorage };
}

const response = (data, status = 200, message = "OK") => Response.json({ success: status === 200, message, data }, { status });

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

for (const status of [400, 401, 403, 409]) {
  test(`allocation sends one bodyless POST and preserves HTTP ${status}`, async () => {
    let calls = 0;
    const { api } = client(async (url, init) => {
      calls++;
      assert.equal(url, "/api/allocation/exam-session/22");
      assert.equal(init.method, "POST");
      assert.equal(init.body, undefined);
      return response(null, status, "Backend explanation");
    });
    await assert.rejects(api.allocateStudents(22), error => error instanceof api.ApiError && error.status === status && error.message === "Backend explanation");
    assert.equal(calls, 1);
  });
}

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
