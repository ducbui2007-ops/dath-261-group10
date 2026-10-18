"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MAX_IMPORT_FILE_BYTES,
  readQuestionImportFile,
  validateQuestionImportSheet,
  type ImportedQuestion,
  type ImportResult,
  type ImportSheet,
} from "@/lib/quiz-question-import";
import { cn } from "@/lib/utils";

interface QuestionImportProps {
  onConfirm: (questions: ImportedQuestion[]) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export function QuestionImport({ onConfirm }: QuestionImportProps) {
  const id = React.useId();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isReading, setIsReading] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [sheets, setSheets] = React.useState<ImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = React.useState("");
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [fileError, setFileError] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const openRef = React.useRef<HTMLButtonElement>(null);
  const chooseRef = React.useRef<HTMLButtonElement>(null);
  const mountedRef = React.useRef(true);
  const generationRef = React.useRef(0);
  const confirmedRef = React.useRef(false);
  const canConfirm = !isReading && !fileError && Boolean(
    result && result.errors.length === 0 && result.questionCount > 0 && result.rows.length > 0
  );

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  const clearCandidate = () => {
    generationRef.current += 1;
    setIsReading(false);
    setFileName("");
    setSheets([]);
    setSheetIndex("");
    setResult(null);
    setFileError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const closeImport = (restoreFocus = true) => {
    clearCandidate();
    setIsExpanded(false);
    if (restoreFocus) requestAnimationFrame(() => openRef.current?.focus());
  };

  const selectFile = async (files: File[]) => {
    clearCandidate();
    confirmedRef.current = false;
    if (files.length === 0) return;
    if (files.length !== 1) {
      setFileError("Choose one CSV or XLSX file at a time.");
      return;
    }
    const file = files[0];
    setFileName(file.name);
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setFileError("Choose a CSV or XLSX file.");
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setFileError("The file must be no larger than 10 MiB.");
      return;
    }
    const generation = generationRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === generation;
    setIsReading(true);
    try {
      const nextSheets = await readQuestionImportFile(file);
      if (!isCurrent()) return;
      if (nextSheets.length === 0) throw new Error("This file has no worksheets to import.");
      setSheets(nextSheets);
      if (nextSheets.length === 1) {
        setSheetIndex("0");
        setResult(validateQuestionImportSheet(nextSheets[0]));
      }
    } catch (error) {
      if (!isCurrent()) return;
      setSheets([]);
      setSheetIndex("");
      setResult(null);
      setFileError(error instanceof Error ? error.message : "The file could not be read. Choose a valid CSV or XLSX file.");
    } finally {
      if (isCurrent()) setIsReading(false);
    }
  };

