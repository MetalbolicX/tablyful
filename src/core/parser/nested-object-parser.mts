import type {
  ObjectOfObjects,
  InputData,
  RowData,
  TablyfulOptions,
} from "@/types";
import { BaseParserImpl } from "./base-parser.mts";

/**
 * Parser for Object of Objects format (nested records with row identifiers)
 *
 * Handles data in the format:
 * ```ts
 * {
 *   "user_001": { name: "Alice", age: 30, department: "Engineering" },
 *   "user_002": { name: "Bob", age: 25, department: "Sales" },
 *   "user_003": { name: "Charlie", age: 35, department: "Marketing" }
 * }
 * ```
 *
 * The outer keys are row identifiers, and each value is an object
 * representing the column data for that row.
 */
export default class NestedObjectParser extends BaseParserImpl {
  readonly parserName = "nested-object-parser";

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
      Object.values(data).every(
        (value) =>
          typeof value === "object" && value !== null && !Array.isArray(value)
      )
    );
  }

  /**
   * Extract headers and data rows from the object of objects.
   * @param data - The input object of objects.
   * @param options - The options for parsing.
   * @returns An object containing the headers and data rows.
   */
  protected _extractHeaders(
    data: InputData,
    options: TablyfulOptions
  ): { headers: string[]; dataRows: unknown[][] } {
    const objectData = data as ObjectOfObjects;

    // Validate that all nested values are proper objects
    this.#validateNestedStructure(objectData);

    // Get row identifiers (outer keys)
    const rowIds = Object.keys(objectData);

    if (!rowIds.length) {
      return { headers: [], dataRows: [] };
    }

    // Extract all unique column names from all nested objects
    const allColumnNames = this.#extractAllColumnNames(objectData);

    // Analyze for sparse data and warn if detected
    this.#analyzeSparseData(objectData);

    // Determine if we should include row IDs as a column
    const includeRowIds = options.hasRowNumbers !== false; // Default to true

    // Build headers: optionally include row ID column + data columns
    let headers: string[];
    if (options.headers && options.headers.length > 0) {
      headers = this._validateAndNormalizeHeaders(options.headers);
    } else {
      const rowIdHeader = options.rowNumberHeader || "_rowId";
      headers = includeRowIds
        ? [rowIdHeader, ...allColumnNames]
        : allColumnNames;
    }

    // Convert nested objects to row arrays
    const dataRows = this.#convertToRowArrays(
      objectData,
      rowIds,
      allColumnNames,
      includeRowIds
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
   * Extract all unique column names from all nested objects.
   * Preserves order of first appearance.
   * @param data - The object of objects.
   * @returns Array of unique column names.
   */
  #extractAllColumnNames(data: ObjectOfObjects): string[] {
    const columnsSet = new Set<string>();

    for (const rowObj of Object.values(data)) {
      Object.keys(rowObj).forEach((key) => columnsSet.add(key));
    }

    return Array.from(columnsSet);
  }

  /**
   * Convert nested objects to array format.
   * @param data - The object of objects.
   * @param rowIds - The row identifiers (outer keys).
   * @param columnNames - The column names to extract.
   * @param includeRowIds - Whether to include row IDs in the output.
   * @returns The converted data rows.
   */
  #convertToRowArrays(
    data: ObjectOfObjects,
    rowIds: string[],
    columnNames: string[],
    includeRowIds: boolean
  ): unknown[][] {
    return rowIds.map((rowId) => {
      const rowObj = data[rowId];
      const columnValues = columnNames.map((columnName) => rowObj[columnName]);

      return includeRowIds ? [rowId, ...columnValues] : columnValues;
    });
  }

  /**
   * Validate that all values are proper objects (not arrays or primitives).
   * @param data - The object of objects to validate.
   */
  #validateNestedStructure(data: ObjectOfObjects): void {
    const invalidRows = Object.entries(data)
      .filter(
        ([_, value]) =>
          typeof value !== "object" || value === null || Array.isArray(value)
      )
      .map(([key]) => key);

    if (invalidRows.length > 0) {
      throw new Error(
        `Invalid nested object data: The following rows are not objects: ${invalidRows.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Check for sparse data (rows with different column sets).
   * @param data - The object of objects.
   * @returns Information about data sparsity.
   */
  #analyzeSparseData(data: ObjectOfObjects): {
    isSparse: boolean;
    columnCounts: Map<number, number>;
  } {
    const columnCounts = new Map<number, number>();

    for (const rowObj of Object.values(data)) {
      const columnCount = Object.keys(rowObj).length;
      columnCounts.set(columnCount, (columnCounts.get(columnCount) || 0) + 1);
    }

    const isSparse = columnCounts.size > 1;

    if (isSparse) {
      const counts = Array.from(columnCounts.entries())
        .map(([count, rows]) => `${rows} row(s) with ${count} column(s)`)
        .join(", ");
      console.warn(
        `Sparse data detected in nested objects: ${counts}. Missing values will be treated as undefined.`
      );
    }

    return { isSparse, columnCounts };
  }
}

export const createNestedObjectParser = (): NestedObjectParser =>
  new NestedObjectParser();
