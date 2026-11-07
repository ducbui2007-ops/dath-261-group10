# Instructor course deletion

Open **Instructor → Courses → Manage Course** and scroll to the separate
**Delete Course** card below the editor/preview. It is not next to Save/Review,
and does not appear on Create Course. The confirmation names the original
course, not a potentially unsaved title. Cancel and Escape preserve course,
quiz and assignment drafts and return focus to the Delete Course button.

## Current local preview

The editor still uses fixture courses. `CourseDeletion` receives no deletion
callback. Confirm therefore displays an explicit unavailable message: no API
request was sent and sample records/drafts are unchanged. Repeated confirmation
does not remove any course, report server success or navigate away. There is no
local fake deletion and no feature flag that enables real deletion implicitly.

## Integration boundary

The component accepts `deleteCourse(id)` returning `{ success: true }`. Only when
server-backed course loading is implemented should the owner pass
`deleteInstructorCourse` from `src/lib/api/instructor-courses.ts`. That helper
requires a UUID and calls `DELETE /api/v1/courses/:id` via the existing API client
with credentials included. Fixture slugs are rejected before any request.

The component supports pending, error/retry and verified success states. A
synchronous pending guard blocks duplicate requests; confirmation/cancellation
state transitions are tested separately. Cancel and Escape cannot interrupt an
active deletion. Success requires an explicit `success: true` result. The
success action (or Escape after success) invokes `onDeleted`; the Course Editor
then releases its unsaved guard, resets drafts and replaces the route with the
course list. That callback is unreachable in the current offline preview.

Backend source was inspected only: an owner or Admin can delete; missing records
return 404, insufficient permissions return 403, success is HTTP 200 with
`{ success: true, message }`. Failures keep the current UI data. A network error
does not establish whether the server applied deletion: reload server data
before retrying once integrated. Do not hide a 404 by treating it as success.

No Backend, authentication, dependency or deployment changes are included.

## Checks

From `frontend/`:

```sh
node tests/course-deletion.test.cjs
node tests/instructor-assignment.test.cjs
node tests/admin-demo.test.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

The deletion tests cover Cancel, Confirm, pending/repeated actions, retry,
verified success, invalid/missing IDs, 404, 403, network/server failure and
unconfirmed HTTP 200 responses. HTTP responses are test doubles; they do not
prove a running Backend or Database.

Validation on this implementation: all 8 deletion, 9 assignment and 8 Admin
checks passed; TypeScript and the production build passed. Build used temporary
`NEXT_IGNORE_INCORRECT_LOCKFILE=1` and `NEXT_TELEMETRY_DISABLED=1`, with real Google
Fonts. Lint remains unavailable because ESLint is missing; no package was added.
Chromium at 390px passed Cancel, original-name confirmation, repeated offline
Confirm, draft preservation, Escape/focus restoration and Tab/Shift+Tab
containment. Quiz and Assignment editors still opened. No API write requests or
application console errors were observed in the final browser check. Loading
and verified success transitions were unit-tested with test responses, not
exercised against a running server.
