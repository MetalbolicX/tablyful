/**
 * Tablyful - A TypeScript library for formatting semi-structured data
 * in various output formats (CSV, JSON, Markdown, HTML, LaTeX)
 *
 * @packageDocumentation
 */

// Main API
export {
  Tablyful,
  createTablyful,
  toCsv,
  detectParser,
  createParser,
  createFormatter,
  getAllParsers,
  getAvailableFormatters,
  isFormatterAvailable,
  PARSER_TYPES,
  FORMATTER_TYPES,
} from "@/api";

// Type exports
export type {
  InputData,
  TableData,
  TablyfulOptions,
  RowData,
  ColumnDefinition,
  BaseParser,
  BaseFormatter,
  OutputFormat,
  ArrayOfArrays,
  ArrayOfObjects,
  ObjectOfArrays,
  ObjectOfObjects,
  CsvFormatterOptions,
  JsonFormatterOptions,
  MarkdownFormatterOptions,
  HtmlFormatterOptions,
  LatexFormatterOptions,
} from "@/types";
// Parser exports (for advanced usage)
export {
  createArrayParser,
  createObjectParser,
  createObjectOfArraysParser,
  createNestedObjectParser,
} from "@/core/parser";

// Formatter exports (for advanced usage)
export {
  CsvFormatter,
  createCsvFormatter,
  CsvStreamFormatter,
  createCsvStreamFormatter,
} from "@/formatters/csv";

// Base classes (for custom implementations)
export { BaseFormatterImpl } from "@/formatters/base";
export { StreamFormatterImpl } from "@/formatters/base";
