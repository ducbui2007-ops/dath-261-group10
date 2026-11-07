const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename,
);
const {
  createAssignmentDraft, validateAssignmentDraft, assignmentFileTypes,
  assignmentDueDate, assignmentDraftsEqual, pruneAssignmentDrafts,
} = require("../src/lib/instructor-assignment.ts");
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const valid = () => ({ ...createAssignmentDraft(), title: "Essay", description: "Submit your analysis as a file." });

check("DTO defaults and independent drafts", () => {
  const a = createAssignmentDraft(), b = createAssignmentDraft();
  assert.equal(a.totalPoints, "100");
  assert.equal(a.passScore, "50");
  assert.equal(a.maxFileSizeMb, "25");
  assert.deepEqual(assignmentFileTypes(a.allowedFileTypes), ["zip", "pdf", "tar.gz"]);
  a.title = "Changed";
  assert.equal(b.title, "");
  assert.deepEqual(validateAssignmentDraft(valid()), {});
});
check("required title/instructions reject whitespace without mutating input", () => {
  const draft = { ...valid(), title: "  ", description: "\n" }, before = { ...draft };
  const errors = validateAssignmentDraft(draft);
  assert(errors.title && errors.description);
  assert.deepEqual(draft, before);
});
check("maximum points are finite and at least one, fractions supported", () => {
  for (const totalPoints of ["", " ", "0", "-1", "0.5", "NaN", "Infinity", "1e999"]) {
    assert(validateAssignmentDraft({ ...valid(), totalPoints }).totalPoints, totalPoints);
  }
  assert.equal(validateAssignmentDraft({ ...valid(), totalPoints: "1.5" }).totalPoints, undefined);
});
check("passing score is a percentage, independent of maximum points", () => {
  for (const passScore of ["", "-0.1", "100.1", "Infinity"]) assert(validateAssignmentDraft({ ...valid(), passScore }).passScore);
  for (const passScore of ["0", "50.5", "100"]) assert.deepEqual(validateAssignmentDraft({ ...valid(), totalPoints: "10", passScore }), {});
});
check("file size must be a positive safe integer", () => {
  for (const maxFileSizeMb of ["", "0", "-1", "1.5", "Infinity", "9007199254740992"]) {
    assert(validateAssignmentDraft({ ...valid(), maxFileSizeMb }).maxFileSizeMb);
  }
  assert.equal(validateAssignmentDraft({ ...valid(), maxFileSizeMb: "1" }).maxFileSizeMb, undefined);
});
check("extensions support compound suffixes and reject empty/duplicate/invalid entries", () => {
  assert.deepEqual(assignmentFileTypes(" PDF, docx, TAR.GZ "), ["pdf", "docx", "tar.gz"]);
  assert.equal(validateAssignmentDraft({ ...valid(), allowedFileTypes: "PDF, docx, tar.gz" }).allowedFileTypes, undefined);
  for (const allowedFileTypes of ["", " ", "pdf,", "pdf,,zip", ".pdf", "*.pdf", "pdf, PDF", "application/pdf", "../zip"]) {
    assert(validateAssignmentDraft({ ...valid(), allowedFileTypes }).allowedFileTypes, allowedFileTypes);
  }
});
check("optional local deadline rejects normalized/invalid dates and allows editing past deadlines", () => {
  for (const dueDate of ["2026-02-29T12:00", "2026-04-31T12:00", "2026-13-01T12:00", "2026-01-01T24:00", "0000-01-01T12:00", "not a date", "2026-01-01T12:00Z"]) {
    assert(validateAssignmentDraft({ ...valid(), dueDate }).dueDate, dueDate);
  }
  for (const dueDate of ["", "2024-02-29T12:00", "2020-01-01T00:00"]) {
    assert.equal(validateAssignmentDraft({ ...valid(), dueDate }).dueDate, undefined);
  }
  const before = process.env.TZ;
  try {
    process.env.TZ = "Asia/Ho_Chi_Minh";
    assert.equal(assignmentDueDate("2026-11-15T23:59").toISOString(), "2026-11-15T16:59:00.000Z");
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});
check("dirty comparison includes every editable field", () => {
  const a = valid();
  assert(assignmentDraftsEqual(a, { ...a }));
  for (const key of Object.keys(a)) assert.equal(assignmentDraftsEqual(a, { ...a, [key]: a[key] + "x" }), false, key);
});
check("lesson/chapter deletion prunes only removed assignments, immutably", () => {
  const drafts = { a: valid(), b: { ...valid(), title: "Second" } };
  const chapters = [{ id: "chapter", title: "Chapter", order: 1, lessons: [{ id: "b", title: "Lesson", order: 1, type: "text" }] }];
  assert.deepEqual(pruneAssignmentDrafts(drafts, chapters), { b: drafts.b });
  assert.deepEqual(Object.keys(drafts), ["a", "b"]);
  assert.deepEqual(pruneAssignmentDrafts(drafts, []), {});
});
console.log(`${checks} assignment checks passed.`);
