import type { Quiz } from "@/types/quiz";
import type {
  GradeValidation, QuizQuestionScore, QuizScore, SubmittedQuizQuestion, SubmittedQuizSnapshot,
} from "@/types/submission";

// Sum the canonical decimal point values exactly, then convert once to a number.
// No fixed decimal limit is imposed on authored points or entered grades.
export function sumGradePoints(values: number[]): number {
  if (values.some((value) => !Number.isFinite(value))) return NaN;
  const parts = values.map((value) => {
    const [coefficient, exponent = "0"] = value.toString().split("e");
    const fraction = coefficient.split(".")[1] ?? "";
    return { digits: coefficient.replace(".", ""), places: fraction.length - Number(exponent) };
  });
  const scale = Math.max(0, ...parts.map((part) => part.places));
  const total = parts.reduce((sum, part) =>
    sum + BigInt(part.digits) * BigInt(`1${"0".repeat(scale - part.places)}`), BigInt(0));
  return Number(`${total}e-${scale}`);
}

// Keep the shortest round-trippable representation, including small fractions.
// Arithmetic noise is avoided at aggregation rather than by rounding grades.
export function formatGradeScore(score: number): string {
  return Number.isFinite(score) ? String(score) : "Unavailable";
}

export function createQuizSubmissionSnapshot(
  quiz: Quiz,
  answers: Readonly<Record<string, number | null | undefined>>,
): SubmittedQuizSnapshot {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => ({
      ...question,
      options: [...question.options],
      selectedOptionIndex: Object.prototype.hasOwnProperty.call(answers, question.id) ? answers[question.id] ?? null : null,
    })),
  };
}

export function scoreQuizQuestion(question: SubmittedQuizQuestion): QuizQuestionScore {
  const questionId = question.id;
  if (!Number.isFinite(question.points) || question.points < 0) {
    return { questionId, status: "review-required", score: null, maxScore: null, reviewReason: "The question has an invalid point value." };
  }

  const maxScore = question.points;
  const key = question.correctOptionIndex;
  // Check the key first: an unanswered question with no valid key still needs review.
  if (key === undefined) {
    return { questionId, status: "review-required", score: null, maxScore, reviewReason: "The question is missing an answer key." };
  }
  if (!Number.isInteger(key) || key < 0 || key >= question.options.length || !question.options[key]?.trim()) {
    return { questionId, status: "review-required", score: null, maxScore, reviewReason: "The answer key does not identify a valid option." };
  }

  const answer = question.selectedOptionIndex;
  if (answer === null || answer === undefined) return { questionId, status: "unanswered", score: 0, maxScore };
  if (answer === key) return { questionId, status: "correct", score: maxScore, maxScore };
  return { questionId, status: "incorrect", score: 0, maxScore };
}

export function scoreQuiz(quiz: SubmittedQuizSnapshot): QuizScore {
  const questions = quiz.questions.map(scoreQuizQuestion);
  if (!questions.length) {
    return { questions, status: "review-required", score: null, maxScore: null, reviewReason: "The submitted quiz has no questions." };
  }

  const total = sumGradePoints(questions.map((question) => question.maxScore ?? NaN));
  const maxScore = Number.isFinite(total) ? total : null;
  if (questions.some((question) => question.status === "review-required") || maxScore === null) {
    return {
      questions, status: "review-required", score: null, maxScore,
      reviewReason: "Review the submitted question keys and point values before assigning a final score.",
    };
  }

  const score = sumGradePoints(questions.map((question) => question.score ?? 0));
  return { questions, status: "graded", score, maxScore };
}

export function validateGrade(value: string | number, maxScore: number): GradeValidation {
  if (!Number.isFinite(maxScore) || maxScore < 0) {
    return { valid: false, error: "The maximum score must be a finite, non-negative number." };
  }
  if (typeof value === "string" && !value.trim()) return { valid: false, error: "Enter a score." };
  const score = typeof value === "string" ? Number(value.trim()) : value;
  if (!Number.isFinite(score)) return { valid: false, error: "Enter a finite numeric score." };
  if (score < 0 || score > maxScore) return { valid: false, error: `Enter a score between 0 and ${formatGradeScore(maxScore)}.` };
  return { valid: true, score };
}
