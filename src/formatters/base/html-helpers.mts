/**
 * Shared HTML formatting utilities.
 */

import type { HtmlFormatterOptions } from "@/types";
import { escapeHtml } from "./format-helpers.mts";

/**
 * Build the opening table tag with optional attributes.
 * @param options - HTML formatting options.
 * @returns The opening table tag.
 */
export const buildTableOpenTag = (
  options: Required<HtmlFormatterOptions>
): string => {
  const attributes = [
    ...(options.tableClass
      ? [`class="${escapeHtml(options.tableClass)}"`]
      : []),
    ...(options.id ? [`id="${escapeHtml(options.id)}"`] : []),
  ];

  const attrString = attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
  return `<table${attrString}>`;
};

/**
 * Format the table header section (thead).
 * @param headers - The column headers.
 * @param options - HTML formatting options.
 * @returns The formatted thead section.
 */
export const formatTableHeader = (
  headers: string[],
  options: Required<HtmlFormatterOptions>
): string => {
  const theadClass = options.theadClass
    ? ` class="${escapeHtml(options.theadClass)}"`
    : "";

  const headerCells = headers.map((header) => {
    const escapedHeader = escapeHtml(header);
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
};

/**
 * Format the table body section (tbody).
 * @param headers - The column headers.
 * @param rows - The table rows.
 * @param options - HTML formatting options.
 * @param sanitizeValue - Function to sanitize values.
 * @returns The formatted tbody section.
 */
export const formatTableBody = (
  headers: string[],
  rows: Record<string, unknown>[],
  options: Required<HtmlFormatterOptions>,
  sanitizeValue: (value: unknown) => string
): string => {
  const tbodyClass = options.tbodyClass
    ? ` class="${escapeHtml(options.tbodyClass)}"`
    : "";

  const rowLines = rows.flatMap((row) => {
    const cells = headers.map((header) => {
      const value = sanitizeValue(row[header]);
      const escapedValue = escapeHtml(value);
      return `      <td>${escapedValue}</td>`;
    });

    return ["    <tr>", ...cells, "    </tr>"];
  });

  const parts: string[] = [`  <tbody${tbodyClass}>`, ...rowLines, "  </tbody>"];

  return parts.join("\n");
};
