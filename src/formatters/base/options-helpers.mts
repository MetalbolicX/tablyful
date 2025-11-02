/**
 * Shared options parsing utilities for formatters.
 * Provides consistent default values and validation.
 */

import type {
  TablyfulOptions,
  CsvFormatterOptions,
  HtmlFormatterOptions,
  JsonFormatterOptions,
  MarkdownFormatterOptions,
  LatexFormatterOptions,
} from "@/types";

/**
 * Get CSV-specific options with defaults.
 * @param options - The general formatting options.
 * @returns The CSV options with defaults applied.
 */
export const getCsvOptions = (
  options?: TablyfulOptions
): Required<CsvFormatterOptions> => {
  const csvOptions = (options?.formatOptions as CsvFormatterOptions) || {};

  return {
    delimiter: csvOptions.delimiter || ",",
    quote: csvOptions.quote || '"',
    escape: csvOptions.escape || '"',
    lineBreak: csvOptions.lineBreak || "\n",
    includeHeaders: csvOptions.includeHeaders !== false, // Default to true
  };
};

/**
 * Get HTML-specific options with defaults.
 * @param options - The general formatting options.
 * @returns The HTML options with defaults applied.
 */
export const getHtmlOptions = (
  options?: TablyfulOptions
): Required<HtmlFormatterOptions> => {
  const htmlOptions = (options?.formatOptions as HtmlFormatterOptions) || {};

  return {
    tableClass: htmlOptions.tableClass || "",
    theadClass: htmlOptions.theadClass || "",
    tbodyClass: htmlOptions.tbodyClass || "",
    id: htmlOptions.id || "",
    caption: htmlOptions.caption || "",
  };
};

/**
 * Get JSON-specific options with defaults.
 * @param options - The general formatting options.
 * @returns The JSON options with defaults applied.
 */
export const getJsonOptions = (
  options?: TablyfulOptions
): Required<JsonFormatterOptions> => {
  const jsonOptions = (options?.formatOptions as JsonFormatterOptions) || {};

  return {
    pretty: jsonOptions.pretty !== false, // Default to true
    indentSize: jsonOptions.indentSize || 2,
    asArray: jsonOptions.asArray || false, // Default to objects
  };
};

/**
 * Get Markdown-specific options with defaults.
 * @param options - The general formatting options.
 * @returns The Markdown options with defaults applied.
 */
export const getMarkdownOptions = (
  options?: TablyfulOptions
): Required<MarkdownFormatterOptions> => {
  const mdOptions =
    (options?.formatOptions as MarkdownFormatterOptions) || {};

  return {
    align: mdOptions.align || "left",
    padding: mdOptions.padding !== false, // Default to true
    githubFlavor: mdOptions.githubFlavor !== false, // Default to true
  };
};

/**
 * Get LaTeX-specific options with defaults.
 * @param options - The general formatting options.
 * @returns The LaTeX options with defaults applied.
 */
export const getLatexOptions = (
  options?: TablyfulOptions
): Required<LatexFormatterOptions> => {
  const latexOptions =
    (options?.formatOptions as LatexFormatterOptions) || {};

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
};
