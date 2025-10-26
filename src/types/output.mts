/**
 * Output format type definitions for Tablyful
 */

/**
 * Generic readable stream interface for Node.js streams
 */
export interface ReadableStream {
  read(size?: number): any;
  on(event: string, listener: (...args: any[]) => void): this;
  pipe(destination: any): any;
}

/**
 * Supported output formats
 */
export type OutputFormat = "markdown" | "latex" | "html" | "csv" | "json";

/**
 * Base output result interface
 */
export interface OutputResult {
  format: OutputFormat;
  content: string;
  metadata?: {
    rowCount: number;
    columnCount: number;
    headers: string[];
    hasRowNumbers: boolean;
  };
}

/**
 * Stream-based output result for large datasets
 */
export interface StreamOutputResult {
  format: OutputFormat;
  stream: ReadableStream;
  metadata?: {
    rowCount?: number;
    columnCount: number;
    headers: string[];
    hasRowNumbers: boolean;
  };
}

/**
 * File output result when writing to files
 */
export interface FileOutputResult extends OutputResult {
  filePath: string;
  encoding:
    | "utf8"
    | "ascii"
    | "utf16le"
    | "ucs2"
    | "base64"
    | "latin1"
    | "binary"
    | "hex";
}

/**
 * Union type for all output result types
 */
export type OutputResultType =
  | OutputResult
  | StreamOutputResult
  | FileOutputResult;

/**
 * Markdown table output options
 */
export interface MarkdownOutputOptions {
  align?: "left" | "center" | "right";
  padding?: boolean;
  githubFlavor?: boolean;
}

/**
 * LaTeX table output options
 */
export interface LatexOutputOptions {
  tableEnvironment?: string;
  columnSpec?: string;
  booktabs?: boolean;
  caption?: string;
  label?: string;
}

/**
 * HTML table output options
 */
export interface HtmlOutputOptions {
  tableClass?: string;
  theadClass?: string;
  tbodyClass?: string;
  id?: string;
  caption?: string;
}

/**
 * CSV output options
 */
export interface CsvOutputOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  lineBreak?: string;
  includeHeaders?: boolean;
}

/**
 * JSON output options
 */
export interface JsonOutputOptions {
  pretty?: boolean;
  indentSize?: number;
  asArray?: boolean;
}

/**
 * Format-specific options union
 */
export type FormatOptions =
  | MarkdownOutputOptions
  | LatexOutputOptions
  | HtmlOutputOptions
  | CsvOutputOptions
  | JsonOutputOptions;
