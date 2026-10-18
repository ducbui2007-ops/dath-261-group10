"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  sameQuizPlacement,
  type InstructorQuizDraft,
  type QuizPlacement,
} from "@/lib/instructor-quiz";

interface QuizPlacementSectionProps {
  placement: QuizPlacement;
  quizzes: InstructorQuizDraft[];
  onAdd: (placement: QuizPlacement, trigger: HTMLButtonElement) => void;
  onEdit: (quiz: InstructorQuizDraft, trigger: HTMLButtonElement) => void;
  onRemove: (quiz: InstructorQuizDraft, trigger: HTMLButtonElement) => void;
  disabled?: boolean;
}

export function QuizPlacementSection({
  placement,
  quizzes,
  onAdd,
  onEdit,
  onRemove,
  disabled = false,
}: QuizPlacementSectionProps) {
  const placementLabel = {
    course: "Course",
    chapter: "Chapter",
    lesson: "Lesson",
  }[placement.kind];
  const headingId = `quiz-placement-${encodeURIComponent(JSON.stringify(placement))}-title`;
  const placedQuizzes = quizzes.filter((quiz) =>
    sameQuizPlacement(quiz.placement, placement)
  );

  return (
    <section
      data-component="QuizPlacementSection"
      data-placement={placement.kind}
      aria-labelledby={headingId}
      className="quiz-placement__container_01 space-y-3 rounded-[15px] border border-border bg-card p-4"
    >
      <div className="quiz-placement__header_01 flex flex-wrap items-center justify-between gap-3">
        <h3
          id={headingId}
          className="quiz-placement__title_01 font-display text-base font-bold text-foreground"
        >
          {placementLabel} Quizzes
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Add ${placement.kind} quiz`}
          disabled={disabled}
          onClick={(event) => onAdd(placement, event.currentTarget)}
          className="quiz-placement__add_01"
        >
          Add Quiz
        </Button>
      </div>
      <p className="quiz-placement__notice_01 text-xs text-muted-foreground">
        Temporary course drafts — not saved to a server.
      </p>
      {placedQuizzes.length === 0 ? (
        <p className="quiz-placement__empty_01 text-sm text-muted-foreground">
          No quizzes yet. Add a quiz for this {placement.kind}.
        </p>
      ) : (
        <ul className="quiz-placement__list_01 space-y-3">
          {placedQuizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="quiz-placement__item_01 flex flex-col gap-3 rounded-[15px] border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="quiz-placement__summary_01 min-w-0 space-y-2">
                <h4 className="quiz-placement__quiz-title_01 break-words font-display text-sm font-bold text-foreground">
                  {quiz.title}
                </h4>
                <Badge
                  variant="outline"
                  className="quiz-placement__question-count_01 text-muted-foreground"
                >
                  {quiz.questions.length}{" "}
                  {quiz.questions.length === 1 ? "question" : "questions"}
                </Badge>
              </div>
              <div className="quiz-placement__actions_01 flex flex-wrap gap-2 sm:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Edit quiz: ${quiz.title}`}
                  disabled={disabled}
                  onClick={(event) => onEdit(quiz, event.currentTarget)}
                  className="quiz-placement__edit_01"
                >
                  Edit Quiz
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove quiz: ${quiz.title}`}
                  disabled={disabled}
                  onClick={(event) => onRemove(quiz, event.currentTarget)}
                  className="quiz-placement__remove_01 text-destructive hover:text-destructive"
                >
                  Remove Quiz
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
