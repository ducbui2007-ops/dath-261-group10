import { createQuizSubmissionSnapshot, scoreQuiz } from "@/lib/instructor-grading";
import type { Quiz } from "@/types/quiz";
import type {
  InstructorSubmission, QuizSubmission, SubmissionCourse, SubmissionStudent,
} from "@/types/submission";

const STUDENTS: SubmissionStudent[] = [
  { id: "sample-student-maya", fullName: "Maya Tran", email: "maya.tran@example.com" },
  { id: "sample-student-alex", fullName: "Alex Nguyen", email: "alex.nguyen@example.com" },
  { id: "sample-student-jordan", fullName: "Jordan Le", email: "jordan.le@example.com" },
  { id: "sample-student-linh", fullName: "Linh Pham", email: "linh.pham@example.com" },
];

const ALGORITHMS: SubmissionCourse = { id: "data-structures-and-algorithms", title: "Data Structures and Algorithms" };
const SOFTWARE: SubmissionCourse = { id: "software-engineering", title: "Software Engineering" };
const NETWORKS: SubmissionCourse = { id: "computer-networks", title: "Computer Networks" };

const ALGORITHMS_QUIZ: Quiz = {
  id: "sample-quiz-algorithm-basics",
  courseId: ALGORITHMS.id,
  title: "Algorithm fundamentals",
  timeLimitMinutes: 20,
  deadline: "2026-10-16T16:00:00Z",
  questions: [
    {
      id: "sample-question-stack", prompt: "Which data structure uses last-in, first-out order?",
      options: ["Stack", "Queue", "Heap", "Hash table"], correctOptionIndex: 0, points: 2,
      explanation: "A stack removes the most recently added item first.",
    },
    {
      id: "sample-question-binary-search", prompt: "What is the worst-case time complexity of binary search on a sorted array?",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(n squared)"], correctOptionIndex: 1, points: 3,
      explanation: "Each comparison halves the remaining search interval.",
    },
    {
      id: "sample-question-bfs", prompt: "Which structure stores the frontier in breadth-first search?",
      options: ["Stack", "Set", "Queue", "Binary search tree"], correctOptionIndex: 2, points: 5,
      explanation: "A queue visits the oldest discovered vertex first.",
    },
  ],
};

// A historical import with incomplete keys demonstrates why automatic grading can stop.
const NETWORKS_QUIZ: Quiz = {
  id: "sample-quiz-reliable-delivery",
  courseId: NETWORKS.id,
  title: "Reliable delivery checkpoint",
  timeLimitMinutes: 15,
  deadline: "2026-10-17T16:00:00Z",
  questions: [
    {
      id: "sample-question-tcp", prompt: "Which transport protocol provides ordered delivery?",
      options: ["UDP", "TCP", "IP", "ARP"], correctOptionIndex: 1, points: 2,
    },
    {
      id: "sample-question-retry", prompt: "What can a sender do when an acknowledgment does not arrive?",
      options: ["Retransmit after a timeout", "Disable the receiver", "Delete the packet", "Skip all checks"], points: 4,
    },
    {
      id: "sample-question-sequence", prompt: "What helps a receiver detect a duplicate segment?",
      options: ["A sequence number", "The cable length", "The host name", "The screen resolution"], correctOptionIndex: 4, points: 4,
    },
  ],
};

function createMockQuizSubmission(
  details: Pick<QuizSubmission, "id" | "student" | "submittedAt" | "attemptNumber">,
  quiz: Quiz,
  answers: Record<string, number | null>,
  gradedAt?: string,
  feedback = "",
): QuizSubmission {
  const quizSnapshot = createQuizSubmissionSnapshot(quiz, answers);
  const result = scoreQuiz(quizSnapshot);
  // All mock point values are valid, including the imported quiz with bad keys.
  if (result.maxScore === null) throw new Error("Mock quizzes must have a known maximum score.");
  const course = quiz.courseId === ALGORITHMS.id ? ALGORITHMS : NETWORKS;
  return {
    ...details,
    student: { ...details.student },
    type: "quiz",
    course: { ...course },
    assessment: {
      id: quiz.id, title: quiz.title, maxScore: result.maxScore, deadline: quiz.deadline,
      instructions: "Choose one answer per question. Unanswered questions receive zero points.",
    },
    quizSnapshot,
    grading: !gradedAt
      ? { status: "pending", score: null, feedback: "", gradedAt: null }
      : result.status === "review-required"
        ? { status: "review-required", score: null, feedback, gradedAt: null, reviewReason: result.reviewReason }
        : { status: "graded", score: result.score, feedback, gradedAt },
  };
}

