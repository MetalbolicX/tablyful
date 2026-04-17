import fs from "node:fs";
import process from "node:process";
import type { WriteStream } from "node:fs";
import type { Writable } from "node:stream";
import streamArray from "stream-json/streamers/stream-array.js";

type OutputFormat = "csv" | "tsv" | "psv" | "sql" | "html" | "yaml";

type PredicateOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE";
type DetectedShape = "array-of-arrays" | "array-of-objects";

type Row = Record<string, unknown>;

interface StreamArrayItem {
  key: number;
  value: unknown;
}

interface StreamCliConfig {
  inputPath: string;
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

interface Predicate {
  column: string;
  op: PredicateOp;
  value: string;
  likePattern?: RegExp;
}

interface InitializeArgs {
  headers: string[];
  strictValidation: boolean;
}

interface StreamErrorLike extends Error {
  code?: string;
}

class StreamCliError extends Error {
  category: string;
  exitCode: number;

  constructor(category: string, message: string, exitCode: number = 1) {
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
  "Automatic streaming currently supports output formats: csv, tsv, psv, sql, html, yaml.";
const ERR_IO_ENOENT = (path: string) =>
  `Failed to read input file: ENOENT: no such file or directory, open '${path}'`;
const ERR_UNKNOWN_COLUMNS = (missing: string[], available: string[]) =>
  `Unknown column(s) in --columns: ${missing.join(", ")}. Available columns: ${available.join(", ")}.`;
const ERR_UNEXPECTED_TOKEN = "Unexpected streaming token shape.";
const ERR_EXPECT_ARRAY_ROWS =
  "Stream mode expects a JSON array containing arrays or objects.";
const ERR_SHAPE_NOT_INIT = "Streaming shape was not initialized.";
const ERR_EMPTY_INPUT = "Input JSON array is empty in streaming mode.";

const SUPPORTED_OUTPUTS: ReadonlySet<OutputFormat> = new Set<OutputFormat>([
  "csv",
  "tsv",
  "psv",
  "sql",
  "html",
  "yaml",
]);

/**
 * Type guard that checks whether a value is a non-null object and can be treated as a Record<string, unknown>.
 *
 * This returns true for objects (including arrays and plain objects) but false for null and primitive values.
 *
 * @param value - The value to test.
 * @returns True if the value is an object and not null, otherwise false.
 *
 * @example
 * ```ts
 * isRecord({ a: 1 }); // true
 * isRecord([1, 2, 3]); // true
 * isRecord(null); // false
 * isRecord(42); // false
 * isRecord("hello"); // false
 * ```
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Type guard that checks whether a value is a non-array object record.
 *
 * Returns true when the provided value is a Record<string, unknown> and is not an Array.
 *
 * @param value - The value to check.
 * @returns True if the value is an object record (non-array), otherwise false.
 */
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && !Array.isArray(value);

/**
 * Type guard that determines whether a value conforms to the StreamArrayItem shape.
 *
 * Verifies that the provided value is an object-like record and contains both
 * the "key" and "value" properties. When this function returns true, the
 * TypeScript compiler will narrow the type of `value` to `StreamArrayItem`.
 *
 * @param value - The value to inspect.
 * @returns True if `value` is a StreamArrayItem (has "key" and "value" properties); otherwise false.
 */
const isStreamArrayItem = (value: unknown): value is StreamArrayItem =>
  isRecord(value) && "value" in value && "key" in value;

/**
 * Writes a string chunk to the provided Writable stream using UTF-8 encoding.
 *
 * Returns a Promise that resolves once the stream's write callback reports success,
 * or rejects with the error provided by the stream's callback if the write fails.
 *
 * @param stream - The Writable stream to which the chunk will be written.
 * @param chunk - The string data to write to the stream.
 * @returns A Promise that resolves when the write completes, or rejects with the underlying error.
 */
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

/**
 * Convert an arbitrary value into a string suitable for comparison.
 *
 * - null or undefined -> "" (empty string)
 * - string -> returned as-is
 * - number or boolean -> converted using String(value)
 * - other types -> converted using JSON.stringify(value)
 *
 * Intended for producing a simple, comparable textual representation for sorting or equality checks.
 *
 * @param value - The value to convert to a comparable string.
 * @returns A string representation of the input suitable for comparison.
 * @throws {TypeError} If JSON.stringify fails (for example, when the value contains circular references).
 */
const toComparableString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
};

/**
 * Escapes HTML special characters in the provided string.
 *
 * Replaces the characters: `&`, `<`, `>`, and `"` with their corresponding
 * HTML entities `&amp;`, `&lt;`, `&gt;`, and `&quot;`.
 *
 * @param value - The input string to escape.
 * @returns The escaped string safe for inclusion in HTML text content or attribute values.
 *
 * @example
 * ```ts
 * escapeHtml('<div class="example">Hello & welcome</div>');
 * // => '&lt;div class=&quot;example&quot;&gt;Hello &amp; welcome&lt;/div&gt;'
 * ```
 */
const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * Convert an arbitrary value to a string suitable for insertion into an HTML cell.
 *
 * - `null` or `undefined` => `""`
 * - `string` => escaped with `escapeHtml` to prevent HTML injection
 * - `number` | `boolean` => converted via `String(value)` (no escaping)
 * - other values (objects, arrays, etc.) => `JSON.stringify(value)` and then escaped with `escapeHtml`
 *
 * @param value - The value to convert to an HTML-safe string.
 * @returns A string representation safe for embedding in HTML cells. Returns an empty string for `null` or `undefined`.
 *
 * @remarks
 * This function relies on `escapeHtml` for escaping raw strings and JSON results to reduce HTML injection risk.
 *
 * @example
 * ```ts
 * toHtmlCell('<script>alert("xss")</script>');
 * // => '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *
 * toHtmlCell({ name: "Alice", age: 30 });
 * // => '{&quot;name&quot;:&quot;Alice&quot;,&quot;age&quot;:30}'
 * ```
 */
const toHtmlCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return escapeHtml(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return escapeHtml(JSON.stringify(value));
};

/**
 * Escapes a string for inclusion in a YAML single-quoted scalar by doubling each single quote.
 *
 * YAML represents a literal single quote inside a single-quoted scalar by using two consecutive
 * single quotes (''). This function replaces every occurrence of "'" with "''".
 *
 * @param value - The input string to escape.
 * @returns The escaped string safe for use inside a YAML single-quoted scalar.
 */
const escapeYamlSingleQuoted = (value: string): string =>
  value.replaceAll("'", "''");

/**
 * Determines whether a string should be quoted when emitted as a YAML scalar.
 *
 * Returns true if the value is an empty string, contains characters that YAML
 * treats specially (':' or '#'), contains newline or tab characters, or has
 * leading or trailing whitespace (i.e. value.trim() !== value). This is a
 * heuristic check and does not perform full YAML validation.
 *
 * @param value - The string to evaluate.
 * @returns True if the string should be quoted to be safely represented in YAML.
 */
const yamlNeedsQuotes = (value: string): boolean => {
  return (
    value === "" ||
    value.includes(":") ||
    value.includes("#") ||
    value.includes("\n") ||
    value.includes("\t") ||
    value.trim() !== value
  );
};

/**
 * Convert a string into a YAML-safe representation.
 *
 * If `quoteStrings` is true or `yamlNeedsQuotes(value)` returns true, the value
 * will be wrapped in single quotes and any internal single quotes will be
 * escaped using `escapeYamlSingleQuoted`. Otherwise the original `value` is
 * returned unchanged.
 *
 * @param value - The input string to format for YAML.
 * @param quoteStrings - Force quoting even if not strictly required.
 * @returns The YAML-safe string, possibly single-quoted and escaped.
 */
const toYamlString = (value: string, quoteStrings: boolean): string => {
  if (quoteStrings || yamlNeedsQuotes(value)) {
    return `'${escapeYamlSingleQuoted(value)}'`;
  }
  return value;
};

/**
 * Convert a value into a YAML-compatible scalar string.
 *
 * Behavior:
 * - `null` or `undefined` => `"null"`
 * - `string` => delegated to `toYamlString(value, quoteStrings)`
 * - `number` or `boolean` => `String(value)`
 * - other types (objects, arrays, symbols, functions, etc.) => `JSON.stringify(value)` then passed through `toYamlString(..., true)` to ensure quoting
 *
 * @param value - The value to convert to a YAML scalar.
 * @param quoteStrings - Whether to quote string values (passed to `toYamlString`). Ignored for non-string inputs.
 * @returns A YAML-safe scalar representation of the input as a string.
 *
 * @example
 * ```ts
 * toYamlScalar(null, false); // "null"
 * toYamlScalar("hello", true); // e.g. "\"hello\"" (depending on toYamlString implementation)
 * toYamlScalar(123, false); // "123"
 * ```
 *
 * @remarks
 * This function relies on an external `toYamlString` helper to handle proper string quoting/escaping.
 */
const toYamlScalar = (value: unknown, quoteStrings: boolean): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return toYamlString(value, quoteStrings);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return toYamlString(JSON.stringify(value), true);
};

/**
 * Escapes and optionally quotes a value for inclusion in a delimited text field (e.g., CSV).
 *
 * The value is first converted to a comparable string (via `toComparableString`). If the resulting
 * text contains the configured `delimiter`, `lineBreak`, or `quote` character, the text is wrapped
 * with the `quote` and any occurrences of the `quote` character inside the text are escaped by
 * prefixing them with the configured `escape` string.
 *
 * @param value - The value to convert and escape.
 * @param options - Configuration for delimiting and escaping.
 * @param options.delimiter - Field delimiter (for example: ",").
 * @param options.quote - Quote character used to wrap fields (for example: `"`).
 * @param options.escape - String used to escape quote characters inside a field.
 * @param options.lineBreak - Line break sequence to consider (for example: "\n" or "\r\n").
 * @returns The resulting string, escaped and quoted if necessary, ready for delimited output.
 */
const escapeDelimitedValue = (
  value: unknown,
  { delimiter, quote, escape, lineBreak }: { delimiter: string; quote: string; escape: string; lineBreak: string },
): string => {
  const text = toComparableString(value);
  if (
    text.includes(delimiter) ||
    text.includes(lineBreak) ||
    text.includes(quote)
  ) {
    return `${quote}${text.replaceAll(quote, `${escape}${quote}`)}${quote}`;
  }
  return text;
};

/**
 * Quote an identifier using the specified quote character, escaping any occurrences of the quote inside the identifier.
 *
 * - If `quote` is falsy, a double quote (") is used.
 * - If `quote` is `"["`, bracket-style quoting is applied: `]` characters inside the identifier are escaped by doubling them (`]]`) and the result is wrapped with `[` and `]`.
 * - Otherwise, occurrences of the provided quote character inside the identifier are escaped by duplicating the quote, and the identifier is wrapped with the quote character.
 *
 * @param identifier - The identifier to be quoted.
 * @param quote - The quote character to use. Use `[` for bracket-style quoting. Defaults to `"`.
 * @returns The quoted and properly escaped identifier.
 *
 * @example
 * ```ts
 * quoteIdentifier('columnName', '"'); // => '"columnName"'
 * quoteIdentifier('column"Name', '"'); // => '"column""Name"'
 * quoteIdentifier('column]Name', '['); // => '[column]]Name]'
 * quoteIdentifier('simpleColumn', ''); // => '"simpleColumn"'
 * ```
 */
const quoteIdentifier = (identifier: string, quote: string): string => {
  const actualQuote = quote || '"';
  if (actualQuote === "[") {
    return `[${identifier.replaceAll("]", "]]")}]`;
  }
  return `${actualQuote}${identifier.replaceAll(actualQuote, `${actualQuote}${actualQuote}`)}${actualQuote}`;
};

/**
 * Convert a JavaScript value into a SQL literal string suitable for embedding in a SQL statement.
 *
 * - null or undefined -> `NULL` (unquoted)
 * - string -> returned wrapped in single quotes, internal single quotes doubled
 * - number -> returned as-is (no quotes)
 * - boolean -> `TRUE` or `FALSE`
 * - other values -> `JSON.stringify(value)` wrapped in single quotes, internal single quotes doubled
 *
 * Notes:
 * - Top-level non-serializable values (e.g. functions, symbols) become the string `"undefined"` via `JSON.stringify` and will be quoted.
 * - This function produces literal SQL values only and does not perform parameterization or protect against SQL injection. Prefer prepared statements or parameterized queries for untrusted input.
 *
 * @param value - The value to convert to a SQL literal.
 * @returns A string representing the SQL literal for the given value.
 */
const toSqlLiteral = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
};

