import fs from "node:fs";
import process from "node:process";
import readline from "node:readline";
import type { WriteStream } from "node:fs";
import type { Writable } from "node:stream";
import type { Readable } from "node:stream";
import streamArray from "stream-json/streamers/stream-array.js";

import {
  type OutputFormat,
  type NormalizedValue,
  type PredicateOp,
  type Predicate,
  normalizeValue,
  isRecord,
  isObjectRecord,
  toComparableString,
  escapeHtml,
  toHtmlCell,
  escapeYamlSingleQuoted,
  yamlNeedsQuotes,
  toYamlString,
  toYamlScalar,
  quoteIdentifier,
  toSqlLiteral,
  escapeDelimitedValue,
  stripQuotes,
  parsePredicate,
  compileLikeExpression,
  compileLikePattern,
  processRowValue as processRowValueSync,
} from "./StreamHelpers.mjs";
type InputFormat = "json" | "ndjson";
type DetectedShape = "array-of-arrays" | "array-of-objects";
type ErrorCategory =
  | "IO_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "STREAM_ERROR";
type Row = Record<string, unknown>;

interface StreamArrayItem {
  key: number;
  value: unknown;
}

interface StreamCliConfig {
  inputPath: string;
  inputFormat: string;
  outputPath: string;
  outputFormat: string;
  delimiter: string;
  quote: string;
  escape: string;
  lineBreak: string;
  includeHeaders: boolean;
  hasHeaders: boolean;
  hasRowNumbers: boolean;
  rowNumberHeader: string;
  sqlTableName: string;
  sqlIdentifierQuote: string;
  sqlIncludeCreateTable: boolean;
  sqlInsertBatchSize: number;
  htmlTableClass: string;
  htmlTheadClass: string;
  htmlTbodyClass: string;
  htmlId: string;
  htmlCaption: string;
  yamlIndent: number;
  yamlQuoteStrings: boolean;
  columns: string[];
  filters: string[];
  stats: boolean;
}

interface InitializeArgs {
  headers: string[];
  strictValidation: boolean;
}

interface InitialRowPlan {
  shape: DetectedShape;
  headers: string[];
  strictValidation: boolean;
  processFirstValue: boolean;
}

interface FinalizeRunArgs {
  useSqlBatch: boolean;
  flushSqlBatch: (force?: boolean) => Promise<void>;
  config: StreamCliConfig;
  output: Writable;
  hasOutputPath: boolean;
  outputHeaders: string[] | null;
  writtenRows: number;
  detectedShape: DetectedShape | null;
  sigintHandler: () => void;
}

interface StreamErrorLike extends Error {
  code?: string;
}

class StreamCliError extends Error {
  category: ErrorCategory;
  exitCode: number;

  constructor(category: ErrorCategory, message: string, exitCode: number = 1) {
    super(message);
    this.name = "StreamCliError";
    this.category = category;
    this.exitCode = exitCode;
  }
}

// Centralized error messages used across the streaming implementation.
const ERR_FILTER_EMPTY = "Filter expression cannot be empty.";
const ERR_INVALID_FILTER = (expression: string) =>
  `Invalid filter expression: ${expression}. Expected operators: =, !=, >, <, >=, <=, LIKE.`;
const ERR_HEADERS_NOT_INIT = "Streaming headers were not initialized.";
const ERR_ARRAYS_INCONSISTENT =
  "Inconsistent JSON array: expected all rows to be arrays in stream mode.";
const ERR_OBJECTS_INCONSISTENT =
  "Inconsistent JSON array: expected all rows to be objects in stream mode.";
const ERR_UNSUPPORTED_OUTPUTS =
  "Automatic streaming currently supports output formats: csv, tsv, psv, sql, html, yaml, ndjson.";
const ERR_UNSUPPORTED_INPUTS =
  "Automatic streaming currently supports input formats: json array, ndjson.";
const ERR_IO_ENOENT = (path: string) =>
  `Failed to read input file: ENOENT: no such file or directory, open '${path}'`;
const ERR_UNKNOWN_COLUMNS = (missing: string[], available: string[]) =>
  `Unknown column(s) in --columns: ${missing.join(", ")}. Available columns: ${available.join(", ")}.`;
const ERR_UNEXPECTED_TOKEN = "Unexpected streaming token shape.";
const ERR_EXPECT_ARRAY_ROWS =
  "Stream mode expects a JSON array containing arrays or objects.";
const ERR_EXPECT_NDJSON_OBJECTS =
  "NDJSON stream mode expects one JSON object per non-empty line.";
const ERR_SHAPE_NOT_INIT = "Streaming shape was not initialized.";
const ERR_EMPTY_INPUT = "Input JSON array is empty in streaming mode.";

const EXIT_OK = 0;
const EXIT_RUNTIME_ERROR = 1;
const EXIT_VALIDATION_ERROR = 2;
const EXIT_SIGINT = 130;

const JSON_PARSE_PATTERNS: ReadonlyArray<RegExp> = [
  /Parser cannot parse input/i,
  /expected a value/i,
  /Top-level object should be an array/i,
  /Unexpected token/i,
  /JSON\.parse/i,
  /position \d+/i,
];

const SUPPORTED_OUTPUTS: ReadonlySet<OutputFormat> = new Set<OutputFormat>([
  "csv",
  "tsv",
  "psv",
  "sql",
  "html",
  "yaml",
  "ndjson",
]);

