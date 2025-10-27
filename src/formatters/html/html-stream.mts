import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  HtmlFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl } from "@/formatters/base";

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

    const htmlOptions = this.#getHtmlOptions(options);

    const parts: string[] = [
      this.#buildTableOpenTag(htmlOptions),
      ...(htmlOptions.caption
        ? [`  <caption>${this.#escapeHtml(htmlOptions.caption)}</caption>`]
        : []),
      this.#formatTableHeader(data, htmlOptions),
      this.#formatTableBody(data, htmlOptions),
      "</table>",
    ];

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
    const htmlOptions = this.#getHtmlOptions(options);

    const captionPart = htmlOptions.caption
      ? [`  <caption>${this.#escapeHtml(htmlOptions.caption)}</caption>`]
      : [];

    const theadClass = htmlOptions.theadClass
      ? ` class="${this.#escapeHtml(htmlOptions.theadClass)}"`
      : "";

    const headerCells = data.headers.map((header) => {
      const escapedHeader = this.#escapeHtml(header);
      return `      <th scope="col">${escapedHeader}</th>`;
    });

    const theadParts = [
      `  <thead${theadClass}>`,
      "    <tr>",
      ...headerCells,
      "    </tr>",
      "  </thead>",
    ];

    const tbodyClass = htmlOptions.tbodyClass
      ? ` class="${this.#escapeHtml(htmlOptions.tbodyClass)}"`
      : "";
    const tbodyOpen = `  <tbody${tbodyClass}>`;

    const parts: string[] = [
      this.#buildTableOpenTag(htmlOptions),
      ...captionPart,
      ...theadParts,
      tbodyOpen,
    ];

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
    let parts: string[] = [];

    for (const row of rows) {
      const cellParts = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        const escapedValue = this.#escapeHtml(value);
        return `      <td>${escapedValue}</td>`;
      });

      parts = [...parts, "    <tr>", ...cellParts, "    </tr>"];
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
    return values.map((v) => `<td>${this.#escapeHtml(v)}</td>`).join("");
  }

  /**
   * Build the opening table tag with optional attributes.
   * @param options - HTML formatting options.
   * @returns The opening table tag.
   */
  #buildTableOpenTag(options: Required<HtmlFormatterOptions>): string {
    const attributes = [
      ...(options.tableClass
        ? [`class="${this.#escapeHtml(options.tableClass)}"`]
        : []),
      ...(options.id ? [`id="${this.#escapeHtml(options.id)}"`] : []),
    ];

    const attrString = attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
    return `<table${attrString}>`;
  }

  /**
   * Format the table header section (thead).
   * @param data - The table data.
   * @param options - HTML formatting options.
   * @returns The formatted thead section.
   */
  #formatTableHeader(
    data: TableData,
    options: Required<HtmlFormatterOptions>
  ): string {
    const theadClass = options.theadClass
      ? ` class="${this.#escapeHtml(options.theadClass)}"`
      : "";

    const headerCells = data.headers.map((header) => {
      const escapedHeader = this.#escapeHtml(header);
      return `      <th scope="col">${escapedHeader}</th>`;
    });

    const parts: string[] = [
      `  <thead${theadClass}>`,
      "    <tr>",
      ...headerCells,
      "    </tr>",
      "  </thead>",
    ];

    return parts.join("\n");
  }

  /**
   * Format the table body section (tbody).
   * @param data - The table data.
   * @param options - HTML formatting options.
   * @returns The formatted tbody section.
   */
  #formatTableBody(
    data: TableData,
    options: Required<HtmlFormatterOptions>
  ): string {
    const tbodyClass = options.tbodyClass
      ? ` class="${this.#escapeHtml(options.tbodyClass)}"`
      : "";

    const rowsParts = data.rows.flatMap((row) => {
      const cellParts = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        const escapedValue = this.#escapeHtml(value);
        return `      <td>${escapedValue}</td>`;
      });

      return ["    <tr>", ...cellParts, "    </tr>"];
    });

    const parts: string[] = [
      `  <tbody${tbodyClass}>`,
      ...rowsParts,
      "  </tbody>",
    ];

    return parts.join("\n");
  }

  /**
   * Escape HTML special characters for safe output.
   * @param value - The string to escape.
   * @returns The escaped string.
   */
  #escapeHtml(value: string): string {
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
  #getHtmlOptions(options?: TablyfulOptions): Required<HtmlFormatterOptions> {
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
