import type {
  TableData,
  TablyfulOptions,
  HtmlFormatterOptions,
} from "@/types";
import { BaseFormatterImpl } from "../base/base-formatter.mts";

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
   * Escape HTML special characters.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    return this._escapeHtml(value);
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
 * Factory function to create an HTML formatter instance.
 * @returns A new HTML formatter instance.
 */
export const createHtmlFormatter = (): HtmlFormatter => new HtmlFormatter();
