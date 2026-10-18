"use client";

import * as React from "react";
import { QuestionBuilder } from "@/components/quiz/question-builder";
import { QuestionImport } from "@/components/quiz/question-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cloneQuizDraft,
  createQuestionDraft,
  quizDraftsEqual,
  toSharedQuiz,
  validateQuizDraft,
  type GradingMethod,
  type InstructorQuizDraft,
  type QuizErrors,
  type QuizSettingsDraft,
  type QuestionDraft,
} from "@/lib/instructor-quiz";
import { cn } from "@/lib/utils";
import { appendImportedQuestions, type ImportedQuestion } from "@/lib/quiz-question-import";

interface QuizEditorProps {
  initialValue: InstructorQuizDraft;
  placementLabel: string;
  onApply: (draft: InstructorQuizDraft) => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

type PendingAction = { kind: "close" | "reset" } | { kind: "remove"; questionId: string };

const NOTICE = "Quizzes and settings are kept only in this course draft, not saved to a server or enforced.";
const CONTROL_STYLE = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";
const GRADING_OPTIONS: { value: GradingMethod; label: string }[] = [
  { value: "highest", label: "Highest Score" },
  { value: "average", label: "Average Score" },
  { value: "latest", label: "Latest Attempt" },
];

function hasQuestionContent(question: QuestionDraft): boolean {
  return Boolean(question.prompt.trim() || question.options.some((option) => option.trim()) ||
    question.explanation?.trim() || question.correctOptionIndex !== undefined || question.points !== "1");
}

export function QuizEditor({ initialValue, placementLabel, onApply, onClose, onDirtyChange }: QuizEditorProps) {
  const [initialDraft] = React.useState(() => cloneQuizDraft(initialValue));
  const [draft, setDraft] = React.useState(() => cloneQuizDraft(initialDraft));
  const [errors, setErrors] = React.useState<QuizErrors>({});
  const [preview, setPreview] = React.useState<InstructorQuizDraft | null>(null);
  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = React.useState<Set<string>>(() => new Set());
  const [focusFieldId, setFocusFieldId] = React.useState<string | null>(null);
  const [importSession, setImportSession] = React.useState(0);
  const touchedQuestionsRef = React.useRef(new Set<string>());
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const confirmationRef = React.useRef<HTMLDialogElement>(null);
  const keepEditingRef = React.useRef<HTMLButtonElement>(null);
  const confirmationTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const addQuestionRef = React.useRef<HTMLButtonElement>(null);
  const isDirty = !quizDraftsEqual(draft, initialDraft);
  const sharedPreview = preview ? toSharedQuiz(preview) : undefined;
  const confirmationCopy = pendingAction?.kind === "reset"
    ? { title: "Reset quiz changes?", description: "This restores the quiz to its values when you opened the editor. Changes in this editor will be discarded.", action: "Reset Quiz Changes" }
    : pendingAction?.kind === "remove"
      ? { title: "Remove this question?", description: "This removes the question and its answer options from this quiz draft.", action: "Remove Question" }
      : { title: "Discard quiz edits?", description: "Changes in this editor will be discarded. The course draft will remain unchanged.", action: "Discard Quiz Changes" };

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    titleRef.current?.focus();
    return () => dialog?.close();
  }, []);

  React.useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  React.useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  React.useEffect(() => {
    if (!focusFieldId) return;
    const field = document.getElementById(focusFieldId);
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
    setFocusFieldId(null);
  }, [focusFieldId, collapsedQuestions]);

  React.useEffect(() => {
    if (pendingAction) {
      if (!confirmationRef.current?.open) confirmationRef.current?.showModal();
      keepEditingRef.current?.focus();
    } else {
      confirmationRef.current?.close();
    }
  }, [pendingAction]);

  const updateDraft = (update: (current: InstructorQuizDraft) => InstructorQuizDraft) => {
    setDraft(update);
    setErrors({});
    setPreview(null);
  };

  const updateSetting = <K extends keyof QuizSettingsDraft>(name: K, value: QuizSettingsDraft[K]) => {
    updateDraft((current) => ({ ...current, settings: { ...current.settings, [name]: value } }));
  };

  const confirm = (action: PendingAction, trigger: HTMLButtonElement | null) => {
    confirmationTriggerRef.current = trigger;
    setPendingAction(action);
  };

  const requestClose = () => {
    if (isDirty) confirm({ kind: "close" }, closeButtonRef.current);
    else onClose();
  };

  const reset = () => {
    setDraft(cloneQuizDraft(initialDraft));
    setErrors({});
    setPreview(null);
    setCollapsedQuestions(new Set());
    touchedQuestionsRef.current.clear();
    setImportSession((current) => current + 1);
  };

  const removeQuestion = (questionId: string) => {
    updateDraft((current) => ({ ...current, questions: current.questions.filter((question) => question.id !== questionId) }));
    touchedQuestionsRef.current.delete(questionId);
    setCollapsedQuestions((previous) => {
      const next = new Set(previous);
      next.delete(questionId);
      return next;
    });
  };

  const addQuestion = () => {
    const question = createQuestionDraft();
    updateDraft((current) => ({ ...current, questions: [...current.questions, question] }));
    setFocusFieldId(`${question.id}-prompt`);
  };

  const importQuestions = (incoming: ImportedQuestion[]) => {
    const replacePlaceholder = draft.questions.length === 1 && !touchedQuestionsRef.current.has(draft.questions[0].id);
    const questions = appendImportedQuestions(draft.questions, incoming, replacePlaceholder);
    const firstNewQuestion = questions.find((question) => !draft.questions.some((existing) => existing.id === question.id));
    updateDraft((current) => ({ ...current, questions }));
    if (firstNewQuestion) setFocusFieldId(`${firstNewQuestion.id}-prompt`);
  };

  const validate = () => {
    const nextErrors = validateQuizDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) return true;
    const fieldOrder = ["quiz-title", "quiz-questions", ...draft.questions.flatMap((question) => [
      `${question.id}-prompt`, `${question.id}-correct`,
      ...question.options.map((_, index) => `${question.id}-options-${index}`), `${question.id}-points`,
    ]), "quiz-time-limit", "quiz-grading-method", "quiz-available-from", "quiz-available-until", "quiz-max-attempts"];
    const firstInvalid = fieldOrder.find((id) => Boolean(nextErrors[id]));
    const question = draft.questions.find((item) => firstInvalid?.startsWith(`${item.id}-`));
    if (question) setCollapsedQuestions((previous) => {
      const next = new Set(previous);
      next.delete(question.id);
      return next;
    });
    if (firstInvalid) setFocusFieldId(firstInvalid);
    return false;
  };

  return (
    <dialog ref={dialogRef} data-component="QuizEditor" aria-labelledby="quiz-editor-title" aria-describedby="quiz-editor-description"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        requestClose();
      }}
      className="quiz-editor__container_01 max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-[15px] border border-border bg-background p-4 text-foreground shadow-lg backdrop:bg-black/50 sm:p-6">
      <div className="quiz-editor__content_01 space-y-6">
        <div className="quiz-editor__header_01 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="quiz-editor__heading_01 min-w-0 space-y-2">
            <h2 id="quiz-editor-title" className="quiz-editor__title_01 font-display text-2xl font-bold tracking-tight">Quiz Editor</h2>
            <p className="quiz-editor__placement_01 break-words text-sm font-medium">Placement: {placementLabel}</p>
            <p id="quiz-editor-description" className="quiz-editor__notice_01 text-sm text-muted-foreground">{NOTICE}</p>
          </div>
          <Button ref={closeButtonRef} type="button" variant="outline" onClick={requestClose}
            className="quiz-editor__close_01 shrink-0">Close Quiz Editor</Button>
        </div>

        <form ref={formRef} noValidate onSubmit={(event) => {
          event.preventDefault();
          if (validate()) setPreview(cloneQuizDraft(draft));
        }} className="quiz-editor__form_01 space-y-6">
          <div className="quiz-editor__title-field_01 space-y-2">
            <label htmlFor="quiz-title" className="quiz-editor__label_01 block text-sm font-medium">Quiz Title</label>
            <Input ref={titleRef} id="quiz-title" value={draft.title} required aria-invalid={Boolean(errors["quiz-title"])}
              aria-describedby={errors["quiz-title"] ? "quiz-title-error" : undefined}
              onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))}
              className={cn("quiz-editor__title-input_01", errors["quiz-title"] && "border-destructive")} />
            {errors["quiz-title"] && <p id="quiz-title-error" role="alert" className="quiz-editor__error_01 text-sm text-destructive">{errors["quiz-title"]}</p>}
          </div>

          <Card className="quiz-editor__questions_01 rounded-[15px]">
            <CardHeader className="quiz-editor__questions-header_01 gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="quiz-editor__section-title_01 font-display text-xl font-bold">Questions</h3>
              <div className="quiz-editor__question-view_01 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={draft.questions.length === 0}
                  onClick={() => setCollapsedQuestions(new Set(draft.questions.map((question) => question.id)))}
                  className="quiz-editor__collapse-all_01">Collapse All</Button>
                <Button type="button" variant="outline" size="sm" disabled={draft.questions.length === 0}
                  onClick={() => setCollapsedQuestions(new Set())}
                  className="quiz-editor__expand-all_01">Expand All</Button>
              </div>
            </CardHeader>
            <CardContent id="quiz-questions" tabIndex={-1} aria-describedby={errors["quiz-questions"] ? "quiz-questions-error" : undefined}
              className="quiz-editor__question-list_01 space-y-4 focus:outline-none focus:ring-2 focus:ring-ring">
              <QuestionImport key={importSession} onConfirm={importQuestions} />
              {draft.questions.length === 0 && <p className="quiz-editor__empty_01 text-sm text-muted-foreground">No questions yet. Add a question to start your quiz.</p>}
              {draft.questions.map((question, index) => (
                <QuestionBuilder key={question.id} question={question} index={index} errors={errors}
                  expanded={!collapsedQuestions.has(question.id)}
                  onExpandedChange={(expanded) => setCollapsedQuestions((previous) => {
                    const next = new Set(previous);
                    if (expanded) next.delete(question.id);
                    else next.add(question.id);
                    return next;
                  })}
                  onChange={(nextQuestion) => {
                    touchedQuestionsRef.current.add(question.id);
                    updateDraft((current) => ({
                      ...current, questions: current.questions.map((item) => item.id === question.id ? nextQuestion : item),
                    }));
                  }}
                  onRemove={() => {
                    if (hasQuestionContent(question)) {
                      const trigger = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
                      confirm({ kind: "remove", questionId: question.id }, trigger);
                    } else removeQuestion(question.id);
                  }} />
              ))}
              {errors["quiz-questions"] && <p id="quiz-questions-error" role="alert" className="quiz-editor__error_02 text-sm text-destructive">{errors["quiz-questions"]}</p>}
              <Button ref={addQuestionRef} type="button" variant="outline" onClick={addQuestion}
                className="quiz-editor__add-question_01">Add Question</Button>
            </CardContent>
          </Card>

          <Card className="quiz-editor__settings_01 rounded-[15px]">
            <CardHeader className="quiz-editor__settings-header_01">
              <h3 className="quiz-editor__section-title_02 font-display text-xl font-bold">Quiz Settings</h3>
              <p className="quiz-editor__timezone_01 text-sm text-muted-foreground">Times use your browser&apos;s local timezone.</p>
            </CardHeader>
            <CardContent className="quiz-editor__settings-fields_01 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="quiz-editor__time-limit_01 space-y-2">
                <label htmlFor="quiz-time-limit" className="quiz-editor__label_02 block text-sm font-medium">Time Limit (minutes)</label>
                <Input id="quiz-time-limit" type="number" step="1" min="1" value={draft.settings.timeLimitMinutes} required
                  onChange={(event) => updateSetting("timeLimitMinutes", event.target.value)} aria-invalid={Boolean(errors["quiz-time-limit"])}
                  aria-describedby={errors["quiz-time-limit"] ? "quiz-time-limit-error" : undefined} className="quiz-editor__time-input_01" />
                {errors["quiz-time-limit"] && <p id="quiz-time-limit-error" role="alert" className="quiz-editor__error_03 text-sm text-destructive">{errors["quiz-time-limit"]}</p>}
              </div>
              <div className="quiz-editor__grading_01 space-y-2">
                <label htmlFor="quiz-grading-method" className="quiz-editor__label_03 block text-sm font-medium">Grading Method</label>
                <select id="quiz-grading-method" value={draft.settings.gradingMethod}
                  onChange={(event) => updateSetting("gradingMethod", event.target.value as GradingMethod)} aria-invalid={Boolean(errors["quiz-grading-method"])}
                  aria-describedby={errors["quiz-grading-method"] ? "quiz-grading-method-error" : undefined}
                  className={cn("quiz-editor__grading-select_01 h-10", CONTROL_STYLE)}>
                  {GRADING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {errors["quiz-grading-method"] && <p id="quiz-grading-method-error" role="alert" className="quiz-editor__error_04 text-sm text-destructive">{errors["quiz-grading-method"]}</p>}
              </div>
              <div className="quiz-editor__available-from_01 space-y-2">
                <label htmlFor="quiz-available-from" className="quiz-editor__label_04 block text-sm font-medium">Available From (optional)</label>
                <Input id="quiz-available-from" type="datetime-local" value={draft.settings.availableFrom}
                  onChange={(event) => updateSetting("availableFrom", event.target.value)} aria-invalid={Boolean(errors["quiz-available-from"])}
                  aria-describedby={errors["quiz-available-from"] ? "quiz-available-from-error" : undefined} className="quiz-editor__available-input_01" />
                {errors["quiz-available-from"] && <p id="quiz-available-from-error" role="alert" className="quiz-editor__error_05 text-sm text-destructive">{errors["quiz-available-from"]}</p>}
              </div>
              <div className="quiz-editor__available-until_01 space-y-2">
                <label htmlFor="quiz-available-until" className="quiz-editor__label_05 block text-sm font-medium">Available Until (optional)</label>
                <Input id="quiz-available-until" type="datetime-local" value={draft.settings.availableUntil}
                  onChange={(event) => updateSetting("availableUntil", event.target.value)} aria-invalid={Boolean(errors["quiz-available-until"])}
                  aria-describedby={errors["quiz-available-until"] ? "quiz-available-until-error" : undefined} className="quiz-editor__available-input_02" />
                {errors["quiz-available-until"] && <p id="quiz-available-until-error" role="alert" className="quiz-editor__error_06 text-sm text-destructive">{errors["quiz-available-until"]}</p>}
              </div>
              <label className="quiz-editor__unlimited_01 flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input type="checkbox" checked={draft.settings.unlimitedAttempts}
                  onChange={(event) => updateSetting("unlimitedAttempts", event.target.checked)} className="quiz-editor__unlimited-checkbox_01 h-4 w-4 accent-primary" />
                Unlimited attempts
              </label>
              <div className="quiz-editor__max-attempts_01 space-y-2">
                <label htmlFor="quiz-max-attempts" className="quiz-editor__label_06 block text-sm font-medium">Maximum Attempts</label>
                <Input id="quiz-max-attempts" type="number" min="1" step="1" value={draft.settings.maxAttempts} disabled={draft.settings.unlimitedAttempts}
                  onChange={(event) => updateSetting("maxAttempts", event.target.value)} aria-invalid={Boolean(errors["quiz-max-attempts"])}
                  aria-describedby={errors["quiz-max-attempts"] ? "quiz-max-attempts-error" : undefined} className="quiz-editor__attempts-input_01" />
                {errors["quiz-max-attempts"] && <p id="quiz-max-attempts-error" role="alert" className="quiz-editor__error_07 text-sm text-destructive">{errors["quiz-max-attempts"]}</p>}
              </div>
            </CardContent>
          </Card>

          <div className="quiz-editor__actions_01 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="submit" className="quiz-editor__review_01">Review Quiz</Button>
            <Button type="button" variant="outline" onClick={(event) => {
              if (isDirty) confirm({ kind: "reset" }, event.currentTarget);
              else reset();
            }} className="quiz-editor__reset_01">Reset</Button>
            <Button type="button" onClick={() => {
              if (validate()) onApply(cloneQuizDraft(draft));
            }} className="quiz-editor__apply_01">Keep in Course Draft</Button>
            {isDirty && <Badge variant="outline" className="quiz-editor__dirty_01 self-center">Unsaved quiz edits</Badge>}
          </div>
        </form>

        {preview && sharedPreview && (
          <Card aria-live="polite" className="quiz-editor__preview_01 rounded-[15px]">
            <CardHeader className="quiz-editor__preview-header_01 space-y-2">
              <h3 className="quiz-editor__section-title_03 font-display text-xl font-bold">Quiz Preview</h3>
              <Badge variant="outline" className="quiz-editor__preview-badge_01 self-start">Preview only — not saved</Badge>
              <p className="quiz-editor__preview-notice_01 text-sm text-muted-foreground">{NOTICE}</p>
            </CardHeader>
            <CardContent className="quiz-editor__preview-body_01 space-y-6">
              <h4 className="quiz-editor__preview-title_01 break-words font-display text-lg font-bold">{sharedPreview.title}</h4>
              <dl className="quiz-editor__preview-settings_01 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="quiz-editor__preview-setting_01"><dt className="quiz-editor__preview-label_01 font-medium">Placement</dt><dd className="quiz-editor__preview-value_01 break-words text-muted-foreground">{placementLabel}</dd></div>
                <div className="quiz-editor__preview-setting_02"><dt className="quiz-editor__preview-label_02 font-medium">Time Limit</dt><dd className="quiz-editor__preview-value_02 text-muted-foreground">{sharedPreview.timeLimitMinutes} minutes</dd></div>
                <div className="quiz-editor__preview-setting_03"><dt className="quiz-editor__preview-label_03 font-medium">Available From</dt><dd className="quiz-editor__preview-value_03 text-muted-foreground">{preview.settings.availableFrom || "Not scheduled"}</dd></div>
                <div className="quiz-editor__preview-setting_04"><dt className="quiz-editor__preview-label_04 font-medium">Available Until</dt><dd className="quiz-editor__preview-value_04 text-muted-foreground">{preview.settings.availableUntil || "Not scheduled"}</dd></div>
                <div className="quiz-editor__preview-setting_05"><dt className="quiz-editor__preview-label_05 font-medium">Attempts</dt><dd className="quiz-editor__preview-value_05 text-muted-foreground">{preview.settings.unlimitedAttempts ? "Unlimited" : Number(preview.settings.maxAttempts)}</dd></div>
                <div className="quiz-editor__preview-setting_06"><dt className="quiz-editor__preview-label_06 font-medium">Grading Method</dt><dd className="quiz-editor__preview-value_06 text-muted-foreground">{GRADING_OPTIONS.find((option) => option.value === preview.settings.gradingMethod)?.label}</dd></div>
              </dl>
              <ol className="quiz-editor__preview-questions_01 space-y-4">
                {sharedPreview.questions.map((question, index) => (
                  <li key={question.id} className="quiz-editor__preview-question_01 space-y-3 rounded-lg border border-border p-4">
                    <p className="quiz-editor__preview-prompt_01 whitespace-pre-wrap break-words font-medium">{index + 1}. {question.prompt}</p>
                    <ol className="quiz-editor__preview-options_01 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <li key={optionIndex} className="quiz-editor__preview-option_01 flex items-start gap-2 text-sm">
                          <span className="quiz-editor__preview-option-text_01 min-w-0 whitespace-pre-wrap break-words">{"ABCD"[optionIndex]}. {option}</span>
                          {question.correctOptionIndex === optionIndex && <Badge variant="secondary" className="quiz-editor__correct_01 shrink-0">Correct</Badge>}
                        </li>
                      ))}
                    </ol>
                    <p className="quiz-editor__preview-points_01 text-sm text-muted-foreground">Points: {question.points}</p>
                    <p className="quiz-editor__preview-explanation_01 whitespace-pre-wrap break-words text-sm text-muted-foreground">Explanation: {question.explanation || "Not provided"}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      <dialog ref={confirmationRef} aria-labelledby="quiz-confirm-title" aria-describedby="quiz-confirm-description"
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPendingAction(null);
        }}
        onClose={(event) => {
          event.stopPropagation();
          setPendingAction(null);
          const trigger = confirmationTriggerRef.current;
          if (trigger?.isConnected && !trigger.disabled) trigger.focus();
          else addQuestionRef.current?.focus();
        }}
        className="quiz-editor__confirmation_01 w-[calc(100%_-_2rem)] max-w-md rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50">
        <h2 id="quiz-confirm-title" className="quiz-editor__confirmation-title_01 font-display text-xl font-bold">{confirmationCopy.title}</h2>
        <p id="quiz-confirm-description" className="quiz-editor__confirmation-description_01 mt-3 text-sm text-muted-foreground">{confirmationCopy.description}</p>
        <div className="quiz-editor__confirmation-actions_01 mt-6 flex flex-col gap-3 sm:flex-row">
          <Button ref={keepEditingRef} type="button" variant="outline" onClick={() => setPendingAction(null)} className="quiz-editor__keep-editing_01">Keep Editing</Button>
          <Button type="button" variant="destructive" onClick={() => {
            if (pendingAction?.kind === "close") onClose();
            else if (pendingAction?.kind === "reset") reset();
            else if (pendingAction?.kind === "remove") removeQuestion(pendingAction.questionId);
            setPendingAction(null);
          }} className="quiz-editor__confirm_01">{confirmationCopy.action}</Button>
        </div>
      </dialog>
    </dialog>
  );
}
