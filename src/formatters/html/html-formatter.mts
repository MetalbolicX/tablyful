import type { TableData, TablyfulOptions, HtmlFormatterOptions } from "@/types";
import { BaseFormatterImpl } from "@/formatters/base";

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

    const attrString = attributes.length > 0 ? " " + attributes.join(" ") : "";
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

    const rowLines = data.rows.flatMap((row) => {
      const cells = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        const escapedValue = this.#escapeHtml(value);
        return `      <td>${escapedValue}</td>`;
      });

      return ["    <tr>", ...cells, "    </tr>"];
    });

    const parts: string[] = [
      `  <tbody${tbodyClass}>`,
      ...rowLines,
      "  </tbody>",
    ];

    return parts.join("\n");
  }

  /**
   * Escape HTML special characters.
   * @param value - The string value to escape.
   * @returns The escaped string.
   */
  protected _escapeString(value: string): string {
    return this.#escapeHtml(value);
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
  #getHtmlOptions(
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