const SUPPORTED_INPUTS: ReadonlySet<InputFormat> = new Set<InputFormat>([
  "json",
  "ndjson",
]);

const isStreamArrayItem = (value: unknown): value is StreamArrayItem =>
  isRecord(value) && "value" in value && "key" in value;

const writeChunk = (stream: Writable, chunk: string): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.write(chunk, "utf8", (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const parseFilterExpression = (expression: string): Predicate => {
  try {
    return parsePredicate(expression);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("cannot be empty")) {
      throw new StreamCliError(
        "VALIDATION_ERROR",
        ERR_FILTER_EMPTY,
        EXIT_VALIDATION_ERROR,
      );
    }
    throw new StreamCliError(
      "VALIDATION_ERROR",
      ERR_INVALID_FILTER(expression),
      EXIT_VALIDATION_ERROR,
    );
  }
};

/**
 * Compare two strings, preferring numeric comparison when both strings represent finite numbers.
 *
 * - If both `left` and `right` convert to finite numbers (via `Number` and `Number.isFinite`), they are compared numerically.
 * - Otherwise a case-insensitive lexicographic comparison of `left.toLowerCase()` and `right.toLowerCase()` is performed.
 *
 * Returns:
 * - -1 if `left` is less than `right`
 * -  1 if `left` is greater than `right`
 * -  0 if they are considered equal under the applicable comparison mode
 *
 * @param left - The left-hand operand as a string.
 * @param right - The right-hand operand as a string.
 * @returns A number: -1, 0, or 1 indicating comparison result.
 */
const compareValues = (left: string, right: string): number => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const bothNumeric =
    Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
  if (bothNumeric) {
    if (leftNumber < rightNumber) return -1;
    if (leftNumber > rightNumber) return 1;
    return 0;
  }

  const lhs = left.toLowerCase();
  const rhs = right.toLowerCase();
  if (lhs < rhs) return -1;
  if (lhs > rhs) return 1;
  return 0;
};

/**
 * Determines whether a given row satisfies every predicate in the provided list.
 *
 * Each predicate is evaluated by converting the row's column value to a comparable
 * string (via toComparableString) and comparing it to the predicate's value using
 * compareValues. Supported operators:
 * - "="  : equal
 * - "!=" : not equal
 * - ">"  : greater than
 * - "<"  : less than
 * - ">=" : greater than or equal
 * - "<=" : less than or equal
 * - "LIKE": pattern match using a RegExp; uses predicate.likePattern if present,
 *           otherwise compiles one from the predicate value via compileLikePattern
 *
 * Evaluation short-circuits on the first failing predicate and returns false.
 * If all predicates pass (or the predicates array is empty), the function returns true.
 *
 * @param row - The row object whose column values will be tested (indexed by predicate.column).
 * @param predicates - Read-only array of Predicate objects describing the column, operator,
 *                     comparison value, and optional precompiled likePattern for "LIKE" ops.
 * @returns True if the row satisfies all predicates (logical AND), otherwise false.
 *
 * @example
 * ```ts
 * // Returns true if the "name" column matches the LIKE pattern and "age" >= "21"
 * const predicates = [
 *   { column: "name", op: "LIKE", value: "%Smith%" },
 *   { column: "age",  op: ">=",   value: "21" }
 * ];
 * rowMatchesFilters(row, predicates);
 * ```
 */
const rowMatchesFilters = (
  row: Row,
  predicates: ReadonlyArray<Predicate>,
): boolean => {
  for (const predicate of predicates) {
    const rowValue = toComparableString(row[predicate.column]);
    const value = predicate.value;
    const cmp = compareValues(rowValue, value);

    if (predicate.op === "=" && cmp !== 0) return false;
    if (predicate.op === "!=" && cmp === 0) return false;
    if (predicate.op === ">" && cmp <= 0) return false;
    if (predicate.op === "<" && cmp >= 0) return false;
    if (predicate.op === ">=" && cmp < 0) return false;
    if (predicate.op === "<=" && cmp > 0) return false;
    if (
      predicate.op === "LIKE" &&
      !(predicate.likePattern ?? compileLikePattern(value)).test(rowValue)
    )
      return false;
  }

  return true;
};

/**
 * Builds a Row object mapping each header to the value at the same index in the values array.
 *
 * For every header in `headers`, the returned object will have a property with that name.
 * If a corresponding value exists in `values` (same index), that value is assigned; otherwise
 * the property is set to `null`. Any extra values beyond the number of headers are ignored.
 *
 * @param headers - Readonly array of header names to use as keys on the returned Row.
 * @param values - Readonly array of values to map to headers by index.
 * @returns Row - A prototype-less object whose keys are the headers and whose values are the corresponding entries from `values` or `null` when missing.
 */
const buildArrayRow = (
  headers: ReadonlyArray<string>,
  values: ReadonlyArray<unknown>,
): Row =>
  headers.reduce((row: Row, header, idx) => {
    row[header] = idx < values.length ? values[idx] : null;
    return row;
  }, Object.create(null) as Row);

