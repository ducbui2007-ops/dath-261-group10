"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CurriculumBuilder } from "@/components/instructor/curriculum-builder";
import { QuizEditor } from "@/components/quiz/quiz-editor";
import { QuizPlacementSection } from "@/components/quiz/quiz-placement-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EMPTY_MATERIAL,
  formatFileSize,
  getMaterialContentUrl,
  getMaterialType,
  hasMaterialContent,
  hydrateMaterials,
  materialDraftsEqual,
  pruneMaterials,
  validateMaterial,
  type MaterialDraft,
  type MaterialDrafts,
} from "@/lib/instructor-material";
import { MOCK_INSTRUCTOR_COURSES } from "@/lib/mock-instructor-courses";
import { cloneQuizDraft, createQuizDraft, describeQuizPlacement, pruneQuizDrafts, type InstructorQuizDraft, type QuizPlacement } from "@/lib/instructor-quiz";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";

export type CourseFormValues = Pick<
  Course,
  "title" | "description" | "thumbnailUrl" | "category" | "level"
>;

type CourseFormProps = { initialValues: CourseFormValues } & (
  | { mode: "create" }
  | { mode: "edit"; courseId: string; initialChapters: Course["chapters"]; initialIsPublished: Course["isPublished"] }
);
type FormErrors = Partial<Record<keyof CourseFormValues, string>>;
type CoursePreview = CourseFormValues & { chapters?: Course["chapters"]; materials?: MaterialDrafts; isPublished?: Course["isPublished"]; quizzes?: InstructorQuizDraft[] };

const FIELDS = [
  ["title", "Course Title"],
  ["description", "Description"],
  ["thumbnailUrl", "Thumbnail URL"],
  ["category", "Category"],
  ["level", "Level"],
] as const;
const LEVELS: Course["level"][] = ["Beginner", "Intermediate", "Advanced"];
const LEAVE_MESSAGE = "You have unsaved changes. Are you sure you want to leave this page?";
const CONTROL_STYLE = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function cloneChapters(chapters: Course["chapters"]): Course["chapters"] {
  return chapters.map((chapter) => ({
    ...chapter,
    lessons: chapter.lessons.map((lesson) => ({ ...lesson })),
  }));
}

