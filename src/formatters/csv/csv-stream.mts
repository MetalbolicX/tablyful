import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  CsvFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl } from "@/formatters/base";

/**
 * Streaming CSV formatter for handling large datasets efficiently.
 * Processes data in batches to minimize memory usage.
 */
export class CsvStreamFormatter extends StreamFormatterImpl {
  public readonly formatName = "csv-stream";
  public readonly fileExtensions = [".csv"];

  /**
   * Format the processed data into CSV format.
   * This is used for non-streaming output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted CSV string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const csvOptions = this._getCsvOptions(options);

    const formattedRows = data.rows.map((row) => {
      const values = data.headers.map((header) => row[header]);
      return this._formatRow(values, csvOptions);
    });

    const headerLines = csvOptions.includeHeaders
      ? [this._formatRow(data.headers, csvOptions)]
      : [];

    const lines = [...headerLines, ...formattedRows];

    return lines.join(csvOptions.lineBreak);
  }

  /**
   * Create a streaming CSV output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns A readable stream of CSV data.
   */
  protected _createFormatStream(
    data: TableData,
    options?: TablyfulOptions
  ): ReadableStream {
    return this._createBaseTransform(data, options);
  }

  /**
   * Format the header section for streaming output.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The formatted CSV header line, or null if headers disabled.
   */
  protected _formatHeader(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const csvOptions = this._getCsvOptions(options);

    if (!csvOptions.includeHeaders) {
      return null;
    }

    const headerLine = this._formatRow(data.headers, csvOptions);
    return headerLine + csvOptions.lineBreak;
  }

  /**
   * Format a batch of rows for streaming output.
   * @param rows - The batch of rows to format.
   * @param data - The complete table data (for context).
   * @param startIndex - The starting row index for this batch.
   * @param options - The formatting options.
   * @returns The formatted batch as CSV lines.
   */
  protected _formatRowBatch(
    rows: RowData[],
    data: TableData,
    startIndex: number,
    options?: TablyfulOptions
  ): string {
    const csvOptions = this._getCsvOptions(options);
    let lines: string[] = [];

    for (const row of rows) {
      const values = data.headers.map((header) => row[header]);
      const rowLine = this._formatRow(values, csvOptions);
      lines = [...lines, rowLine];
    }

    return lines.join(csvOptions.lineBreak) + csvOptions.lineBreak;
  }

  /**
   * Join row values into a CSV line.
   * @param values - The sanitized and escaped values.
   * @param options - The formatting options.
   * @returns The joined CSV row string.
   */
  protected _joinRowValues(
    values: string[],
    options?: TablyfulOptions
  ): string {
    const csvOptions = this._getCsvOptions(options);
    return values.join(csvOptions.delimiter);
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
}

/**
 * Factory function to create a streaming CSV formatter instance.
 * @returns A new streaming CSV formatter instance.
 */
export const createCsvStreamFormatter = (): CsvStreamFormatter =>
  new CsvStreamFormatter();
