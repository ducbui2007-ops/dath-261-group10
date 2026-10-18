"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Chapter, Lesson, MaterialType } from "@/types/course";

interface CurriculumBuilderProps {
  chapters: Chapter[];
  onChange: (chapters: Chapter[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "text", label: "Text" },
  { value: "slide", label: "Slide" },
  { value: "file", label: "File" },
];

// Frontend convention only: sibling order follows array position, starting at 1.
function normalizeOrder(chapters: Chapter[]): Chapter[] {
  return chapters.map((chapter, index) => ({
    ...chapter,
    order: index + 1,
    lessons: chapter.lessons.map((lesson, lessonIndex) => ({ ...lesson, order: lessonIndex + 1 })),
  }));
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

export function CurriculumBuilder({ chapters, onChange, errors = {}, disabled = false }: CurriculumBuilderProps) {
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const addChapterRef = React.useRef<HTMLButtonElement>(null);
  const pendingChapter = chapters.find((chapter) => chapter.id === pendingDeleteId);

  React.useEffect(() => {
    if (pendingDeleteId) {
      dialogRef.current?.showModal();
      cancelRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [pendingDeleteId]);

  const updateChapter = (id: string, patch: Partial<Chapter>) => {
    onChange(chapters.map((chapter) => chapter.id === id ? { ...chapter, ...patch } : chapter));
  };
  const updateLesson = (chapter: Chapter, id: string, patch: Partial<Lesson>) => {
    updateChapter(chapter.id, {
      lessons: chapter.lessons.map((lesson) => lesson.id === id ? { ...lesson, ...patch } : lesson),
    });
  };
  const changeStructure = (next: Chapter[]) => onChange(normalizeOrder(next));
  const addChapter = () => {
    changeStructure([...chapters, { id: crypto.randomUUID(), title: "", order: chapters.length + 1, lessons: [] }]);
  };
  const removeChapter = (chapter: Chapter) => {
    if (chapter.lessons.length) setPendingDeleteId(chapter.id);
    else changeStructure(chapters.filter((item) => item.id !== chapter.id));
  };
  const changeLessons = (chapter: Chapter, lessons: Lesson[]) => {
    changeStructure(chapters.map((item) => item.id === chapter.id ? { ...item, lessons } : item));
  };
  const addLesson = (chapter: Chapter) => {
    changeLessons(chapter, [...chapter.lessons, {
      id: crypto.randomUUID(), title: "", order: chapter.lessons.length + 1, type: "text",
    }]);
  };

  return (
    <Card data-component="CurriculumBuilder" className="curriculum-builder__container_01 rounded-[15px]">
      <CardHeader className="curriculum-builder__header_01 gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="curriculum-builder__heading_01 space-y-2">
          <h2 className="curriculum-builder__title_01 font-display text-xl font-bold">Course Curriculum</h2>
          <p className="curriculum-builder__description_01 text-sm text-muted-foreground">
            Organize chapters and lessons. Use Move Up and Move Down to change their order.
          </p>
        </div>
        <Button ref={addChapterRef} type="button" disabled={disabled} onClick={addChapter}
          className="curriculum-builder__add-chapter_01 shrink-0">Add Chapter</Button>
      </CardHeader>
      <CardContent className="curriculum-builder__content_01">
        {chapters.length === 0 ? (
          <p className="curriculum-builder__empty_01 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No chapters yet. Add a chapter to start organizing your course.
          </p>
        ) : (
          <ol className="curriculum-builder__chapters_01 space-y-6">
            {chapters.map((chapter, chapterIndex) => (
              <li key={chapter.id} className="curriculum-builder__chapter_01 space-y-4 rounded-[15px] border border-border p-4 sm:p-6">
                <div className="curriculum-builder__chapter-header_01 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="curriculum-builder__chapter-label_01 font-display text-base font-bold">Chapter {chapterIndex + 1}</h3>
                  <Badge variant="outline" className="curriculum-builder__lesson-count_01">
                    {chapter.lessons.length} {chapter.lessons.length === 1 ? "lesson" : "lessons"}
                  </Badge>
                </div>
                <div className="curriculum-builder__chapter-field_01 space-y-2">
                  <label htmlFor={`curriculum-chapter-${chapter.id}`} className="curriculum-builder__label_01 block text-sm font-medium">Chapter Title</label>
                  <Input id={`curriculum-chapter-${chapter.id}`} value={chapter.title} disabled={disabled} required
                    onChange={(event) => updateChapter(chapter.id, { title: event.target.value })}
                    aria-invalid={Boolean(errors[chapter.id])}
                    aria-describedby={errors[chapter.id] ? `curriculum-chapter-${chapter.id}-error` : undefined}
                    className={cn("curriculum-builder__chapter-input_01", errors[chapter.id] && "border-destructive")} />
                  {errors[chapter.id] && <p id={`curriculum-chapter-${chapter.id}-error`} role="alert" className="curriculum-builder__error_01 text-sm text-destructive">{errors[chapter.id]}</p>}
                </div>
                <div className="curriculum-builder__chapter-actions_01 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={disabled || chapterIndex === 0}
                    aria-label={`Move chapter ${chapterIndex + 1} up`}
                    onClick={() => changeStructure(moveItem(chapters, chapterIndex, -1))}>Move Up</Button>
                  <Button type="button" variant="outline" size="sm" disabled={disabled || chapterIndex === chapters.length - 1}
                    aria-label={`Move chapter ${chapterIndex + 1} down`}
                    onClick={() => changeStructure(moveItem(chapters, chapterIndex, 1))}>Move Down</Button>
                  <Button type="button" variant="destructive" size="sm" disabled={disabled}
                    aria-label={`Remove chapter ${chapterIndex + 1}`} onClick={() => removeChapter(chapter)}>Remove Chapter</Button>
                </div>
                {chapter.lessons.length === 0 ? (
                  <p className="curriculum-builder__lessons-empty_01 text-sm text-muted-foreground">No lessons yet. Add the first lesson to this chapter.</p>
                ) : (
                  <ol className="curriculum-builder__lessons_01 space-y-4 border-l border-border pl-4 sm:pl-6">
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className="curriculum-builder__lesson_01 space-y-3 rounded-lg bg-muted/30 p-4">
                        <h4 className="curriculum-builder__lesson-label_01 font-display text-sm font-bold">Lesson {chapterIndex + 1}.{lessonIndex + 1}</h4>
                        <div className="curriculum-builder__lesson-fields_01 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                          <div className="curriculum-builder__lesson-field_01 space-y-2">
                            <label htmlFor={`curriculum-lesson-${lesson.id}`} className="curriculum-builder__label_01 block text-sm font-medium">Lesson Title</label>
                            <Input id={`curriculum-lesson-${lesson.id}`} value={lesson.title} disabled={disabled} required
                              onChange={(event) => updateLesson(chapter, lesson.id, { title: event.target.value })}
                              aria-invalid={Boolean(errors[lesson.id])}
                              aria-describedby={errors[lesson.id] ? `curriculum-lesson-${lesson.id}-error` : undefined}
                              className={cn("curriculum-builder__lesson-input_01", errors[lesson.id] && "border-destructive")} />
                            {errors[lesson.id] && <p id={`curriculum-lesson-${lesson.id}-error`} role="alert" className="curriculum-builder__error_01 text-sm text-destructive">{errors[lesson.id]}</p>}
                          </div>
                          <div className="curriculum-builder__type-field_01 space-y-2">
                            <label htmlFor={`curriculum-type-${lesson.id}`} className="curriculum-builder__label_01 block text-sm font-medium">Material Type</label>
                            <select id={`curriculum-type-${lesson.id}`} value={lesson.type} disabled={disabled}
                              onChange={(event) => updateLesson(chapter, lesson.id, { type: event.target.value as MaterialType })}
                              className="curriculum-builder__type-select_01 h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                              {MATERIAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="curriculum-builder__lesson-actions_01 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" disabled={disabled || lessonIndex === 0}
                            aria-label={`Move lesson ${chapterIndex + 1}.${lessonIndex + 1} up`}
                            onClick={() => changeLessons(chapter, moveItem(chapter.lessons, lessonIndex, -1))}>Move Up</Button>
                          <Button type="button" variant="outline" size="sm" disabled={disabled || lessonIndex === chapter.lessons.length - 1}
                            aria-label={`Move lesson ${chapterIndex + 1}.${lessonIndex + 1} down`}
                            onClick={() => changeLessons(chapter, moveItem(chapter.lessons, lessonIndex, 1))}>Move Down</Button>
                          <Button type="button" variant="destructive" size="sm" disabled={disabled}
                            aria-label={`Remove lesson ${chapterIndex + 1}.${lessonIndex + 1}`}
                            onClick={() => changeLessons(chapter, chapter.lessons.filter((item) => item.id !== lesson.id))}>Remove Lesson</Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <Button type="button" variant="outline" disabled={disabled} onClick={() => addLesson(chapter)}
                  className="curriculum-builder__add-lesson_01">Add Lesson</Button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
      <dialog ref={dialogRef} aria-labelledby="curriculum-delete-title" aria-describedby="curriculum-delete-message"
        onCancel={() => setPendingDeleteId(null)}
        className="curriculum-builder__dialog_01 w-[calc(100%_-_2rem)] max-w-md rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50">
        <h2 id="curriculum-delete-title" className="curriculum-builder__dialog-title_01 font-display text-xl font-bold">Remove this chapter?</h2>
        <p id="curriculum-delete-message" className="curriculum-builder__dialog-message_01 mt-3 text-sm text-muted-foreground">
          Removing {pendingChapter?.title.trim() || "this chapter"} also removes all of its lessons from this curriculum.
        </p>
        <div className="curriculum-builder__dialog-actions_01 mt-6 flex flex-col gap-3 sm:flex-row">
          <Button ref={cancelRef} type="button" variant="outline" onClick={() => setPendingDeleteId(null)}>Keep Chapter</Button>
          <Button type="button" variant="destructive" disabled={disabled} onClick={() => {
            changeStructure(chapters.filter((chapter) => chapter.id !== pendingDeleteId));
            dialogRef.current?.close();
            setPendingDeleteId(null);
            addChapterRef.current?.focus();
          }}>Remove Chapter and Lessons</Button>
        </div>
      </dialog>
    </Card>
  );
}