function validate(values: CourseFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = "Enter a course title.";
  if (!values.description.trim()) errors.description = "Enter a description.";
  if (!values.category.trim()) errors.category = "Enter a category.";
  if (!LEVELS.includes(values.level)) errors.level = "Select a valid level.";
  if (values.thumbnailUrl.trim()) {
    try {
      const url = new URL(values.thumbnailUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      errors.thumbnailUrl = "Enter a valid HTTP or HTTPS URL, or leave it empty.";
    }
  }
  return errors;
}

export function CourseForm(props: CourseFormProps) {
  const { initialValues, mode } = props;
  const initialChapters = props.mode === "edit" ? props.initialChapters : [];
  const initialIsPublished = props.mode === "edit" ? props.initialIsPublished : false;
  const initialMaterials = React.useMemo(() => hydrateMaterials(initialChapters), [initialChapters]);
  const router = useRouter();
  const [values, setValues] = React.useState<CourseFormValues>(() => ({ ...initialValues }));
  const [isPublished, setIsPublished] = React.useState<Course["isPublished"]>(initialIsPublished);
  const [chapters, setChapters] = React.useState(() => cloneChapters(initialChapters));
  const [materials, setMaterials] = React.useState(() => hydrateMaterials(initialChapters));
  const [quizzes, setQuizzes] = React.useState<InstructorQuizDraft[]>([]);
  const [editingQuiz, setEditingQuiz] = React.useState<InstructorQuizDraft | null>(null);
  const [quizEditorDirty, setQuizEditorDirty] = React.useState(false);
  const [pendingQuizRemoval, setPendingQuizRemoval] = React.useState<InstructorQuizDraft | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [curriculumErrors, setCurriculumErrors] = React.useState<Record<string, string>>({});
  const [materialErrors, setMaterialErrors] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<CoursePreview | null>(null);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [isResetPending, setIsResetPending] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const stayRef = React.useRef<HTMLButtonElement>(null);
  const resetDialogRef = React.useRef<HTMLDialogElement>(null);
  const keepEditingRef = React.useRef<HTMLButtonElement>(null);
  const resetButtonRef = React.useRef<HTMLButtonElement>(null);
  const quizTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const quizRemoveDialogRef = React.useRef<HTMLDialogElement>(null);
  const keepQuizRef = React.useRef<HTMLButtonElement>(null);
  const allowLeaveRef = React.useRef(false);
  const isDirty = FIELDS.some(([name]) => values[name] !== initialValues[name]) ||
    (mode === "edit" && (quizzes.length > 0 || quizEditorDirty || isPublished !== initialIsPublished || JSON.stringify(chapters) !== JSON.stringify(initialChapters) ||
      !materialDraftsEqual(materials, initialMaterials)));

  React.useEffect(() => setIsReady(true), []);

  const requestNavigation = React.useCallback((href: string) => {
    if (isDirty) setPendingHref(href);
    else router.push(href);
  }, [isDirty, router]);

  React.useEffect(() => {
    if (pendingHref) {
      dialogRef.current?.showModal();
      stayRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [pendingHref]);

  React.useEffect(() => {
    if (isResetPending) {
      if (!resetDialogRef.current?.open) resetDialogRef.current?.showModal();
      keepEditingRef.current?.focus();
    } else {
      resetDialogRef.current?.close();
    }
  }, [isResetPending]);

  React.useEffect(() => {
    if (pendingQuizRemoval) {
      if (!quizRemoveDialogRef.current?.open) quizRemoveDialogRef.current?.showModal();
      keepQuizRef.current?.focus();
    } else {
      quizRemoveDialogRef.current?.close();
    }
  }, [pendingQuizRemoval]);

  React.useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    // Guard ordinary link clicks only while this form is mounted and dirty.
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      requestNavigation(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardLink, true);
    };
  }, [isDirty, requestNavigation]);

  const changeMaterial = (lessonId: string, material: MaterialDraft) => {
    allowLeaveRef.current = false;
    setMaterials((previous) => ({ ...previous, [lessonId]: material }));
    const originalLesson = initialChapters.flatMap((chapter) => chapter.lessons).find((lesson) => lesson.id === lessonId);
    setChapters((previous) => previous.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => lesson.id === lessonId ? {
        ...lesson,
        type: getMaterialType(material) ?? originalLesson?.type ?? "text",
        contentUrl: getMaterialContentUrl(material),
      } : lesson),
    })));
    setMaterialErrors((previous) => {
      const next = { ...previous };
      delete next[lessonId];
      return next;
    });
    setPreview(null);
  };

  const reset = () => {
    setValues({ ...initialValues });
    setIsPublished(initialIsPublished);
    setChapters(cloneChapters(initialChapters));
    setMaterials(hydrateMaterials(initialChapters));
    setQuizzes([]);
    setEditingQuiz(null);
    setQuizEditorDirty(false);
    setErrors({});
    setCurriculumErrors({});
    setMaterialErrors({});
    setPreview(null);
  };
  const review = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    const nextCurriculumErrors: Record<string, string> = {};
    const nextMaterialErrors: Record<string, string> = {};
    let invalidCurriculumField: string | undefined;
    if (mode === "edit") {
      for (const chapter of chapters) {
        if (!chapter.title.trim()) {
          nextCurriculumErrors[chapter.id] = "Enter a chapter title.";
          invalidCurriculumField ??= `curriculum-chapter-${chapter.id}`;
        }
        for (const lesson of chapter.lessons) {
          if (!lesson.title.trim()) {
            nextCurriculumErrors[lesson.id] = "Enter a lesson title.";
            invalidCurriculumField ??= `curriculum-lesson-${lesson.id}`;
          }
          const materialError = validateMaterial(materials[lesson.id] ?? EMPTY_MATERIAL);
          if (materialError) {
            nextMaterialErrors[lesson.id] = materialError;
            invalidCurriculumField ??= `material-${lesson.id}`;
          }
        }
      }
    }
    setErrors(nextErrors);
    setCurriculumErrors(nextCurriculumErrors);
    setMaterialErrors(nextMaterialErrors);
    const invalidField = FIELDS.find(([name]) => nextErrors[name]);
    if (invalidField) {
      document.getElementById(`course-${invalidField[0]}`)?.focus();
      return;
    }
    if (invalidCurriculumField) {
      document.getElementById(invalidCurriculumField)?.focus();
      return;
    }
    setPreview({ ...values, ...(mode === "edit" ? {
      isPublished,
      chapters: cloneChapters(chapters),
      materials: Object.fromEntries(Object.entries(materials).map(([id, material]) => [id, { ...material }])),
      quizzes: quizzes.map(cloneQuizDraft),
    } : {}) });
  };

  const restoreQuizFocus = () => {
    if (quizTriggerRef.current?.isConnected) quizTriggerRef.current.focus();
    else document.getElementById("course-title")?.focus();
  };
  const closeQuizEditor = () => {
    setEditingQuiz(null);
    setQuizEditorDirty(false);
    requestAnimationFrame(restoreQuizFocus);
  };
  const openQuizEditor = (quiz: InstructorQuizDraft, trigger: HTMLButtonElement) => {
    quizTriggerRef.current = trigger;
    setEditingQuiz(cloneQuizDraft(quiz));
  };
  const renderQuizzes = (placement: QuizPlacement) => (
    <QuizPlacementSection
      placement={placement}
      quizzes={quizzes}
      disabled={!isReady}
      onAdd={(target, trigger) => {
        if (props.mode === "edit") openQuizEditor(createQuizDraft(props.courseId, target), trigger);
      }}
      onEdit={openQuizEditor}
      onRemove={(quiz, trigger) => { quizTriggerRef.current = trigger; setPendingQuizRemoval(quiz); }}
    />
  );

  return (
    <div data-component="CourseForm" className="course-form__container_01 min-h-screen bg-background pb-16">
      <div className="course-form__content_01 mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="course-form__header_01 space-y-2">
          <h1 className="course-form__title_01 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {mode === "edit" ? "Edit Course" : "Create Course"}
          </h1>
          <p className="course-form__notice_01 text-sm text-muted-foreground">
            Changes are not saved to a server. Leaving or refreshing discards them.
            {mode === "edit" && " You are editing sample course metadata."}
          </p>
        </div>

        <Card className="course-form__card_01 rounded-[15px]">
          <CardContent className="course-form__fields_01 p-6">
            {props.mode === "edit" && (
              <div className="course-form__selector_01 mb-6 space-y-2">
                <label htmlFor="course-selector" className="course-form__label_01 text-sm font-medium">Select a Course</label>
                <select id="course-selector" value={props.courseId} disabled={!isReady} className={cn("course-form__select_01", CONTROL_STYLE)}
                  onChange={(event) => requestNavigation(`/instructor/courses/${event.target.value}/edit`)}>
                  {MOCK_INSTRUCTOR_COURSES.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </div>
            )}
            <form onSubmit={review} noValidate className="course-form__form_01 space-y-6">
              {mode === "edit" && (
                <h2 className="course-form__section-title_01 font-display text-xl font-bold">Course Information</h2>
              )}
              <div className="course-form__grid_01 grid grid-cols-1 gap-6 md:grid-cols-2">
                {FIELDS.map(([name, label]) => {
                  const inputProps = {
                    id: `course-${name}`,
                    name,
                    value: values[name],
                    disabled: !isReady,
                    required: name !== "thumbnailUrl",
                    "aria-invalid": Boolean(errors[name]),
                    "aria-describedby": errors[name] ? `course-${name}-error` : undefined,
                    className: cn("course-form__control_01", CONTROL_STYLE, name !== "description" && "h-11", errors[name] && "border-destructive"),
                    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                      allowLeaveRef.current = false;
                      setValues((previous) => ({ ...previous, [name]: event.target.value }));
                      setErrors((previous) => ({ ...previous, [name]: undefined }));
                      setPreview(null);
                    },
                  };
                  return (
                    <div key={name} className={cn("course-form__field_01 space-y-2", name === "description" && "md:col-span-2")}>
                      <label htmlFor={inputProps.id} className="course-form__label_01 block text-sm font-medium">
                        {label}{name === "thumbnailUrl" && " (optional)"}
                      </label>
                      {name === "description" ? <textarea {...inputProps} rows={4} /> : name === "level" ? (
                        <select {...inputProps}>{LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select>
                      ) : <Input {...inputProps} type={name === "thumbnailUrl" ? "url" : "text"} />}
                      {errors[name] && <p id={`course-${name}-error`} role="alert" className="course-form__error_01 text-sm text-destructive">{errors[name]}</p>}
                    </div>
                  );
                })}
              </div>
              {mode === "edit" && (
                <section aria-labelledby="course-publication-title" className="course-form__publication_01 space-y-3 rounded-[15px] border border-border p-4">
                  <div className="course-form__publication-heading_01 flex flex-wrap items-center justify-between gap-2">
                    <h2 id="course-publication-title" className="course-form__publication-title_01 font-display text-lg font-bold">Publication Status</h2>
                    <Badge variant="outline" className={cn("course-form__publication-status_01 whitespace-nowrap", isPublished
                      ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-red-600/20 bg-red-500/10 text-red-700 dark:text-red-300")}>{isPublished ? "Published" : "Draft"}</Badge>
                  </div>
                  <label htmlFor="course-is-published" className="course-form__publication-toggle_01 flex w-fit cursor-pointer items-center gap-3">
                    <input id="course-is-published" type="checkbox" role="switch" checked={isPublished} disabled={!isReady}
                      aria-describedby="course-publication-notice"
                      onChange={(event) => {
                        allowLeaveRef.current = false;
                        setIsPublished(event.target.checked);
                        setPreview(null);
                      }} className="course-form__publication-input_01 peer sr-only" />
                    <span aria-hidden="true" className="course-form__publication-track_01 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-muted p-0.5 transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50">
                      <span className={cn("course-form__publication-thumb_01 block h-4 w-4 rounded-full bg-primary-foreground shadow-sm transition-transform", isPublished ? "translate-x-5" : "translate-x-0")} />
                    </span>
                    <span className="course-form__publication-label_01 text-sm font-medium">Publish this course</span>
                  </label>
                  <p id="course-publication-notice" className="course-form__publication-notice_01 text-xs text-muted-foreground">Preview only — status changes are not saved or applied to the course.</p>
                </section>
              )}
              {mode === "edit" && (
                renderQuizzes({ kind: "course" })
              )}
              {mode === "edit" && (
                <CurriculumBuilder
                  chapters={chapters}
                  materials={materials}
                  onMaterialChange={changeMaterial}
                  quizzes={quizzes}
                  renderQuizzes={renderQuizzes}
                  errors={curriculumErrors}
                  materialErrors={materialErrors}
                  disabled={!isReady}
                  onChange={(nextChapters) => {
                    allowLeaveRef.current = false;
                    setChapters(nextChapters);
                    setMaterials((previous) => pruneMaterials(previous, nextChapters));
                    setQuizzes((previous) => pruneQuizDrafts(previous, nextChapters));
                    setCurriculumErrors({});
                    setMaterialErrors({});
                    setPreview(null);
                  }}
                />
              )}
              <div className="course-form__actions_01 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button type="submit" disabled={!isReady}>{mode === "edit" ? "Review Changes" : "Preview Course"}</Button>
                <Button ref={resetButtonRef} type="button" variant="outline" disabled={!isReady} onClick={() => {
                  if (isDirty) setIsResetPending(true);
                  else reset();
                }}>Reset</Button>
                <Button type="button" variant="ghost" disabled={!isReady} onClick={() => requestNavigation("/instructor/courses")}>Cancel / Back to Courses</Button>
                {isDirty && <Badge variant="outline" className="course-form__dirty_01 self-center">Unsaved changes</Badge>}
              </div>
            </form>
          </CardContent>
        </Card>

        {preview && (
          <Card className="course-form__preview_01 rounded-[15px]" aria-live="polite">
            <CardHeader className="course-form__preview-header_01 space-y-3">
              <h2 className="course-form__preview-title_01 font-display text-xl font-bold">{mode === "edit" ? "Course Preview" : "Course Metadata Preview"}</h2>
              <Badge variant="outline" className="course-form__preview-badge_01 self-start">Preview only — not saved</Badge>
            </CardHeader>
            <CardContent className="course-form__preview-body_01">
              <dl className="course-form__preview-fields_01 space-y-4">
                {FIELDS.map(([name, label]) => (
                  <div key={name} className="course-form__preview-field_01 space-y-1">
                    <dt className="course-form__preview-label_01 text-sm font-medium">{label}</dt>
                    <dd className="course-form__preview-value_01 whitespace-pre-wrap break-words text-sm text-muted-foreground">{preview[name] || "Not provided"}</dd>
                  </div>
                ))}
                {typeof preview.isPublished === "boolean" && (
                  <div className="course-form__preview-publication_01 space-y-1">
                    <dt className="course-form__preview-label_01 text-sm font-medium">Publication Status</dt>
                    <dd className="course-form__preview-value_01">
                      <Badge variant="outline" className={cn("course-form__preview-status_01 whitespace-nowrap", preview.isPublished
                        ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-red-600/20 bg-red-500/10 text-red-700 dark:text-red-300")}>{preview.isPublished ? "Published" : "Draft"}</Badge>
                    </dd>
                  </div>
                )}
              </dl>
              {preview.quizzes && preview.quizzes.length > 0 && (
                <section aria-labelledby="course-quizzes-preview-title" className="course-form__quiz-preview_01 mt-6 space-y-3">
                  <h3 id="course-quizzes-preview-title" className="course-form__section-title_03 font-display text-lg font-bold">Quiz Drafts</h3>
                  <p className="course-form__quiz-notice_01 text-xs text-muted-foreground">Not saved to a server. Review questions and settings using Edit Quiz.</p>
                  <ul className="course-form__quiz-list_01 space-y-2">
                    {preview.quizzes.map((quiz) => (
                      <li key={quiz.id} className="course-form__quiz-summary_01 space-y-1 rounded-lg border border-border p-3 text-sm">
                        <p className="course-form__quiz-title_01 break-words font-semibold">{quiz.title}</p>
                        <p className="course-form__quiz-placement_01 break-words text-muted-foreground">{describeQuizPlacement(quiz.placement, preview.title, preview.chapters ?? [])}</p>
                        <p className="course-form__quiz-count_01 text-muted-foreground">{quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {preview.chapters && (
                <section className="course-form__curriculum-preview_01 mt-6 space-y-4" aria-labelledby="curriculum-preview-title">
                  <h3 id="curriculum-preview-title" className="course-form__section-title_02 font-display text-lg font-bold">Course Curriculum</h3>
                  {preview.chapters.length === 0 ? (
                    <p className="course-form__empty_01 text-sm text-muted-foreground">No chapters added yet.</p>
                  ) : (
                    <ol className="course-form__preview-chapters_01 space-y-4">
                      {preview.chapters.map((chapter) => (
                        <li key={chapter.id} className="course-form__preview-chapter_01 space-y-3 rounded-lg border border-border p-4">
                          <h4 className="course-form__chapter-title_01 break-words font-medium">{chapter.order}. {chapter.title}</h4>
                          {chapter.lessons.length === 0 ? (
                            <p className="course-form__empty_02 text-sm text-muted-foreground">No lessons added yet.</p>
                          ) : (
                            <ol className="course-form__preview-lessons_01 space-y-2 pl-4">
                              {chapter.lessons.map((lesson) => {
                                const material = preview.materials?.[lesson.id] ?? EMPTY_MATERIAL;
                                return (
                                  <li key={lesson.id} className="course-form__preview-lesson_01 space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
                                    <div className="course-form__lesson-heading_01 flex flex-wrap items-center justify-between gap-2">
                                      <span className="course-form__lesson-title_01 min-w-0 break-words">{chapter.order}.{lesson.order} {lesson.title}</span>
                                      <Badge variant="outline" className="course-form__lesson-type_01 capitalize">{getMaterialType(material) ?? "Empty draft"}</Badge>
                                    </div>
                                    {!hasMaterialContent(material) ? (
                                      <p className="course-form__material-empty_01 text-muted-foreground">No material attached. This lesson is a valid draft.</p>
                                    ) : material.method === "upload" && material.file ? (
                                      <div className="course-form__material-file_01 space-y-1">
                                        <p className="course-form__material-name_01 break-all">{material.file.name}</p>
                                        <p className="course-form__material-size_01 text-muted-foreground">{formatFileSize(material.file.size)} ({material.file.size.toLocaleString()} bytes)</p>
                                        <Badge variant="outline" className="course-form__local-state_01">Selected locally — not uploaded</Badge>
                                      </div>
                                    ) : material.method === "url" ? (
                                      <div className="course-form__material-url_01 space-y-1">
                                        <a href={getMaterialContentUrl(material)} target="_blank" rel="noopener noreferrer" className="course-form__material-link_01 break-all text-primary underline">{material.url.trim()}</a>
                                        <p className="course-form__material-notice_01 text-xs text-muted-foreground">Remote URL not verified.</p>
                                      </div>
                                    ) : material.method === "text" ? (
                                      <p className="course-form__material-text_01 whitespace-pre-wrap break-words text-muted-foreground">{material.text}</p>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </CardContent>
          </Card>
        )}

        {editingQuiz && (
          <QuizEditor key={editingQuiz.id} initialValue={editingQuiz}
            placementLabel={describeQuizPlacement(editingQuiz.placement, values.title, chapters)}
            onDirtyChange={setQuizEditorDirty}
            onClose={closeQuizEditor}
            onApply={(draft) => {
              allowLeaveRef.current = false;
              setQuizzes((previous) => previous.some((quiz) => quiz.id === draft.id)
                ? previous.map((quiz) => quiz.id === draft.id ? cloneQuizDraft(draft) : quiz)
                : [...previous, cloneQuizDraft(draft)]);
              setPreview(null);
              closeQuizEditor();
            }} />
        )}

        <dialog ref={quizRemoveDialogRef} aria-labelledby="course-remove-quiz-title" aria-describedby="course-remove-quiz-message"
          onCancel={(event) => { event.preventDefault(); setPendingQuizRemoval(null); }}
          onClose={restoreQuizFocus}
          className="course-form__dialog_03 w-[calc(100%_-_2rem)] max-w-md rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50">
          <h2 id="course-remove-quiz-title" className="course-form__dialog-title_03 font-display text-xl font-bold">Remove this quiz?</h2>
          <p id="course-remove-quiz-message" className="course-form__dialog-message_03 mt-3 break-words text-sm text-muted-foreground">Removing {pendingQuizRemoval?.title} discards its questions and settings from this course draft.</p>
          <div className="course-form__dialog-actions_03 mt-6 flex flex-col gap-3 sm:flex-row">
            <Button ref={keepQuizRef} type="button" variant="outline" onClick={() => setPendingQuizRemoval(null)}>Keep Quiz</Button>
            <Button type="button" variant="destructive" onClick={() => {
              setQuizzes((previous) => previous.filter((quiz) => quiz.id !== pendingQuizRemoval?.id));
              setPreview(null);
              setPendingQuizRemoval(null);
            }}>Remove Quiz</Button>
          </div>
        </dialog>

        <dialog ref={resetDialogRef} aria-labelledby="course-reset-title" aria-describedby="course-reset-message"
          onCancel={(event) => { event.preventDefault(); setIsResetPending(false); }}
          onClose={() => { setIsResetPending(false); resetButtonRef.current?.focus(); }}
          className="course-form__dialog_02 w-[calc(100%_-_2rem)] max-w-md rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50">
          <h2 id="course-reset-title" className="course-form__dialog-title_02 font-display text-xl font-bold">Reset all changes?</h2>
          <p id="course-reset-message" className="course-form__dialog-message_02 mt-3 text-sm text-muted-foreground">
            This will discard all unsaved changes to the course information, chapters, lessons, learning materials, and quizzes. This action cannot be undone.
          </p>
          <div className="course-form__dialog-actions_02 mt-6 flex flex-col gap-3 sm:flex-row">
            <Button ref={keepEditingRef} type="button" variant="outline" onClick={() => setIsResetPending(false)}>Keep Editing</Button>
            <Button type="button" variant="destructive" onClick={() => {
              reset();
              setIsResetPending(false);
            }}>Reset Changes</Button>
          </div>
        </dialog>

        <dialog ref={dialogRef} aria-labelledby="course-leave-title" aria-describedby="course-leave-message"
          onCancel={() => setPendingHref(null)}
          className="course-form__dialog_01 w-[calc(100%_-_2rem)] max-w-md rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50">
          <h2 id="course-leave-title" className="course-form__dialog-title_01 font-display text-xl font-bold">Leave this page?</h2>
          <p id="course-leave-message" className="course-form__dialog-message_01 mt-3 text-sm text-muted-foreground">{LEAVE_MESSAGE}</p>
          <div className="course-form__dialog-actions_01 mt-6 flex flex-col gap-3 sm:flex-row">
            <Button ref={stayRef} type="button" variant="outline" onClick={() => setPendingHref(null)}>Stay on Page</Button>
            <Button type="button" variant="destructive" onClick={() => {
              if (!pendingHref) return;
              allowLeaveRef.current = true;
              reset();
              setPendingHref(null);
              router.push(pendingHref);
            }}>Leave Without Saving</Button>
          </div>
        </dialog>
      </div>
    </div>
  );
}