/**
 * Trims whitespace from the input and removes matching surrounding single or double quotes.
 *
 * The function first trims leading and trailing whitespace. If the trimmed string has fewer
 * than two characters, it is returned unchanged. If the first and last characters are both
 * single quotes (') or both double quotes ("), those surrounding quotes are removed and
 * the inner substring is returned. Otherwise, the trimmed string is returned as-is.
 *
 * @param value - The string to trim and strip surrounding quotes from.
 * @returns The trimmed string with surrounding matching quotes removed, if present.
 *
 * @example
 * ```ts
 * stripQuotes('  "hello world"  '); // => 'hello world'
 * stripQuotes("  'hello world'  "); // => 'hello world'
 * stripQuotes("  'mismatched\"  "); // => '\'mismatched"'
 * ```
 */
const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed.at(0);
  const last = trimmed.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

/**
 * Compiles a SQL-like pattern into a JavaScript RegExp.
 *
 * Treats all characters in the input as literals except:
 * - '%' is translated to '.*' (match any sequence of characters)
 * - '_' is translated to '.'  (match any single character)
 *
 * All RegExp metacharacters in the pattern are escaped before translation.
 * The resulting regular expression is anchored with ^ and $ and created
 * with the case-insensitive flag.
 *
 * @param pattern - The SQL-like pattern using '%' and '_' wildcards.
 * @returns A RegExp that matches the entire input string according to the supplied pattern (case-insensitive).
 *
 * @example
 * ```ts
 * compileLikePattern("foo%bar").test("FoobazBAR"); // true
 * compileLikePattern("data_").test("data1"); // true
 * ```
 *
 * @remarks
 * Passing an empty string produces a RegExp that only matches the empty input (/^$/i).
 */
