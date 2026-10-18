import type { QuestionDraft } from "@/lib/instructor-quiz";

export type ImportedQuestion = Omit<QuestionDraft, "id">;
export interface ImportError { row: number; column?: string; message: string }
export interface ImportSheet { name: string; rows: unknown[][]; errors?: ImportError[] }
export interface ImportRow { row: number; question: ImportedQuestion }
export interface ImportResult {
  rows: ImportRow[];
  errors: ImportError[];
  questionCount: number;
  blankRowCount: number;
}

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const REQUIRED_COLUMNS = ["question", "a", "b", "c", "d", "correct"];
const OPTIONAL_COLUMNS = ["points", "explanation"];
const isBlank = (value: unknown) => value === null || value === undefined || (typeof value === "string" && !value.trim());
const isBlankRow = (row: unknown[]) => row.every(isBlank);

function textCell(value: unknown): string | undefined {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function columnLetter(index: number): string {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + (value - 1) % 26) + name;
  }
  return name;
}

export async function readQuestionImportFile(file: File): Promise<ImportSheet[]> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error("Choose a .csv or .xlsx file. Other formats are not supported.");
  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error("Choose a file no larger than 10 MiB.");
  if (/\.csv$/i.test(file.name)) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      throw new Error("Could not read this CSV as UTF-8. Save it as CSV UTF-8 and try again.");
    }
    const { default: Papa } = await import("papaparse");
    const parsed = Papa.parse<string[]>(text, { delimiter: ",", skipEmptyLines: false, dynamicTyping: false });
    return [{
      name: "CSV",
      rows: parsed.data,
      errors: parsed.errors.map((error) => ({ row: (error.row ?? 0) + 1, message: error.message })),
    }];
  }
  try {
    const { default: readExcelFile } = await import("read-excel-file/browser");
    const sheets = await readExcelFile(file, { trim: false });
    if (!sheets.length) throw new Error("The workbook contains no worksheets.");
    return sheets.map(({ sheet, data }) => ({ name: sheet, rows: data }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid workbook data.";
    throw new Error(`Could not read this XLSX workbook. ${detail}`);
  }
}

export function validateQuestionImportSheet(sheet: ImportSheet): ImportResult {
  const errors: ImportError[] = [...(sheet.errors || [])];
  const rows: ImportRow[] = [];
  const blankRowCount = sheet.rows.filter(isBlankRow).length;
  const headerIndex = sheet.rows.findIndex((row) => !isBlankRow(row));
  if (headerIndex === -1) {
    errors.push({ row: 1, message: "No header or question rows were found." });
    return { rows: [], errors, questionCount: 0, blankRowCount };
  }
  const headers = sheet.rows[headerIndex].map((cell, index) => {
    const value = textCell(cell);
    if (value === undefined) errors.push({ row: headerIndex + 1, column: columnLetter(index), message: "Headers must be text or numbers, not dates, booleans, or objects." });
    return value?.replace(/^\uFEFF/, "").trim().toLowerCase() || "";
  });
  const columns = new Map<string, number>();
  headers.forEach((header, index) => {
    if (!header) return;
    if (![...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].includes(header)) {
      errors.push({ row: headerIndex + 1, column: columnLetter(index), message: `Unknown column "${header}".` });
    }
    if (columns.has(header)) errors.push({ row: headerIndex + 1, column: columnLetter(index), message: `Duplicate column "${header}".` });
    else columns.set(header, index);
  });
  REQUIRED_COLUMNS.forEach((header) => {
    if (!columns.has(header)) errors.push({ row: headerIndex + 1, column: header === "question" ? "Question" : header.toUpperCase(), message: `Missing required column "${header}".` });
  });
  let questionCount = 0;
  for (let index = headerIndex + 1; index < sheet.rows.length; index += 1) {
    const source = sheet.rows[index];
    if (isBlankRow(source)) continue;
    questionCount += 1;
    const row = index + 1;
    const invalidCells = new Set<number>();
    const cells = source.map((cell, cellIndex) => {
      const value = textCell(cell);
      if (value === undefined) {
        invalidCells.add(cellIndex);
        errors.push({ row, column: headers[cellIndex] || columnLetter(cellIndex), message: "Use text or a finite number. Dates, booleans, and objects are not supported." });
      } else if (!isBlank(cell) && !headers[cellIndex]) {
        errors.push({ row, column: columnLetter(cellIndex), message: "Unexpected value in a column without a header." });
      }
      return value ?? "";
    });
    const value = (header: string) => cells[columns.get(header) ?? -1] ?? "";
    for (const header of REQUIRED_COLUMNS) {
      const columnIndex = columns.get(header);
      if (columnIndex !== undefined && !invalidCells.has(columnIndex) && !value(header).trim()) {
        errors.push({ row, column: header === "question" ? "Question" : header.toUpperCase(), message: "Enter a nonempty value." });
      }
    }
    const answer = value("correct").trim().toUpperCase();
    if (answer && !/^[A-D]$/.test(answer)) errors.push({ row, column: "Correct", message: "Use exactly one letter: A, B, C, or D." });
    const points = value("points").trim() ? value("points") : "1";
    if (!Number.isFinite(Number(points)) || Number(points) <= 0) errors.push({ row, column: "Points", message: "Points must be a positive, finite number." });
    rows.push({ row, question: {
      prompt: value("question"),
      options: [value("a"), value("b"), value("c"), value("d")],
      correctOptionIndex: answer.length === 1 ? "ABCD".indexOf(answer) : -1,
      points,
      explanation: value("explanation"),
    } });
  }
  if (!questionCount) errors.push({ row: headerIndex + 1, message: "No question rows were found below the header." });
  return { rows: errors.length ? [] : rows, errors, questionCount, blankRowCount };
}

export function isUntouchedQuestionPlaceholder(question: QuestionDraft): boolean {
  return question.prompt === "" && question.options.length === 4 && question.options.every((option) => option === "") &&
    question.correctOptionIndex === undefined && question.points === "1" && (question.explanation === "" || question.explanation === undefined);
}

function isValidImportedQuestion(question: ImportedQuestion): boolean {
  return typeof question.prompt === "string" && Boolean(question.prompt.trim()) &&
    Array.isArray(question.options) && question.options.length === 4 && question.options.every((option) => typeof option === "string" && Boolean(option.trim())) &&
    typeof question.correctOptionIndex === "number" && Number.isInteger(question.correctOptionIndex) && question.correctOptionIndex >= 0 && question.correctOptionIndex <= 3 &&
    typeof question.points === "string" && Boolean(question.points.trim()) && Number.isFinite(Number(question.points)) && Number(question.points) > 0 &&
    (question.explanation === undefined || typeof question.explanation === "string");
}

export function appendImportedQuestions(existing: QuestionDraft[], incoming: ImportedQuestion[], replacePlaceholder: boolean): QuestionDraft[] {
  if (!incoming.every(isValidImportedQuestion)) throw new Error("Imported questions are invalid. Review and validate the complete import first.");
  if (!incoming.length) return existing;
  const imported = incoming.map((question): QuestionDraft => ({ ...question, id: crypto.randomUUID(), options: [...question.options] }));
  const base = replacePlaceholder && existing.length === 1 && isUntouchedQuestionPlaceholder(existing[0]) ? [] : existing;
  return [...base, ...imported];
}
