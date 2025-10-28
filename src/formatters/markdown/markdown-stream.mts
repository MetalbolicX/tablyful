import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  MarkdownFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl } from "@/formatters/base";

/**
 * Streaming Markdown formatter for handling large datasets efficiently.
 * Generates GitHub-flavored Markdown tables.
 */
export class MarkdownStreamFormatter extends StreamFormatterImpl {
  public readonly formatName = "markdown-stream";
  public readonly fileExtensions = [".md", ".markdown"];

  /**
   * Format the processed data into Markdown table.
   * This is used for non-streaming output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted Markdown string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const mdOptions = this.#getMarkdownOptions(options);

    const headerLine = this.#formatHeaderRow(data.headers, mdOptions);
    const separatorLine = this.#formatSeparatorRow(
      data.headers.length,
      mdOptions
    );

    const rowLines = data.rows.map((row) => {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return this.#escapeMarkdown(value);
      });
      return this.#formatDataRow(values, mdOptions);
    });

    const lines = [headerLine, separatorLine, ...rowLines];

    return lines.join("\n");
  }

  /**
   * Create a streaming Markdown output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns A readable stream of Markdown data.
   */
  protected _createFormatStream(
    data: TableData,
    options?: TablyfulOptions
  ): ReadableStream {
    return this._createBaseTransform(data, options);
  }

  /**
   * Format the header section for streaming output.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The header row and separator row.
   */
  protected _formatHeader(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const mdOptions = this.#getMarkdownOptions(options);

    const headerLine = this.#formatHeaderRow(data.headers, mdOptions);
    const separatorLine = this.#formatSeparatorRow(
      data.headers.length,
      mdOptions
    );

    const lines: string[] = [...[headerLine, separatorLine]];

    return lines.join("\n") + "\n";
  }

  /**
   * Format a batch of rows for streaming output.
   * @param rows - The batch of rows to format.
   * @param data - The complete table data (for context).
   * @param startIndex - The starting row index for this batch.
   * @param options - The formatting options.
   * @returns The formatted batch as Markdown table rows.
   */
  protected _formatRowBatch(
    rows: RowData[],
    data: TableData,
    startIndex: number,
    options?: TablyfulOptions
  ): string {
    const mdOptions = this.#getMarkdownOptions(options);

    const lines = rows.map((row) => {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return this.#escapeMarkdown(value);
      });
      return this.#formatDataRow(values, mdOptions);
    });

    return lines.join("\n") + "\n";
  }

  /**
   * Format the footer section for streaming output.
   * Markdown tables don't have footers.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns Null (no footer needed).
   */
  protected _formatFooter(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    return null;
  }

  /**
   * Join row values into a formatted string.
   * @param values - The sanitized and escaped values.
   * @param options - The formatting options.
   * @returns The joined row string.
   */
  protected _joinRowValues(
    values: string[],
    options?: TablyfulOptions
  ): string {
    const mdOptions = this.#getMarkdownOptions(options);
    return this.#joinCells(values, mdOptions);
  }

  /**
   * Format the header row.
   * @param headers - The column headers.
   * @param options - Markdown formatting options.
   * @returns The formatted header row.
   */
  #formatHeaderRow(
    headers: string[],
    options: Required<MarkdownFormatterOptions>
  ): string {
    const escapedHeaders = headers.map((h) => this.#escapeMarkdown(h));
    return this.#joinCells(escapedHeaders, options);
  }

  /**
   * Format the separator row that defines column alignment.
   * @param columnCount - The number of columns.
   * @param options - Markdown formatting options.
   * @returns The formatted separator row.
   */
  #formatSeparatorRow(
    columnCount: number,
    options: Required<MarkdownFormatterOptions>
  ): string {
    const separators = [...Array(columnCount)].map(() =>
      this._createSeparator(options.align)
    );

    return this.#joinCells(separators, options);
  }

  /**
   * Create a column separator with alignment markers.
   * @param align - The alignment type.
   * @returns The separator string.
   */
  private _createSeparator(align: "left" | "center" | "right"): string {
    switch (align) {
      case "left":
        return ":---";
      case "center":
        return ":---:";
      case "right":
        return "---:";
      default:
        return "---";
    }
  }

  /**
   * Format a data row.
   * @param values - The cell values.
   * @param options - Markdown formatting options.
   * @returns The formatted data row.
   */
  #formatDataRow(
    values: string[],
    options: Required<MarkdownFormatterOptions>
  ): string {
    return this.#joinCells(values, options);
  }

  /**
   * Join cell values into a markdown table row.
   * @param cells - The cell values.
   * @param options - Markdown formatting options.
   * @returns The joined row string.
   */
  #joinCells(
    cells: string[],
    options: Required<MarkdownFormatterOptions>
  ): string {
    if (options.padding) {
      // Add padding around cell content
      const paddedCells = cells.map((cell) => ` ${cell} `);
      return `|${paddedCells.join("|")}|`;
    }

    return `|${cells.join("|")}|`;
  }

  /**
   * Escape Markdown special characters.
   * Specifically handles pipe characters which break table structure.
   * @param value - The string to escape.
   * @returns The escaped string.
   */
  #escapeMarkdown(value: string): string {
    // Escape pipe characters as they break table structure
    let escaped = value.replace(/\|/g, "\\|");

    // Escape backslashes before pipes
    escaped = escaped.replace(/\\\|/g, "\\\\|");

    // Replace newlines with <br> for inline content
    escaped = escaped.replace(/\n/g, "<br>");
    escaped = escaped.replace(/\r/g, "");

    return escaped;
  }

  /**
   * Get Markdown-specific options with defaults.
   * @param options - The general formatting options.
   * @returns The Markdown options with defaults applied.
   */
  #getMarkdownOptions(
    options?: TablyfulOptions
  ): Required<MarkdownFormatterOptions> {
    const mdOptions =
      (options?.formatOptions as MarkdownFormatterOptions) || {};

    return {
      align: mdOptions.align || "left",
      padding: mdOptions.padding !== false, // Default to true
      githubFlavor: mdOptions.githubFlavor !== false, // Default to true
    };
  }
}

/**
 * Factory function to create a streaming Markdown formatter instance.
 * @returns A new streaming Markdown formatter instance.
 */
export const createMarkdownStreamFormatter = (): MarkdownStreamFormatter =>
  new MarkdownStreamFormatter();
