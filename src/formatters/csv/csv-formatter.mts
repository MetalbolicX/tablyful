import type {
  TableData,
  TablyfulOptions,
  CsvFormatterOptions,
} from "@/types";
import { BaseFormatterImpl, getCsvOptions, formatCsvValue } from "@/formatters/base";

/**
 * CSV formatter for converting table data to CSV format.
 * Handles proper escaping, quoting, and delimiter configuration.
 */
export class CsvFormatter extends BaseFormatterImpl {
  public readonly formatName = "csv";
  public readonly fileExtensions = [".csv"];

  /**
   * Format the processed data into CSV format.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted CSV string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const csvOptions = getCsvOptions(options);
    let lines: string[] = [];

    // Add headers if requested
    if (csvOptions.includeHeaders) {
      const headerLine = this.#formatRow(data.headers, csvOptions);
      lines = [...lines, headerLine];
    }

    // Format each data row
    for (const row of data.rows) {
      const values = data.headers.map((header) => row[header]);
      const rowLine = this.#formatRow(values, csvOptions);
      lines = [...lines, rowLine];
    }

    return lines.join(csvOptions.lineBreak);
  }

  /**
   * Format a single row of values into a CSV line.
   * @param values - The values to format.
   * @param options - The CSV options.
   * @returns The formatted CSV line.
   */
  #formatRow(
    values: unknown[],
    options: Required<CsvFormatterOptions>
  ): string {
    const formattedValues = values.map((value) => {
      const stringValue = this._sanitizeValue(value);
      return formatCsvValue(stringValue, options.delimiter, options.quote, options.escape);
    });

    return formattedValues.join(options.delimiter);
  }

  /**
   * Override escapeString to handle CSV-specific escaping.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    // CSV escaping is handled in formatCsvValue helper
    // This method is kept for compatibility with base class
    return value;
  }
}

/**
 * Factory function to create a CSV formatter instance.
 * @returns A new CSV formatter instance.
 */
export const createCsvFormatter = (): CsvFormatter => new CsvFormatter();
