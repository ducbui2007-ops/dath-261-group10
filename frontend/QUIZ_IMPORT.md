# Importing quiz questions

Use **Import Questions** inside the quiz editor to read a local `.csv` or `.xlsx` file, up to **10 MiB**. Reading and reviewing the file does not change the quiz. Select a worksheet when an Excel workbook contains several sheets, review the questions and any row errors, then confirm the import.

The import is atomic: any parser, header, or question error blocks the whole selected sheet. Existing questions remain unchanged until confirmation. Confirming appends questions in file order; only a single untouched default question can be replaced automatically. Edited questions are retained. New question IDs are created on confirmation, not while reading or reviewing. Imported questions are local drafts, not saved to a server.

## Columns

The first nonblank row contains the headers. Header names are case-insensitive and ignore surrounding whitespace. Column order can change. Duplicate, unknown, or missing required headers are errors.

| Column | Required | Value |
| --- | --- | --- |
| `Question` | Yes | Nonempty question text |
| `A`, `B`, `C`, `D` | Yes | Four nonempty answer options |
| `Correct` | Yes | Exactly one letter `A`, `B`, `C`, or `D`; lowercase is accepted |
| `Points` | No | Positive, finite number, including fractions such as `0.5`; omitted or blank defaults to `1` |
| `Explanation` | No | Optional explanation text |

Text and finite numeric cells are accepted; numeric cells become text. Boolean, date, and object cells are rejected. Question text, options, and explanations retain their whitespace. Empty cells are allowed only in optional columns. Nonempty values in extra or unnamed columns are errors.

```csv
Question,A,B,C,D,Correct,Points,Explanation
"Which structure supports FIFO, or first in first out?",Stack,Queue,Tree,Graph,B,1,Queues process the earliest added item first.
What is 2 + 2?,3,4,5,6,B,0.5,Two plus two equals four.
```

Download the template at `/templates/quiz-questions.csv`. You can open it in Excel, edit it, and use **Save As → Excel Workbook (.xlsx)**. Renaming a CSV to `.xlsx` does not convert the format.

## Format and row numbers

- CSV must be **UTF-8**, optionally with a BOM, and comma-delimited. Export **CSV UTF-8** from Excel. Quoted commas, doubled quotes, and quoted multiline cells are supported. CSV errors use logical record numbers, including the header and blank records; a quoted multiline question is one record, not several physical lines.
- XLSX reads worksheets locally, retaining their names, leading/internal blank rows and cell whitespace. Errors use the original worksheet row numbers, including the header. The XLSX reader discards wholly empty trailing rows and columns; counts reflect the rows it returns.
- Blank rows are ignored and their count is reported. A blank sheet or a header without questions is an error.
- Only the selected sheet is imported. Fix all its errors before confirming. Unsupported formats such as `.xls`, `.xlsm`, `.ods`, and `.tsv` are rejected.
- No remote URLs are fetched. Formulas are not evaluated; XLSX may contain cached formula results, so use plain text and numbers to avoid stale values. Images, formatting, and embedded objects are not imported.
