import type {
  TableData,
  TablyfulOptions,
  CsvFormatterOptions,
} from "@/types";
import { BaseFormatterImpl } from "@/formatters/base";

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

    const csvOptions = this._getCsvOptions(options);
    let lines: string[] = [];

    // Add headers if requested
    if (csvOptions.includeHeaders) {
      const headerLine = this._formatRow(data.headers, csvOptions);
      lines = [...lines, headerLine];
    }

    // Format each data row
    for (const row of data.rows) {
      const values = data.headers.map((header) => row[header]);
      const rowLine = this._formatRow(values, csvOptions);
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
  private _formatRow(
    values: unknown[],
    options: Required<CsvFormatterOptions>
  ): string {
    const formattedValues = values.map((value) => {
      const stringValue = this._sanitizeValue(value);
      return this._formatCsvValue(stringValue, options);
    });

    return formattedValues.join(options.delimiter);
  }

  /**
   * Format a single CSV value with proper quoting and escaping.
   * @param value - The string value to format.
   * @param options - The CSV options.
   * @returns The formatted and escaped CSV value.
   */
  private _formatCsvValue(
    value: string,
    options: Required<CsvFormatterOptions>
  ): string {
    const { delimiter, quote, escape } = options;

    // Check if value needs quoting
    const needsQuoting =
      value.includes(delimiter) ||
      value.includes(quote) ||
      value.includes("\n") ||
      value.includes("\r");

    if (!needsQuoting) {
      return value;
    }

    // Escape quote characters in the value
    const escapedValue = value.replace(
      new RegExp(quote, "g"),
      escape + quote
    );

    // Wrap in quotes
    return `${quote}${escapedValue}${quote}`;
  }

  /**
   * Get CSV-specific options with defaults.
   * @param options - The general formatting options.
   * @returns The CSV options with defaults applied.
   */
  private _getCsvOptions(
    options?: TablyfulOptions
  ): Required<CsvFormatterOptions> {
    const csvOptions = (options?.formatOptions as CsvFormatterOptions) || {};

    return {
      delimiter: csvOptions.delimiter || ",",
      quote: csvOptions.quote || '"',
      escape: csvOptions.escape || '"',
      lineBreak: csvOptions.lineBreak || "\n",
      includeHeaders: csvOptions.includeHeaders !== false, // Default to true
    };
  }

  /**
   * Override escapeString to handle CSV-specific escaping.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    // CSV escaping is handled in _formatCsvValue
    // This method is kept for compatibility with base class
    return value;
  }
}

/**
 * Factory function to create a CSV formatter instance.
 * @returns A new CSV formatter instance.
 */
export const createCsvFormatter = (): CsvFormatter => new CsvFormatter();
