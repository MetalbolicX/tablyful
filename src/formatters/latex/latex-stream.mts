import type {
  TableData,
  TablyfulOptions,
  ReadableStream,
  LatexFormatterOptions,
  RowData,
} from "@/types";
import {
  StreamFormatterImpl,
  escapeLatex,
  getLatexOptions,
  createLatexColumnSpec,
} from "@/formatters/base";

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

    const latexOptions = getLatexOptions(options);
    let lines: string[] = [];

    // Add table environment if requested
    if (latexOptions.useTableEnvironment) {
      lines = [...lines, "\\begin{table}[h]"];
      if (latexOptions.centering) {
        lines = [...lines, "  \\centering"];
      }
    }

    // Begin tabular environment
    const columnSpec = createLatexColumnSpec(
      data.headers.length,
      latexOptions.align,
      latexOptions.borders,
      latexOptions.columnSpec
    );
    const indent = latexOptions.useTableEnvironment ? "  " : "";
    lines = [...lines, `${indent}\\begin{tabular}{${columnSpec}}`];

    // Add top border if requested
    if (latexOptions.borders) {
      lines = [...lines, `${indent}  \\hline`];
    }

    // Header row
    if (latexOptions.includeHeader) {
      const escapedHeaders = data.headers.map((h) => {
        const escaped = escapeLatex(h);
        return latexOptions.boldHeaders ? `\\textbf{${escaped}}` : escaped;
      });
      const headerLine = escapedHeaders.join(" & ") + " \\\\";
      lines = [...lines, `${indent}  ${headerLine}`];

      if (latexOptions.borders) {
        lines = [...lines, `${indent}  \\hline`];
      }
    }

    // Data rows
    for (const row of data.rows) {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return escapeLatex(value);
      });
      const rowLine = values.join(" & ") + " \\\\";
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
        lines = [...lines, `  \\caption{${escapeLatex(latexOptions.caption)}}`];
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
    const latexOptions = getLatexOptions(options);
    let lines: string[] = [];

    // Add table environment if requested
    if (latexOptions.useTableEnvironment) {
      lines = [...lines, "\\begin{table}[h]"];
      if (latexOptions.centering) {
        lines = [...lines, "  \\centering"];
      }
    }

    // Begin tabular environment
    const columnSpec = createLatexColumnSpec(
      data.headers.length,
      latexOptions.align,
      latexOptions.borders,
      latexOptions.columnSpec
    );
    const indent = latexOptions.useTableEnvironment ? "  " : "";
    lines = [...lines, `${indent}\\begin{tabular}{${columnSpec}}`];

    // Add top border if requested
    if (latexOptions.borders) {
      lines = [...lines, `${indent}  \\hline`];
    }

    // Header row
    if (latexOptions.includeHeader) {
      const escapedHeaders = data.headers.map((h) => {
        const escaped = escapeLatex(h);
        return latexOptions.boldHeaders ? `\\textbf{${escaped}}` : escaped;
      });
      const headerLine = escapedHeaders.join(" & ") + " \\\\";
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
    const latexOptions = getLatexOptions(options);
    let lines: string[] = [];
    const indent = latexOptions.useTableEnvironment ? "    " : "  ";

    for (const row of rows) {
      const values = data.headers.map((header) => {
        const value = this._sanitizeValue(row[header]);
        return escapeLatex(value);
      });
      const rowLine = values.join(" & ") + " \\\\";
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
    const latexOptions = getLatexOptions(options);
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
        lines = [...lines, `  \\caption{${escapeLatex(latexOptions.caption)}}`];
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
}

/**
 * Factory function to create a streaming LaTeX formatter instance.
 * @returns A new streaming LaTeX formatter instance.
 */
export const createLatexStreamFormatter = (): LatexStreamFormatter =>
  new LatexStreamFormatter();
