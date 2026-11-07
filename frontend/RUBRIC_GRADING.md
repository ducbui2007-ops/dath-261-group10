# Instructor rubric grading

Open **Instructor → Submissions → Structured analysis (local rubric) → Review**
or `/instructor/submissions/sample-submission-written-rubric/grade`.
This additional fictional submission has three criteria (4 + 4 + 2 points).
The existing total-only written/code examples and quiz review are retained.

The rubric form displays each criterion's name, description and maximum points,
required awarded points, optional criterion feedback and General Feedback.
Totals reuse the existing exact decimal summation. Zero is a valid score;
blank, nonfinite, negative or over-maximum scores block review. Empty rubrics,
duplicate/missing IDs or names, invalid maxima, stale evaluation IDs and totals
above the assignment maximum also block review. `rubrics: undefined` retains
the existing total-only demo; `rubrics: []` is explicitly incomplete rubric data
and cannot be reviewed as a rubric grade.

Review opens the existing confirmation dialog with a snapshot of all criterion
scores/comments and General Feedback. Cancel/Escape keep edits. Confirm changes
only the local reviewed flag; recorded grade/status remain unchanged. Any
subsequent criterion or feedback edit requires review again. Reset requires
confirmation and restores recorded criterion evaluations when supplied, or
blank scores for an ungraded example. The workspace provider retains drafts
through list/detail navigation and warns before leaving the workspace. Reload
discards them. No POST, PATCH, PUT or DELETE request is made by this feature.

## Backend integration boundary

Backend DTO/controller/service source was inspected only:

- `GET /api/v1/assignments/:id` supplies rubric IDs, `criterionName`,
  `description`, `maxPoints`, `orderIndex` and optional levels.
- `POST /api/v1/assignments/submissions/:submissionId/grade` accepts
  `{ evaluations: [{ rubricId, pointsAwarded, feedback }], generalFeedback }`.
- The grading service validates membership and individual maximum points,
  replaces previous rubric evaluations and updates the recorded grade.

`toRubricGradePayload` prepares that body without sending it. It recomputes
scores from criteria, never trusts an editable total, and requires a written
submission, explicit `rubricSource: "server"`, valid server submission/assignment
and rubric UUIDs, and a complete valid evaluation for every criterion. The local
fixture uses `rubricSource: "local"` and non-server IDs; the adapter rejects it.
The source marker is a data provenance convention, not authorization. Future
loading must set it only for validated server data.

Before connecting API requests:

1. Load real assignment/submission data; map `totalPoints` to `maxScore`, nullable
   descriptions/comments to optional strings and order criteria by `orderIndex`.
2. Confirm how an instructor retrieves previously saved per-criterion evaluations.
   The inspected instructor submission-list response contains aggregate scores
   and feedback, while the `mySubmission` evaluation data is student-specific.
   Do not infer or distribute a recorded total across criteria.
3. Agree on rounding: this UI keeps exact decimal totals; the inspected grade
   service rounds the recorded total to two decimal places. Display the returned
   recorded grade after any future successful request.
4. Revalidate rubric membership/maxima before sending; handle changed criteria,
   missing data and HTTP errors without treating local review as a server save.

Rubric authoring, levels selection, grading API calls, Authentication and Backend
changes are outside this implementation.

## Validation

From `frontend/`:

```sh
node tests/rubric-grading.test.cjs
node tests/course-deletion.test.cjs
node tests/instructor-assignment.test.cjs
node tests/admin-demo.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

- All 11 rubric, 8 deletion, 9 assignment and 8 Admin test groups passed.
- TypeScript and production build passed. Build used temporary
  `NEXT_IGNORE_INCORRECT_LOCKFILE=1` and `NEXT_TELEMETRY_DISABLED=1`, real Google
  Fonts and no dependency/configuration changes.
- Lint remains blocked by the existing missing ESLint dependency. Build success
  is not a lint pass.
- Chromium at 390px passed required/max validation and focus, exact `0.1 + 0.2`
  total, criterion/general feedback preview, Cancel, repeated review, edits
  invalidating review, reset cancellation/confirmation, list/detail persistence,
  leaving-workspace cancellation and unchanged recorded grade. No horizontal
  overflow, application console errors or grading requests were observed.
- Existing total-only grading reviewed/reset successfully; Course Builder,
  Quiz Editor, Assignment Authoring and Delete Course dialogs still opened.
- Backend/Database persistence and retrieval of real instructor grades have not
  been tested.
