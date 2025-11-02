import type {
  TableData,
  TablyfulOptions,
  JsonFormatterOptions,
} from "@/types";
import { BaseFormatterImpl, getJsonOptions } from "@/formatters/base";

/**
 * JSON formatter for converting table data to JSON format.
 * Supports both array and object output formats with optional pretty printing.
 */
export class JsonFormatter extends BaseFormatterImpl {
  public readonly formatName = "json";
  public readonly fileExtensions = [".json"];

  /**
   * Process data without sanitization to preserve types.
   * JSON should keep numbers, booleans, etc. as their original types.
   * @param data - The raw table data.
   * @param options - Optional processing options.
   * @returns The processed table data.
   */
  protected _processData(
    data: TableData,
    options?: TablyfulOptions
  ): TableData {
    let processedData = { ...data };

    // Add row numbers if requested
    if (options?.hasRowNumbers) {
      processedData = this._addRowNumbers(processedData, options);
    }

    // Skip sanitization to preserve types for JSON
    return processedData;
  }

  /**
   * Format the processed data into JSON format.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted JSON string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const jsonOptions = getJsonOptions(options);

    // Convert table data to JSON-serializable format
    const jsonData = jsonOptions.asArray
      ? this.#formatAsArray(data)
      : this.#formatAsObjects(data);

    // Serialize to JSON string
    if (jsonOptions.pretty) {
      return JSON.stringify(jsonData, null, jsonOptions.indentSize);
    }

    return JSON.stringify(jsonData);
  }

  /**
   * Format table data as an array of arrays.
   * @param data - The table data.
   * @returns Array format: [headers, ...rows]
   */
  #formatAsArray(data: TableData): unknown[][] {
    const rows = data.rows.map((row) => data.headers.map((header) => row[header]));
    return [[...data.headers], ...rows];
  }

  /**
   * Format table data as an array of objects.
   * @param data - The table data.
   * @returns Array of row objects
   */
  #formatAsObjects(data: TableData): Record<string, unknown>[] {
    return data.rows.map((row) => {
      const obj: Record<string, unknown> = {};

      for (const header of data.headers) {
        obj[header] = row[header];
      }

      return obj;
    });
  }
}

/**
 * Factory function to create a JSON formatter instance.
 * @returns A new JSON formatter instance.
 */
export const createJsonFormatter = (): JsonFormatter => new JsonFormatter();
