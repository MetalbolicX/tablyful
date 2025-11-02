import type {
  TableData,
  TablyfulOptions,
} from "@/types";
import {
  BaseFormatterImpl,
  escapeMarkdown,
  getMarkdownOptions,
  createMarkdownSeparator,
  joinMarkdownCells,
} from "@/formatters/base";

/**
 * Markdown formatter for converting table data to GitHub-flavored Markdown tables.
 * Generates properly formatted markdown tables with optional alignment.
 */
export class MarkdownFormatter extends BaseFormatterImpl {
  public readonly formatName = "markdown";
  public readonly fileExtensions = [".md", ".markdown"];

  /**
   * Format the processed data into Markdown table.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted Markdown string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const mdOptions = getMarkdownOptions(options);

    // Header and separator rows
    const escapedHeaders = data.headers.map((h) => escapeMarkdown(h));
    const headerLine = joinMarkdownCells(escapedHeaders, mdOptions.padding);

    const separators = [...Array(data.headers.length)].map(() =>
      createMarkdownSeparator(mdOptions.align)
    );
    const separatorLine = joinMarkdownCells(separators, mdOptions.padding);

    // Data rows
    const dataLines = data.rows.map((row) => {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return escapeMarkdown(value);
      });
      return joinMarkdownCells(values, mdOptions.padding);
    });

    const lines: string[] = [headerLine, separatorLine, ...dataLines];

    return lines.join("\n");
  }

  /**
   * Escape special Markdown characters in cell content.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    return escapeMarkdown(value);
  }
}

/**
 * Factory function to create a Markdown formatter instance.
 * @returns A new Markdown formatter instance.
 */
export const createMarkdownFormatter = (): MarkdownFormatter =>
  new MarkdownFormatter();
