import type { User } from "@/types/auth";
import type { Course } from "@/types/course";
import type { CodeSubmission, Question, Quiz } from "@/types/quiz";

// Local Instructor Studio view models, not backend request/response contracts.
export type SubmissionStudent = Pick<User, "id" | "fullName" | "email" | "avatarUrl">;
export type SubmissionCourse = Pick<Course, "id" | "title">;

export interface RubricCriterion {
  id: string;
  criterionName: string;
  description?: string;
  maxPoints: number;
}

export interface RubricEvaluation {
  rubricId: string;
  pointsAwarded: number;
  feedback?: string;
}

export interface SubmissionAssessment {
  id: string;
  title: string;
  instructions: string;
  maxScore: number;
  deadline?: string;
  rubrics?: RubricCriterion[];
  rubricSource?: "local" | "server";
}

export type SubmissionGrading =
  | { status: "pending"; score: null; feedback: string; gradedAt: null }
  | { status: "graded"; score: number; feedback: string; gradedAt: string }
  | { status: "review-required"; score: null; feedback: string; gradedAt: null; reviewReason: string };

export type SubmissionStatus = SubmissionGrading["status"];

// Captured at submission time, including the key used for grading this attempt.
export type SubmittedQuizQuestion = Readonly<Omit<Question, "options">> & {
  readonly options: readonly string[];
  readonly selectedOptionIndex: number | null;
};

export type SubmittedQuizSnapshot = Readonly<Omit<Quiz, "questions">> & {
  readonly questions: readonly SubmittedQuizQuestion[];
};

export interface SubmissionAttachment {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

interface SubmissionBase {
  id: string;
  student: SubmissionStudent;
  course: SubmissionCourse;
  assessment: SubmissionAssessment;
  // ISO 8601 timestamps with an explicit timezone; attempts start at 1.
  submittedAt: string;
  attemptNumber: number;
  grading: SubmissionGrading;
  rubricEvaluations?: RubricEvaluation[];
}

export type QuizSubmission = SubmissionBase & {
  type: "quiz";
  quizSnapshot: SubmittedQuizSnapshot;
};

export type WrittenSubmission = SubmissionBase & {
  type: "written";
  // A written response can contain text, attachments, or both.
  writtenAnswer: string;
  attachments: SubmissionAttachment[];
};

export type InstructorCodeSubmission = SubmissionBase & {
  type: "code";
  codeSubmission: CodeSubmission;
};

export type InstructorSubmission = QuizSubmission | WrittenSubmission | InstructorCodeSubmission;

export type QuizQuestionScore = {
  questionId: Question["id"];
} & (
  | { status: "correct" | "incorrect" | "unanswered"; score: number; maxScore: number }
  | { status: "review-required"; score: null; maxScore: number | null; reviewReason: string }
);

export type QuizScore = {
  questions: QuizQuestionScore[];
} & (
  | { status: "graded"; score: number; maxScore: number }
  | { status: "review-required"; score: null; maxScore: number | null; reviewReason: string }
);

export type GradeValidation =
  | { valid: true; score: number }
  | { valid: false; error: string };
