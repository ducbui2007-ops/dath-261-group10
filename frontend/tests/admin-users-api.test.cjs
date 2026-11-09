const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith("@/") ? path.resolve(__dirname, "../src", request.slice(2)) : request, parent, ...args);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);

const { getUsers, UsersApiError } = require("../src/lib/api/users.ts");
const originalFetch = global.fetch;
const user = {
  id: "user-1", email: "one@example.test", fullName: "User One", role: "student",
  avatarUrl: null, createdAt: "2026-01-02T03:04:05.000Z",
};
const body = (data = [user], meta = { total: 21, page: 2, limit: 10, totalPages: 3, hasNextPage: true, hasPreviousPage: true }) => ({ success: true, data, meta });
let checks = 0;
function check(name, fn) { return Promise.resolve().then(fn).then(() => { checks++; console.log(`PASS ${name}`); }); }

(async () => {
  try {
    await check("sends server search/page and includes cookies; maps nullable avatar and pagination", async () => {
      let request;
      global.fetch = async (url, options) => {
        request = { url: String(url), options };
        return new Response(JSON.stringify(body()), { status: 200 });
      };
      const result = await getUsers({ page: 2, limit: 10, search: "  Ada Lovelace " });
      const url = new URL(request.url);
      assert.equal(url.pathname, "/api/v1/users");
      assert.equal(url.searchParams.get("page"), "2");
      assert.equal(url.searchParams.get("limit"), "10");
      assert.equal(url.searchParams.get("search"), "Ada Lovelace");
      assert.equal(request.options.credentials, "include");
      assert.equal(result.data[0].avatarUrl, undefined);
      assert.equal(result.data[0].createdAt, user.createdAt);
      assert.deepEqual(result.meta, body().meta);
    });
    await check("omits empty search and returns empty pages without fixture fallback", async () => {
      let requestUrl;
      global.fetch = async (url) => {
        requestUrl = new URL(String(url));
        return new Response(JSON.stringify(body([], { total: 0, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false })), { status: 200 });
      };
      const result = await getUsers({ page: 1, limit: 10, search: " " });
      assert.equal(requestUrl.searchParams.has("search"), false);
      assert.deepEqual(result.data, []);
      assert.equal(result.meta.total, 0);
    });
    for (const status of [401, 403]) {
      await check(`preserves HTTP ${status} for the UI`, async () => {
        global.fetch = async () => new Response(JSON.stringify({ message: "Denied" }), { status });
        await assert.rejects(getUsers({ page: 1, limit: 10, search: "" }), (error) => error instanceof UsersApiError && error.status === status && error.message === "Denied");
      });
    }
    await check("rejects unexpected response contracts", async () => {
      global.fetch = async () => new Response(JSON.stringify(body([{ ...user, role: "owner" }])), { status: 200 });
      await assert.rejects(getUsers({ page: 1, limit: 10, search: "" }), /unexpected format/);
    });
    await check("propagates network errors", async () => {
      global.fetch = async () => { throw new TypeError("offline"); };
      await assert.rejects(getUsers({ page: 1, limit: 10, search: "" }), /offline/);
    });
    console.log(`${checks} Admin Users API checks passed`);
  } finally {
    global.fetch = originalFetch;
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
