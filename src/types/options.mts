/**
 * Configuration options for Tablyful
 */

import type { OutputFormat, FormatOptions } from "./output.mts";

/**
 * Global configuration options
 */
export interface TablyfulOptions {
  // Input options
  headers?: string[];
  hasHeaders?: boolean;
  rowNumberHeader?: string;
  hasRowNumbers?: boolean;

  // Processing options
  batchSize?: number;
  maxMemory?: number;
  encoding?:
    | "utf8"
    | "ascii"
    | "utf16le"
    | "ucs2"
    | "base64"
    | "latin1"
    | "binary"
    | "hex";

  // Output options
  outputFormat?: OutputFormat;
  outputFile?: string;
  formatOptions?: FormatOptions;

  // Stream options
  useStreams?: boolean;
  highWaterMark?: number;
}

/**
 * Parser-specific options
 */
export interface ParserOptions {
  detectHeaders?: boolean;
  headerRowIndex?: number;
  skipEmptyRows?: boolean;
  trimValues?: boolean;
}

/**
 * Stream processing options
 */
export interface StreamOptions {
  batchSize: number;
  highWaterMark: number;
  encoding:
    | "utf8"
    | "ascii"
    | "utf16le"
    | "ucs2"
    | "base64"
    | "latin1"
    | "binary"
    | "hex";
  objectMode?: boolean;
}

/**
 * Default options for different scenarios
 */
export const DEFAULT_OPTIONS: Omit<Required<TablyfulOptions>, "outputFile"> & {
  outputFile: undefined;
} = {
  headers: [],
  hasHeaders: true,
  rowNumberHeader: "#",
  hasRowNumbers: false,
  batchSize: 1000,
  maxMemory: 100 * 1024 * 1024, // 100MB
  encoding: "utf8",
  outputFormat: "markdown",
  outputFile: undefined,
  formatOptions: {},
  useStreams: false,
  highWaterMark: 16384, // 16KB
};

/**
 * Options for quick format functions
 */
export interface QuickFormatOptions
  extends Omit<TablyfulOptions, "outputFormat"> {
  // Inherits all options except outputFormat which is determined by the function
}

/**
 * Validation function for options
 */
export const validateOptions = (
  options: Partial<TablyfulOptions>
): TablyfulOptions => ({
  ...DEFAULT_OPTIONS,
  ...options,
});
