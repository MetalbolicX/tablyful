import type {
  TableData,
  TablyfulOptions,
  JsonFormatterOptions,
} from "@/types";
import { BaseFormatterImpl } from "@/formatters/base";

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

    const jsonOptions = this.#getJsonOptions(options);

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

  /**
   * Get JSON-specific options with defaults.
   * @param options - The general formatting options.
   * @returns The JSON options with defaults applied.
   */
  #getJsonOptions(
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
