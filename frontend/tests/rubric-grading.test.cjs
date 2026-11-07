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
const { scoreRubric, toRubricGradePayload } = require("../src/lib/rubric-grading.ts");
const { createGradingDraft, editGradingDraft, reviewGradingDraft, sameGradingDraftValues } = require("../src/lib/instructor-grading-draft.ts");
const { MOCK_INSTRUCTOR_SUBMISSIONS } = require("../src/lib/mock-instructor-submissions.ts");
const sample = MOCK_INSTRUCTOR_SUBMISSIONS.find((s) => s.id === "sample-submission-written-rubric");
const rubrics = sample.assessment.rubrics;
const values = (...scores) => Object.fromEntries(rubrics.map((r, i) => [r.id, { score: scores[i] ?? "", feedback: "" }]));
const draft = (...scores) => editGradingDraft(sample, undefined, { evaluations: values(...scores) });
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }

check("local fixture is ungraded with independent criteria and required score fields", () => {
  assert.equal(sample.assessment.rubricSource, "local");
  assert.equal(sample.grading.status, "pending");
  const a = createGradingDraft(sample), b = createGradingDraft(sample);
  assert.equal(a.score, "");
  assert.equal(scoreRubric(rubrics, a.evaluations, 10).score, null);
  a.evaluations[rubrics[0].id].score = "2";
  assert.equal(b.evaluations[rubrics[0].id].score, "");
});
check("sum and decimal points are exact, zero is a valid grade", () => {
  assert.equal(scoreRubric(rubrics, values("0.1", "0.2", "0"), 10).score, 0.3);
  assert.equal(scoreRubric(rubrics, values("4", "4", "2"), 10).score, 10);
  assert.equal(scoreRubric(rubrics, values("0", "0", "0"), 10).score, 0);
});
check("every criterion rejects missing, negative, nonfinite or excessive points", () => {
  for (let index = 0; index < rubrics.length; index++) {
    for (const bad of ["", "  ", "-0.1", "Infinity", "NaN", String(rubrics[index].maxPoints + 0.1)]) {
      const evaluations = values("1", "1", "1");
      evaluations[rubrics[index].id].score = bad;
      const result = scoreRubric(rubrics, evaluations, 10);
      assert.equal(result.score, null);
      assert(result.errors[rubrics[index].id], bad);
    }
  }
});
check("empty, duplicate, unnamed and invalid rubric data block review", () => {
  const invalid = [[], [rubrics[0], rubrics[0]], [{ ...rubrics[0], id: "" }], [{ ...rubrics[0], criterionName: " " }],
    [{ ...rubrics[0], maxPoints: NaN }], [{ ...rubrics[0], maxPoints: 0 }]];
  for (const criteria of invalid) {
    assert.equal(scoreRubric(criteria, {}, 10).score, null);
    assert(scoreRubric(criteria, {}, 10).errors.rubric);
  }
  assert.equal(reviewGradingDraft({ ...sample, assessment: { ...sample.assessment, rubrics: [] } }, createGradingDraft(sample)), undefined);
});
check("stale/extra criteria and totals above assignment maximum cannot be graded", () => {
  assert(scoreRubric(rubrics, { ...values("1", "1", "1"), stale: { score: "1", feedback: "" } }, 10).errors.rubric);
  assert.equal(scoreRubric(rubrics, values("4", "4", "2"), 9).score, null);
  assert.equal(scoreRubric(rubrics, values("1", "1", "1"), NaN).score, null);
});
check("many decimal criteria do not accumulate floating-point noise", () => {
  const many = Array.from({ length: 100 }, (_, i) => ({ id: `r${i}`, criterionName: `Criterion ${i}`, maxPoints: 0.1 }));
  const evaluations = Object.fromEntries(many.map((r) => [r.id, { score: "0.1", feedback: "" }]));
  assert.equal(scoreRubric(many, evaluations, 10).score, 10);
});
check("review, repeated review, feedback edits and reset baseline preserve recorded data", () => {
  const before = JSON.stringify(sample);
  const a = draft("1", "2", "1");
  assert.equal(a.score, "4");
  const reviewed = reviewGradingDraft(sample, a);
  assert.equal(reviewed.reviewed, true);
  assert.deepEqual(reviewGradingDraft(sample, reviewed), reviewed);
  const edited = editGradingDraft(sample, reviewed, { feedback: "General remarks" });
  assert.equal(edited.reviewed, false);
  const perCriterion = { ...edited.evaluations, [rubrics[0].id]: { score: "1", feedback: "Criterion comment" } };
  assert.equal(editGradingDraft(sample, reviewed, { evaluations: perCriterion }).reviewed, false);
  assert.equal(editGradingDraft(sample, a, createGradingDraft(sample)), undefined);
  assert.equal(JSON.stringify(sample), before);
});
check("confirmation detects per-criterion changes even when total stays equal", () => {
  const a = draft("1", "2", "1"), b = draft("2", "1", "1");
  assert.equal(a.score, b.score);
  assert.equal(sameGradingDraftValues(a, b), false);
  assert.equal(sameGradingDraftValues(a, { ...a, evaluations: { ...a.evaluations } }), true);
  assert.strictEqual(editGradingDraft(sample, a, { feedback: a.feedback }), a);
});
check("recorded per-criterion values hydrate including zero and feedback", () => {
  const submission = { ...sample, rubricEvaluations: rubrics.map((r, i) => ({ rubricId: r.id, pointsAwarded: i, feedback: `Note ${i}` })) };
  const hydrated = createGradingDraft(submission);
  assert.equal(hydrated.evaluations[rubrics[0].id].score, "0");
  assert.equal(hydrated.evaluations[rubrics[1].id].feedback, "Note 1");
  assert.equal(hydrated.score, "3");
});
check("legacy total-only grading still works without rubric data", () => {
  const legacy = MOCK_INSTRUCTOR_SUBMISSIONS.find((s) => s.id === "sample-submission-written-text");
  const a = editGradingDraft(legacy, undefined, { score: "8.5", feedback: "Good work" });
  assert.equal(reviewGradingDraft(legacy, a).reviewed, true);
  assert.equal(a.evaluations, undefined);
  assert.equal(reviewGradingDraft(legacy, { ...a, score: "11" }), undefined);
});
check("adapter blocks local rubric data and invalid/incomplete server drafts", () => {
  assert.throws(() => toRubricGradePayload(sample, draft("1", "2", "1")), /server/);
  const server = {
    ...sample, id: "10000000-0000-0000-0000-000000000001",
    assessment: { ...sample.assessment, id: "20000000-0000-0000-0000-000000000001", rubricSource: "server",
      rubrics: rubrics.map((r, i) => ({ ...r, id: `30000000-0000-0000-0000-00000000000${i}` })) },
  };
  assert.throws(() => toRubricGradePayload(server, createGradingDraft(server)), /Complete/);
  const evaluations = Object.fromEntries(server.assessment.rubrics.map((r) => [r.id, { score: "0.5", feedback: "Clear" }]));
  const payload = toRubricGradePayload(server, { score: "999", feedback: "Overall", evaluations, reviewed: false });
  assert.deepEqual(payload, { evaluations: server.assessment.rubrics.map((r) => ({ rubricId: r.id, pointsAwarded: 0.5, feedback: "Clear" })), generalFeedback: "Overall" });
  assert.throws(() => toRubricGradePayload({ ...server, assessment: { ...server.assessment, rubricSource: "local" } }, draft("1", "2", "1")), /server/);
});
console.log(`${checks} rubric grading checks passed. No HTTP requests were made.`);