/**
 * Build a Row object by mapping each header name to the corresponding value
 * from the provided record.
 *
 * The returned object is created with Object.create(null) (no prototype) and
 * contains exactly the keys listed in `headers`. For each header the property
 * value is set to `value[header]` unless that entry is nullish, in which case
 * it is set to `null`.
 *
 * @param headers - Readonly array of header names to include as keys on the Row.
 * @param value - Source record from which to read values for each header.
 * @returns A Row whose keys are the given headers and whose values are taken
 *          from `value` or set to `null` when the source entry is nullish.
 */
const buildObjectRow = (
  headers: ReadonlyArray<string>,
  value: Record<string, unknown>,
): Row =>
  headers.reduce((row: Row, header) => {
    row[header] = value[header] ?? null;
    return row;
  }, Object.create(null) as Row);

interface InputStreamSetup {
  input: Readable;
  output: Writable;
  cleanupOutputFile: () => void;
  sigintHandler: () => void;
}

/**
 * Build a Row from a parsed input value according to the detected shape.
 *
 * If the detected shape is "array-of-arrays", the function expects `value` to be an array and
 * delegates to `buildArrayRow` to map array elements to the `sourceHeaders` order. For any other
 * shape it expects `value` to be an object record and delegates to `buildObjectRow` to map keys
 * to the `sourceHeaders`.
 *
 * @param shape - The detected input shape (e.g. "array-of-arrays" or an object-based shape).
 * @param sourceHeaders - Ordered source headers used to align values into the returned Row.
 * @param value - The parsed input value to convert into a Row.
 * @returns The constructed Row aligned to `sourceHeaders`.
 * @throws {StreamCliError} Throws a PARSE_ERROR with ERR_ARRAYS_INCONSISTENT when `shape` is
 * "array-of-arrays" but `value` is not an array.
 * @throws {StreamCliError} Throws a PARSE_ERROR with ERR_OBJECTS_INCONSISTENT when `shape` is
 * not "array-of-arrays" but `value` is not an object record.
 */
const buildRowFromValue = (
  shape: DetectedShape,
  sourceHeaders: ReadonlyArray<string>,
  value: unknown,
): Row => {
  if (shape === "array-of-arrays") {
    if (!Array.isArray(value)) {
      throw new StreamCliError(
        "PARSE_ERROR",
        ERR_ARRAYS_INCONSISTENT,
        EXIT_RUNTIME_ERROR,
      );
    }

    return buildArrayRow(sourceHeaders, value);
  }

  if (!isObjectRecord(value)) {
    throw new StreamCliError(
      "PARSE_ERROR",
      ERR_OBJECTS_INCONSISTENT,
      EXIT_RUNTIME_ERROR,
    );
  }

  return buildObjectRow(sourceHeaders, value);
};

/**
 * Build and return a normalized output row for the streaming CLI.
 *
 * If row numbering is enabled in config (config.hasRowNumbers), this function
 * creates a shallow copy of the input row and injects the provided rowNumber
 * under the header name specified by config.rowNumberHeader. The (possibly
 * augmented) row is then passed to buildObjectRow along with outputHeaders to
 * produce a Row that contains only the requested headers in the expected order.
 *
 * The original row is not mutated.
 *
 * @param row - The source row object to transform.
 * @param outputHeaders - Readonly array of header keys that should appear in the output row.
 * @param config - Stream CLI configuration that may enable row numbering and defines the row number header.
 * @param rowNumber - Numeric row index to inject when row numbering is enabled.
 * @returns A new Row formatted according to outputHeaders, with an optional row number field.
 */
const projectRow = (
  row: Row,
  outputHeaders: ReadonlyArray<string>,
  config: StreamCliConfig,
  rowNumber: number,
): Row => {
  const withRowNumber = config.hasRowNumbers
    ? { ...row, [config.rowNumberHeader]: rowNumber }
    : row;
  return buildObjectRow(outputHeaders, withRowNumber);
};

/**
 * Process a single input value: build a row from the value using the detected shape and source headers,
 * apply predicate filters, project the row to the requested output headers, and emit it to the provided stream.
 *
 * @param value - The raw input value to convert into a row.
 * @param sourceHeaders - Source column headers used when building the row representation.
 * @param outputHeaders - Desired output column headers used when projecting the row.
 * @param shape - Detected shape describing how to interpret the input value as a row.
 * @param predicates - Array of predicate functions used to filter rows; if any predicate fails, the row is skipped.
 * @param config - Streaming CLI configuration that controls projection and emission behavior.
 * @param rowNumber - Index of the current row in the input sequence (used for projection/metadata).
 * @param emitProjectedRow - Callback used to emit or buffer the projected row.
 * @returns A promise that resolves to true if the row passed filtering, or false if it was filtered out.
 *
 * @remarks
 * - The function awaits emission to the stream and may reject if emission or stream I/O fails.
 * - Side effects: writes to the provided stream when a row passes filtering.
 */
const processRowValue = async (
  value: unknown,
  sourceHeaders: ReadonlyArray<string>,
  outputHeaders: ReadonlyArray<string>,
  shape: DetectedShape,
  predicates: ReadonlyArray<Predicate>,
  config: StreamCliConfig,
  rowNumber: number,
  emitProjectedRow: (row: Row) => Promise<void>,
): Promise<boolean> => {
  const row = buildRowFromValue(shape, sourceHeaders, value);
  if (!rowMatchesFilters(row, predicates)) {
    return false;
  }

  const projected = projectRow(row, outputHeaders, config, rowNumber);
  await emitProjectedRow(projected);
  return true;
};

