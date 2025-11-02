import type { TableData, TablyfulOptions } from "@/types";
import {
  BaseFormatterImpl,
  escapeHtml,
  getHtmlOptions,
  buildTableOpenTag,
  formatTableHeader,
  formatTableBody,
} from "@/formatters/base";

/**
 * HTML formatter for converting table data to semantic HTML tables.
 * Generates proper table structure with thead, tbody, and optional caption.
 */
export class HtmlFormatter extends BaseFormatterImpl {
  public readonly formatName = "html";
  public readonly fileExtensions = [".html"];

  /**
   * Format the processed data into semantic HTML table.
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
      formatTableBody(
        data.headers,
        data.rows,
        htmlOptions,
        this._sanitizeValue.bind(this)
      ),
      "</table>",
    ];

    return parts.join("\n");
  }

  /**
   * Escape HTML special characters.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    return escapeHtml(value);
  }
}

/**
 * Factory function to create an HTML formatter instance.
 * @returns A new HTML formatter instance.
 */
export const createHtmlFormatter = (): HtmlFormatter => new HtmlFormatter();
