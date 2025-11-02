import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  MarkdownFormatterOptions,
  RowData,
} from "@/types";
import {
  StreamFormatterImpl,
  escapeMarkdown,
  getMarkdownOptions,
  createMarkdownSeparator,
  joinMarkdownCells,
} from "@/formatters/base";

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

    const mdOptions = getMarkdownOptions(options);

    const escapedHeaders = data.headers.map((h) => escapeMarkdown(h));
    const headerLine = joinMarkdownCells(escapedHeaders, mdOptions.padding);
    
    const separators = [...Array(data.headers.length)].map(() =>
      createMarkdownSeparator(mdOptions.align)
    );
    const separatorLine = joinMarkdownCells(separators, mdOptions.padding);

    const rowLines = data.rows.map((row) => {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return escapeMarkdown(value);
      });
      return joinMarkdownCells(values, mdOptions.padding);
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
    const mdOptions = getMarkdownOptions(options);

    const escapedHeaders = data.headers.map((h) => escapeMarkdown(h));
    const headerLine = joinMarkdownCells(escapedHeaders, mdOptions.padding);
    
    const separators = [...Array(data.headers.length)].map(() =>
      createMarkdownSeparator(mdOptions.align)
    );
    const separatorLine = joinMarkdownCells(separators, mdOptions.padding);

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
    const mdOptions = getMarkdownOptions(options);

    const lines = rows.map((row) => {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return escapeMarkdown(value);
      });
      return joinMarkdownCells(values, mdOptions.padding);
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
    const mdOptions = getMarkdownOptions(options);
    return joinMarkdownCells(values, mdOptions.padding);
  }
}

/**
 * Factory function to create a streaming Markdown formatter instance.
 * @returns A new streaming Markdown formatter instance.
 */
export const createMarkdownStreamFormatter = (): MarkdownStreamFormatter =>
  new MarkdownStreamFormatter();
