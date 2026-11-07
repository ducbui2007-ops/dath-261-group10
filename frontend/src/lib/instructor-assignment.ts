import type { Course } from "@/types/course";

// Local course drafts only, not persisted assignments or API responses.
export interface AssignmentDraft {
  title: string;
  description: string;
  dueDate: string;
  totalPoints: string;
  passScore: string;
  maxFileSizeMb: string;
  allowedFileTypes: string;
}

export type AssignmentDrafts = Record<string, AssignmentDraft>;
export type AssignmentErrors = Partial<Record<keyof AssignmentDraft, string>>;

export function createAssignmentDraft(): AssignmentDraft {
  return {
    title: "", description: "", dueDate: "", totalPoints: "100",
    passScore: "50", maxFileSizeMb: "25", allowedFileTypes: "zip, pdf, tar.gz",
  };
}

export function assignmentDraftsEqual(a: AssignmentDraft, b: AssignmentDraft): boolean {
  return (Object.keys(a) as (keyof AssignmentDraft)[]).every((key) => a[key] === b[key]);
}

export function assignmentFileTypes(value: string): string[] {
  return value.split(",").map((extension) => extension.trim().toLowerCase());
}

export function assignmentDueDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(value);
  const parts = value.split(/[-T:]/).map(Number);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() < 1 ||
      [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]
        .some((part, index) => part !== parts[index])) return undefined;
  return date;
}

export function validateAssignmentDraft(draft: AssignmentDraft): AssignmentErrors {
  const errors: AssignmentErrors = {};
  if (!draft.title.trim()) errors.title = "Enter an assignment title.";
  if (!draft.description.trim()) errors.description = "Enter the assignment instructions.";
  const number = (value: string) => value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number(draft.totalPoints)) || number(draft.totalPoints) < 1) {
    errors.totalPoints = "Enter a finite maximum score of at least 1 point.";
  }
  if (!Number.isFinite(number(draft.passScore)) || number(draft.passScore) < 0 || number(draft.passScore) > 100) {
    errors.passScore = "Enter a passing percentage between 0 and 100.";
  }
  if (!Number.isSafeInteger(number(draft.maxFileSizeMb)) || number(draft.maxFileSizeMb) < 1) {
    errors.maxFileSizeMb = "Enter a positive whole number of megabytes.";
  }
  const extensions = assignmentFileTypes(draft.allowedFileTypes);
  if (extensions.some((extension) => !/^[a-z0-9]+(?:\.[a-z0-9]+)*$/.test(extension))) {
    errors.allowedFileTypes = "Enter comma-separated extensions without a leading dot, such as pdf, docx, tar.gz.";
  } else if (new Set(extensions).size !== extensions.length) {
    errors.allowedFileTypes = "Remove duplicate file extensions.";
  }
  if (draft.dueDate && !assignmentDueDate(draft.dueDate)) errors.dueDate = "Enter a valid local date and time.";
  return errors;
}

export function pruneAssignmentDrafts(drafts: AssignmentDrafts, chapters: Course["chapters"]): AssignmentDrafts {
  const ids = new Set(chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id)));
  return Object.fromEntries(Object.entries(drafts).filter(([id]) => ids.has(id)));
}
