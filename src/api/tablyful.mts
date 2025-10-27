/**
 * Main Tablyful API class
 */

import type {
  InputData,
  TableData,
  TablyfulOptions,
  BaseParser,
  BaseFormatter,
  OutputFormat,
} from "@/types";
import { validateOptions } from "@/types";
import {
  detectParser,
  createFormatter,
  isFormatterAvailable,
  FORMATTER_TYPES,
} from "./factory.mts";

/**
 * Main Tablyful class for converting data to various table formats
 */
export class Tablyful {
  #options: TablyfulOptions;

  /**
   * Create a new Tablyful instance
   * @param options - Configuration options
   */
  constructor(options?: Partial<TablyfulOptions>) {
    this.#options = validateOptions(options || {});
  }

  /**
   * Convert input data to the specified format
   * @param data - The input data to convert
   * @param format - The output format (optional, uses options.outputFormat if not provided)
   * @param formatOptions - Additional options for this conversion
   * @returns The formatted output string
   */
  public convert(
    data: InputData,
    format?: OutputFormat,
    formatOptions?: Partial<TablyfulOptions>
  ): string {
    // Merge options
    const options = this.#mergeOptions(formatOptions);
    const outputFormat = format || options.outputFormat || "csv";

    // Parse the input data
    const tableData = this.#parseData(data, options);

    // Format the output
    return this.#formatData(tableData, outputFormat, options);
  }

  /**
   * Parse input data into table format
   * @param data - The input data to parse
   * @param options - Parsing options
   * @returns The parsed table data
   */
  public parse(
    data: InputData,
    options?: Partial<TablyfulOptions>
  ): TableData {
    const mergedOptions = this.#mergeOptions(options);
    return this.#parseData(data, mergedOptions);
  }

  /**
   * Format table data to string
   * @param tableData - The table data to format
   * @param format - The output format
   * @param options - Formatting options
   * @returns The formatted output string
   */
  public format(
    tableData: TableData,
    format: OutputFormat,
    options?: Partial<TablyfulOptions>
  ): string {
    const mergedOptions = this.#mergeOptions(options);
    return this.#formatData(tableData, format, mergedOptions);
  }

  /**
   * Convert input data to CSV format
   * @param data - The input data
   * @param options - Optional formatting options
   * @returns CSV formatted string
   */
  public toCsv(data: InputData, options?: Partial<TablyfulOptions>): string {
    return this.convert(data, "csv", options);
  }

  /**
   * Convert input data to JSON format
   * @param data - The input data
   * @param options - Optional formatting options
   * @returns JSON formatted string
   */
  public toJson(data: InputData, options?: Partial<TablyfulOptions>): string {
    return this.convert(data, "json", options);
  }

  /**
   * Update the default options
   * @param options - The options to update
   */
  public setOptions(options: Partial<TablyfulOptions>): void {
    this.#options = validateOptions({ ...this.#options, ...options });
  }

  /**
   * Get the current options
   * @returns The current options
   */
  public getOptions(): TablyfulOptions {
    return { ...this.#options };
  }

  /**
   * Parse input data using the appropriate parser
   * @param data - The input data
   * @param options - Parsing options
   * @returns The parsed table data
   * @private
   */
  #parseData(data: InputData, options: TablyfulOptions): TableData {
    const parser = this.#getParser(data);

    if (!parser) {
      throw new Error(
        "No suitable parser found for the provided data format. " +
          "Supported formats: arrays of arrays, arrays of objects, " +
          "objects of arrays, and objects of objects."
      );
    }

    // Cast to any to access the parse method with options parameter
    // The actual implementation accepts options as a second parameter
    return (parser as any).parse(data, options);
  }

  /**
   * Format table data using the appropriate formatter
   * @param tableData - The table data
   * @param format - The output format
   * @param options - Formatting options
   * @returns The formatted string
   * @private
   */
  #formatData(
    tableData: TableData,
    format: OutputFormat,
    options: TablyfulOptions
  ): string {
    const formatter = this.#getFormatter(format);

    if (!formatter) {
      const available = this.#getAvailableFormats();
      throw new Error(
        `Formatter "${format}" is not available. ` +
          `Available formats: ${available.join(", ")}`
      );
    }

    return formatter.format(tableData, options);
  }

  /**
   * Get the appropriate parser for the input data
   * @param data - The input data
   * @returns The parser instance
   * @private
   */
  #getParser(data: InputData): BaseParser | null {
    return detectParser(data);
  }

  /**
   * Get the appropriate formatter for the output format
   * @param format - The output format
   * @returns The formatter instance
   * @private
   */
  #getFormatter(format: OutputFormat): BaseFormatter | null {
    return createFormatter(format);
  }

  /**
   * Get available output formats
   * @returns Array of available format names
   * @private
   */
  #getAvailableFormats(): string[] {
    return Object.values(FORMATTER_TYPES).filter(isFormatterAvailable);
  }

  /**
   * Merge options with instance defaults
   * @param options - The options to merge
   * @returns The merged options
   * @private
   */
  #mergeOptions(
    options?: Partial<TablyfulOptions>
  ): TablyfulOptions {
    if (!options) {
      return this.#options;
    }

    return validateOptions({ ...this.#options, ...options });
  }
}

/**
 * Create a new Tablyful instance
 * @param options - Configuration options
 * @returns A new Tablyful instance
 */
export const createTablyful = (
  options?: Partial<TablyfulOptions>
): Tablyful => {
  return new Tablyful(options);
};

/**
 * Quick function to convert data to CSV
 * @param data - The input data
 * @param options - Optional formatting options
 * @returns CSV formatted string
 */
export const toCsv = (
  data: InputData,
  options?: Partial<TablyfulOptions>
): string => {
  const tablyful = new Tablyful(options);
  return tablyful.toCsv(data);
};

/**
 * Quick function to convert data to JSON
 * @param data - The input data
 * @param options - Optional formatting options
 * @returns JSON formatted string
 */
export const toJson = (
  data: InputData,
  options?: Partial<TablyfulOptions>
): string => {
  const tablyful = new Tablyful(options);
  return tablyful.toJson(data);
};
