"use client";

import { useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CourseDeletionResponse } from "@/lib/api/instructor-courses";
import { courseDeletionState } from "@/lib/course-deletion-state";

interface CourseDeletionProps {
  courseId: string;
  courseTitle: string;
  hasUnsavedChanges: boolean;
  disabled: boolean;
  deleteCourse?: (id: string) => Promise<CourseDeletionResponse>;
  onDeleted: () => void;
}

export function CourseDeletion({ courseId, courseTitle, hasUnsavedChanges, disabled, deleteCourse, onDeleted }: CourseDeletionProps) {
  const [state, dispatch] = useReducer(courseDeletionState, { phase: "closed" });
  const { phase } = state;
  const open = phase !== "closed";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      cancelRef.current?.focus();
    } else dialogRef.current?.close();
  }, [open]);

  useEffect(() => {
    if (phase === "success") backRef.current?.focus();
    if (phase === "deleting") dialogRef.current?.focus();
  }, [phase]);

  const close = () => {
    if (pendingRef.current) return;
    if (phase === "success") { onDeleted(); return; }
    dispatch({ type: "cancel" });
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const confirm = async () => {
    if (pendingRef.current || (phase !== "confirm" && phase !== "error")) return;
    dispatch({ type: "confirm" });
    if (!deleteCourse) {
      dispatch({ type: "error", message: "Deletion is unavailable in this local preview. No API request was sent. The sample course and your drafts are unchanged." });
      return;
    }
    pendingRef.current = true;
    try {
      const response = await deleteCourse(courseId);
      if (response?.success !== true) throw new Error("The server did not confirm course deletion.");
      dispatch({ type: "success" });
    } catch (cause) {
      dispatch({ type: "error", message: cause instanceof Error ? cause.message : "Course deletion could not be confirmed. Check the course status before retrying." });
    } finally {
      pendingRef.current = false;
    }
  };

  return (
    <Card data-component="CourseDeletion" className="course-deletion__container_01 rounded-[15px] border-destructive/30">
      <CardHeader className="course-deletion__header_01">
        <h2 className="course-deletion__title_01 font-display text-lg font-bold">Delete Course</h2>
      </CardHeader>
      <CardContent className="course-deletion__content_01 space-y-4">
        <p className="course-deletion__notice_01 text-sm text-muted-foreground">
          {deleteCourse ? "Permanently delete this course after reviewing the confirmation."
            : "Local preview: course deletion is not connected to the server. Sample courses cannot be deleted here."}
        </p>
        <Button ref={triggerRef} type="button" variant="outline" disabled={disabled || phase === "success"}
          className="course-deletion__trigger_01 text-destructive" onClick={() => dispatch({ type: "open" })}>
          Delete Course
        </Button>
      </CardContent>
      <dialog ref={dialogRef} tabIndex={-1} aria-labelledby="course-delete-title" aria-describedby="course-delete-description"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          const first = controls[0], last = controls[controls.length - 1];
          if (!first) event.preventDefault();
          else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        className="course-deletion__dialog_01 max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-black/50">
        <h2 id="course-delete-title" className="course-deletion__dialog-title_01 font-display text-xl font-bold">
          {phase === "success" ? "Course deleted" : "Delete this course?"}
        </h2>
        <p className="course-deletion__course-name_01 mt-4 break-words font-semibold">{courseTitle}</p>
        <p id="course-delete-description" className="course-deletion__description_01 mt-3 text-sm text-muted-foreground">
          {deleteCourse ? "Deleting the course on the server cannot be undone. Review the course name before confirming."
            : "This is a confirmation preview only. Confirming cannot delete a course until the server API is integrated."}
        </p>
        {hasUnsavedChanges && phase !== "success" && <p className="course-deletion__draft-warning_01 mt-3 text-sm">
          You have unsaved course changes, which may include quizzes and assignments. Cancel keeps these drafts.
        </p>}
        {phase === "deleting" && <p role="status" className="course-deletion__pending_01 mt-4 text-sm">Deleting course… Please wait.</p>}
        {state.phase === "error" && <p role="alert" className="course-deletion__error_01 mt-4 break-words text-sm text-destructive">{state.message}</p>}
        {phase === "success" && <p role="status" className="course-deletion__success_01 mt-4 text-sm">The server confirmed deletion. Return to the course list to load its current state.</p>}
        <div aria-busy={phase === "deleting"} className="course-deletion__actions_01 mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {phase === "success" ? <Button ref={backRef} type="button" onClick={onDeleted}>Back to Courses</Button> : <>
            <Button ref={cancelRef} type="button" variant="outline" disabled={phase === "deleting"} onClick={close}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={phase === "deleting"} onClick={() => void confirm()}>
              {phase === "deleting" ? "Deleting…" : "Confirm Deletion"}
            </Button>
          </>}
        </div>
      </dialog>
    </Card>
  );
}
