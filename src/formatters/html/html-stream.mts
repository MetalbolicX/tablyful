import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  RowData,
} from "@/types";
import {
  StreamFormatterImpl,
  escapeHtml,
  getHtmlOptions,
  buildTableOpenTag,
  formatTableHeader,
  formatTableBody,
} from "@/formatters/base";

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

    const htmlOptions = getHtmlOptions(options);

    const parts: string[] = [
      buildTableOpenTag(htmlOptions),
      ...(htmlOptions.caption
        ? [`  <caption>${escapeHtml(htmlOptions.caption)}</caption>`]
        : []),
      formatTableHeader(data.headers, htmlOptions),
      formatTableBody(data.headers, data.rows, htmlOptions, this._sanitizeValue.bind(this)),
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
    const htmlOptions = getHtmlOptions(options);

    const captionPart = htmlOptions.caption
      ? [`  <caption>${escapeHtml(htmlOptions.caption)}</caption>`]
      : [];

    const theadClass = htmlOptions.theadClass
      ? ` class="${escapeHtml(htmlOptions.theadClass)}"`
      : "";

    const headerCells = data.headers.map((header) => {
      const escapedHeader = escapeHtml(header);
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
      ? ` class="${escapeHtml(htmlOptions.tbodyClass)}"`
      : "";
    const tbodyOpen = `  <tbody${tbodyClass}>`;

    const parts: string[] = [
      buildTableOpenTag(htmlOptions),
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
        const escapedValue = escapeHtml(value);
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
    return values.map((v) => `<td>${escapeHtml(v)}</td>`).join("");
  }
}

/**
 * Factory function to create a streaming HTML formatter instance.
 * @returns A new streaming HTML formatter instance.
 */
export const createHtmlStreamFormatter = (): HtmlStreamFormatter =>
  new HtmlStreamFormatter();
