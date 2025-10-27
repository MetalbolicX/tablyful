import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  HtmlFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl } from "../base/stream-formatter.mts";

/**
 * Streaming HTML formatter for handling large datasets efficiently.
 * Generates semantic HTML tables with proper structure.
 */
export class HtmlStreamFormatter extends StreamFormatterImpl {
  public readonly formatName = "html-stream";
  public readonly fileExtensions = [".html"];

  /**
   * Format the processed data into semantic HTML table.
   * This is used for non-streaming output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted HTML string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const htmlOptions = this._getHtmlOptions(options);
    const parts: string[] = [];

    // Opening table tag with optional attributes
    parts.push(this._buildTableOpenTag(htmlOptions));

    // Optional caption
    if (htmlOptions.caption) {
      parts.push(`  <caption>${this._escapeHtml(htmlOptions.caption)}</caption>`);
    }

    // Table header (thead)
    parts.push(this._formatTableHeader(data, htmlOptions));

    // Table body (tbody)
    parts.push(this._formatTableBody(data, htmlOptions));

    // Closing table tag
    parts.push("</table>");

    return parts.join("\n");
  }

  /**
   * Create a streaming HTML output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns A readable stream of HTML data.
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
   * @returns The table opening tags, caption, and thead.
   */
  protected _formatHeader(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const htmlOptions = this._getHtmlOptions(options);
    const parts: string[] = [];

    // Opening table tag
    parts.push(this._buildTableOpenTag(htmlOptions));

    // Optional caption
    if (htmlOptions.caption) {
      parts.push(`  <caption>${this._escapeHtml(htmlOptions.caption)}</caption>`);
    }

    // Table header
    const theadClass = htmlOptions.theadClass
      ? ` class="${this._escapeHtml(htmlOptions.theadClass)}"`
      : "";

    parts.push(`  <thead${theadClass}>`);
    parts.push("    <tr>");

    for (const header of data.headers) {
      const escapedHeader = this._escapeHtml(header);
      parts.push(`      <th scope="col">${escapedHeader}</th>`);
    }

    parts.push("    </tr>");
    parts.push("  </thead>");

    // Opening tbody tag
    const tbodyClass = htmlOptions.tbodyClass
      ? ` class="${this._escapeHtml(htmlOptions.tbodyClass)}"`
      : "";
    parts.push(`  <tbody${tbodyClass}>`);

    return parts.join("\n") + "\n";
  }

  /**
   * Format a batch of rows for streaming output.
   * @param rows - The batch of rows to format.
   * @param data - The complete table data (for context).
   * @param startIndex - The starting row index for this batch.
   * @param options - The formatting options.
   * @returns The formatted batch as HTML table rows.
   */
  protected _formatRowBatch(
    rows: RowData[],
    data: TableData,
    startIndex: number,
    options?: TablyfulOptions
  ): string {
    const parts: string[] = [];

    for (const row of rows) {
      parts.push("    <tr>");

      for (const header of data.headers) {
        const value = this._sanitizeValue(row[header]);
        const escapedValue = this._escapeHtml(value);
        parts.push(`      <td>${escapedValue}</td>`);
      }

      parts.push("    </tr>");
    }

    return parts.join("\n") + "\n";
  }

  /**
   * Format the footer section for streaming output.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The closing tbody and table tags.
   */
  protected _formatFooter(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    return "  </tbody>\n</table>";
  }

  /**
   * Join row values into a formatted string.
   * Not directly used for HTML but required by base class.
   * @param values - The sanitized and escaped values.
   * @param options - The formatting options.
   * @returns The joined row string.
   */
  protected _joinRowValues(
    values: string[],
    options?: TablyfulOptions
  ): string {
    return values.map((v) => `<td>${this._escapeHtml(v)}</td>`).join("");
  }

  /**
   * Build the opening table tag with optional attributes.
   * @param options - HTML formatting options.
   * @returns The opening table tag.
   */
  private _buildTableOpenTag(options: Required<HtmlFormatterOptions>): string {
    const attributes: string[] = [];

    if (options.tableClass) {
      attributes.push(`class="${this._escapeHtml(options.tableClass)}"`);
    }

    if (options.id) {
      attributes.push(`id="${this._escapeHtml(options.id)}"`);
    }

    const attrString = attributes.length > 0 ? " " + attributes.join(" ") : "";
    return `<table${attrString}>`;
  }

  /**
   * Format the table header section (thead).
   * @param data - The table data.
   * @param options - HTML formatting options.
   * @returns The formatted thead section.
   */
  private _formatTableHeader(
    data: TableData,
    options: Required<HtmlFormatterOptions>
  ): string {
    const parts: string[] = [];
    const theadClass = options.theadClass
      ? ` class="${this._escapeHtml(options.theadClass)}"`
      : "";

    parts.push(`  <thead${theadClass}>`);
    parts.push("    <tr>");

    for (const header of data.headers) {
      const escapedHeader = this._escapeHtml(header);
      parts.push(`      <th scope="col">${escapedHeader}</th>`);
    }

    parts.push("    </tr>");
    parts.push("  </thead>");

    return parts.join("\n");
  }

  /**
   * Format the table body section (tbody).
   * @param data - The table data.
   * @param options - HTML formatting options.
   * @returns The formatted tbody section.
   */
  private _formatTableBody(
    data: TableData,
    options: Required<HtmlFormatterOptions>
  ): string {
    const parts: string[] = [];
    const tbodyClass = options.tbodyClass
      ? ` class="${this._escapeHtml(options.tbodyClass)}"`
      : "";

    parts.push(`  <tbody${tbodyClass}>`);

    for (const row of data.rows) {
      parts.push("    <tr>");

      for (const header of data.headers) {
        const value = this._sanitizeValue(row[header]);
        const escapedValue = this._escapeHtml(value);
        parts.push(`      <td>${escapedValue}</td>`);
      }

      parts.push("    </tr>");
    }

    parts.push("  </tbody>");

    return parts.join("\n");
  }

  /**
   * Escape HTML special characters for safe output.
   * @param value - The string to escape.
   * @returns The escaped string.
   */
  private _escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Get HTML-specific options with defaults.
   * @param options - The general formatting options.
   * @returns The HTML options with defaults applied.
   */
  private _getHtmlOptions(
    options?: TablyfulOptions
  ): Required<HtmlFormatterOptions> {
    const htmlOptions = (options?.formatOptions as HtmlFormatterOptions) || {};

    return {
      tableClass: htmlOptions.tableClass || "",
      theadClass: htmlOptions.theadClass || "",
      tbodyClass: htmlOptions.tbodyClass || "",
      id: htmlOptions.id || "",
      caption: htmlOptions.caption || "",
    };
  }
}

/**
 * Factory function to create a streaming HTML formatter instance.
 * @returns A new streaming HTML formatter instance.
 */
export const createHtmlStreamFormatter = (): HtmlStreamFormatter =>
  new HtmlStreamFormatter();
