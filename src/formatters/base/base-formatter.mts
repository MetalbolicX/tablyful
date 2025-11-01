import type {
  BaseFormatter,
  TableData,
  RowData,
  ColumnDefinition,
  TablyfulOptions,
} from "@/types";
import { Maybe, match } from "@/utils";

/**
 * Abstract base formatter class providing common functionality for all formatters.
 * Handles data preparation, type conversion, and common formatting operations.
 */
export abstract class BaseFormatterImpl implements BaseFormatter {
  /**
   * Format table data to string representation.
   * @param data - The table data to format.
   * @param options - Optional formatting options.
   * @returns The formatted string output.
   */
  public format(data: TableData, options?: TablyfulOptions): string {
    // Handle empty data gracefully
    if (!data.headers || data.headers.length === 0 || !data.rows || data.rows.length === 0) {
      return "";
    }

    const processedData = this._processData(data, options);
    return this._formatData(processedData, options);
  }

  /**
   * Get the output format name (must be implemented by subclasses).
   */
  public abstract readonly formatName: string;

  /**
   * Get supported file extensions (must be implemented by subclasses).
   */
  public abstract readonly fileExtensions: string[];

  /**
   * Format the processed data into the target format.
   * This is the main method that subclasses must implement.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted string output.
   */
  protected abstract _formatData(
    data: TableData,
    options?: TablyfulOptions
  ): string;

  /**
   * Process and prepare table data before formatting.
   * Handles row numbering and data sanitization.
   * Custom headers are handled by the parsers.
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

    // Sanitize data values
    processedData = this._sanitizeData(processedData);

    return processedData;
  }

  /**
   * Apply custom headers to the table data.
   * @param data - The table data.
   * @param customHeaders - The custom header names.
   * @returns The table data with updated headers.
   */
  protected _applyCustomHeaders(
    data: TableData,
    customHeaders: string[]
  ): TableData {
    const expectedColumnCount = data.headers.length;
    const providedHeaderCount = customHeaders.length;

    if (providedHeaderCount !== expectedColumnCount) {
      throw new Error(
        `Header count mismatch: expected ${expectedColumnCount} headers, got ${providedHeaderCount}`
      );
    }

    // Create a mapping from old headers to new headers
    const headerMap = new Map<string, string>();
    data.headers.forEach((oldHeader, index) => {
      headerMap.set(oldHeader, customHeaders[index]);
    });

    // Remap the row data to use new header names
    const remappedRows = data.rows.map((row) => {
      const newRow: RowData = {};
      for (const [oldKey, value] of Object.entries(row)) {
        const newKey = headerMap.get(oldKey) || oldKey;
        newRow[newKey] = value;
      }
      return newRow;
    });

    return {
      ...data,
      headers: [...customHeaders],
      columns: data.columns.map((column, index) => ({
        ...column,
        name: customHeaders[index],
        originalName: column.name,
      })),
      rows: remappedRows,
    };
  }

  /**
   * Add row numbers to the table data.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The table data with row numbers added.
   */
  protected _addRowNumbers(
    data: TableData,
    options?: TablyfulOptions
  ): TableData {
    const rowNumberHeader = options?.rowNumberHeader || "#";
    const startIndex = 1; // Always start row numbering from 1

    const newHeaders = [rowNumberHeader, ...data.headers];
    const newColumns: ColumnDefinition[] = [
      {
        name: rowNumberHeader,
        type: "number",
        nullable: false,
        originalName: rowNumberHeader,
      },
      ...data.columns,
    ];

    const newRows = data.rows.map((row, index) => ({
      [rowNumberHeader]: startIndex + index,
      ...row,
    }));

    return {
      ...data,
      headers: newHeaders,
      columns: newColumns,
      rows: newRows,
      metadata: {
        ...data.metadata,
        columnCount: data.metadata.columnCount + 1,
        hasRowNumbers: true,
      },
    };
  }

  /**
   * Sanitize data values for safe output.
   * Handles null/undefined values, escaping, and type conversion.
   * @param data - The table data to sanitize.
   * @returns The sanitized table data.
   */
  protected _sanitizeData(data: TableData): TableData {
    const sanitizedRows = data.rows.map((row) => this._sanitizeRow(row));

    return {
      ...data,
      rows: sanitizedRows,
    };
  }

  /**
   * Sanitize a single row of data.
   * @param row - The row data to sanitize.
   * @returns The sanitized row data.
   */
  protected _sanitizeRow(row: RowData): RowData {
    // Use a functional transformation to keep the logic concise and easy to test.
    // Rely on `_sanitizeValue` which already uses `match`/`Maybe` to handle nullish values.
    const entries = Object.entries(row).map(([key, value]) => [key, this._sanitizeValue(value)] as const);
    return Object.fromEntries(entries) as RowData;
  }

  /**
   * Sanitize a single value.
   * Converts null/undefined to empty string and handles special cases.
   * @param value - The value to sanitize.
   * @returns The sanitized value.
   */
  protected _sanitizeValue(value: unknown): string {
    return match(value as any)
      .when((v) => Maybe.of(v).isNothing(), () => "")
      .when((v) => typeof v === "string", (v) => v)
      .when((v) => typeof v === "number", (v) => v.toString())
      .when((v) => typeof v === "boolean", (v) => v.toString())
      .when((v) => v instanceof Date, (v) => v.toISOString())
      .when((v) => typeof v === "object", (v) => {
        try {
          return JSON.stringify(v);
        } catch {
          return "[Object]";
        }
      })
      .otherwise((v) => String(v));
  }

  /**
   * Get the maximum width needed for each column.
   * Useful for formatters that need to calculate spacing.
   * @param data - The table data.
   * @returns Array of maximum widths for each column.
   */
  protected _calculateColumnWidths(data: TableData): number[] {
    const widths = data.headers.map((header) => header.length);

    for (const row of data.rows) {
      for (let index = 0; index < data.headers.length; index++) {
        const header = data.headers[index];
        const value = this._sanitizeValue(row[header]);
        widths[index] = Math.max(widths[index], value.length);
      }
    }

    return widths;
  }

  /**
   * Validate that the table data is properly structured.
   * @param data - The table data to validate.
   * @throws Error if the data is invalid.
   */
  protected _validateData(data: TableData): void {
    if (!data.headers || data.headers.length === 0) {
      throw new Error("Table data must have at least one header");
    }

    if (!data.rows) {
      throw new Error("Table data must have a rows array");
    }

    if (!data.columns || data.columns.length !== data.headers.length) {
      throw new Error("Column definitions must match header count");
    }

    // Validate each row has the expected structure
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const missingHeaders = data.headers.filter((header) => !(header in row));

      if (missingHeaders.length > 0) {
        console.warn(`Row ${i} missing headers: ${missingHeaders.join(", ")}`);
      }
    }
  }

  /**
   * Helper method to escape special characters in strings.
   * Can be overridden by subclasses for format-specific escaping.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    // Default implementation - no escaping
    // Subclasses should override for format-specific escaping
    return value;
  }

  /**
   * Helper method to generate a separator line.
   * Useful for text-based formats that need dividers.
   * @param widths - The column widths.
   * @param separator - The separator character.
   * @returns The separator line.
   */
  protected _generateSeparator(widths: number[], separator = "-"): string {
    return widths.map((width) => separator.repeat(width)).join("+");
  }
}
