import type {
  ArrayOfArrays,
  InputData,
  RowData,
  TablyfulOptions,
} from "@/types";
import { BaseParserImpl } from "./base-parser.mts";

export default class ArrayParser extends BaseParserImpl {
  readonly parserName = "array-parser";

  /**
   * Checks if the parser can handle the given input data.
   * @param data - The input data to check.
   * @returns True if the parser can handle the data, false otherwise.
   */
  public canParse(data: InputData): boolean {
    return (
      Array.isArray(data) &&
      data.length > 0 &&
      data.every((row) => Array.isArray(row))
    );
  }

  /**
   * Extract headers and data rows from the input array.
   * @param data - The input array of arrays.
   * @param options - The options for parsing.
   * @returns An object containing the headers and data rows.
   */
  protected _extractHeaders(
    data: InputData,
    options: TablyfulOptions
  ): { headers: string[]; dataRows: unknown[][] } {
    const arrayData = data as ArrayOfArrays;

    if (!arrayData.length) {
      return { headers: [], dataRows: [] };
    }

    if (options.hasHeaders) {
      const [headerRow, ...dataRows] = arrayData;
      const headers = this._validateAndNormalizeHeaders(headerRow);

      // Normalize data rows to match header length
      const normalizedDataRows = dataRows.map((row) =>
        this._normalizeRow(row, headers.length)
      );

      return { headers, dataRows: normalizedDataRows };
    }

    // Generate default headers
    const columnCount = Math.max(...arrayData.map((row) => row.length));
    const headers = this._generateDefaultHeaders(columnCount);

    // Normalize all rows to match the maximum length
    const normalizedDataRows = arrayData.map((row) =>
      this._normalizeRow(row, columnCount)
    );

    return { headers, dataRows: normalizedDataRows };
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
}

export const createArrayParser = (): ArrayParser => new ArrayParser();