  const selectSheet = (value: string) => {
    generationRef.current += 1;
    confirmedRef.current = false;
    setSheetIndex(value);
    setResult(null);
    setFileError("");
    if (value === "") return;
    const sheet = sheets[Number(value)];
    if (!sheet) return;
    try {
      setResult(validateQuestionImportSheet(sheet));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "This worksheet could not be validated.");
    }
  };

  return (
    <Card data-component="QuestionImport" aria-labelledby={`${id}-title`}
      className="question-import__container_01 min-w-0 rounded-[15px]">
      <CardHeader className="question-import__header_01 gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 id={`${id}-title`} className="question-import__title_01 font-display text-xl font-bold">Import Questions</h3>
        {!isExpanded && (
          <Button ref={openRef} type="button" variant="outline" aria-expanded={isExpanded} aria-controls={`${id}-panel`}
            onClick={() => {
              confirmedRef.current = false;
              setIsExpanded(true);
              requestAnimationFrame(() => chooseRef.current?.focus());
            }} className="question-import__open_01">Import Questions</Button>
        )}
      </CardHeader>
      {isExpanded && (
        <CardContent id={`${id}-panel`} className="question-import__content_01 space-y-4">
          <p id={`${id}-notice`} className="question-import__notice_01 text-sm text-muted-foreground">
            Files are read on this device. Nothing is uploaded; your quiz changes only after Confirm Import.
          </p>
          <div className="question-import__instructions_01 space-y-2 text-sm">
            <a href="/templates/quiz-questions.csv" download
              className="question-import__template_01 inline-block rounded text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Download CSV Template
            </a>
            <p id={`${id}-columns`} className="question-import__columns_01 text-muted-foreground">
              Required columns: Question, A, B, C, D, Correct. Correct must be A, B, C, or D.
              {" "}Points is optional (defaults to 1); positive fractional points are supported. Explanation is optional.
              {" "}Choose a CSV or XLSX file up to 10 MiB.
            </p>
          </div>
          <fieldset aria-describedby={`${id}-notice ${id}-columns`} aria-busy={isReading}
            className="question-import__file-section_01 min-w-0 space-y-3 rounded-lg border border-border p-3 sm:p-4">
            <legend className="question-import__legend_01 px-1 text-sm font-medium">Question File</legend>
            <label htmlFor={`${id}-file`} className="question-import__file-label_01 sr-only">Choose CSV or XLSX File</label>
            <Input ref={fileRef} id={`${id}-file`} type="file" accept=".csv,.xlsx" tabIndex={-1}
              aria-describedby={fileError ? `${id}-file-error` : `${id}-columns`}
              aria-invalid={Boolean(fileError)} className="question-import__file-input_01 hidden"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                void selectFile(files);
              }} />
            <Button ref={chooseRef} type="button" variant="outline" disabled={isReading}
              onClick={() => fileRef.current?.click()} className="question-import__choose_01">
              Choose CSV or XLSX File
            </Button>
            <p role="status" aria-live="polite" className="question-import__read-status_01 break-all text-sm text-muted-foreground">
              {isReading ? `Reading ${fileName}…` : fileName ? `Source: ${fileName}` : "No file selected."}
            </p>
            {fileError && (
              <p id={`${id}-file-error`} role="alert" className="question-import__file-error_01 break-words text-sm text-destructive">{fileError}</p>
            )}
            {sheets.length > 1 ? (
              <div className="question-import__worksheet-field_01 space-y-2">
                <label htmlFor={`${id}-worksheet`} className="question-import__worksheet-label_01 block text-sm font-medium">Select Worksheet</label>
                <select id={`${id}-worksheet`} value={sheetIndex} disabled={isReading}
                  onChange={(event) => selectSheet(event.target.value)}
                  className="question-import__worksheet_01 h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">Choose a worksheet</option>
                  {sheets.map((sheet, index) => <option key={index} value={index}>{sheet.name}</option>)}
                </select>
                {sheetIndex === "" && <p className="question-import__worksheet-help_01 text-xs text-muted-foreground">Select one worksheet to validate and preview. Nothing is imported automatically.</p>}
              </div>
            ) : sheets.length === 1 && (
              <p className="question-import__worksheet-name_01 break-words text-sm text-muted-foreground">Worksheet: {sheets[0].name}</p>
            )}
          </fieldset>

          {result && (
            <div className="question-import__validation_01 space-y-3">
              <div role="status" aria-live="polite" className="question-import__counts_01 flex flex-wrap items-center gap-2">
                <Badge variant={result.errors.length ? "destructive" : "secondary"} className="question-import__count_01">
                  {result.questionCount} {result.questionCount === 1 ? "question" : "questions"} found
                </Badge>
                <span className="question-import__blank-count_01 text-xs text-muted-foreground">
                  Skipped {result.blankRowCount} blank {result.blankRowCount === 1 ? "row" : "rows"}.
                </span>
              </div>
              {result.errors.length > 0 ? (
                <div role="alert" className="question-import__errors_01 space-y-2 rounded-lg border border-destructive p-3 text-sm">
                  <p className="question-import__errors-title_01 font-medium text-destructive">No questions will be imported until every error is fixed.</p>
                  <ul className="question-import__error-list_01 max-h-60 space-y-2 overflow-y-auto pr-2">
                    {result.errors.map((error, index) => (
                      <li key={index} className="question-import__error_01 break-words text-destructive">
                        Row {error.row}{error.column ? `, Column ${error.column}` : ""}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : result.rows.length === 0 ? (
                <p role="alert" className="question-import__empty_01 text-sm text-destructive">No questions found. Add question rows before importing.</p>
              ) : (
                <section aria-labelledby={`${id}-preview-title`} className="question-import__preview_01 space-y-3">
                  <h4 id={`${id}-preview-title`} className="question-import__preview-title_01 font-display text-base font-bold">Question Import Preview</h4>
                  <p className="question-import__preview-help_01 text-xs text-muted-foreground">Review the questions in file order before confirming. Existing quiz questions are kept.</p>
                  <ol className="question-import__rows_01 max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                    {result.rows.map(({ row, question }, index) => (
                      <li key={`${row}-${index}`} className="question-import__row_01">
                        <details className="question-import__details_01 rounded-lg border border-border p-3">
                          <summary className="question-import__summary_01 cursor-pointer break-words text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {index + 1}. {question.prompt} (Row {row})
                          </summary>
                          <div className="question-import__question_01 mt-3 space-y-3 text-sm">
                            <p className="question-import__prompt_01 whitespace-pre-wrap break-words">{question.prompt}</p>
                            <ol className="question-import__options_01 space-y-2">
                              {question.options.map((option, optionIndex) => (
                                <li key={optionIndex} className={cn("question-import__option_01 whitespace-pre-wrap break-words", question.correctOptionIndex === optionIndex && "font-semibold text-secondary")}>
                                  {OPTION_LABELS[optionIndex]}. {option}
                                </li>
                              ))}
                            </ol>
                            <p className="question-import__correct_01">Correct: {question.correctOptionIndex === undefined ? "Not provided" : OPTION_LABELS[question.correctOptionIndex]}</p>
                            <p className="question-import__points_01">Points: {question.points}</p>
                            <p className="question-import__explanation_01 whitespace-pre-wrap break-words">Explanation: {question.explanation || "Not provided"}</p>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
          <div className="question-import__actions_01 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" disabled={!canConfirm} onClick={() => {
              if (!canConfirm || !result || confirmedRef.current) return;
              confirmedRef.current = true;
              const questions = result.rows.map(({ question }): ImportedQuestion => ({ ...question, options: [...question.options] }));
              onConfirm(questions);
              closeImport(false);
            }} className="question-import__confirm_01">Confirm Import</Button>
            <Button type="button" variant="outline" onClick={() => closeImport()} className="question-import__cancel_01">Cancel Import</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
