import type {
  ObjectOfArrays,
  InputData,
  RowData,
  TablyfulOptions,
} from "@/types";
import { BaseParserImpl } from "./base-parser.mts";

/**
 * Parser for Object of Arrays format (columnar data)
 *
 * Handles data in the format:
 * ```ts
 * {
 *   name: ["Alice", "Bob", "Charlie"],
 *   age: [30, 25, 35],
 *   city: ["NYC", "LA", "Chicago"]
 * }
 * ```
 *
 * This is a columnar format where each key represents a column
 * and its value is an array of row values for that column.
 */
export default class ObjectOfArraysParser extends BaseParserImpl {
  readonly parserName = "object-of-arrays-parser";

  /**
   * Checks if the parser can handle the given input data.
   * @param data - The input data to check.
   * @returns True if the parser can handle the data, false otherwise.
   */
  public canParse(data: InputData): boolean {
    return (
      typeof data === "object" &&
      data !== null &&
      !Array.isArray(data) &&
      Object.values(data).every((value) => Array.isArray(value))
    );
  }

  /**
   * Extract headers and data rows from the object of arrays.
   * @param data - The input object of arrays.
   * @param options - The options for parsing.
   * @returns An object containing the headers and data rows.
   */
  protected _extractHeaders(
    data: InputData,
    options: TablyfulOptions
  ): { headers: string[]; dataRows: unknown[][] } {
    const objectData = data as ObjectOfArrays;

    // Validate that all columns are proper arrays
    this.#validateColumnarStructure(objectData);

    // Get column names (keys)
    const columnNames = Object.keys(objectData);

    if (!columnNames.length) {
      return { headers: [], dataRows: [] };
    }

    // Use custom headers if provided, otherwise use column names
    const headers =
      options.headers && options.headers.length > 0
        ? this._validateAndNormalizeHeaders(options.headers)
        : this._validateAndNormalizeHeaders(columnNames);

    // Find the maximum row count across all columns
    const maxRowCount = this.#getMaxRowCount(objectData);

    // Transpose columnar data to row format
    const dataRows = this.#transposeColumnarData(
      objectData,
      headers,
      maxRowCount
    );

    return { headers, dataRows };
  }

  /**
   * Convert raw data rows to RowData objects.
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
   * Get the maximum row count across all columns.
   * Handles cases where columns have different lengths.
   * @param data - The object of arrays.
   * @returns The maximum row count.
   */
  #getMaxRowCount(data: ObjectOfArrays): number {
    const columnLengths = Object.values(data).map((arr) => arr.length);

    if (!columnLengths.length) return 0;

    const maxLength = Math.max(...columnLengths);
    const minLength = Math.min(...columnLengths);

    // Warn if columns have inconsistent lengths
    if (maxLength !== minLength) {
      console.warn(
        `Inconsistent column lengths detected. ` +
          `Min: ${minLength}, Max: ${maxLength}. ` +
          `Missing values will be treated as undefined.`
      );
    }

    return maxLength;
  }

  /**
   * Transpose columnar data to row format.
   * Converts from { col1: [v1, v2], col2: [v3, v4] }
   * to [[v1, v3], [v2, v4]]
   * @param data - The object of arrays.
   * @param headers - The column headers in desired order.
   * @param rowCount - The number of rows to generate.
   * @returns The transposed data rows.
   */
  #transposeColumnarData(
    data: ObjectOfArrays,
    headers: string[],
    rowCount: number
  ): unknown[][] {
    const dataRows = Array.from({ length: rowCount }, (_, rowIndex) =>
      headers.map((header) => {
        const columnArray = data[header];
        return columnArray && rowIndex < columnArray.length
          ? columnArray[rowIndex]
          : undefined;
      })
    );

    return dataRows;
  }

  /**
   * Validate that all columns are proper arrays.
   * @param data - The object of arrays to validate.
   */
  #validateColumnarStructure(data: ObjectOfArrays): void {
    const nonArrayColumns = Object.entries(data)
      .filter(([_, value]) => !Array.isArray(value))
      .map(([key]) => key);

    if (nonArrayColumns.length > 0) {
      throw new Error(
        `Invalid columnar data: The following columns are not arrays: ${nonArrayColumns.join(
          ", "
        )}`
      );
    }
  }
}

export const createObjectOfArraysParser = (): ObjectOfArraysParser =>
  new ObjectOfArraysParser();
