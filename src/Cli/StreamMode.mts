import fs from "node:fs";
import process from "node:process";
import type { ReadStream, WriteStream } from "node:fs";
import type { Writable } from "node:stream";
import streamArray from "stream-json/streamers/stream-array.js";

type OutputFormat = "csv" | "tsv" | "psv" | "sql" | "html" | "yaml";

type PredicateOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE";

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

const SUPPORTED_OUTPUTS: ReadonlySet<OutputFormat> = new Set<OutputFormat>([
  "csv",
  "tsv",
  "psv",
  "sql",
  "html",
  "yaml",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return isRecord(value) && !Array.isArray(value);
};

const isStreamArrayItem = (value: unknown): value is StreamArrayItem => {
  return isRecord(value) && "value" in value && "key" in value;
};

const writeChunk = (stream: Writable, chunk: string): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.write(chunk, "utf8", error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const toComparableString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const toHtmlCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return escapeHtml(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return escapeHtml(JSON.stringify(value));
};

const escapeYamlSingleQuoted = (value: string): string => value.replaceAll("'", "''");

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

const toYamlString = (value: string, quoteStrings: boolean): string => {
  if (quoteStrings || yamlNeedsQuotes(value)) {
    return `'${escapeYamlSingleQuoted(value)}'`;
  }
  return value;
};

const toYamlScalar = (value: unknown, quoteStrings: boolean): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return toYamlString(value, quoteStrings);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return toYamlString(JSON.stringify(value), true);
};

const escapeDelimitedValue = (
  value: unknown,
  context: { delimiter: string; quote: string; escape: string; lineBreak: string },
): string => {
  const text = toComparableString(value);
  if (text.includes(context.delimiter) || text.includes(context.lineBreak) || text.includes(context.quote)) {
    return `${context.quote}${text.replaceAll(context.quote, `${context.escape}${context.quote}`)}${context.quote}`;
  }
  return text;
};

const quoteIdentifier = (identifier: string, quote: string): string => {
  const actualQuote = quote || "\"";
  if (actualQuote === "[") {
    return `[${identifier.replaceAll("]", "]]")}]`;
  }
  return `${actualQuote}${identifier.replaceAll(actualQuote, `${actualQuote}${actualQuote}`)}${actualQuote}`;
};

const toSqlLiteral = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
};

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

const parseFilterExpression = (expression: string): Predicate => {
  const expr = expression.trim();
  if (!expr) {
    throw new StreamCliError("VALIDATION_ERROR", "Filter expression cannot be empty.", 1);
  }

  const likeMatch = expr.match(/^(.*?)\s+like\s+(.*)$/i);
  if (likeMatch) {
    return {
      column: likeMatch[1].trim(),
      op: "LIKE",
      value: stripQuotes(likeMatch[2]),
    };
  }

  const operators: ReadonlyArray<Exclude<PredicateOp, "LIKE">> = [">=", "<=", "!=", "=", ">", "<"];
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
    `Invalid filter expression: ${expression}. Expected operators: =, !=, >, <, >=, <=, LIKE.`,
    1,
  );
};

const compareValues = (left: string, right: string): number => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);
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

const matchesLike = (value: string, pattern: string): boolean => {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = `^${escaped.replaceAll("%", ".*").replaceAll("_", ".")}$`;
  return new RegExp(source, "i").test(value);
};

const rowMatchesFilters = (row: Row, predicates: ReadonlyArray<Predicate>): boolean => {
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
    if (predicate.op === "LIKE" && !matchesLike(rowValue, value)) return false;
  }

  return true;
};

const buildArrayRow = (headers: ReadonlyArray<string>, values: ReadonlyArray<unknown>): Row => {
  const row: Row = Object.create(null) as Row;
  for (let i = 0; i < headers.length; i += 1) {
    row[headers[i]] = i < values.length ? values[i] : null;
  }
  return row;
};

const buildObjectRow = (headers: ReadonlyArray<string>, value: Record<string, unknown>): Row => {
  const row: Row = Object.create(null) as Row;
  for (const header of headers) {
    row[header] = value[header] ?? null;
  }
  return row;
};

function ensureSupported(outputFormat: string): asserts outputFormat is OutputFormat {
  if (!SUPPORTED_OUTPUTS.has(outputFormat as OutputFormat)) {
    throw new StreamCliError(
      "VALIDATION_ERROR",
      "Automatic streaming currently supports output formats: csv, tsv, psv, sql, html, yaml.",
      2,
    );
  }
}

const normalizeLineBreak = (lineBreak: string): string => (lineBreak && lineBreak !== "" ? lineBreak : "\n");

