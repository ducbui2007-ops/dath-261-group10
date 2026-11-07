"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatGradeScore, validateGrade } from "@/lib/instructor-grading";
import { createGradingDraft, type GradingDraftValues, type ManualGradingSubmission } from "@/lib/instructor-grading-draft";
import { scoreRubric } from "@/lib/rubric-grading";
import { RubricGradingFields } from "./rubric-grading-fields";
import { GradingDraftDialog } from "./grading-draft-dialog";
import { useSubmissionDrafts } from "./submission-draft-provider";

type DraftDialog =
  | { mode: "review"; score: number; values: GradingDraftValues }
  | { mode: "reset" };

export function ManualGradingForm({ submission }: { submission: ManualGradingSubmission }) {
  const { drafts, updateDraft, confirmDraft, resetDraft } = useSubmissionDrafts();
  const storedDraft = drafts[submission.id];
  const draft = storedDraft ?? createGradingDraft(submission);
  const [error, setError] = useState<string | null>(null);
  const [showRubricErrors, setShowRubricErrors] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dialog, setDialog] = useState<DraftDialog | null>(null);
  const scoreRef = useRef<HTMLInputElement>(null);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const maxScore = submission.assessment.maxScore;
  const rubrics = submission.assessment.rubrics;
  const rubricResult = rubrics !== undefined ? scoreRubric(rubrics, draft.evaluations ?? {}, maxScore) : null;

  useEffect(() => { setIsHydrated(true); }, []);

  function checkScore(value: string): boolean {
    const result = validateGrade(value, maxScore);
    setError(result.valid ? null : result.error);
    return result.valid;
  }

  function reviewGrade() {
    if (!isHydrated) return;
    if (rubricResult && rubricResult.score === null) {
      setShowRubricErrors(true);
      const index = rubrics!.findIndex((rubric) => rubricResult.errors[rubric.id]);
      document.getElementById(rubricResult.errors.rubric || index < 0 ? "grading-rubric" : `rubric-score-${index}`)?.focus();
      return;
    }
    const result = validateGrade(draft.score, maxScore);
    if (!result.valid) {
      setError(result.error);
      scoreRef.current?.focus();
      return;
    }
    setError(null);
    setDialog({ mode: "review", score: result.score, values: {
      score: draft.score, feedback: draft.feedback,
      ...(draft.evaluations ? { evaluations: Object.fromEntries(Object.entries(draft.evaluations).map(([id, value]) => [id, { ...value }])) } : {}),
    } });
  }

  function closeDialog(focusReset = false) {
    setDialog(null);
    requestAnimationFrame(() => (focusReset ? resetButtonRef : reviewButtonRef).current?.focus());
  }

  function confirmDialog() {
    if (dialog?.mode === "review") {
      confirmDraft(submission, dialog.values);
    } else if (dialog?.mode === "reset") {
      resetDraft(submission.id);
      setError(null);
      setShowRubricErrors(false);
    }
    closeDialog();
  }

  return (
    <Card data-component="ManualGradingForm" className="manual-grading__container_01 min-w-0 rounded-[15px]">
      <CardHeader className="manual-grading__header_01 space-y-2">
        <h2 id="manual-grading-title" className="manual-grading__title_01 font-display text-lg font-bold">Grading draft</h2>
        <p className="manual-grading__description_01 text-sm leading-relaxed text-muted-foreground">
          {rubrics !== undefined ? "Prepare rubric scores and feedback. Nothing is saved to the server or sent to students." : "Prepare a draft score and feedback."}
        </p>
      </CardHeader>
      <CardContent className="manual-grading__content_01 space-y-4">
        <p role="status" className="manual-grading__status_01 rounded-lg border border-border bg-muted p-3 text-sm">
          {!isHydrated ? "Grading requires JavaScript. Controls become available after this page finishes loading." : storedDraft
            ? draft.reviewed ? "Draft reviewed locally." : "Draft changes need review."
            : submission.grading.status === "pending" ? "Not graded. Enter scores to prepare a local draft." : "The fields start with the recorded values. Changes create a draft."}
        </p>
        {rubrics !== undefined && <p className="manual-grading__rubric-source_01 text-xs text-muted-foreground">
          {submission.assessment.rubricSource === "server" ? "Server rubric data — changes remain local until API integration."
            : "Local rubric example — not server data. These criteria cannot be used to submit real grades."}
        </p>}
        <div role="form" aria-labelledby="manual-grading-title" className="manual-grading__form_01">
          <fieldset
            disabled={!isHydrated}
            className="manual-grading__fields_01 min-w-0 space-y-5"
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.target === scoreRef.current) {
                event.preventDefault();
                reviewGrade();
              }
            }}
          >
            {rubrics !== undefined && <RubricGradingFields rubrics={rubrics} evaluations={draft.evaluations ?? {}}
              errors={showRubricErrors ? rubricResult!.errors : { ...(rubricResult!.errors.rubric ? { rubric: rubricResult!.errors.rubric } : {}) }}
              onChange={(evaluations) => updateDraft(submission, { evaluations })} />}
            <div className="manual-grading__score-field_01 space-y-2">
              {rubricResult ? <>
                <p className="manual-grading__total-label_01 text-sm font-semibold">Calculated rubric total</p>
                <p role="status" className="manual-grading__total_01 text-xl font-bold">
                  {rubricResult.score === null ? "Incomplete or invalid scores" : `${formatGradeScore(rubricResult.score)} / ${formatGradeScore(maxScore)} points`}
                </p>
              </> : <>
              <label htmlFor="grading-score" className="manual-grading__label_01 block text-sm font-semibold">Grade (points)</label>
              <Input
                ref={scoreRef}
                id="grading-score"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={draft.score}
                aria-invalid={Boolean(error)}
                aria-describedby={`grading-score-help${error ? " grading-score-error" : ""}`}
                onChange={(event) => {
                  updateDraft(submission, { score: event.target.value });
                  if (error) checkScore(event.target.value);
                }}
              />
              <p id="grading-score-help" className="manual-grading__score-help_01 text-xs text-muted-foreground">0–{formatGradeScore(maxScore)} points; decimals allowed.</p>
              {error && <p id="grading-score-error" role="alert" className="manual-grading__error_01 text-sm font-medium text-red-700 dark:rounded-md dark:bg-red-950 dark:px-2 dark:py-1 dark:text-red-300">{error}</p>}
              </>}
            </div>
            <div className="manual-grading__feedback-field_01 space-y-2">
              <label htmlFor="grading-feedback" className="manual-grading__label_02 block text-sm font-semibold">{rubrics !== undefined ? "General Feedback" : "Instructor feedback"}</label>
              <textarea
                id="grading-feedback"
                rows={5}
                value={draft.feedback}
                aria-describedby="grading-feedback-help"
                onChange={(event) => updateDraft(submission, { feedback: event.target.value })}
                className="manual-grading__textarea_01 block w-full min-w-0 resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p id="grading-feedback-help" className="manual-grading__feedback-help_01 text-xs text-muted-foreground">Optional comments for this draft. Nothing is sent to the student.</p>
            </div>
            <div className="manual-grading__actions_01 flex flex-wrap gap-3">
              <Button ref={reviewButtonRef} type="button" disabled={!isHydrated} onClick={reviewGrade}>Review Grade</Button>
              <Button ref={resetButtonRef} type="button" variant="outline" disabled={!isHydrated || !storedDraft} onClick={() => setDialog({ mode: "reset" })}>Reset Draft</Button>
            </div>
          </fieldset>
        </div>
      </CardContent>
      {dialog && (
        <GradingDraftDialog
          mode={dialog.mode}
          studentName={submission.student.fullName}
          assessmentTitle={submission.assessment.title}
          maxScore={maxScore}
          score={dialog.mode === "review" ? dialog.score : undefined}
          feedback={dialog.mode === "review" ? dialog.values.feedback : undefined}
          rubricRows={dialog.mode === "review" ? rubrics?.map((rubric) => ({
            criterionName: rubric.criterionName, maxPoints: rubric.maxPoints,
            score: dialog.values.evaluations?.[rubric.id]?.score ?? "",
            feedback: dialog.values.evaluations?.[rubric.id]?.feedback ?? "",
          })) : undefined}
          onCancel={() => closeDialog(dialog.mode === "reset")}
          onConfirm={confirmDialog}
        />
      )}
    </Card>
  );
}
