import { sumGradePoints, validateGrade } from "./instructor-grading";
import type { GradingDraft, ManualGradingSubmission } from "./instructor-grading-draft";
import type { RubricCriterion, RubricEvaluation } from "@/types/submission";

export type RubricDraftValues = Record<string, { score: string; feedback: string }>;

export function scoreRubric(rubrics: readonly RubricCriterion[], evaluations: RubricDraftValues, maxScore: number) {
  const errors: Record<string, string> = {};
  const ids = rubrics.map((rubric) => rubric.id);
  if (!rubrics.length) errors.rubric = "Rubric criteria are missing. Grading is unavailable.";
  if (new Set(ids).size !== ids.length || rubrics.some((r) => !r.id.trim() || !r.criterionName.trim() || !Number.isFinite(r.maxPoints) || r.maxPoints < 0.1)) {
    errors.rubric = "Rubric criteria contain missing, duplicate or invalid data. Grading is unavailable.";
  }
  if (Object.keys(evaluations).some((id) => !ids.includes(id))) errors.rubric = "The rubric changed. Reset the draft and review the current criteria.";
  const points = rubrics.map((rubric) => {
    const value = evaluations[rubric.id]?.score ?? "";
    const result = validateGrade(value, rubric.maxPoints);
    if (!result.valid) errors[rubric.id] = result.error;
    return result.valid ? result.score : NaN;
  });
  const total = sumGradePoints(points);
  if (!Number.isFinite(total) && points.every(Number.isFinite)) errors.rubric = "The rubric total is not finite. Review the criterion values.";
  if (!Number.isFinite(maxScore) || maxScore < 0 || (Number.isFinite(total) && total > maxScore)) {
    errors.rubric = "The rubric total exceeds the assignment maximum or the maximum is invalid. Review the assignment data.";
  }
  return { errors, score: Object.keys(errors).length || !Number.isFinite(total) ? null : total };
}

export interface RubricGradePayload {
  evaluations: RubricEvaluation[];
  generalFeedback: string;
}

// No request is sent here. Local fixtures must never become a server grading payload.
export function toRubricGradePayload(submission: ManualGradingSubmission, draft: GradingDraft): RubricGradePayload {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rubrics = submission.assessment.rubrics ?? [];
  if (submission.type !== "written" || submission.assessment.rubricSource !== "server" ||
      ![submission.id, submission.assessment.id, ...rubrics.map((r) => r.id)].every((id) => uuid.test(id))) {
    throw new Error("Verified server assignment, submission and rubric IDs are required. Local grading drafts cannot be submitted.");
  }
  const result = scoreRubric(rubrics, draft.evaluations ?? {}, submission.assessment.maxScore);
  if (result.score === null) throw new Error("Complete and validate every rubric criterion before preparing a grade.");
  return {
    evaluations: rubrics.map((rubric) => ({
      rubricId: rubric.id,
      pointsAwarded: Number(draft.evaluations![rubric.id].score),
      feedback: draft.evaluations![rubric.id].feedback,
    })),
    generalFeedback: draft.feedback,
  };
}
