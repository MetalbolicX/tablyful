import type {
  TableData,
  TablyfulOptions,
  LatexFormatterOptions,
} from "@/types";
import {
  BaseFormatterImpl,
  escapeLatex,
  getLatexOptions,
  getLatexAlignmentChar,
  createLatexColumnSpec,
} from "@/formatters/base";

/**
 * LaTeX formatter for converting table data to LaTeX tabular format.
 * Generates properly formatted LaTeX tables with optional styling.
 */
export class LatexFormatter extends BaseFormatterImpl {
  public readonly formatName = "latex";
  public readonly fileExtensions = [".tex", ".latex"];

  /**
   * Format the processed data into LaTeX table.
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
        lines = [
          ...lines,
          `  \\caption{${escapeLatex(latexOptions.caption)}}`,
        ];
      }
      if (latexOptions.label) {
        lines = [...lines, `  \\label{${latexOptions.label}}`];
      }
      lines = [...lines, "\\end{table}"];
    }

    return lines.join("\n");
  }
}

/**
 * Factory function to create a LaTeX formatter instance.
 * @returns A new LaTeX formatter instance.
 */
export const createLatexFormatter = (): LatexFormatter => new LatexFormatter();
