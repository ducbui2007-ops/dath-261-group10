import { validateGrade } from "@/lib/instructor-grading";
import type { InstructorSubmission } from "@/types/submission";
import { scoreRubric, type RubricDraftValues } from "./rubric-grading";

export type ManualGradingSubmission = Exclude<InstructorSubmission, { type: "quiz" }>;

// In-memory workspace state only; these values never replace sample records.
export interface GradingDraft {
  score: string;
  feedback: string;
  reviewed: boolean;
  evaluations?: RubricDraftValues;
}

export type GradingDraftValues = Pick<GradingDraft, "score" | "feedback" | "evaluations">;
export type GradingDraftChanges = Partial<GradingDraftValues>;

export function createGradingDraft(submission: ManualGradingSubmission): GradingDraft {
  const evaluations = submission.assessment.rubrics?.map((rubric) => {
    const recorded = submission.rubricEvaluations?.find((value) => value.rubricId === rubric.id);
    return [rubric.id, { score: recorded ? String(recorded.pointsAwarded) : "", feedback: recorded?.feedback ?? "" }];
  });
  const rubricValues = evaluations ? Object.fromEntries(evaluations) as RubricDraftValues : undefined;
  const rubricScore = rubricValues ? scoreRubric(submission.assessment.rubrics!, rubricValues, submission.assessment.maxScore).score : null;
  return {
    score: rubricValues ? rubricScore === null ? "" : String(rubricScore) : submission.grading.score === null ? "" : String(submission.grading.score),
    feedback: submission.grading.feedback,
    reviewed: false,
    ...(rubricValues ? { evaluations: rubricValues } : {}),
  };
}

export function sameGradingDraftValues(a: GradingDraftValues, b: GradingDraftValues): boolean {
  const ids = new Set([...Object.keys(a.evaluations ?? {}), ...Object.keys(b.evaluations ?? {})]);
  return a.score === b.score && a.feedback === b.feedback && Array.from(ids).every((id) =>
    a.evaluations?.[id]?.score === b.evaluations?.[id]?.score && a.evaluations?.[id]?.feedback === b.evaluations?.[id]?.feedback);
}

export function editGradingDraft(
  submission: ManualGradingSubmission,
  current: GradingDraft | undefined,
  changes: GradingDraftChanges,
): GradingDraft | undefined {
  const baseline = createGradingDraft(submission);
  const previous = current ?? baseline;
  const next = { ...previous, ...changes, reviewed: false };
  if (submission.assessment.rubrics !== undefined) {
    const result = scoreRubric(submission.assessment.rubrics, next.evaluations ?? {}, submission.assessment.maxScore);
    next.score = result.score === null ? "" : String(result.score);
  }
  if (sameGradingDraftValues(previous, next)) return current;
  return sameGradingDraftValues(baseline, next) ? undefined : next;
}

export function reviewGradingDraft(submission: ManualGradingSubmission, draft: GradingDraft): GradingDraft | undefined {
  if (submission.assessment.rubrics !== undefined) {
    const result = scoreRubric(submission.assessment.rubrics, draft.evaluations ?? {}, submission.assessment.maxScore);
    return result.score === null ? undefined : { ...draft, score: String(result.score), reviewed: true };
  }
  return validateGrade(draft.score, submission.assessment.maxScore).valid ? { ...draft, reviewed: true } : undefined;
}
