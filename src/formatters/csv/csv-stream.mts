import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  CsvFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl, getCsvOptions, formatCsvValue } from "@/formatters/base";

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

    const csvOptions = getCsvOptions(options);

    const formattedRows = data.rows.map((row) => {
      const values = data.headers.map((header) => row[header]);
      return this.#formatRow(values, csvOptions);
    });

    const headerLines = csvOptions.includeHeaders
      ? [this.#formatRow(data.headers, csvOptions)]
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
    const csvOptions = getCsvOptions(options);

    if (!csvOptions.includeHeaders) {
      return null;
    }

    const headerLine = this.#formatRow(data.headers, csvOptions);
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
    const csvOptions = getCsvOptions(options);
    let lines: string[] = [];

    for (const row of rows) {
      const values = data.headers.map((header) => row[header]);
      const rowLine = this.#formatRow(values, csvOptions);
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
    const csvOptions = getCsvOptions(options);
    return values.join(csvOptions.delimiter);
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
}

/**
 * Factory function to create a streaming CSV formatter instance.
 * @returns A new streaming CSV formatter instance.
 */
export const createCsvStreamFormatter = (): CsvStreamFormatter =>
  new CsvStreamFormatter();
