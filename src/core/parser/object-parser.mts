import type {
  ArrayOfObjects,
  InputData,
  RowData,
  TablyfulOptions,
} from "@/types";
import { BaseParserImpl } from "./base-parser.mts";

/**
 * Parser for Array of Objects format
 *
 * Handles data in the format:
 * ```ts
 * [
 *   { name: "Alice", age: 30 },
 *   { name: "Bob", age: 25 }
 * ]
 * ```
 */
export default class ObjectParser extends BaseParserImpl {
  readonly parserName = "object-parser";

  /**
   * Checks if the parser can handle the given input data.
   * @param data - The input data to check.
   * @returns True if the parser can handle the data, false otherwise.
   */
  public canParse(data: InputData): boolean {
    return (
      Array.isArray(data) &&
      data.every(
        (row) => typeof row === "object" && row !== null && !Array.isArray(row)
      )
    );
  }

  /**
   * Extract headers and data rows from the array of objects.
   * @param data - The input array of objects.
   * @param options - The options for parsing.
   * @returns An object containing the headers and data rows.
   */
  protected _extractHeaders(
    data: InputData,
    options: TablyfulOptions
  ): { headers: string[]; dataRows: unknown[][] } {
    const objectData = data as ArrayOfObjects;

    if (!objectData.length) {
      return { headers: [], dataRows: [] };
    }

    // Extract all unique keys from all objects to get complete header set
    const allKeys = this._extractAllKeys(objectData);

    // Determine final headers
    let headers: string[];
    let keyMapping: string[];

    if (options.headers && options.headers.length > 0) {
      // Custom headers provided - use them as the final headers
      // but keep the original keys for data extraction
      const customHeaders = this._validateAndNormalizeHeaders(options.headers);

      if (customHeaders.length !== allKeys.length) {
        throw new Error(
          `Custom headers count (${customHeaders.length}) does not match ` +
          `the number of columns in the data (${allKeys.length})`
        );
      }

      headers = customHeaders;
      keyMapping = allKeys; // Use original keys to extract data
    } else {
      // No custom headers - use the extracted keys
      headers = this._validateAndNormalizeHeaders(allKeys);
      keyMapping = allKeys;
    }

    // Convert objects to arrays using the original keys for extraction
    const dataRows = objectData.map((obj) =>
      keyMapping.map((key) => obj[key])
    );

    return { headers, dataRows };
  }

  /**
   * Convert raw data rows to RowData objects.
   * Since the data is already objects, we just need to ensure consistency.
   * @param dataRows - The data rows to convert.
   * @param headers - The column headers.
   * @param options - The options for processing.
   * @returns The converted row data.
   */
  protected _convertRowsToObjects(
    dataRows: unknown[][],
    headers: string[],
    _options: TablyfulOptions
  ): RowData[] {
    return dataRows.map((row) => {
      const rowData: RowData = {};

      // Convert array row to object with column headers
      headers.forEach((header, colIndex) => {
        rowData[header] = row[colIndex];
      });

      return rowData;
    });
  }

  /**
   * Extract all unique keys from an array of objects.
   * Preserves order of first appearance.
   * @param data - The array of objects.
   * @returns Array of unique keys.
   */
  private _extractAllKeys(data: ArrayOfObjects): string[] {
    const keysSet = new Set<string>();

    for (const obj of data) {
      Object.keys(obj).forEach((key) => keysSet.add(key));
    }

    return Array.from(keysSet);
  }
}

export const createObjectParser = (): ObjectParser => new ObjectParser();