/**
 * Ensures the given output format is one of the supported formats and narrows its type.
 *
 * @param outputFormat - The output format to validate.
 * @throws {StreamCliError} If the provided format is not supported (emits "VALIDATION_ERROR" and ERR_UNSUPPORTED_OUTPUTS).
 * @asserts outputFormat is OutputFormat
 */
const ensureSupported = (
  outputFormat: string,
): OutputFormat => {
  if (!SUPPORTED_OUTPUTS.has(outputFormat as OutputFormat)) {
    throw new StreamCliError(
      "VALIDATION_ERROR",
      ERR_UNSUPPORTED_OUTPUTS,
      EXIT_VALIDATION_ERROR,
    );
  }
  return outputFormat as OutputFormat;
};

const ensureInputSupported = (inputFormat: string): InputFormat => {
  if (!SUPPORTED_INPUTS.has(inputFormat as InputFormat)) {
    throw new StreamCliError(
      "VALIDATION_ERROR",
      ERR_UNSUPPORTED_INPUTS,
      EXIT_VALIDATION_ERROR,
    );
  }
  return inputFormat as InputFormat;
};

/**
 * Normalize a line break value.
 *
 * Returns the provided `lineBreak` when it is a non-empty string; otherwise returns the default `"\n"`.
 *
 * @param lineBreak - The line break string to normalize. If falsy or an empty string, the default `"\n"` is returned.
 * @returns The normalized line break sequence.
 *
 * @example
 * ```ts
 * normalizeLineBreak("\r\n"); // => "\r\n"
 * normalizeLineBreak("");     // => "\n"
 * ```
 */
const normalizeLineBreak = (lineBreak: string): string =>
  lineBreak && lineBreak !== "" ? lineBreak : "\n";

/**
 * Emit a SQL CREATE TABLE statement to the provided writable stream based on the given headers and configuration.
 *
 * The function no-ops if `config.sqlIncludeCreateTable` is falsy. Identifiers (table name and column names)
 * are quoted using `config.sqlIdentifierQuote` via `quoteIdentifier`. Each header becomes a column definition:
 * the first column is typed as `INTEGER` when `config.hasRowNumbers` is true, otherwise every column is typed as `TEXT`.
 * Column definitions are separated by commas and newlines, and the statement is terminated with a semicolon and two newlines.
 *
 * @param stream - Writable stream to which the CREATE TABLE statement will be written.
 * @param headers - Ordered list of column headers to include as table columns.
 * @param config - Configuration controlling inclusion of the CREATE TABLE statement, table name quoting, and column typing.
 *
 * @returns A promise that resolves once the SQL has been written to the stream (or immediately if creation is skipped).
 *
 * @remarks
 * - Uses `quoteIdentifier` with `config.sqlIdentifierQuote` to protect identifiers.
 * - Uses `writeChunk` to perform the actual write to the provided stream.
 */
const emitSqlCreateTable = async (
  stream: Writable,
  headers: ReadonlyArray<string>,
  config: StreamCliConfig,
): Promise<void> => {
  if (!config.sqlIncludeCreateTable) return;

  const quotedHeaders = headers.map((header) =>
    quoteIdentifier(header, config.sqlIdentifierQuote),
  );
  const tableName = quoteIdentifier(
    config.sqlTableName,
    config.sqlIdentifierQuote,
  );
  const defs = quotedHeaders
    .map(
      (header, idx) =>
        `  ${header} ${idx === 0 && config.hasRowNumbers ? "INTEGER" : "TEXT"}`,
    )
    .join(",\n");

  await writeChunk(stream, `CREATE TABLE ${tableName} (\n${defs}\n);\n\n`);
};

/**
 * Emit a single row to a writable stream according to the provided stream CLI configuration.
 *
 * The function formats and writes the row depending on config.outputFormat:
 * - "sql": writes a SQL INSERT statement for config.sqlTableName using quoted identifiers and inline SQL literals.
 * - "html": writes a single HTML table row (<tr>) with each cell rendered via toHtmlCell and wrapped in <td>.
 * - "yaml": emits a YAML list item. If outputHeaders is empty, emits "- {}" followed by config.lineBreak.
 *   Otherwise emits the first header inline after "- " and the remaining headers as indented mappings using
 *   config.yamlIndent (minimum 1). Uses config.yamlQuoteStrings to control string quoting.
 * - default (delimited text): escapes each value via escapeDelimitedValue and joins them with config.delimiter,
 *   terminating the line with config.lineBreak.
 *
 * Side effects:
 * - Writes asynchronously to the provided stream via writeChunk(stream, ...).
 * - Relies on helper functions such as quoteIdentifier, toSqlLiteral, toHtmlCell, toYamlScalar, and escapeDelimitedValue.
 *
 * @param stream - Writable stream to write the formatted row to.
 * @param outputHeaders - Ordered list of headers/column names used to select values from the row and to order emitted fields.
 * @param row - Record mapping header names to cell values for the current row.
 * @param config - Configuration controlling output format and formatting options (e.g. outputFormat, delimiter, quote,
 *                 escape, lineBreak, sqlTableName, sqlIdentifierQuote, yamlIndent, yamlQuoteStrings).
 * @returns A Promise that resolves once the row has been fully written to the stream.
 */
