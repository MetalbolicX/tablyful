import type {
  TableData,
  TablyfulOptions,
  MarkdownFormatterOptions,
} from "@/types";
import { BaseFormatterImpl } from "@/formatters/base";

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

    const mdOptions = this.#getMarkdownOptions(options);

    // Header and separator rows
    const headerLine = this.#formatHeaderRow(data.headers, mdOptions);
    const separatorLine = this.#formatSeparatorRow(
      data.headers.length,
      mdOptions
    );

    // Data rows
    const dataLines = data.rows.map((row) => {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return this.#escapeMarkdown(value);
      });
      return this.#formatDataRow(values, mdOptions);
    });

    const lines: string[] = [headerLine, separatorLine, ...dataLines];

    return lines.join("\n");
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
      this.#createSeparator(options.align)
    );

    return this.#joinCells(separators, options);
  }

  /**
   * Create a column separator with alignment markers.
   * @param align - The alignment type.
   * @returns The separator string.
   */
  #createSeparator(align: "left" | "center" | "right"): string {
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
   * Escape special Markdown characters in cell content.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    return this.#escapeMarkdown(value);
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
 * Factory function to create a Markdown formatter instance.
 * @returns A new Markdown formatter instance.
 */
export const createMarkdownFormatter = (): MarkdownFormatter =>
  new MarkdownFormatter();
