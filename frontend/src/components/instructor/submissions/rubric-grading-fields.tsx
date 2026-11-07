"use client";

import { Input } from "@/components/ui/input";
import { formatGradeScore } from "@/lib/instructor-grading";
import type { RubricDraftValues } from "@/lib/rubric-grading";
import type { RubricCriterion } from "@/types/submission";

export function RubricGradingFields({ rubrics, evaluations, errors, onChange }: {
  rubrics: RubricCriterion[];
  evaluations: RubricDraftValues;
  errors: Record<string, string>;
  onChange: (evaluations: RubricDraftValues) => void;
}) {
  return (
    <section data-component="RubricGradingFields" id="grading-rubric" tabIndex={-1}
      aria-labelledby="grading-rubric-title" className="rubric-grading__container_01 min-w-0 space-y-4 focus:outline-none focus:ring-2 focus:ring-ring">
      <h3 id="grading-rubric-title" className="rubric-grading__title_01 font-display font-semibold">Rubric criteria</h3>
      {errors.rubric && <p role="alert" className="rubric-grading__error_01 text-sm text-destructive">{errors.rubric}</p>}
      {rubrics.map((rubric, index) => {
        const id = `rubric-score-${index}`;
        const value = evaluations[rubric.id] ?? { score: "", feedback: "" };
        const change = (patch: Partial<typeof value>) => onChange({ ...evaluations, [rubric.id]: { ...value, ...patch } });
        return (
          <fieldset key={`${rubric.id}-${index}`} className="rubric-grading__criterion_01 min-w-0 space-y-3 rounded-[15px] border border-border p-4">
            <legend className="rubric-grading__name_01 max-w-full break-words px-1 text-sm font-semibold">{rubric.criterionName || "Unnamed criterion"}</legend>
            <p className="rubric-grading__description_01 whitespace-pre-wrap break-words text-sm text-muted-foreground">{rubric.description || "No description provided."}</p>
            <p className="rubric-grading__maximum_01 text-sm">Maximum: {formatGradeScore(rubric.maxPoints)} points</p>
            <label htmlFor={id} className="rubric-grading__label_01 block text-sm font-medium">Points awarded (required)</label>
            <Input id={id} type="text" inputMode="decimal" autoComplete="off" required value={value.score}
              aria-invalid={Boolean(errors[rubric.id])} aria-describedby={`${id}-help${errors[rubric.id] ? ` ${id}-error` : ""}`}
              onChange={(event) => change({ score: event.target.value })} />
            <p id={`${id}-help`} className="rubric-grading__help_01 text-xs text-muted-foreground">0–{formatGradeScore(rubric.maxPoints)} points; decimals allowed.</p>
            {errors[rubric.id] && <p id={`${id}-error`} role="alert" className="rubric-grading__error_02 text-sm text-destructive">{errors[rubric.id]}</p>}
            <label htmlFor={`${id}-feedback`} className="rubric-grading__label_02 block text-sm font-medium">Criterion feedback (optional)</label>
            <textarea id={`${id}-feedback`} rows={3} value={value.feedback} onChange={(event) => change({ feedback: event.target.value })}
              className="rubric-grading__feedback_01 block w-full min-w-0 resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </fieldset>
        );
      })}
    </section>
  );
}