const compileLikePattern = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = `^${escaped.replaceAll("%", ".*").replaceAll("_", ".")}$`;
  return new RegExp(source, "i");
};

/**
 * Parse a single filter expression string into a Predicate object.
 *
 * Supported forms:
 * - "<column> like <value>" (case-insensitive keyword "like")
 *   - value quotes are stripped; a compiled likePattern is returned in the predicate
 * - "<column><op><value>" where op is one of: >=, <=, !=, =, >, <
 *   - the first operator from that list that appears (with a non-empty LHS) is used
 *   - value quotes are stripped
 *
 * Behavior notes:
 * - Leading/trailing whitespace is ignored.
 * - Quotes around values are removed via stripQuotes before being stored in the Predicate.
 * - For "like" expressions, compileLikePattern(parsedValue) is used to populate likePattern.
 * - A column name must be non-empty and a value must be non-empty for a successful parse.
 *
 * @param expression - The filter expression to parse (e.g. `age >= 30`, `name like "Jo%"`).
 * @returns A Predicate describing the parsed filter. For LIKE expressions the returned object
 *          includes a `likePattern` property in addition to `column`, `op`, and `value`.
 *
 * @throws {StreamCliError} Throws a StreamCliError with code "VALIDATION_ERROR" and:
 *   - ERR_FILTER_EMPTY when the provided expression is empty or only whitespace.
 *   - ERR_INVALID_FILTER(expression) when the expression cannot be parsed into a supported form.
 */
