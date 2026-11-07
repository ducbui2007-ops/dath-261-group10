const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename,
);
const { courseDeletionState: reduce } = require("../src/lib/course-deletion-state.ts");
const { deleteInstructorCourse } = require("../src/lib/api/instructor-courses.ts");
const id = "10000000-0000-0000-0000-000000000001";
const closed = { phase: "closed" };
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }

(async () => {
  await check("Cancel returns to closed; confirmation cannot skip the dialog", () => {
    assert.deepEqual(reduce(reduce(closed, { type: "open" }), { type: "cancel" }), closed);
    assert.strictEqual(reduce(closed, { type: "confirm" }), closed);
    assert.strictEqual(reduce(closed, { type: "success" }), closed);
  });
  await check("Confirm enters pending; repeated confirm and cancel cannot interrupt it", () => {
    const pending = reduce(reduce(closed, { type: "open" }), { type: "confirm" });
    assert.deepEqual(pending, { phase: "deleting" });
    for (const type of ["confirm", "cancel", "open"]) assert.strictEqual(reduce(pending, { type }), pending);
  });
  await check("Errors preserve the dialog; retry and cancel are explicit", () => {
    const failed = reduce({ phase: "deleting" }, { type: "error", message: "Course not found" });
    assert.deepEqual(failed, { phase: "error", message: "Course not found" });
    assert.deepEqual(reduce(failed, { type: "confirm" }), { phase: "deleting" });
    assert.deepEqual(reduce(failed, { type: "cancel" }), closed);
  });
  await check("Success is only accepted while pending and prevents another deletion", () => {
    const success = reduce({ phase: "deleting" }, { type: "success" });
    assert.deepEqual(success, { phase: "success" });
    for (const type of ["confirm", "cancel", "open"]) assert.strictEqual(reduce(success, { type }), success);
  });
  const originalFetch = global.fetch;
  try {
    let calls = 0;
    global.fetch = async () => { calls++; throw Error("Unexpected request"); };
    await check("Missing ID and fixture slugs never send DELETE", async () => {
      for (const invalid of ["", "missing-course", "software-engineering"]) {
        await assert.rejects(deleteInstructorCourse(invalid), /server course ID/);
      }
      assert.equal(calls, 0);
    });
    await check("Verified response uses DELETE, credentials and the versioned endpoint", async () => {
      global.fetch = async (url, options) => {
        assert(url.endsWith(`/v1/courses/${id}`));
        assert.equal(options.method, "DELETE");
        assert.equal(options.credentials, "include");
        return { ok: true, json: async () => ({ success: true, message: "Deleted" }) };
      };
      assert.equal((await deleteInstructorCourse(id)).success, true);
    });
    await check("404, forbidden and network failures never become success", async () => {
      for (const [status, message] of [[404, "Course not found"], [403, "Not allowed"], [500, "Database unavailable"]]) {
        global.fetch = async () => ({ ok: false, status, json: async () => ({ success: false, message }) });
        await assert.rejects(deleteInstructorCourse(id), new RegExp(message));
      }
      global.fetch = async () => { throw Error("Network offline"); };
      await assert.rejects(deleteInstructorCourse(id), /Network offline/);
    });
    await check("HTTP 200 without explicit success is rejected", async () => {
      for (const body of [{ success: false }, {}, null]) {
        global.fetch = async () => ({ ok: true, json: async () => body });
        await assert.rejects(deleteInstructorCourse(id), /did not confirm/);
      }
    });
  } finally { global.fetch = originalFetch; }
  console.log(`${checks} course deletion checks passed. HTTP responses were test doubles, not a running backend.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