const emitRow = async (
  stream: Writable,
  outputHeaders: ReadonlyArray<string>,
  row: Row,
  config: StreamCliConfig,
): Promise<void> => {
  if (config.outputFormat === "ndjson") {
    const object = outputHeaders.reduce<Record<string, unknown>>((acc, header) => {
      acc[header] = row[header] ?? null;
      return acc;
    }, Object.create(null) as Record<string, unknown>);
    await writeChunk(stream, JSON.stringify(object) + config.lineBreak);
    return;
  }

  if (config.outputFormat === "sql") {
    const tableName = quoteIdentifier(
      config.sqlTableName,
      config.sqlIdentifierQuote,
    );
    const quotedHeaders = outputHeaders.map((header) =>
      quoteIdentifier(header, config.sqlIdentifierQuote),
    );
    const values = outputHeaders
      .map((header) => toSqlLiteral(row[header]))
      .join(", ");

    await writeChunk(
      stream,
      `INSERT INTO ${tableName} (${quotedHeaders.join(", ")}) VALUES (${values});\n`,
    );
    return;
  }

  if (config.outputFormat === "html") {
    const cells = outputHeaders
      .map((header) => `      <td>${toHtmlCell(row[header])}</td>`)
      .join("\n");
    await writeChunk(stream, `    <tr>\n${cells}\n    </tr>\n`);
    return;
  }

  if (config.outputFormat === "yaml") {
    if (outputHeaders.length === 0) {
      await writeChunk(stream, `- {}${config.lineBreak}`);
      return;
    }

    const indent = Math.max(1, config.yamlIndent || 2);
    const padding = " ".repeat(indent);
    const [firstHeader, ...restHeaders] = outputHeaders;
    const firstLine = `- ${firstHeader}: ${toYamlScalar(row[firstHeader], config.yamlQuoteStrings)}`;
    const restLines = restHeaders.map(
      (header) =>
        `${padding}${header}: ${toYamlScalar(row[header], config.yamlQuoteStrings)}`,
    );
    await writeChunk(
      stream,
      [firstLine, ...restLines].join(config.lineBreak) + config.lineBreak,
    );
    return;
  }

  const line = outputHeaders
    .map((header) =>
      escapeDelimitedValue(row[header], {
        delimiter: config.delimiter,
        quote: config.quote,
        escape: config.escape,
        lineBreak: config.lineBreak,
      }),
    )
    .join(config.delimiter);

  await writeChunk(stream, line + config.lineBreak);
};

/**
 * Finalizes a writable output stream when writing to a file.
 *
 * If `isFile` is false the function returns immediately. If `isFile` is true,
 * the function attaches an "error" listener to the provided Writable and calls
 * end() (the stream is cast to a WriteStream) to flush and close the underlying
 * file descriptor. The returned promise resolves when the stream's end callback
 * is invoked and rejects if the stream emits an "error".
 *
 * @param stream - The writable stream to finalize.
 * @param isFile - Whether the stream represents a file (only then it will be ended).
 * @returns A promise that resolves when the stream has finished closing or rejects on stream error.
 */
const finalizeOutput = async (
  stream: Writable,
  isFile: boolean,
): Promise<void> => {
  if (!isFile) return;

  await new Promise<void>((resolve, reject) => {
    stream.on("error", reject);
    (stream as WriteStream).end(() => resolve());
  });
};

const emitHtmlPreamble = async (
  output: Writable,
  outputHeaders: ReadonlyArray<string>,
  config: StreamCliConfig,
): Promise<void> => {
  const tableTag =
    config.htmlId && config.htmlId !== ""
      ? `<table id="${escapeHtml(config.htmlId)}" class="${escapeHtml(config.htmlTableClass || "")}">`
      : config.htmlTableClass && config.htmlTableClass !== ""
        ? `<table class="${escapeHtml(config.htmlTableClass)}">`
        : "<table>";

  const theadTag =
    config.htmlTheadClass && config.htmlTheadClass !== ""
      ? `  <thead class="${escapeHtml(config.htmlTheadClass)}">`
      : "  <thead>";

  const tbodyTag =
    config.htmlTbodyClass && config.htmlTbodyClass !== ""
      ? `  <tbody class="${escapeHtml(config.htmlTbodyClass)}">`
      : "  <tbody>";

  await writeChunk(output, `${tableTag}\n`);
  if (config.htmlCaption && config.htmlCaption !== "") {
    await writeChunk(
      output,
      `  <caption>${escapeHtml(config.htmlCaption)}</caption>\n`,
    );
  }
  await writeChunk(output, `${theadTag}\n`);
  await writeChunk(output, "    <tr>\n");
  for (const header of outputHeaders) {
    await writeChunk(output, `      <th>${escapeHtml(header)}</th>\n`);
  }
  await writeChunk(output, "    </tr>\n");
  await writeChunk(output, "  </thead>\n");
  await writeChunk(output, `${tbodyTag}\n`);
};

const emitDelimitedHeaderLine = async (
  output: Writable,
  outputHeaders: ReadonlyArray<string>,
  config: StreamCliConfig,
  lineBreak: string,
): Promise<void> => {
  const headerLine = outputHeaders
    .map((header) =>
      escapeDelimitedValue(header, {
        delimiter: config.delimiter,
        quote: config.quote,
        escape: config.escape,
        lineBreak,
      }),
    )
    .join(config.delimiter);
  await writeChunk(output, headerLine + lineBreak);
};