const parseFilterExpression = (expression: string): Predicate => {
  const expr = expression.trim();
  if (!expr) {
    throw new StreamCliError("VALIDATION_ERROR", ERR_FILTER_EMPTY, 1);
  }

  const likeMatch = expr.match(/^(.*?)\s+like\s+(.*)$/i);
  if (likeMatch) {
    const parsedValue = stripQuotes(likeMatch[2]);
    return {
      column: likeMatch[1].trim(),
      op: "LIKE",
      value: parsedValue,
      likePattern: compileLikePattern(parsedValue),
    };
  }

  const operators: ReadonlyArray<Exclude<PredicateOp, "LIKE">> = [
    ">=",
    "<=",
    "!=",
    "=",
    ">",
    "<",
  ];
  for (const op of operators) {
    const idx = expr.indexOf(op);
    if (idx > 0) {
      const column = expr.slice(0, idx).trim();
      const value = stripQuotes(expr.slice(idx + op.length));
      if (column && value) {
        return { column, op, value };
      }
    }
  }

  throw new StreamCliError(
    "VALIDATION_ERROR",
    ERR_INVALID_FILTER(expression),
    1,
  );
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

/**
 * Validates that both header arrays are initialized and returns them as non-null arrays.
 *
 * @param sourceHeaders - The source headers array, or `null` if not initialized.
 * @param outputHeaders - The output headers array, or `null` if not initialized.
 * @returns An object containing `sourceHeaders` and `outputHeaders` guaranteed to be non-null `string[]`.
 * @throws {StreamCliError} If either `sourceHeaders` or `outputHeaders` is `null`. The error is raised with code "STREAM_ERROR" and message `ERR_HEADERS_NOT_INIT`.
 */
const ensureInitializedHeaders = (
  sourceHeaders: string[] | null,
  outputHeaders: string[] | null,
): { sourceHeaders: string[]; outputHeaders: string[] } => {
  if (!sourceHeaders || !outputHeaders) {
    throw new StreamCliError("STREAM_ERROR", ERR_HEADERS_NOT_INIT, 1);
  }

  return { sourceHeaders, outputHeaders };
};

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
      throw new StreamCliError("PARSE_ERROR", ERR_ARRAYS_INCONSISTENT, 1);
    }

    return buildArrayRow(sourceHeaders, value);
  }

  if (!isObjectRecord(value)) {
    throw new StreamCliError("PARSE_ERROR", ERR_OBJECTS_INCONSISTENT, 1);
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
 * @param stream - Writable stream to which the emitted row will be written.
 * @param value - The raw input value to convert into a row.
 * @param sourceHeaders - Source column headers used when building the row representation.
 * @param outputHeaders - Desired output column headers used when projecting the row.
 * @param shape - Detected shape describing how to interpret the input value as a row.
 * @param predicates - Array of predicate functions used to filter rows; if any predicate fails, the row is skipped.
 * @param config - Streaming CLI configuration that controls projection and emission behavior.
 * @param rowNumber - Index of the current row in the input sequence (used for projection/metadata).
 * @returns A promise that resolves to true if the row was emitted, or false if it was filtered out.
 *
 * @remarks
 * - The function awaits emission to the stream and may reject if emission or stream I/O fails.
 * - Side effects: writes to the provided stream when a row passes filtering.
 */
const processRowValue = async (
  stream: Writable,
  value: unknown,
  sourceHeaders: ReadonlyArray<string>,
  outputHeaders: ReadonlyArray<string>,
  shape: DetectedShape,
  predicates: ReadonlyArray<Predicate>,
  config: StreamCliConfig,
  rowNumber: number,
): Promise<boolean> => {
  const row = buildRowFromValue(shape, sourceHeaders, value);
  if (!rowMatchesFilters(row, predicates)) {
    return false;
  }

  const projected = projectRow(row, outputHeaders, config, rowNumber);
  await emitRow(stream, outputHeaders, projected, config);
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
    throw new StreamCliError("VALIDATION_ERROR", ERR_UNSUPPORTED_OUTPUTS, 2);
  }
  return outputFormat as OutputFormat;
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
 * - "sql": writes a SQL INSERT statement for config.sqlTableName using quoted identifiers and "?" placeholders,
 *   and emits a preceding comment containing the concrete VALUES rendered via toSqlLiteral.
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
  if (config.outputFormat === "sql") {
    const tableName = quoteIdentifier(
      config.sqlTableName,
      config.sqlIdentifierQuote,
    );
    const quotedHeaders = outputHeaders.map((header) =>
      quoteIdentifier(header, config.sqlIdentifierQuote),
    );
    const placeholders = outputHeaders.map(() => "?").join(", ");
    const values = outputHeaders
      .map((header) => toSqlLiteral(row[header]))
      .join(", ");

    await writeChunk(stream, `-- VALUES: (${values})\n`);
    await writeChunk(
      stream,
      `INSERT INTO ${tableName} (${quotedHeaders.join(", ")}) VALUES (${placeholders});\n`,
    );
    return;
  }

  if (config.outputFormat === "html") {
    await writeChunk(stream, "    <tr>\n");
    for (const header of outputHeaders) {
      await writeChunk(stream, `      <td>${toHtmlCell(row[header])}</td>\n`);
    }
    await writeChunk(stream, "    </tr>\n");
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
    await writeChunk(
      stream,
      `- ${firstHeader}: ${toYamlScalar(row[firstHeader], config.yamlQuoteStrings)}${config.lineBreak}`,
    );

    for (const header of restHeaders) {
      await writeChunk(
        stream,
        `${padding}${header}: ${toYamlScalar(row[header], config.yamlQuoteStrings)}${config.lineBreak}`,
      );
    }
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

/**
 * Stream-processes newline- or file-based JSON input and writes a tabular export.
 *
 * Reads a JSON array from either a file (config.inputPath) or stdin and writes a tabular
 * representation to either a file (config.outputPath) or stdout. The function detects the
 * input "shape" from the first array element: array-of-arrays or array-of-objects. It can
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

  const predicates = (config.filters ?? []).map(parseFilterExpression);
  const requestedColumns = Array.isArray(config.columns)
    ? config.columns.filter((value) => value !== "")
    : [];
  const lineBreak = normalizeLineBreak(config.lineBreak);

  const hasInputPath = Boolean(config.inputPath);
  const hasOutputPath = Boolean(config.outputPath);

  if (hasInputPath && !fs.existsSync(config.inputPath)) {
    throw new StreamCliError("IO_ERROR", ERR_IO_ENOENT(config.inputPath), 1);
  }

  const input = hasInputPath
    ? fs.createReadStream(config.inputPath, { encoding: "utf8" })
    : process.stdin;
  const output = hasOutputPath
    ? fs.createWriteStream(config.outputPath, { encoding: "utf8" })
    : process.stdout;

  if (!hasInputPath) {
    process.stdin.setEncoding("utf8");
  }

  const jsonStream = input.pipe(
    streamArray.withParserAsStream(),
  ) as AsyncIterable<unknown>;

  let detectedShape: DetectedShape | "" = "";
  let sourceHeaders: string[] | null = null;
  let outputHeaders: string[] | null = null;
  let sawAnyItem = false;
  let writtenRows = 0;
  let initialized = false;
  const configWithLineBreak: StreamCliConfig = { ...config, lineBreak };

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
            1,
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
    } else if (config.includeHeaders) {
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
    }

    initialized = true;
  };

  for await (const entry of jsonStream) {
    if (!isStreamArrayItem(entry)) {
      throw new StreamCliError("PARSE_ERROR", ERR_UNEXPECTED_TOKEN, 1);
    }

    const value = entry.value;
    sawAnyItem = true;

    if (!initialized) {
      if (Array.isArray(value)) {
        const shape: DetectedShape = "array-of-arrays";
        detectedShape = shape;

        if (config.hasHeaders) {
          const headers = value.map((item) => toComparableString(item));
          await initialize({ headers, strictValidation: true });
          continue;
        }

        const headers =
          requestedColumns.length > 0
            ? requestedColumns
            : value.map((_, idx) => `column${idx + 1}`);
        await initialize({ headers, strictValidation: false });

        const initializedHeaders = ensureInitializedHeaders(
          sourceHeaders,
          outputHeaders,
        );
        const wroteRow = await processRowValue(
          output,
          value,
          initializedHeaders.sourceHeaders,
          initializedHeaders.outputHeaders,
          shape,
          predicates,
          configWithLineBreak,
          writtenRows + 1,
        );
        if (wroteRow) {
          writtenRows += 1;
        }
        continue;
      }

      if (isObjectRecord(value)) {
        const shape: DetectedShape = "array-of-objects";
        detectedShape = shape;
        const baseHeaders = Object.keys(value);
        const headers =
          requestedColumns.length > 0 ? requestedColumns : baseHeaders;
        await initialize({ headers, strictValidation: false });

        const initializedHeaders = ensureInitializedHeaders(
          sourceHeaders,
          outputHeaders,
        );
        const wroteRow = await processRowValue(
          output,
          value,
          initializedHeaders.sourceHeaders,
          initializedHeaders.outputHeaders,
          shape,
          predicates,
          configWithLineBreak,
          writtenRows + 1,
        );
        if (wroteRow) {
          writtenRows += 1;
        }
        continue;
      }

      throw new StreamCliError("PARSE_ERROR", ERR_EXPECT_ARRAY_ROWS, 1);
    }

    if (detectedShape === "") {
      throw new StreamCliError("STREAM_ERROR", ERR_SHAPE_NOT_INIT, 1);
    }

    const initializedHeaders = ensureInitializedHeaders(
      sourceHeaders,
      outputHeaders,
    );
    const wroteRow = await processRowValue(
      output,
      value,
      initializedHeaders.sourceHeaders,
      initializedHeaders.outputHeaders,
      detectedShape,
      predicates,
      configWithLineBreak,
      writtenRows + 1,
    );
    if (wroteRow) {
      writtenRows += 1;
    }
  }

  if (!sawAnyItem) {
    throw new StreamCliError("PARSE_ERROR", ERR_EMPTY_INPUT, 1);
  }

  if (config.outputFormat === "html") {
    await writeChunk(output, "  </tbody>\n</table>\n");
  }

  await finalizeOutput(output, hasOutputPath);

  if (config.stats) {
    const columnCount =
      outputHeaders !== null ? (outputHeaders as string[]).length : 0;
    process.stderr.write(
      `[tablyful] rows: ${writtenRows}, columns: ${columnCount}, detected: ${detectedShape}, format: ${config.outputFormat}\n`,
    );
  }

  process.exit(0);
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
    if (error instanceof StreamCliError) {
      process.stderr.write(`[${error.category}] ${error.message}\n`);
      process.exit(error.exitCode);
      return;
    }

    const streamError = error as StreamErrorLike;
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("ENOENT:")) {
      process.stderr.write(
        `[IO_ERROR] Failed to read input file: ${message}\n`,
      );
      process.exit(1);
      return;
    }

    if (
      message.includes("Parser cannot parse input") ||
      message.includes("expected a value") ||
      message.includes("Top-level object should be an array")
    ) {
      process.stderr.write("[PARSE_ERROR] Invalid JSON format\n");
      process.exit(1);
      return;
    }

    if (streamError.code === "EACCES") {
      process.stderr.write(`[IO_ERROR] Permission denied: ${message}\n`);
      process.exit(1);
      return;
    }

    process.stderr.write(`[STREAM_ERROR] ${message}\n`);
    process.exit(1);
  });
}
