"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MOCK_INSTRUCTOR_COURSES } from "@/lib/mock-instructor-courses";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";

export type CourseFormValues = Pick<
  Course,
  "title" | "description" | "thumbnailUrl" | "category" | "level"
>;

type CourseFormProps = { initialValues: CourseFormValues } & (
  | { mode: "create" }
  | { mode: "edit"; courseId: string }
);
type FormErrors = Partial<Record<keyof CourseFormValues, string>>;

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
  const router = useRouter();
  const [values, setValues] = React.useState<CourseFormValues>(() => ({ ...initialValues }));
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [preview, setPreview] = React.useState<CourseFormValues | null>(null);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const stayRef = React.useRef<HTMLButtonElement>(null);
  const allowLeaveRef = React.useRef(false);
  const isDirty = FIELDS.some(([name]) => values[name] !== initialValues[name]);

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

  const reset = () => {
    setValues({ ...initialValues });
    setErrors({});
    setPreview(null);
  };
  const review = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    const invalidField = FIELDS.find(([name]) => nextErrors[name]);
    if (invalidField) {
      document.getElementById(`course-${invalidField[0]}`)?.focus();
      return;
    }
    setPreview({ ...values });
  };

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
              <div className="course-form__actions_01 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button type="submit" disabled={!isReady}>{mode === "edit" ? "Review Changes" : "Preview Course"}</Button>
                <Button type="button" variant="outline" disabled={!isReady} onClick={reset}>Reset</Button>
                <Button type="button" variant="ghost" disabled={!isReady} onClick={() => requestNavigation("/instructor/courses")}>Cancel / Back to Courses</Button>
                {isDirty && <Badge variant="outline" className="course-form__dirty_01 self-center">Unsaved changes</Badge>}
              </div>
            </form>
          </CardContent>
        </Card>

        {preview && (
          <Card className="course-form__preview_01 rounded-[15px]" aria-live="polite">
            <CardHeader className="course-form__preview-header_01 space-y-3">
              <h2 className="course-form__preview-title_01 font-display text-xl font-bold">Course Metadata Preview</h2>
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
              </dl>
            </CardContent>
          </Card>
        )}

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