const createInputIterable = (
  input: Readable,
  inputFormat: InputFormat,
  parseNdjsonLine: (line: string) => unknown,
): AsyncIterable<unknown> => {
  if (inputFormat === "ndjson") {
    return (async function* ndjsonValues(
      readable: Readable,
    ): AsyncGenerator<StreamArrayItem> {
      const rl = readline.createInterface({
        input: readable,
        crlfDelay: Infinity,
      });
      let index = 0;
      for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed === "") {
          continue;
        }
        yield { key: index, value: parseNdjsonLine(trimmed) };
        index += 1;
      }
    })(input);
  }

  return input.pipe(streamArray.withParserAsStream()) as AsyncIterable<unknown>;
};

const planInitialRow = (
  value: unknown,
  inputFormat: InputFormat,
  hasHeaders: boolean,
  requestedColumns: ReadonlyArray<string>,
): InitialRowPlan => {
  if (inputFormat === "ndjson") {
    if (!isObjectRecord(value)) {
      throw new StreamCliError(
        "PARSE_ERROR",
        ERR_EXPECT_NDJSON_OBJECTS,
        EXIT_RUNTIME_ERROR,
      );
    }

    const baseHeaders = Object.keys(value);
    return {
      shape: "array-of-objects",
      headers: requestedColumns.length > 0 ? [...requestedColumns] : baseHeaders,
      strictValidation: false,
      processFirstValue: true,
    };
  }

  if (Array.isArray(value)) {
    if (hasHeaders) {
      return {
        shape: "array-of-arrays",
        headers: value.map((item) => toComparableString(item)),
        strictValidation: true,
        processFirstValue: false,
      };
    }

    return {
      shape: "array-of-arrays",
      headers:
        requestedColumns.length > 0
          ? [...requestedColumns]
          : value.map((_, idx) => `column${idx + 1}`),
      strictValidation: false,
      processFirstValue: true,
    };
  }

  if (isObjectRecord(value)) {
    const baseHeaders = Object.keys(value);
    return {
      shape: "array-of-objects",
      headers: requestedColumns.length > 0 ? [...requestedColumns] : baseHeaders,
      strictValidation: false,
      processFirstValue: true,
    };
  }

  throw new StreamCliError(
    "PARSE_ERROR",
    ERR_EXPECT_ARRAY_ROWS,
    EXIT_RUNTIME_ERROR,
  );
};

const finalizeSuccessfulRun = async ({
  useSqlBatch,
  flushSqlBatch,
  config,
  output,
  hasOutputPath,
  outputHeaders,
  writtenRows,
  detectedShape,
  sigintHandler,
}: FinalizeRunArgs): Promise<void> => {
  if (useSqlBatch) {
    await flushSqlBatch(true);
  }

  if (config.outputFormat === "html") {
    await writeChunk(output, "  </tbody>\n</table>\n");
  }

  await finalizeOutput(output, hasOutputPath);

  if (config.stats) {
    const columnCount = outputHeaders !== null ? outputHeaders.length : 0;
    const shape = detectedShape ?? "unknown";
    process.stderr.write(
      `[tablyful] rows: ${writtenRows}, columns: ${columnCount}, detected: ${shape}, format: ${config.outputFormat}\n`,
    );
  }

  process.off("SIGINT", sigintHandler);
  process.exit(EXIT_OK);
};

const createInputStream = (config: StreamCliConfig): InputStreamSetup => {
  const hasInputPath = Boolean(config.inputPath);
  const hasOutputPath = Boolean(config.outputPath);

  if (hasInputPath && !fs.existsSync(config.inputPath)) {
    throw new StreamCliError(
      "IO_ERROR",
      ERR_IO_ENOENT(config.inputPath),
      EXIT_RUNTIME_ERROR,
    );
  }

  const input: Readable = hasInputPath
    ? fs.createReadStream(config.inputPath, { encoding: "utf8" })
    : process.stdin;
  const output: Writable = hasOutputPath
    ? fs.createWriteStream(config.outputPath, { encoding: "utf8" })
    : process.stdout;

  const cleanupOutputFile = (): void => {
    if (!hasOutputPath) return;
    try {
      if (output instanceof fs.WriteStream) {
        output.destroy();
      }
    } catch {
      // Best-effort cleanup only.
    }

    try {
      if (fs.existsSync(config.outputPath)) {
        fs.unlinkSync(config.outputPath);
      }
    } catch {
      // Best-effort cleanup only.
    }
  };

  const sigintHandler = (): void => {
    cleanupOutputFile();
    process.exit(EXIT_SIGINT);
  };
  process.on("SIGINT", sigintHandler);

  if (!hasInputPath) {
    process.stdin.setEncoding("utf8");
  }

  return { input, output, cleanupOutputFile, sigintHandler };
};

