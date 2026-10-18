"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { QuestionDraft, QuizErrors } from "@/lib/instructor-quiz";
import { cn } from "@/lib/utils";

export interface QuestionBuilderProps {
  question: QuestionDraft;
  index: number;
  total: number;
  errors?: QuizErrors;
  onChange: (question: QuestionDraft) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export function QuestionBuilder({ question, index, total, errors = {}, onChange, onMove, onRemove, disabled = false }: QuestionBuilderProps) {
  const number = index + 1;
  const promptId = `${question.id}-prompt`;
  const correctId = `${question.id}-correct`;
  const pointsId = `${question.id}-points`;
  const explanationId = `${question.id}-explanation`;

  const updateOption = (optionIndex: number, text: string) => {
    const options: QuestionDraft["options"] = [...question.options];
    options[optionIndex] = text;
    onChange({ ...question, options });
  };

  return (
    <Card data-component="QuestionBuilder" className="question-builder__container_01 min-w-0 rounded-[15px]">
      <CardHeader className="question-builder__header_01 gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="question-builder__title_01 font-display text-base font-bold">Question {number}</CardTitle>
        <div className="question-builder__actions_01 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled || index <= 0}
            aria-label={`Move question ${number} up`} onClick={() => onMove(-1)}
            className="question-builder__move-up_01">Move Up</Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled || index >= total - 1}
            aria-label={`Move question ${number} down`} onClick={() => onMove(1)}
            className="question-builder__move-down_01">Move Down</Button>
          <Button type="button" variant="destructive" size="sm" disabled={disabled}
            aria-label={`Remove question ${number}`} onClick={onRemove}
            className="question-builder__remove_01">Remove Question</Button>
        </div>
      </CardHeader>
      <CardContent className="question-builder__content_01 space-y-5">
        <div className="question-builder__prompt-field_01 space-y-2">
          <label htmlFor={promptId} className="question-builder__label_01 block text-sm font-medium">Question Prompt</label>
          <textarea id={promptId} value={question.prompt} rows={3} disabled={disabled}
            onChange={(event) => onChange({ ...question, prompt: event.target.value })}
            aria-invalid={Boolean(errors[promptId])} aria-describedby={errors[promptId] ? `${promptId}-error` : undefined}
            className={cn("question-builder__prompt_01 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50", errors[promptId] && "border-destructive")} />
          {errors[promptId] && <p id={`${promptId}-error`} role="alert" className="question-builder__error_01 text-sm text-destructive">{errors[promptId]}</p>}
        </div>

        <fieldset id={correctId} tabIndex={-1} disabled={disabled}
          aria-invalid={Boolean(errors[correctId])} aria-describedby={`${correctId}-help${errors[correctId] ? ` ${correctId}-error` : ""}`}
          className={cn("question-builder__options_01 min-w-0 space-y-3 rounded-lg border border-border p-3 focus:outline-none focus:ring-2 focus:ring-ring sm:p-4", errors[correctId] && "border-destructive")}>
          <legend className="question-builder__legend_01 px-1 text-sm font-medium">Options and Correct Answer</legend>
          <p id={`${correctId}-help`} className="question-builder__options-help_01 text-xs text-muted-foreground">Enter all four options and select one correct answer.</p>
          {OPTION_LABELS.map((label, optionIndex) => {
            const optionId = `${question.id}-options-${optionIndex}`;
            const radioId = `${question.id}-correct-${optionIndex}`;
            return (
              <div key={label} className="question-builder__option_01 space-y-2">
                <label htmlFor={optionId} className="question-builder__option-label_01 block text-sm font-medium">Option {label}</label>
                <Input id={optionId} value={question.options[optionIndex]} disabled={disabled}
                  onChange={(event) => updateOption(optionIndex, event.target.value)}
                  aria-invalid={Boolean(errors[optionId])} aria-describedby={errors[optionId] ? `${optionId}-error` : undefined}
                  className={cn("question-builder__option-input_01", errors[optionId] && "border-destructive")} />
                {errors[optionId] && <p id={`${optionId}-error`} role="alert" className="question-builder__error_01 text-sm text-destructive">{errors[optionId]}</p>}
                <label htmlFor={radioId} className="question-builder__correct-label_01 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input id={radioId} type="radio" name={`${question.id}-correct-answer`} value={optionIndex}
                    checked={question.correctOptionIndex === optionIndex} disabled={disabled}
                    onChange={() => onChange({ ...question, correctOptionIndex: optionIndex })}
                    aria-invalid={Boolean(errors[correctId])} aria-describedby={errors[correctId] ? `${correctId}-error` : undefined}
                    className="question-builder__correct-radio_01 h-[18px] w-[18px] shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                  Option {label} is correct
                </label>
              </div>
            );
          })}
          {errors[correctId] && <p id={`${correctId}-error`} role="alert" className="question-builder__error_01 text-sm text-destructive">{errors[correctId]}</p>}
        </fieldset>

        <div className="question-builder__points-field_01 max-w-xs space-y-2">
          <label htmlFor={pointsId} className="question-builder__label_01 block text-sm font-medium">Points</label>
          <Input id={pointsId} type="number" min={Number.MIN_VALUE} step="any" value={question.points} disabled={disabled}
            onChange={(event) => onChange({ ...question, points: event.target.value })}
            aria-invalid={Boolean(errors[pointsId])} aria-describedby={errors[pointsId] ? `${pointsId}-error` : undefined}
            className={cn("question-builder__points-input_01", errors[pointsId] && "border-destructive")} />
          {errors[pointsId] && <p id={`${pointsId}-error`} role="alert" className="question-builder__error_01 text-sm text-destructive">{errors[pointsId]}</p>}
        </div>

        <div className="question-builder__explanation-field_01 space-y-2">
          <label htmlFor={explanationId} className="question-builder__label_01 block text-sm font-medium">Explanation (Optional)</label>
          <textarea id={explanationId} value={question.explanation ?? ""} rows={3} disabled={disabled}
            onChange={(event) => onChange({ ...question, explanation: event.target.value })}
            className="question-builder__explanation_01 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}
