import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  JsonFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl } from "../base/stream-formatter.mts";

/**
 * Streaming JSON formatter for handling large datasets efficiently.
 * Processes data in batches to minimize memory usage.
 */
export class JsonStreamFormatter extends StreamFormatterImpl {
  public readonly formatName = "json-stream";
  public readonly fileExtensions = [".json"];

  /**
   * Format the processed data into JSON format.
   * This is used for non-streaming output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted JSON string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const jsonOptions = this._getJsonOptions(options);

    // Convert table data to JSON-serializable format
    const jsonData = jsonOptions.asArray
      ? this._formatAsArray(data)
      : this._formatAsObjects(data);

    // Serialize to JSON string
    if (jsonOptions.pretty) {
      return JSON.stringify(jsonData, null, jsonOptions.indentSize);
    }

    return JSON.stringify(jsonData);
  }

  /**
   * Create a streaming JSON output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns A readable stream of JSON data.
   */
  protected _createFormatStream(
    data: TableData,
    options?: TablyfulOptions
  ): ReadableStream {
    // For JSON, streaming is complex due to array/object structure
    // Use simple stream approach for now
    return this._createSimpleStream(data, options);
  }

  /**
   * Format the header section for streaming output.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The opening bracket or brace.
   */
  protected _formatHeader(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const jsonOptions = this._getJsonOptions(options);

    if (jsonOptions.asArray) {
      // Array format: start with opening bracket and headers
      const headers = JSON.stringify(data.headers);
      return jsonOptions.pretty
        ? `[\n  ${headers},\n`
        : `[${headers},`;
    }

    // Object format: start with opening bracket
    return jsonOptions.pretty ? "[\n" : "[";
  }

  /**
   * Format a batch of rows for streaming output.
   * @param rows - The batch of rows to format.
   * @param data - The complete table data (for context).
   * @param startIndex - The starting row index for this batch.
   * @param options - The formatting options.
   * @returns The formatted batch as JSON.
   */
  protected _formatRowBatch(
    rows: RowData[],
    data: TableData,
    startIndex: number,
    options?: TablyfulOptions
  ): string {
    const jsonOptions = this._getJsonOptions(options);
    const isLastBatch = startIndex + rows.length >= data.metadata.rowCount;
    const parts: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isLastRow = isLastBatch && i === rows.length - 1;

      if (jsonOptions.asArray) {
        // Array format: [value1, value2, ...]
        const rowArray = data.headers.map((header) => row[header]);
        const rowJson = JSON.stringify(rowArray);

        if (jsonOptions.pretty) {
          parts.push(`  ${rowJson}${isLastRow ? "" : ","}\n`);
        } else {
          parts.push(`${rowJson}${isLastRow ? "" : ","}`);
        }
      } else {
        // Object format: {key: value, ...}
        const rowObj: Record<string, unknown> = {};
        for (const header of data.headers) {
          rowObj[header] = row[header];
        }
        const rowJson = JSON.stringify(rowObj);

        if (jsonOptions.pretty) {
          parts.push(`  ${rowJson}${isLastRow ? "" : ","}\n`);
        } else {
          parts.push(`${rowJson}${isLastRow ? "" : ","}`);
        }
      }
    }

    return parts.join("");
  }

  /**
   * Format the footer section for streaming output.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The closing bracket.
   */
  protected _formatFooter(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const jsonOptions = this._getJsonOptions(options);
    return jsonOptions.pretty ? "\n]" : "]";
  }

  /**
   * Join row values into a formatted string.
   * Not used for JSON formatting, but required by base class.
   * @param values - The sanitized and escaped values.
   * @param options - The formatting options.
   * @returns The joined row string.
   */
  protected _joinRowValues(
    values: string[],
    options?: TablyfulOptions
  ): string {
    return JSON.stringify(values);
  }

  /**
   * Format table data as an array of arrays.
   * @param data - The table data.
   * @returns Array format: [headers, ...rows]
   */
  private _formatAsArray(data: TableData): unknown[][] {
    const result: unknown[][] = [];

    // Add headers as first row
    result.push([...data.headers]);

    // Add data rows
    for (const row of data.rows) {
      const rowArray = data.headers.map((header) => row[header]);
      result.push(rowArray);
    }

    return result;
  }

  /**
   * Format table data as an array of objects.
   * @param data - The table data.
   * @returns Array of row objects
   */
  private _formatAsObjects(data: TableData): Record<string, unknown>[] {
    return data.rows.map((row) => {
      const obj: Record<string, unknown> = {};

      for (const header of data.headers) {
        obj[header] = row[header];
      }

      return obj;
    });
  }

  /**
   * Get JSON-specific options with defaults.
   * @param options - The general formatting options.
   * @returns The JSON options with defaults applied.
   */
  private _getJsonOptions(
    options?: TablyfulOptions
  ): Required<JsonFormatterOptions> {
    const jsonOptions = (options?.formatOptions as JsonFormatterOptions) || {};

    return {
      pretty: jsonOptions.pretty !== false, // Default to true
      indentSize: jsonOptions.indentSize || 2,
      asArray: jsonOptions.asArray || false, // Default to objects
    };
  }
}

/**
 * Factory function to create a streaming JSON formatter instance.
 * @returns A new streaming JSON formatter instance.
 */
export const createJsonStreamFormatter = (): JsonStreamFormatter =>
  new JsonStreamFormatter();