/**
 * Stream-processes newline- or file-based JSON input and writes a tabular export.
 *
 * Reads JSON input from either a file (config.inputPath) or stdin and writes a tabular
 * representation to either a file (config.outputPath) or stdout. Supported input formats are
 * JSON arrays and NDJSON. For JSON arrays, the function detects the input "shape" from the
 * first array element: array-of-arrays or array-of-objects. NDJSON expects one JSON object per
 * non-empty line and is treated as array-of-objects.
 * accept an explicit header row (config.hasHeaders) or derive headers from objects/array
 * indices. Selected columns (config.columns) are validated when strict header validation is
 * required. Row-level predicates (config.filters) are applied to decide which rows to emit.
 *
 * Supported output formats include delimited text (custom delimiter/quote/escape/lineBreak),
 * HTML (emits table/thead/tbody and optional caption/classes/ids), and SQL (emits a CREATE TABLE).
 * When config.hasRowNumbers is set, a leading row number column is added. Optionally emits a
 * header line for delimited formats (config.includeHeaders).
 *
 * Side effects:
 * - May set stdin encoding when reading from stdin.
 * - Reads/writes files, pipes, and stdout/stderr.
 * - Emits a final stats line to stderr if config.stats is true.
 * - Calls process.exit(0) on successful completion.
 *
 * The function is asynchronous and will fully consume the input stream. It also performs
 * validation (missing requested columns, unexpected JSON shapes, empty input, parse errors)
 * and will throw StreamCliError with appropriate codes on error conditions.
 *
 * @param config - Runtime options controlling input, output, formatting, filtering and validation.
 * @returns A Promise that resolves when processing and finalization are complete.
 * @throws {StreamCliError} For IO errors (e.g., missing input file), parse errors, validation
 *   errors (unknown columns), stream errors (shape not initialized), or empty input.
 */
const run = async (config: StreamCliConfig): Promise<void> => {
  ensureSupported(config.outputFormat);
  const inputFormat = ensureInputSupported(
    (config.inputFormat || "json").toLowerCase(),
  );

  const predicates = (config.filters ?? []).map(parseFilterExpression);
  const requestedColumns = Array.isArray(config.columns)
    ? config.columns.filter((value) => value !== "")
    : [];
  const lineBreak = normalizeLineBreak(config.lineBreak);

  const { input, output, cleanupOutputFile, sigintHandler } =
    createInputStream(config);
  const hasOutputPath = Boolean(config.outputPath);

  let parseNdjsonRowNumber = 0;
  const parseNdjsonLine = (line: string): unknown => {
    parseNdjsonRowNumber += 1;
    try {
      return JSON.parse(line);
    } catch {
      throw new StreamCliError(
        "PARSE_ERROR",
        `Invalid JSON on NDJSON line ${parseNdjsonRowNumber}.`,
        EXIT_RUNTIME_ERROR,
      );
    }
  };

  const jsonStream = createInputIterable(input as Readable, inputFormat, parseNdjsonLine);

  let detectedShape: DetectedShape | null = null;
  let sourceHeaders: string[] | null = null;
  let outputHeaders: string[] | null = null;
  let sawAnyItem = false;
  let writtenRows = 0;
  let initialized = false;
  const configWithLineBreak: StreamCliConfig = { ...config, lineBreak };

  const sqlBatchSize = Math.max(1, config.sqlInsertBatchSize ?? 1);
  const useSqlBatch = config.outputFormat === "sql" && sqlBatchSize > 1;
  const sqlBatch: Row[] = [];

  const initialize = async ({
    headers,
    strictValidation,
  }: InitializeArgs): Promise<void> => {
    let selectedHeaders = headers;
    if (requestedColumns.length > 0) {
      if (strictValidation) {
        const missing = requestedColumns.filter(
          (column) => !headers.includes(column),
        );
        if (missing.length > 0) {
          throw new StreamCliError(
            "VALIDATION_ERROR",
            ERR_UNKNOWN_COLUMNS(missing, headers),
            EXIT_VALIDATION_ERROR,
          );
        }
      }
      selectedHeaders = requestedColumns;
    }

    outputHeaders = config.hasRowNumbers
      ? [config.rowNumberHeader, ...selectedHeaders]
      : selectedHeaders;
    sourceHeaders = headers;

    if (config.outputFormat === "sql") {
      await emitSqlCreateTable(output, outputHeaders, config);
    } else if (config.outputFormat === "html") {
      await emitHtmlPreamble(output, outputHeaders, config);
    } else if (config.includeHeaders) {
      await emitDelimitedHeaderLine(output, outputHeaders, config, lineBreak);
    }

    initialized = true;
  };

  const flushSqlBatch = async (force = false): Promise<void> => {
    if (sqlBatch.length === 0) return;
    if (!force && sqlBatch.length < sqlBatchSize) return;
    if (!outputHeaders) return;
    const oh = outputHeaders;
    const tableName = quoteIdentifier(
      config.sqlTableName,
      config.sqlIdentifierQuote,
    );
    const quotedHeaders = oh.map((h) =>
      quoteIdentifier(h, config.sqlIdentifierQuote),
    );
  const rowLiterals = sqlBatch.map(
    (r) => `(${oh.map((h) => toSqlLiteral(r[h])).join(", ")})`,
  );
  const valuesBody = rowLiterals
    .map((literal, index) => {
      const suffix = index < rowLiterals.length - 1 ? "," : ";";
      return `  ${literal}${suffix}`;
    })
    .join("\n");
  await writeChunk(
    output,
    `INSERT INTO ${tableName} (${quotedHeaders.join(", ")}) VALUES\n${valuesBody}\n`,
  );
  sqlBatch.length = 0;
};

  const processItem = async (value: unknown): Promise<void> => {
    if (detectedShape === null) {
      throw new StreamCliError(
        "STREAM_ERROR",
        ERR_SHAPE_NOT_INIT,
        EXIT_RUNTIME_ERROR,
      );
    }

    if (!sourceHeaders || !outputHeaders) {
      throw new StreamCliError(
        "STREAM_ERROR",
        ERR_HEADERS_NOT_INIT,
        EXIT_RUNTIME_ERROR,
      );
    }
    const sh = sourceHeaders;
    const oh = outputHeaders;
    const wasProcessed = await processRowValue(
      value,
      sh,
      oh,
      detectedShape,
      predicates,
      configWithLineBreak,
      writtenRows + 1,
      async (projected) => {
        if (useSqlBatch) {
          sqlBatch.push(projected);
          if (sqlBatch.length >= sqlBatchSize) {
            await flushSqlBatch();
          }
        } else {
          await emitRow(output, oh, projected, configWithLineBreak);
        }
      },
    );

    if (wasProcessed) {
      writtenRows++;
    }
  };

  try {
    for await (const entry of jsonStream) {
      if (!isStreamArrayItem(entry)) {
        throw new StreamCliError(
          "PARSE_ERROR",
          ERR_UNEXPECTED_TOKEN,
          EXIT_RUNTIME_ERROR,
        );
      }

      const value = entry.value;
      sawAnyItem = true;

      if (!initialized) {
        const initialPlan = planInitialRow(
          value,
          inputFormat,
          config.hasHeaders,
          requestedColumns,
        );
        detectedShape = initialPlan.shape;
        await initialize({
          headers: initialPlan.headers,
          strictValidation: initialPlan.strictValidation,
        });

        if (initialPlan.processFirstValue) {
          await processItem(value);
        }
        continue;
      }

      if (inputFormat === "ndjson" && !isObjectRecord(value)) {
        throw new StreamCliError(
          "PARSE_ERROR",
          ERR_EXPECT_NDJSON_OBJECTS,
          EXIT_RUNTIME_ERROR,
        );
      }

      await processItem(value);
    }

    if (!sawAnyItem) {
      throw new StreamCliError(
        "PARSE_ERROR",
        ERR_EMPTY_INPUT,
        EXIT_RUNTIME_ERROR,
      );
    }

    await finalizeSuccessfulRun({
      useSqlBatch,
      flushSqlBatch,
      config,
      output,
      hasOutputPath,
      outputHeaders,
      writtenRows,
      detectedShape,
      sigintHandler,
    });
  } catch (error) {
    cleanupOutputFile();
    process.off("SIGINT", sigintHandler);
    throw error;
  }
};

