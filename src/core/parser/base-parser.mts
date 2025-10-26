import type {
  InputData,
  TableData,
  ColumnDefinition,
  RowData,
  TablyfulOptions,
  BaseParser,
} from "@/types";

/**
 * Abstract base class for all data parsers in Tablyful.
 *
 * Provides common functionality for:
 * - Data validation and sanitization
 * - Type inference for columns
 * - Row processing and normalization
 * - Metadata generation
 * - Error handling
 *
 * Concrete parsers should extend this class and implement:
 * - canParse(): boolean
 * - extractHeaders(): { headers: string[], dataRows: any[] }
 * - convertRowsToObjects(): RowData[]
 */
export abstract class BaseParserImpl implements BaseParser {
  /**
   * Name identifier for the parser
   */
  abstract readonly parserName: string;

  /**
   * Check if this parser can handle the given data format
   */
  public abstract canParse(data: InputData): boolean;

  /**
   * Parse input data into structured table format
   * @param data - The input data to parse
   * @param options - The options for parsing
   * @returns The parsed table data
   */
  public parse(data: InputData, options: TablyfulOptions = {}): TableData {
    // Validate input
    if (!this.canParse(data)) {
      throw new Error(`Invalid input format for ${this.parserName}`);
    }

    // Extract headers and data rows (implemented by concrete parsers)
    const { headers, dataRows } = this._extractHeaders(data, options);

    // Process rows into objects
    const processedRows = this._processRows(dataRows, options, headers);

    // Infer column definitions
    const columns = this._inferColumnDefinitions(headers, processedRows);

    // Generate metadata
    const metadata = this._generateMetadata(headers, processedRows, options);

    return { headers, rows: processedRows, columns, metadata };
  }

  /**
   * Extract headers and data rows from input (implemented by concrete parsers)
   */
  protected abstract _extractHeaders(
    data: InputData,
    options: TablyfulOptions
  ): { headers: string[]; dataRows: unknown[][] };

  /**
   * Convert raw data rows to RowData objects (implemented by concrete parsers)
   */
  protected abstract _convertRowsToObjects(
    dataRows: unknown[][],
    headers: string[],
    options: TablyfulOptions
  ): RowData[];

  /**
   * Process rows with common transformations (row numbering, etc.)
   * @param dataRows - The raw data rows to process
   * @param options - The options for processing
   * @param headers - The column headers
   * @returns The processed row data
   */
  protected _processRows(
    dataRows: unknown[][],
    options: TablyfulOptions,
    headers: string[]
  ): RowData[] {
    const rows = this._convertRowsToObjects(dataRows, headers, options);

    return rows.map((row, index) => {
      const processedRow: RowData = { ...row };

      // Add row numbering if requested
      if (options.hasRowNumbers) {
        processedRow[options.rowNumberHeader || "#"] = index + 1;
        processedRow._rowNumber = index + 1;
      }

      // Sanitize all values
      headers.forEach((header) => {
        processedRow[header] = this._sanitizeValue(processedRow[header]);
      });

      return processedRow;
    });
  }

  /**
   * Infer column types and create column definitions
   * @param headers - The column headers
   * @param rows - The row data
   * @returns The inferred column definitions
   */
  protected _inferColumnDefinitions(
    headers: string[],
    rows: RowData[]
  ): ColumnDefinition[] {
    return headers.map((header) => {
      const values = rows
        .map((row) => row[header])
        .filter((val) => val !== undefined && val !== null);

      const inferredType = this._inferType(values);
      const nullable = rows.some(
        (row) => row[header] === null || row[header] === undefined
      );

      return {
        name: header,
        type: inferredType,
        nullable,
        originalName: header,
      };
    });
  }

  /**
   * Infer the data type of a column based on its values
   * @param values - The values to analyze
   * @returns The inferred data type
   */
  protected _inferType(values: unknown[]): ColumnDefinition["type"] {
    if (!values.length) return "unknown";

    // Check if all non-null values are numbers
    if (values.every((val) => typeof val === "number" && !isNaN(val))) {
      return "number";
    }

    // Check if all non-null values are booleans
    if (values.every((val) => typeof val === "boolean")) {
      return "boolean";
    }

    // Check if all non-null values are valid dates
    if (
      values.every((val) => {
        if (val instanceof Date) return true;
        if (typeof val === "string" || typeof val === "number") {
          const date = new Date(val as any);
          return !isNaN(date.getTime());
        }
        return false;
      })
    ) {
      return "date";
    }

    // Default to string for mixed or unrecognized types
    return "string";
  }

  /**
   * Generate metadata for the parsed table
   * @param headers - The column headers
   * @param rows - The row data
   * @param options - The options for generating metadata
   * @returns The generated metadata
   */
  protected _generateMetadata(
    headers: string[],
    rows: RowData[],
    options: TablyfulOptions
  ): TableData["metadata"] {
    return {
      rowCount: rows.length,
      columnCount: headers.length,
      hasRowNumbers: options.hasRowNumbers || false,
      originalFormat: this.parserName,
    };
  }

  /**
   * Sanitize individual values (remove empty strings, trim whitespace, etc.)
   * @param value - The value to sanitize
   * @returns The sanitized value
   */
  protected _sanitizeValue(value: unknown): unknown {
    if (value === "" || value === null) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    }
    return value;
  }

  /**
   * Normalize a row to ensure consistent length
   * @param row - The row to normalize
   * @param expectedLength - The expected length of the row
   * @returns The normalized row
   */
  protected _normalizeRow(row: unknown[], expectedLength: number): unknown[] {
    if (row.length < expectedLength) {
      // Pad with undefined
      return [...row, ...Array(expectedLength - row.length).fill(undefined)];
    }
    if (row.length > expectedLength) {
      // Truncate (though this should be rare)
      return row.slice(0, expectedLength);
    }
    return row;
  }

  /**
   * Validate basic data structure
   * @param data - The data to validate
   */
  protected _validateBasicStructure(data: unknown): void {
    if (data === null || data === undefined) {
      throw new Error("Input data cannot be null or undefined");
    }
  }

  /**
   * Generate default column headers
   * @param count - The number of headers to generate
   * @returns An array of default column headers
   */
  protected _generateDefaultHeaders(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Column_${i + 1}`);
  }

  /**
   * Validate and normalize column headers
   * @param headers - The column headers to validate
   * @returns An array of validated and normalized column headers
   */
  protected _validateAndNormalizeHeaders(headers: unknown[]): string[] {
    return headers.map((header, i) =>
      typeof header === "string" && header.trim() !== ""
        ? header.trim()
        : `Column_${i + 1}`
    );
  }
}