const emitSqlCreateTable = async (stream: Writable, headers: ReadonlyArray<string>, config: StreamCliConfig): Promise<void> => {
  if (!config.sqlIncludeCreateTable) return;

  const quotedHeaders = headers.map(header => quoteIdentifier(header, config.sqlIdentifierQuote));
  const tableName = quoteIdentifier(config.sqlTableName, config.sqlIdentifierQuote);
  const defs = quotedHeaders
    .map((header, idx) => `  ${header} ${idx === 0 && config.hasRowNumbers ? "INTEGER" : "TEXT"}`)
    .join(",\n");

  await writeChunk(stream, `CREATE TABLE ${tableName} (\n${defs}\n);\n\n`);
};

const emitRow = async (
  stream: Writable,
  outputHeaders: ReadonlyArray<string>,
  row: Row,
  config: StreamCliConfig,
): Promise<void> => {
  if (config.outputFormat === "sql") {
    const tableName = quoteIdentifier(config.sqlTableName, config.sqlIdentifierQuote);
    const quotedHeaders = outputHeaders.map(header => quoteIdentifier(header, config.sqlIdentifierQuote));
    const placeholders = outputHeaders.map(() => "?").join(", ");
    const values = outputHeaders.map(header => toSqlLiteral(row[header])).join(", ");

    await writeChunk(stream, `-- VALUES: (${values})\n`);
    await writeChunk(stream, `INSERT INTO ${tableName} (${quotedHeaders.join(", ")}) VALUES (${placeholders});\n`);
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
    await writeChunk(stream, `- ${firstHeader}: ${toYamlScalar(row[firstHeader], config.yamlQuoteStrings)}${config.lineBreak}`);

    for (const header of restHeaders) {
      await writeChunk(stream, `${padding}${header}: ${toYamlScalar(row[header], config.yamlQuoteStrings)}${config.lineBreak}`);
    }
    return;
  }

  const line = outputHeaders
    .map(header =>
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

const finalizeOutput = async (stream: Writable, isFile: boolean): Promise<void> => {
  if (!isFile) return;

  await new Promise<void>((resolve, reject) => {
    stream.on("error", reject);
    (stream as WriteStream).end(() => resolve());
  });
};

const run = async (config: StreamCliConfig): Promise<void> => {
  ensureSupported(config.outputFormat);

  const predicates = (config.filters ?? []).map(parseFilterExpression);
  const requestedColumns = Array.isArray(config.columns) ? config.columns.filter(value => value !== "") : [];
  const lineBreak = normalizeLineBreak(config.lineBreak);

  const hasInputPath = Boolean(config.inputPath);
  const hasOutputPath = Boolean(config.outputPath);

  if (hasInputPath && !fs.existsSync(config.inputPath)) {
    throw new StreamCliError("IO_ERROR", `Failed to read input file: ENOENT: no such file or directory, open '${config.inputPath}'`, 1);
  }

  const input: ReadStream | NodeJS.ReadStream = hasInputPath
    ? fs.createReadStream(config.inputPath, { encoding: "utf8" })
    : process.stdin;
  const output: WriteStream | NodeJS.WriteStream = hasOutputPath
    ? fs.createWriteStream(config.outputPath, { encoding: "utf8" })
    : process.stdout;

  if (!hasInputPath) {
    process.stdin.setEncoding("utf8");
  }

  const jsonStream = input.pipe(streamArray.withParserAsStream()) as AsyncIterable<unknown>;

  let detectedShape = "";
  let sourceHeaders: string[] | null = null;
  let outputHeaders: string[] | null = null;
  let sawAnyItem = false;
  let writtenRows = 0;
  let initialized = false;

  const initialize = async ({ headers, strictValidation }: InitializeArgs): Promise<void> => {
    let selectedHeaders = headers;
    if (requestedColumns.length > 0) {
      if (strictValidation) {
        const missing = requestedColumns.filter(column => !headers.includes(column));
        if (missing.length > 0) {
          throw new StreamCliError(
            "VALIDATION_ERROR",
            `Unknown column(s) in --columns: ${missing.join(", ")}. Available columns: ${headers.join(", ")}.`,
            1,
          );
        }
      }
      selectedHeaders = requestedColumns;
    }

    outputHeaders = config.hasRowNumbers ? [config.rowNumberHeader, ...selectedHeaders] : selectedHeaders;
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
        await writeChunk(output, `  <caption>${escapeHtml(config.htmlCaption)}</caption>\n`);
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
        .map(header =>
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
      throw new StreamCliError("PARSE_ERROR", "Unexpected streaming token shape.", 1);
    }

    const value = entry.value;
    sawAnyItem = true;

    if (!initialized) {
      if (Array.isArray(value)) {
        detectedShape = "array-of-arrays";

        if (config.hasHeaders) {
          const headers = value.map(item => toComparableString(item));
          await initialize({ headers, strictValidation: true });
          continue;
        }

        const headers = requestedColumns.length > 0 ? requestedColumns : value.map((_, idx) => `column${idx + 1}`);
        await initialize({ headers, strictValidation: false });

        if (!sourceHeaders || !outputHeaders) {
          throw new StreamCliError("STREAM_ERROR", "Streaming headers were not initialized.", 1);
        }

        const row = buildArrayRow(sourceHeaders, value);
        if (!rowMatchesFilters(row, predicates)) {
          continue;
        }

        const projected = buildObjectRow(outputHeaders, {
          ...row,
          [config.rowNumberHeader]: writtenRows + 1,
        });
        if (config.hasRowNumbers) {
          projected[config.rowNumberHeader] = writtenRows + 1;
        }
        await emitRow(output, outputHeaders, projected, {...config, lineBreak});
        writtenRows += 1;
        continue;
      }

      if (isObjectRecord(value)) {
        detectedShape = "array-of-objects";
        const baseHeaders = Object.keys(value);
        const headers = requestedColumns.length > 0 ? requestedColumns : baseHeaders;
        await initialize({ headers, strictValidation: false });

        if (!sourceHeaders || !outputHeaders) {
          throw new StreamCliError("STREAM_ERROR", "Streaming headers were not initialized.", 1);
        }

        const row = buildObjectRow(sourceHeaders, value);
        if (!rowMatchesFilters(row, predicates)) {
          continue;
        }

        const projected = buildObjectRow(outputHeaders, {
          ...row,
          [config.rowNumberHeader]: writtenRows + 1,
        });
        if (config.hasRowNumbers) {
          projected[config.rowNumberHeader] = writtenRows + 1;
        }
        await emitRow(output, outputHeaders, projected, {...config, lineBreak});
        writtenRows += 1;
        continue;
      }

      throw new StreamCliError("PARSE_ERROR", "Stream mode expects a JSON array containing arrays or objects.", 1);
    }

    if (!sourceHeaders || !outputHeaders) {
      throw new StreamCliError("STREAM_ERROR", "Streaming headers were not initialized.", 1);
    }

    if (detectedShape === "array-of-arrays") {
      if (!Array.isArray(value)) {
        throw new StreamCliError("PARSE_ERROR", "Inconsistent JSON array: expected all rows to be arrays in stream mode.", 1);
      }

      const row = buildArrayRow(sourceHeaders, value);
      if (!rowMatchesFilters(row, predicates)) {
        continue;
      }

      const projected = buildObjectRow(outputHeaders, {
        ...row,
        [config.rowNumberHeader]: writtenRows + 1,
      });
      if (config.hasRowNumbers) {
        projected[config.rowNumberHeader] = writtenRows + 1;
      }
      await emitRow(output, outputHeaders, projected, {...config, lineBreak});
      writtenRows += 1;
      continue;
    }

    if (!isObjectRecord(value)) {
      throw new StreamCliError("PARSE_ERROR", "Inconsistent JSON array: expected all rows to be objects in stream mode.", 1);
    }

    const row = buildObjectRow(sourceHeaders, value);
    if (!rowMatchesFilters(row, predicates)) {
      continue;
    }

    const projected = buildObjectRow(outputHeaders, {
      ...row,
      [config.rowNumberHeader]: writtenRows + 1,
    });
    if (config.hasRowNumbers) {
      projected[config.rowNumberHeader] = writtenRows + 1;
    }
    await emitRow(output, outputHeaders, projected, {...config, lineBreak});
    writtenRows += 1;
  }

  if (!sawAnyItem) {
    throw new StreamCliError("PARSE_ERROR", "Input JSON array is empty in streaming mode.", 1);
  }

  if (config.outputFormat === "html") {
    await writeChunk(output, "  </tbody>\n</table>\n");
  }

  await finalizeOutput(output, hasOutputPath);

  if (config.stats) {
    const columnCount = outputHeaders !== null ? (outputHeaders as string[]).length : 0;
    process.stderr.write(
      `[tablyful] rows: ${writtenRows}, columns: ${columnCount}, detected: ${detectedShape}, format: ${config.outputFormat}\n`,
    );
  }

  process.exit(0);
};

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
      process.stderr.write(`[IO_ERROR] Failed to read input file: ${message}\n`);
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