const normalizeStreamError = (error: unknown): StreamCliError => {
  if (error instanceof StreamCliError) {
    return error;
  }

  const streamError = error as StreamErrorLike;
  const message = error instanceof Error ? error.message : String(error);
  const errorCode = streamError.code;

  if (errorCode === "ENOENT" || message.includes("ENOENT:")) {
    return new StreamCliError(
      "IO_ERROR",
      message.includes("Failed to read input file:")
        ? message
        : `Failed to read input file: ${message}`,
      EXIT_RUNTIME_ERROR,
    );
  }

  if (errorCode === "EACCES") {
    return new StreamCliError(
      "IO_ERROR",
      `Permission denied: ${message}`,
      EXIT_RUNTIME_ERROR,
    );
  }

  if (
    streamError.name === "SyntaxError" ||
    JSON_PARSE_PATTERNS.some((pattern) => pattern.test(message))
  ) {
    return new StreamCliError(
      "PARSE_ERROR",
      "Invalid JSON format",
      EXIT_RUNTIME_ERROR,
    );
  }

  return new StreamCliError("STREAM_ERROR", message, EXIT_RUNTIME_ERROR);
};

/**
 * Initiates the stream conversion and centralizes error handling for CLI usage.
 *
 * Calls the asynchronous run(config) operation without awaiting it and attaches
 * a rejection handler that:
 * - If the error is a StreamCliError, writes `[<category>] <message>` to stderr and exits
 *   with the error's exitCode.
 * - If the error message contains "ENOENT:", writes `[IO_ERROR] Failed to read input file: <message>`
 *   to stderr and exits with code 1.
 * - If the error appears to be a JSON parse error (e.g. "Parser cannot parse input",
 *   "expected a value", "Top-level object should be an array"), writes
 *   `[PARSE_ERROR] Invalid JSON format` to stderr and exits with code 1.
 * - If the error has code "EACCES", writes `[IO_ERROR] Permission denied: <message>` to stderr
 *   and exits with code 1.
 * - For any other error, writes `[STREAM_ERROR] <message>` to stderr and exits with code 1.
 *
 * Note: This function performs process-wide side effects (writes to stderr and calls
 * process.exit), and therefore is intended for CLI contexts.
 *
 * @param config - Stream CLI configuration used to start the conversion.
 * @returns void - The function does not return a promise; errors are handled by exiting the process.
 */
export function runStreamConversion(config: StreamCliConfig): void {
  void run(config).catch((error: unknown) => {
    const normalized = normalizeStreamError(error);
    process.stderr.write(`[${normalized.category}] ${normalized.message}\n`);
    process.exit(normalized.exitCode);
  });
}
