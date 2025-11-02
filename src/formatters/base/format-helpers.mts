/**
 * Shared formatting utilities for all formatters.
 * Provides common escaping and formatting operations.
 */

/**
 * Escape HTML special characters for safe output.
 * @param value - The string to escape.
 * @returns The escaped string.
 */
export const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

/**
 * Escape Markdown special characters.
 * Specifically handles pipe characters which break table structure.
 * @param value - The string to escape.
 * @returns The escaped string.
 */
export const escapeMarkdown = (value: string): string => {
  // Escape pipe characters as they break table structure
  let escaped = value.replace(/\|/g, "\\|");

  // Escape backslashes before pipes
  escaped = escaped.replace(/\\\|/g, "\\\\|");

  // Replace newlines with <br> for inline content
  escaped = escaped.replace(/\n/g, "<br>");
  escaped = escaped.replace(/\r/g, "");

  return escaped;
};

/**
 * Escape LaTeX special characters.
 * @param value - The string to escape.
 * @returns The escaped string.
 */
export const escapeLatex = (value: string): string => {
  // LaTeX special characters: # $ % & ~ _ ^ \ { }
  const escapeMap: Record<string, string> = {
    "\\": "\\textbackslash{}",
    "#": "\\#",
    $: "\\$",
    "%": "\\%",
    "&": "\\&",
    "~": "\\textasciitilde{}",
    _: "\\_",
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
};

/**
 * Format a CSV value with proper quoting and escaping.
 * @param value - The string value to format.
 * @param delimiter - The CSV delimiter.
 * @param quote - The quote character.
 * @param escape - The escape character.
 * @returns The formatted and escaped CSV value.
 */
export const formatCsvValue = (
  value: string,
  delimiter: string,
  quote: string,
  escape: string
): string => {
  // Check if value needs quoting
  const needsQuoting =
    value.includes(delimiter) ||
    value.includes(quote) ||
    value.includes("\n") ||
    value.includes("\r");

  if (!needsQuoting) {
    return value;
  }

  // Escape quote characters in the value
  const escapedValue = value.replace(new RegExp(quote, "g"), escape + quote);

  // Wrap in quotes
  return `${quote}${escapedValue}${quote}`;
};

/**
 * Create a markdown column separator with alignment markers.
 * @param align - The alignment type.
 * @returns The separator string.
 */
export const createMarkdownSeparator = (
  align: "left" | "center" | "right"
): string => {
  switch (align) {
    case "left":
      return ":---";
    case "center":
      return ":---:";
    case "right":
      return "---:";
    default:
      return "---";
  }
};

/**
 * Join markdown table cells with proper formatting.
 * @param cells - The cell values.
 * @param padding - Whether to add padding around cells.
 * @returns The joined row string.
 */
export const joinMarkdownCells = (
  cells: string[],
  padding: boolean
): string => {
  if (padding) {
    const paddedCells = cells.map((cell) => ` ${cell} `);
    return `|${paddedCells.join("|")}|`;
  }

  return `|${cells.join("|")}|`;
};

/**
 * Get LaTeX alignment character from alignment type.
 * @param align - The alignment type.
 * @returns The LaTeX alignment character.
 */
export const getLatexAlignmentChar = (
  align: "left" | "center" | "right"
): string => {
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
};

/**
 * Create LaTeX column specification for tabular environment.
 * @param columnCount - The number of columns.
 * @param align - The alignment type.
 * @param borders - Whether to include borders.
 * @param customSpec - Optional custom column specification.
 * @returns The column specification string.
 */
export const createLatexColumnSpec = (
  columnCount: number,
  align: "left" | "center" | "right",
  borders: boolean,
  customSpec?: string
): string => {
  if (customSpec) {
    return customSpec;
  }

  const alignChar = getLatexAlignmentChar(align);
  let columnSpecs: string[] = [];

  // Add left border if requested
  if (borders) {
    columnSpecs = [...columnSpecs, "|"];
  }

  // Add column specifications
  for (let i = 0; i < columnCount; i++) {
    if (borders) {
      columnSpecs = [...columnSpecs, alignChar, "|"];
    } else {
      columnSpecs = [...columnSpecs, alignChar];
    }
  }

  return columnSpecs.join("");
};