const WRITTEN_ASSESSMENT = {
  id: "sample-assignment-development-process",
  title: "Choosing a development process",
  instructions: "Recommend a development process for a campus event registration service. Explain delivery, testing, and feedback in a short response or text attachment.",
  maxScore: 10,
  deadline: "2026-10-18T16:00:00Z",
};

const CODE_ASSESSMENT = {
  id: "sample-assignment-balanced-brackets",
  title: "Balanced brackets",
  instructions: "Implement is_balanced(text) for (), [], and {} using a stack. Return true for an empty string and ignore non-bracket characters.",
  maxScore: 20,
  deadline: "2026-10-19T16:00:00Z",
};

// Fictional, deterministic local previews only; not backend records or persisted grades.
// Code test results are sample historical output, not execution in the browser.
export const MOCK_INSTRUCTOR_SUBMISSIONS: InstructorSubmission[] = [
  {
    id: "sample-submission-written-rubric", type: "written", student: { ...STUDENTS[0] }, course: { ...SOFTWARE },
    assessment: {
      id: "sample-assignment-rubric-analysis", title: "Structured analysis (local rubric)",
      instructions: "Explain your proposed development process, support it with examples, and organize the response clearly. This is a local rubric demonstration.",
      maxScore: 10, rubricSource: "local",
      rubrics: [
        { id: "local-rubric-reasoning", criterionName: "Reasoning", description: "Explain the process and justify the main decisions.", maxPoints: 4 },
        { id: "local-rubric-evidence", criterionName: "Evidence", description: "Support the argument with practical examples.", maxPoints: 4 },
        { id: "local-rubric-clarity", criterionName: "Clarity", description: "Use a clear structure and precise language.", maxPoints: 2 },
      ],
    },
    submittedAt: "2026-10-20T09:00:00Z", attemptNumber: 1,
    writtenAnswer: "I propose iterative delivery, with acceptance criteria for each release and demonstrations to validate the registration rules with event organizers.",
    attachments: [], grading: { status: "pending", score: null, feedback: "", gradedAt: null },
  },
  createMockQuizSubmission(
    { id: "sample-submission-quiz-pending", student: STUDENTS[1], submittedAt: "2026-10-16T09:12:00Z", attemptNumber: 1 },
    ALGORITHMS_QUIZ,
    { "sample-question-stack": 0, "sample-question-binary-search": 1, "sample-question-bfs": 2 },
  ),
  createMockQuizSubmission(
    { id: "sample-submission-quiz-attempt-1", student: STUDENTS[0], submittedAt: "2026-10-15T08:20:00Z", attemptNumber: 1 },
    ALGORITHMS_QUIZ,
    { "sample-question-stack": 0, "sample-question-binary-search": 0, "sample-question-bfs": null },
    "2026-10-15T08:20:05Z",
    "The stack answer is correct. Review the halving step in binary search and answer the frontier question on your next attempt.",
  ),
  createMockQuizSubmission(
    { id: "sample-submission-quiz-attempt-2", student: STUDENTS[0], submittedAt: "2026-10-16T10:35:00Z", attemptNumber: 2 },
    ALGORITHMS_QUIZ,
    { "sample-question-stack": 0, "sample-question-binary-search": 1, "sample-question-bfs": 2 },
    "2026-10-16T10:35:05Z",
    "All three answers are correct. Your second attempt shows a clear understanding of traversal and search.",
  ),
  createMockQuizSubmission(
    { id: "sample-submission-quiz-review", student: STUDENTS[2], submittedAt: "2026-10-17T11:45:00Z", attemptNumber: 1 },
    NETWORKS_QUIZ,
    { "sample-question-tcp": 1, "sample-question-retry": 0, "sample-question-sequence": 0 },
    "2026-10-17T11:45:05Z",
    "Automatic grading paused: the imported snapshot has one missing key and one key outside its option list. Instructor review is required.",
  ),
  {
    id: "sample-submission-written-text", type: "written", student: { ...STUDENTS[1] }, course: { ...SOFTWARE },
    assessment: { ...WRITTEN_ASSESSMENT }, submittedAt: "2026-10-18T07:50:00Z", attemptNumber: 1,
    writtenAnswer: "I would deliver the registration service in short iterations. Start with event creation and registration, then add cancellation and waiting lists. Each change should have a peer review and automated tests for seat limits. A short demonstration with the student organizers would help the team identify unclear requirements before planning the next iteration.",
    attachments: [],
    grading: { status: "pending", score: null, feedback: "", gradedAt: null },
  },
  {
    id: "sample-submission-written-file", type: "written", student: { ...STUDENTS[0] }, course: { ...SOFTWARE },
    assessment: { ...WRITTEN_ASSESSMENT }, submittedAt: "2026-10-18T09:05:00Z", attemptNumber: 1,
    writtenAnswer: "",
    attachments: [{
      id: "sample-attachment-written-answer", fileName: "sample-written-answer.txt", mimeType: "text/plain",
      url: "/mock-submissions/sample-written-answer.txt", sizeBytes: 842,
    }],
    grading: { status: "pending", score: null, feedback: "", gradedAt: null },
  },
  {
    id: "sample-submission-written-graded", type: "written", student: { ...STUDENTS[3] }, course: { ...SOFTWARE },
    assessment: { ...WRITTEN_ASSESSMENT }, submittedAt: "2026-10-17T13:15:00Z", attemptNumber: 1,
    writtenAnswer: "An iterative process would let the team validate registration rules with event organizers early. I would define acceptance criteria for seat limits, cancellation, and duplicate registrations, then build the smallest complete workflow first. Code review and automated tests would run before each demonstration. Stakeholder feedback would determine the next backlog priority, while a short retrospective would address delivery problems within the team.",
    attachments: [],
    grading: {
      status: "graded", score: 8.5, gradedAt: "2026-10-18T14:30:00Z",
      feedback: "Clear connection between short iterations and stakeholder feedback. The acceptance criteria are useful; explain how concurrent registration requests will be tested to strengthen the proposal.",
    },
  },
  {
    id: "sample-submission-code-pending", type: "code", student: { ...STUDENTS[2] }, course: { ...ALGORITHMS },
    assessment: { ...CODE_ASSESSMENT }, submittedAt: "2026-10-19T08:40:00Z", attemptNumber: 1,
    codeSubmission: {
      assignmentId: CODE_ASSESSMENT.id, language: "python",
      code: "def is_balanced(text):\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for char in text:\n        if char in '([{':\n            stack.append(char)\n        elif char in pairs:\n            if not stack or stack.pop() != pairs[char]:\n                return False\n    return not stack\n",
      testResults: { passed: true, output: "6/6 sample tests passed. Instructor assessment pending.", runtimeMs: 12 },
    },
    grading: { status: "pending", score: null, feedback: "", gradedAt: null },
  },
  {
    id: "sample-submission-code-zero", type: "code", student: { ...STUDENTS[1] }, course: { ...ALGORITHMS },
    assessment: { ...CODE_ASSESSMENT }, submittedAt: "2026-10-18T10:20:00Z", attemptNumber: 1,
    codeSubmission: {
      assignmentId: CODE_ASSESSMENT.id, language: "python", code: "def is_balanced(text):\n    pass\n",
      testResults: { passed: false, output: "0/6 sample tests passed. Expected a boolean; received None.", runtimeMs: 8 },
    },
    grading: {
      status: "graded", score: 0, gradedAt: "2026-10-19T13:10:00Z",
      feedback: "The submitted function has no implementation and returns None. Use a stack to match each closing bracket, return a boolean, and test the empty input before resubmitting.",
    },
  },
  {
    id: "sample-submission-code-review", type: "code", student: { ...STUDENTS[3] }, course: { ...ALGORITHMS },
    assessment: { ...CODE_ASSESSMENT }, submittedAt: "2026-10-19T11:55:00Z", attemptNumber: 1,
    codeSubmission: {
      assignmentId: CODE_ASSESSMENT.id, language: "python",
      code: "def is_balanced(text):\n    while '()' in text or '[]' in text or '{}' in text:\n        text = text.replace('()', '').replace('[]', '').replace('{}', '')\n    return text == ''\n",
    },
    grading: {
      status: "review-required", score: null, gradedAt: null,
      feedback: "Review the implementation and rerun the sample cases before assigning a score.",
      reviewReason: "The sandbox was unavailable when this attempt was submitted; no test result was recorded.",
    },
  },
];
