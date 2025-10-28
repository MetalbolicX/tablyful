import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  LatexFormatterOptions,
  RowData,
} from "@/types";
import { StreamFormatterImpl } from "@/formatters/base";

/**
 * Streaming LaTeX formatter for handling large datasets efficiently.
 * Generates LaTeX tabular format tables.
 */
export class LatexStreamFormatter extends StreamFormatterImpl {
  public readonly formatName = "latex-stream";
  public readonly fileExtensions = [".tex", ".latex"];

  /**
   * Format the processed data into LaTeX table.
   * This is used for non-streaming output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns The formatted LaTeX string.
   */
  protected _formatData(data: TableData, options?: TablyfulOptions): string {
    this._validateData(data);

    const latexOptions = this.#getLatexOptions(options);
    let lines: string[] = [];

    // Add table environment if requested
    if (latexOptions.useTableEnvironment) {
      lines = [...lines, "\\begin{table}[h]"];
      if (latexOptions.centering) {
        lines = [...lines, "  \\centering"];
      }
    }

    // Begin tabular environment
    const columnSpec = this.#createColumnSpec(data.headers.length, latexOptions);
    const indent = latexOptions.useTableEnvironment ? "  " : "";
    lines = [...lines, `${indent}\\begin{tabular}{${columnSpec}}`];

    // Add top border if requested
    if (latexOptions.borders) {
      lines = [...lines, `${indent}  \\hline`];
    }

    // Header row
    if (latexOptions.includeHeader) {
      const headerLine = this.#formatHeaderRow(data.headers, latexOptions);
      lines = [...lines, `${indent}  ${headerLine}`];

      if (latexOptions.borders) {
        lines = [...lines, `${indent}  \\hline`];
      }
    }

    // Data rows
    for (const row of data.rows) {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return this.#escapeLaTeX(value);
      });
      const rowLine = this.#formatDataRow(values, latexOptions);
      lines = [...lines, `${indent}  ${rowLine}`];
    }

    // Add bottom border if requested
    if (latexOptions.borders) {
      lines = [...lines, `${indent}  \\hline`];
    }

    // End tabular environment
    lines = [...lines, `${indent}\\end{tabular}`];

    // Add caption and label if provided
    if (latexOptions.useTableEnvironment) {
      if (latexOptions.caption) {
        lines = [...lines, `  \\caption{${this.#escapeLaTeX(latexOptions.caption)}}`];
      }
      if (latexOptions.label) {
        lines = [...lines, `  \\label{${latexOptions.label}}`];
      }
      lines = [...lines, "\\end{table}"];
    }

    return lines.join("\n");
  }

  /**
   * Create a streaming LaTeX output.
   * @param data - The processed table data.
   * @param options - Optional formatting options.
   * @returns A readable stream of LaTeX data.
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
   * @returns The LaTeX preamble and header.
   */
  protected _formatHeader(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const latexOptions = this.#getLatexOptions(options);
    let lines: string[] = [];

    // Add table environment if requested
    if (latexOptions.useTableEnvironment) {
      lines = [...lines, "\\begin{table}[h]"];
      if (latexOptions.centering) {
        lines = [...lines, "  \\centering"];
      }
    }

    // Begin tabular environment
    const columnSpec = this.#createColumnSpec(data.headers.length, latexOptions);
    const indent = latexOptions.useTableEnvironment ? "  " : "";
    lines = [...lines, `${indent}\\begin{tabular}{${columnSpec}}`];

    // Add top border if requested
    if (latexOptions.borders) {
      lines = [...lines, `${indent}  \\hline`];
    }

    // Header row
    if (latexOptions.includeHeader) {
      const headerLine = this.#formatHeaderRow(data.headers, latexOptions);
      lines = [...lines, `${indent}  ${headerLine}`];

      if (latexOptions.borders) {
        lines = [...lines, `${indent}  \\hline`];
      }
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Format a batch of rows for streaming output.
   * @param rows - The batch of rows to format.
   * @param data - The complete table data (for context).
   * @param startIndex - The starting row index for this batch.
   * @param options - The formatting options.
   * @returns The formatted batch as LaTeX table rows.
   */
  protected _formatRowBatch(
    rows: RowData[],
    data: TableData,
    startIndex: number,
    options?: TablyfulOptions
  ): string {
    const latexOptions = this.#getLatexOptions(options);
    let lines: string[] = [];
    const indent = latexOptions.useTableEnvironment ? "    " : "  ";

    for (const row of rows) {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return this.#escapeLaTeX(value);
      });
      const rowLine = this.#formatDataRow(values, latexOptions);
      lines = [...lines, `${indent}${rowLine}`];
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Format the footer section for streaming output.
   * @param data - The table data.
   * @param options - The formatting options.
   * @returns The LaTeX table closing.
   */
  protected _formatFooter(
    data: TableData,
    options?: TablyfulOptions
  ): string | null {
    const latexOptions = this.#getLatexOptions(options);
    let lines: string[] = [];
    const indent = latexOptions.useTableEnvironment ? "  " : "";

    // Add bottom border if requested
    if (latexOptions.borders) {
      lines = [...lines, `${indent}  \\hline`];
    }

    // End tabular environment
    lines = [...lines, `${indent}\\end{tabular}`];

    // Add caption and label if provided
    if (latexOptions.useTableEnvironment) {
      if (latexOptions.caption) {
        lines = [...lines, `  \\caption{${this.#escapeLaTeX(latexOptions.caption)}}`];
      }
      if (latexOptions.label) {
        lines = [...lines, `  \\label{${latexOptions.label}}`];
      }
      lines = [...lines, "\\end{table}"];
    }

    return lines.join("\n");
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
    return values.join(" & ") + " \\\\";
  }

  /**
   * Create column specification for tabular environment.
   * @param columnCount - The number of columns.
   * @param options - LaTeX formatting options.
   * @returns The column specification string.
   */
  #createColumnSpec(
    columnCount: number,
    options: Required<LatexFormatterOptions>
  ): string {
    // Use custom column spec if provided
    if (options.columnSpec) {
      return options.columnSpec;
    }

    const alignChar = this.#getAlignmentChar(options.align);
    let columnSpecs: string[] = [];

    // Add left border if requested
    if (options.borders) {
      columnSpecs = [...columnSpecs, "|"];
    }

    // Add column specifications
    for (let i = 0; i < columnCount; i++) {
      if (options.borders) {
        columnSpecs = [...columnSpecs, alignChar, "|"];
      } else {
        columnSpecs = [...columnSpecs, alignChar];
      }
    }

    return columnSpecs.join("");
  }

  /**
   * Get LaTeX alignment character.
   * @param align - The alignment type.
   * @returns The LaTeX alignment character.
   */
  #getAlignmentChar(align: "left" | "center" | "right"): string {
    switch (align) {
      case "left":
        return "l";
      case "center":
        return "c";
      case "right":
        return "r";
      default:
        return "l";
    }
  }

  /**
   * Format the header row.
   * @param headers - The column headers.
   * @param options - LaTeX formatting options.
   * @returns The formatted header row.
   */
  #formatHeaderRow(
    headers: string[],
    options: Required<LatexFormatterOptions>
  ): string {
    const escapedHeaders = headers.map((h) => {
      const escaped = this.#escapeLaTeX(h);
      return options.boldHeaders ? `\\textbf{${escaped}}` : escaped;
    });
    return escapedHeaders.join(" & ") + " \\\\";
  }

  /**
   * Format a data row.
   * @param values - The cell values.
   * @param options - LaTeX formatting options.
   * @returns The formatted data row.
   */
  #formatDataRow(
    values: string[],
    options: Required<LatexFormatterOptions>
  ): string {
    return values.join(" & ") + " \\\\";
  }

  /**
   * Escape LaTeX special characters.
   * @param value - The string to escape.
   * @returns The escaped string.
   */
  #escapeLaTeX(value: string): string {
    // LaTeX special characters: # $ % & ~ _ ^ \ { }
    const escapeMap: Record<string, string> = {
      "\\": "\\textbackslash{}",
      "#": "\\#",
      "$": "\\$",
      "%": "\\%",
      "&": "\\&",
      "~": "\\textasciitilde{}",
      "_": "\\_",
      "^": "\\textasciicircum{}",
      "{": "\\{",
      "}": "\\}",
    };

    // First handle backslash specially to avoid double-escaping
    let escaped = value.replace(/\\/g, "\\textbackslash{}");

    // Then handle other special characters
    for (const [char, replacement] of Object.entries(escapeMap)) {
      if (char !== "\\") {
        escaped = escaped.replace(new RegExp("\\" + char, "g"), replacement);
      }
    }

    // Handle newlines
    escaped = escaped.replace(/\n/g, " \\\\ ");
    escaped = escaped.replace(/\r/g, "");

    return escaped;
  }

  /**
   * Get LaTeX-specific options with defaults.
   * @param options - The general formatting options.
   * @returns The LaTeX options with defaults applied.
   */
  #getLatexOptions(
    options?: TablyfulOptions
  ): Required<LatexFormatterOptions> {
    const latexOptions = (options?.formatOptions as LatexFormatterOptions) || {};

    return {
      align: latexOptions.align || "left",
      borders: latexOptions.borders !== false, // Default to true
      boldHeaders: latexOptions.boldHeaders !== false, // Default to true
      includeHeader: latexOptions.includeHeader !== false, // Default to true
      useTableEnvironment: latexOptions.useTableEnvironment !== false, // Default to true
      centering: latexOptions.centering !== false, // Default to true
      tableEnvironment: latexOptions.tableEnvironment || "table",
      columnSpec: latexOptions.columnSpec || "",
      booktabs: latexOptions.booktabs || false,
      caption: latexOptions.caption || "",
      label: latexOptions.label || "",
    };
  }
}

/**
 * Factory function to create a streaming LaTeX formatter instance.
 * @returns A new streaming LaTeX formatter instance.
 */
export const createLatexStreamFormatter = (): LatexStreamFormatter =>
  new LatexStreamFormatter();
