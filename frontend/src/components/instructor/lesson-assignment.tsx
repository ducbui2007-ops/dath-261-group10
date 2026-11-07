"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DemoDialog } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  assignmentDraftsEqual, createAssignmentDraft, validateAssignmentDraft,
  type AssignmentDraft, type AssignmentErrors,
} from "@/lib/instructor-assignment";

interface LessonAssignmentProps {
  lessonId: string;
  lessonTitle: string;
  value?: AssignmentDraft;
  onChange: (draft: AssignmentDraft) => void;
  onDirtyChange: (dirty: boolean) => void;
  disabled: boolean;
}

const FIELDS = [
  ["title", "Assignment Title", "text"],
  ["description", "Instructions / Requirements", "textarea"],
  ["dueDate", "Deadline (optional, local time)", "datetime-local"],
  ["totalPoints", "Maximum Score (points)", "number"],
  ["passScore", "Passing Score (%)", "number"],
  ["maxFileSizeMb", "Maximum File Size (MB)", "number"],
  ["allowedFileTypes", "Allowed File Extensions", "text"],
] as const;

function AssignmentEditor({ value, lessonTitle, onApply, onClose, onDirtyChange }: {
  value?: AssignmentDraft;
  lessonTitle: string;
  onApply: (draft: AssignmentDraft) => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [initial] = useState(() => ({ ...(value ?? createAssignmentDraft()) }));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<AssignmentErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dirty = !assignmentDraftsEqual(initial, draft);
  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const requestClose = () => dirty ? setConfirmDiscard(true) : onClose();

  return (
    <DemoDialog title={value ? "Edit File Assignment" : "Create File Assignment"}
      description="Local draft only — nothing is saved to the server or sent to students. Reloading or leaving the course discards it."
      onClose={requestClose}>
      <div data-component="AssignmentEditor" className="assignment-editor__container_01 min-w-0 space-y-4">
        <p className="assignment-editor__placement_01 break-words text-sm">Lesson: {lessonTitle.trim() || "Untitled lesson"}</p>
        <Badge variant="outline">{dirty ? "Unsaved assignment changes" : "Local draft"}</Badge>
        <form noValidate className="assignment-editor__form_01 grid min-w-0 gap-4 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextErrors = validateAssignmentDraft(draft);
          setErrors(nextErrors);
          const first = FIELDS.find(([key]) => nextErrors[key]);
          if (first) document.getElementById(`assignment-${first[0]}`)?.focus();
          else onApply({ ...draft });
        }}>
          {FIELDS.map(([key, label, type]) => {
            const id = `assignment-${key}`;
            const props = {
              id, value: draft[key], required: key !== "dueDate",
              "aria-invalid": Boolean(errors[key]),
              "aria-describedby": `${id}-help${errors[key] ? ` ${id}-error` : ""}`,
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                setDraft((previous) => ({ ...previous, [key]: event.target.value }));
                setErrors((previous) => ({ ...previous, [key]: undefined }));
              },
            };
            const help = key === "dueDate" ? "Uses your browser's timezone. Leave empty for no deadline; past deadlines are allowed when editing."
              : key === "passScore" ? "Percentage of the maximum score, not a number of points."
              : key === "allowedFileTypes" ? "Comma-separated, without leading dots: pdf, docx, zip, tar.gz."
              : key === "maxFileSizeMb" ? "Positive whole MB. File submission limits are not enforced by this local draft."
              : key === "totalPoints" ? "At least 1 point; fractional scores are allowed."
              : key === "description" ? "Describe what students must submit and how their work will be assessed."
              : "A descriptive name for this lesson's file submission assignment.";
            return (
              <div key={key} className={`assignment-editor__field_01 min-w-0 space-y-2 ${["title", "description", "allowedFileTypes"].includes(key) ? "sm:col-span-2" : ""}`}>
                <label htmlFor={id} className="assignment-editor__label_01 block text-sm font-medium">{label}</label>
                {type === "textarea" ? <textarea {...props} rows={5} className="assignment-editor__instructions_01 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  : <Input {...props} ref={key === "title" ? titleRef : undefined} type={type}
                    min={type === "number" ? key === "passScore" ? 0 : 1 : undefined}
                    max={key === "passScore" ? 100 : undefined}
                    step={type === "number" ? key === "maxFileSizeMb" ? 1 : "any" : undefined} />}
                <p id={`${id}-help`} className="assignment-editor__help_01 text-xs text-muted-foreground">{help}</p>
                {errors[key] && <p id={`${id}-error`} role="alert" className="assignment-editor__error_01 text-sm text-destructive">{errors[key]}</p>}
              </div>
            );
          })}
          <div className="assignment-editor__actions_01 flex flex-col gap-3 sm:col-span-2 sm:flex-row">
            <Button type="submit">Apply to Local Course Draft</Button>
            <Button type="button" variant="outline" onClick={requestClose}>Cancel</Button>
          </div>
        </form>
        {confirmDiscard && (
          <DemoDialog title="Discard assignment edits?" description="Only edits made in this editor will be discarded. The previously applied course draft is kept."
            onClose={() => setConfirmDiscard(false)}>
            <div className="assignment-editor__confirmation_01 flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>Keep Editing Assignment</Button>
              <Button type="button" variant="destructive" onClick={onClose}>Discard Assignment Edits</Button>
            </div>
          </DemoDialog>
        )}
      </div>
    </DemoDialog>
  );
}

export function LessonAssignment({ lessonId, lessonTitle, value, onChange, onDirtyChange, disabled }: LessonAssignmentProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <Card data-component="LessonAssignment" className="lesson-assignment__container_01 min-w-0 rounded-[15px]">
      <CardHeader className="lesson-assignment__header_01 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 id={`lesson-assignment-${lessonId}`} className="lesson-assignment__title_01 font-display text-base font-bold">File Submission Assignment</h4>
        <Button ref={triggerRef} type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
          {value ? "Edit Assignment" : "Add Assignment"}
        </Button>
      </CardHeader>
      <CardContent className="lesson-assignment__content_01 min-w-0 space-y-2">
        <p className="lesson-assignment__notice_01 text-xs text-muted-foreground">One assignment per lesson. Local draft only — not saved to a server.</p>
        {value ? <div role="status" className="lesson-assignment__summary_01 space-y-1 break-words text-sm">
          <p className="font-semibold">{value.title}</p>
          <p>{value.totalPoints} points · Pass: {value.passScore}% · Maximum file: {value.maxFileSizeMb} MB</p>
          <p>Allowed: {value.allowedFileTypes}</p>
          <p>{value.dueDate ? `Deadline: ${value.dueDate.replace("T", " ")} (browser local time)` : "No deadline"}</p>
          <Badge variant="outline">Applied locally — not saved</Badge>
        </div> : <p className="text-sm text-muted-foreground">No assignment in this lesson draft.</p>}
      </CardContent>
      {open && createPortal(<AssignmentEditor value={value} lessonTitle={lessonTitle} onDirtyChange={onDirtyChange}
        onClose={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }}
        onApply={(draft) => { onChange(draft); setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }} />, document.body)}
    </Card>
  );
}
