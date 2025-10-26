/**
 * Formatter interface definitions for Tablyful
 */

import type { ReadableStream } from "./output.mts";
import type { TablyfulOptions } from "./options.mts";

/**
 * Column definition for table structure
 */
export interface ColumnDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "unknown";
  nullable: boolean;
  originalName?: string;
}

/**
 * Row data representation
 */
export interface RowData {
  [key: string]: unknown;
  _rowNumber?: number; // Internal row number for processing
}

/**
 * Table data representation for formatters
 */
export interface TableData {
  headers: string[];
  rows: RowData[];
  columns: ColumnDefinition[];
  metadata: {
    rowCount: number;
    columnCount: number;
    hasRowNumbers: boolean;
    originalFormat: string;
  };
}

/**
 * Base formatter interface
 */
export interface BaseFormatter {
  /**
   * Format table data to string
   */
  format(data: TableData, options?: TablyfulOptions): string;

  /**
   * Get the output format name
   */
  readonly formatName: string;

  /**
   * Get supported file extensions
   */
  readonly fileExtensions: string[];
}

/**
 * Stream-based formatter interface for large datasets
 */
export interface StreamFormatter extends BaseFormatter {
  /**
   * Format table data as a readable stream
   */
  formatStream(data: TableData, options?: TablyfulOptions): ReadableStream;

  /**
   * Check if this formatter supports streaming
   */
  readonly supportsStreaming: boolean;
}

/**
 * Formatter that can write directly to files
 */
export interface FileFormatter extends BaseFormatter {
  /**
   * Write formatted data to a file
   */
  writeToFile(
    data: TableData,
    filePath: string,
    options?: TablyfulOptions
  ): Promise<void>;
}

/**
 * Union type for all formatter types
 */
export type Formatter = BaseFormatter | StreamFormatter | FileFormatter;

/**
 * Formatter factory function type
 */
export type FormatterFactory = (options?: TablyfulOptions) => Formatter;

/**
 * Registry of available formatters
 */
export interface FormatterRegistry {
  register(name: string, factory: FormatterFactory): void;
  get(name: string): FormatterFactory | undefined;
  list(): string[];
  has(name: string): boolean;
}

/**
 * Formatter options for specific formats
 */
export interface MarkdownFormatterOptions {
  align?: "left" | "center" | "right";
  padding?: boolean;
  githubFlavor?: boolean;
}

export interface LatexFormatterOptions {
  tableEnvironment?: string;
  columnSpec?: string;
  booktabs?: boolean;
  caption?: string;
  label?: string;
}

export interface HtmlFormatterOptions {
  tableClass?: string;
  theadClass?: string;
  tbodyClass?: string;
  id?: string;
  caption?: string;
}

export interface CsvFormatterOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  lineBreak?: string;
  includeHeaders?: boolean;
}

export interface JsonFormatterOptions {
  pretty?: boolean;
  indentSize?: number;
  asArray?: boolean;
}

/**
 * Format-specific options union
 */
export type SpecificFormatterOptions =
  | MarkdownFormatterOptions
  | LatexFormatterOptions
  | HtmlFormatterOptions
  | CsvFormatterOptions
  | JsonFormatterOptions;

/**
 * Parser interface definitions for Tablyful
 */

import type { InputData } from "./input.mts";

/**
 * Base parser interface
 */
export interface BaseParser {
  /**
   * Parse input data into table format
   */
  parse(data: InputData): TableData;

  /**
   * Check if this parser can handle the given data
   */
  canParse(data: InputData): boolean;

  /**
   * Get parser name
   */
  readonly parserName: string;
}

/**
 * Stream-based parser for large datasets
 */
export interface StreamParser extends BaseParser {
  /**
   * Parse data from a readable stream
   */
  parseStream(stream: ReadableStream): Promise<TableData>;

  /**
   * Check if this parser supports streaming
   */
  readonly supportsStreaming: boolean;
}

/**
 * Parser that can read from files
 */
export interface FileParser extends BaseParser {
  /**
   * Parse data from a file
   */
  parseFile(filePath: string): Promise<TableData>;
}

/**
 * Union type for all parser types
 */
export type Parser = BaseParser | StreamParser | FileParser;

/**
 * Parser factory function type
 */
export type ParserFactory = () => Parser;

/**
 * Parser detection result
 */
export interface ParserDetectionResult {
  parser: Parser;
  confidence: number; // 0-1, higher is better match
}
