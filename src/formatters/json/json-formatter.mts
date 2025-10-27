import type {
  TableData,
  TablyfulOptions,
  JsonFormatterOptions,
} from "@/types";
import { BaseFormatterImpl } from "../base/base-formatter.mts";

/**
 * JSON formatter for converting table data to JSON format.
 * Supports both array and object output formats with optional pretty printing.
 */
export class JsonFormatter extends BaseFormatterImpl {
  public readonly formatName = "json";
  public readonly fileExtensions = [".json"];

  /**
   * Format the processed data into JSON format.
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
 * Factory function to create a JSON formatter instance.
 * @returns A new JSON formatter instance.
 */
export const createJsonFormatter = (): JsonFormatter => new JsonFormatter();
