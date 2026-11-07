# File assignment authoring

Open **Instructor → Courses → Manage Course**, add a chapter and lesson, then
choose **Add Assignment** inside the lesson. One assignment is supported per
lesson, matching the backend creation service. **Edit Assignment** reopens the
applied local draft. No API requests are made and no sample server assignment
is fabricated.

The editor supports title, required instructions, optional deadline in the
browser's local timezone, maximum points (at least 1), passing percentage
(0–100), positive whole megabytes and comma-separated extensions without leading
dots. Compound suffixes such as `tar.gz` are accepted. Duplicate or empty
extensions are rejected. Past deadlines remain valid for editing existing work.
Defaults match `CreateAssignmentDto`: 100 points, 50%, 25 MB, zip/pdf/tar.gz.

**Apply to Local Course Draft** validates and updates the lesson summary.
It does not save to a server, publish an assignment or send anything to students.
Cancel, Close and Escape ask before discarding changed editor fields; cancelling
that confirmation preserves the fields. Applied drafts take part in the course
unsaved-changes warning, preview and reset. Removing their lesson/chapter removes
their drafts after the existing deletion confirmation. Reloading or leaving the
course discards all drafts. Existing course/quiz/grading behavior is retained.

The modal reuses the existing native `DemoDialog`, Button, Card and Input. It is
portalled outside the course form so forms are not nested; submission propagation
is stopped so applying an assignment does not submit the course form.

Backend routes were inspected, not called:

- `POST /api/v1/lessons/:lessonId/assignments`
- `GET /api/v1/assignments/:id`
- `PUT /api/v1/assignments/:id`

Future integration must load server assignment IDs, convert numeric strings and
extensions to DTO values and convert a local deadline to ISO 8601. Clearing an
existing server deadline needs an agreed update contract; this UI makes no claim
that an empty deadline has been persisted. Optional rubric authoring and grading
are not part of this change. Backend creation changes lesson content type to
`assignment`; this prototype does not alter shared lesson/material types or
pretend to enforce that server behavior.

Run from `frontend/`:

```sh
node tests/instructor-assignment.test.cjs
node tests/admin-demo.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

Browser checks: create and edit; invalid/empty values; cancel and discard;
Escape and focus restoration; independent lessons; preview/reset and lesson
deletion; verify the Quiz Editor still opens; repeat at 390px width. Confirm no
API mutation requests and no success message claiming a server save.

## Validation performed

- All 9 assignment domain checks and 8 existing Admin checks passed.
- TypeScript passed with `--noEmit --incremental false`.
- Production build exited 0 with real Google Fonts. The process used temporary
  `NEXT_IGNORE_INCORRECT_LOCKFILE=1` to avoid automatic lockfile repair and
  `NEXT_TELEMETRY_DISABLED=1`; dependency and configuration files were unchanged.
- Lint could not run because ESLint is not installed in the existing project.
  The build reports that limitation as well; build success is not a lint pass.
- Chromium against the production build passed create/apply/edit, validation and
  first-error focus, cancel/keep/discard, nested Escape, focus restoration,
  independent lesson drafts, deletion/pruning, course preview/reset/leave guard,
  and opening the existing Quiz Editor. The 390px editor had no horizontal
  overflow. No API mutation requests or application JavaScript errors were
  observed; the existing `/favicon.ico` request returned 404.
- Backend/Database integration, actual student file submission and rubric
  grading were not exercised.
