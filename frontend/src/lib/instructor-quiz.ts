import type { Course } from "@/types/course";
import type { Question, Quiz } from "@/types/quiz";

export type QuizPlacement =
  | { kind: "course" }
  | { kind: "chapter"; chapterId: string }
  | { kind: "lesson"; chapterId: string; lessonId: string };

export type GradingMethod = "highest" | "average" | "latest";

export interface QuizSettingsDraft {
  timeLimitMinutes: string;
  availableFrom: string;
  availableUntil: string;
  unlimitedAttempts: boolean;
  maxAttempts: string;
  gradingMethod: GradingMethod;
}

export type QuestionDraft = Omit<Question, "options" | "points"> & {
  options: [string, string, string, string];
  points: string;
};

export type InstructorQuizDraft = Pick<Quiz, "id" | "courseId" | "title"> & {
  placement: QuizPlacement;
  settings: QuizSettingsDraft;
  questions: QuestionDraft[];
};

export type QuizErrors = Record<string, string>;

export function createQuestionDraft(): QuestionDraft {
  return {
    id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], points: "1", explanation: "",
  };
}

export function createQuizDraft(courseId: string, placement: QuizPlacement): InstructorQuizDraft {
  return {
    id: crypto.randomUUID(),
    courseId,
    title: "",
    placement: { ...placement },
    settings: {
      timeLimitMinutes: "30", availableFrom: "", availableUntil: "",
      unlimitedAttempts: false, maxAttempts: "1", gradingMethod: "highest",
    },
    questions: [createQuestionDraft()],
  };
}

export function cloneQuizDraft(draft: InstructorQuizDraft): InstructorQuizDraft {
  return {
    ...draft,
    placement: { ...draft.placement },
    settings: { ...draft.settings },
    questions: draft.questions.map((question) => ({ ...question, options: [...question.options] })),
  };
}

export function sameQuizPlacement(a: QuizPlacement, b: QuizPlacement): boolean {
  if (a.kind === "course" || b.kind === "course") return a.kind === b.kind;
  if (a.kind !== b.kind || a.chapterId !== b.chapterId) return false;
  return a.kind === "chapter" || (b.kind === "lesson" && a.lessonId === b.lessonId);
}

export function quizDraftsEqual(a: InstructorQuizDraft, b: InstructorQuizDraft): boolean {
  if (a.id !== b.id || a.courseId !== b.courseId || a.title !== b.title || !sameQuizPlacement(a.placement, b.placement)) return false;
  const settingKeys: (keyof QuizSettingsDraft)[] = [
    "timeLimitMinutes", "availableFrom", "availableUntil", "unlimitedAttempts", "maxAttempts", "gradingMethod",
  ];
  if (settingKeys.some((key) => a.settings[key] !== b.settings[key])) return false;
  return a.questions.length === b.questions.length && a.questions.every((question, index) => {
    const other = b.questions[index];
    return question.id === other.id && question.prompt === other.prompt && question.points === other.points &&
      question.explanation === other.explanation && question.correctOptionIndex === other.correctOptionIndex &&
      question.options.length === other.options.length && question.options.every((option, optionIndex) => option === other.options[optionIndex]);
  });
}

export function describeQuizPlacement(placement: QuizPlacement, courseTitle: string, chapters: Course["chapters"]): string {
  const courseName = courseTitle.trim() || "Untitled course";
  if (placement.kind === "course") return courseName;
  const chapter = chapters.find((item) => item.id === placement.chapterId);
  const chapterName = chapter?.title.trim() || "Untitled chapter";
  if (placement.kind === "chapter") return `${courseName} / ${chapterName}`;
  const lesson = chapter?.lessons.find((item) => item.id === placement.lessonId);
  return `${courseName} / ${chapterName} / ${lesson?.title.trim() || "Untitled lesson"}`;
}

export function pruneQuizDrafts(drafts: InstructorQuizDraft[], chapters: Course["chapters"]): InstructorQuizDraft[] {
  return drafts.filter(({ placement }) => {
    if (placement.kind === "course") return true;
    const chapter = chapters.find((item) => item.id === placement.chapterId);
    return Boolean(chapter && (placement.kind === "chapter" || chapter.lessons.some((lesson) => lesson.id === placement.lessonId)));
  });
}

function positiveNumber(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
}

function localDateTime(value: string): number | undefined {
  const match = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!match) return undefined;
  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, millisecondValue] = match;
  const [year, month, day, hour, minute, second] = [yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue || "0"].map(Number);
  const millisecond = Number((millisecondValue || "0").padEnd(3, "0"));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return undefined;
  // Native datetime-local values use the browser's local timezone, not UTC.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, second, millisecond);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 ||
      date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute || date.getSeconds() !== second) return undefined;
  return date.getTime();
}

export function validateQuizDraft(draft: InstructorQuizDraft): QuizErrors {
  const errors: QuizErrors = {};
  const settings = draft.settings;
  if (!draft.title.trim()) errors["quiz-title"] = "Enter a quiz title.";
  if (!positiveNumber(settings.timeLimitMinutes) || !Number.isSafeInteger(Number(settings.timeLimitMinutes))) {
    errors["quiz-time-limit"] = "Enter a positive whole number of minutes.";
  }
  if (!settings.unlimitedAttempts && (!positiveNumber(settings.maxAttempts) || !Number.isSafeInteger(Number(settings.maxAttempts)))) {
    errors["quiz-max-attempts"] = "Enter a positive whole number of attempts.";
  }
  if (!["highest", "average", "latest"].includes(settings.gradingMethod)) errors["quiz-grading-method"] = "Select a valid grading method.";
  const from = settings.availableFrom ? localDateTime(settings.availableFrom) : undefined;
  const until = settings.availableUntil ? localDateTime(settings.availableUntil) : undefined;
  if (settings.availableFrom && from === undefined) errors["quiz-available-from"] = "Enter a valid local start date and time.";
  if (settings.availableUntil && until === undefined) errors["quiz-available-until"] = "Enter a valid local end date and time.";
  if (from !== undefined && until !== undefined && until <= from) errors["quiz-available-until"] = "The end must be after the start.";
  if (!draft.questions.length) errors["quiz-questions"] = "Add at least one question.";
  for (const question of draft.questions) {
    if (!question.prompt.trim()) errors[`${question.id}-prompt`] = "Enter a question.";
    if (question.options.length !== 4) errors["quiz-questions"] = "Each question must have exactly four answer options.";
    for (let index = 0; index < 4; index += 1) {
      if (!question.options[index]?.trim()) errors[`${question.id}-options-${index}`] = "Enter an answer option.";
    }
    if (typeof question.correctOptionIndex !== "number" || !Number.isInteger(question.correctOptionIndex) ||
        question.correctOptionIndex < 0 || question.correctOptionIndex > 3) errors[`${question.id}-correct`] = "Choose one correct answer.";
    if (!positiveNumber(question.points)) errors[`${question.id}-points`] = "Enter a positive, finite point value.";
  }
  return errors;
}

export function toSharedQuiz(draft: InstructorQuizDraft): Quiz | undefined {
  if (Object.keys(validateQuizDraft(draft)).length) return undefined;
  // Placement, availability, attempts and grading stay in the local Instructor draft.
  return {
    id: draft.id,
    courseId: draft.courseId,
    title: draft.title,
    timeLimitMinutes: Number(draft.settings.timeLimitMinutes),
    questions: draft.questions.map((question) => ({ ...question, options: [...question.options], points: Number(question.points) })),
  };
}
