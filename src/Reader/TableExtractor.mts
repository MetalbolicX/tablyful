import { unified } from "unified";
import rehypeParse from "rehype-parse";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toText } from "hast-util-to-text";

// ── Shared types ──────────────────────────────────────────────────────────────

interface ExtractedTable {
  headers: string[];
  rows: Record<string, string>[];
}

// ── HAST helpers (HTML) ───────────────────────────────────────────────────────

interface HastNode {
  type: string;
  tagName?: string;
  children?: HastNode[];
  value?: string;
  properties?: Record<string, unknown>;
}

/**
 * Recursively collects all nodes in a HAST subtree whose tagName matches the given tag.
 *
 * The function performs a pre-order traversal: it checks the provided node first,
 * then recursively searches its children (if any), accumulating matches into a flat array.
 * The tag comparison is strict (case-sensitive) against node.tagName.
 *
 * @param node - The root HastNode to search.
 * @param tag - The tag name to match (e.g., "table", "thead").
 * @returns An array of HastNode objects whose tagName equals the provided tag, in traversal order.
 *
 * @remarks
 * - Time complexity: O(n) where n is the number of nodes in the subtree.
 * - Uses recursion; very deep trees may risk call-stack limits.
 */
const findAll = (node: HastNode, tag: string): HastNode[] =>
  (node.children ?? []).reduce<HastNode[]>(
    (acc, child) => acc.concat(findAll(child, tag)),
    node.tagName === tag ? [node] : [],
  );

/**
 * Extracts and returns the textual content of a HAST node.
 *
 * Attempts to use the `toText` helper to produce a normalized text representation
 * and trims surrounding whitespace. If `toText` throws, falls back to a recursive
 * extraction:
 * - returns `node.value.trim()` if the node has a `value` property,
 * - otherwise recursively concatenates the text of `node.children` (no separator)
 *   and trims the result,
 * - returns an empty string for nodes with neither `value` nor `children`.
 *
 * The function swallows errors from `toText` and always returns a string.
 *
 * @param node - The HAST node to extract text from.
 * @returns The trimmed textual content for the given node (empty string if none).
 */
const hastText = (node: HastNode): string => {
  try {
    return toText(node as Parameters<typeof toText>[0]).trim();
  } catch {
    // Fallback: collect raw text values recursively
    if (node.value) return node.value.trim();
    if (!node.children) return "";
    return node.children.map((c) => hastText(c)).join("").trim();
  }
};

// ── HTML extraction ──────────────────────────────────────────────────────────

/**
 * Parse an HTML string and extract the first `<table>` as header+row records.
 *
 * The function looks for `<th>` elements inside `<thead>` (or the first `<tr>`)
 * to determine headers. Every subsequent `<tr>` contributes a data row.
 *
 * @param html - Raw HTML string that contains at least one `<table>`.
 * @returns An ExtractedTable with headers and rows.
 * @throws Error when no `<table>` element is found.
 */
export function extractHtmlTable(html: string): ExtractedTable {
  const tree = unified()
    .use(rehypeParse, { fragment: false })
    .parse(html) as unknown as HastNode;

  const tables = findAll(tree, "table");
  if (tables.length === 0) {
    throw new Error("No <table> element found in HTML input.");
  }

  const table = tables[0];
  const allRows = findAll(table, "tr");
  if (allRows.length === 0) {
    throw new Error("HTML <table> contains no rows.");
  }

  // Determine headers
  let headers: string[] = [];
  let dataStartIndex = 0;

  // Try <thead> first
  const theads = findAll(table, "thead");
  if (theads.length > 0) {
    const headerRow = findAll(theads[0], "tr")[0];
    if (headerRow) {
      const ths = findAll(headerRow, "th");
      if (ths.length > 0) {
        headers = ths.map((th) => hastText(th));
      } else {
        // thead might use <td> instead of <th>
        const tds = findAll(headerRow, "td");
        headers = tds.map((td) => hastText(td));
      }
    }
  }

  // Fallback: first row with <th> elements
  if (headers.length === 0) {
    for (let i = 0; i < allRows.length; i++) {
      const ths = findAll(allRows[i], "th");
      if (ths.length > 0) {
        headers = ths.map((th) => hastText(th));
        dataStartIndex = i + 1;
        break;
      }
    }
  }

  // Fallback: use first row as header
  if (headers.length === 0) {
    const firstRowCells = findAll(allRows[0], "td");
    headers = firstRowCells.map((td) => hastText(td));
    dataStartIndex = 1;
  }

  // Determine data rows (skip thead rows)
  const tbodies = findAll(table, "tbody");
  let dataRows: HastNode[];
  if (tbodies.length > 0) {
    dataRows = findAll(tbodies[0], "tr");
  } else {
    dataRows = allRows.slice(dataStartIndex);
  }

  // Build row records
  const rows: Record<string, string>[] = dataRows.map((tr) => {
    const cells = [...findAll(tr, "td"), ...findAll(tr, "th")];
    return headers.reduce<Record<string, string>>((row, header, i) => {
      row[header] = i < cells.length ? hastText(cells[i]) : "";
      return row;
    }, {});
  });

  return { headers, rows };
}

// ── mdast helpers (Markdown) ──────────────────────────────────────────────────

interface MdastNode {
  type: string;
  children?: MdastNode[];
  value?: string;
  align?: (string | null)[];
}

/**
 * Recursively searches an MDAST node tree and returns all nodes whose `type`
 * property matches the provided `type` string.
 *
 * The search is depth-first (preorder): the current node is checked before its
 * children. If the root `node` matches, it will be included in the returned
 * array.
 *
 * @param node - The root MDAST node to search. It is expected that nodes may
 *               have an optional `children` array containing more `MdastNode`s.
 * @param type - The node `type` value to match (e.g. "heading", "paragraph").
 * @returns An array of `MdastNode` objects whose `type` equals the provided
 *          `type`. Returns an empty array if no matches are found.
 *
 * @remarks
 * - Time complexity: O(n) where n is the number of nodes in the subtree rooted
 *   at `node`, since each node is visited at most once.
 * - Space complexity: O(n) in the worst case due to the results array and
 *   recursion stack.
 * - The function assumes well-formed MDAST nodes; if `children` is present it
 *   should be an iterable of `MdastNode`.
 *
 * @example
 * ```ts
 * const headings = mdastFindAll(rootNode, "heading");
 * ```
 */
const mdastFindAll = (node: MdastNode, type: string): MdastNode[] =>
  (node.children ?? []).reduce<MdastNode[]>(
    (acc, child) => acc.concat(mdastFindAll(child, type)),
    node.type === type ? [node] : [],
  );

/**
 * Extracts and concatenates plain text from an MDAST node.
 *
 * - If the node is a "text" or "inlineCode" node, returns its `value` (or an empty string if `value` is undefined).
 * - If the node has `children`, recursively concatenates the text of each child.
 * - Returns an empty string for nodes with no text value and no children.
 *
 * @param node - The MDAST node to extract text from.
 * @returns The concatenated textual content of the node and its descendants.
 */
const mdastText = (node: MdastNode): string => {
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  if (!node.children) return "";
  return node.children.map((c) => mdastText(c)).join("");
};

// ── Markdown extraction ─────────────────────────────────────────────────────

/**
 * Extracts the first Markdown table found in the provided Markdown string.
 *
 * Parses the Markdown using remark (with GFM support), locates the first table node,
 * treats the first table row as the header row, and converts subsequent rows into
 * objects mapping header names to cell text. Cell text is trimmed; missing cells are
 * represented as empty strings.
 *
 * @param md - The Markdown content to parse.
 * @returns An ExtractedTable containing `headers: string[]` and `rows: Record<string, string>[]`.
 * @throws Error if no table is found in the Markdown input or if the table contains no rows.
 *
 * @example
 * ```ts
 * const md = `
 * | Name  | Age |
 * |-------|-----|
 * | Alice | 30  |
 * | Bob   | 25  |
 * `;
 * const table = extractMarkdownTable(md);
 * // table.headers => ["Name", "Age"]
 * // table.rows => [{ Name: "Alice", Age: "30" }, { Name: "Bob", Age: "25" }]
 * ```
 */
export function extractMarkdownTable(md: string): ExtractedTable {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(md) as unknown as MdastNode;

  const tables = mdastFindAll(tree, "table");
  if (tables.length === 0) {
    throw new Error("No table found in Markdown input.");
  }

  const table = tables[0];
  const tableRows = (table.children ?? []).filter((c) => c.type === "tableRow");

  if (tableRows.length === 0) {
    throw new Error("Markdown table contains no rows.");
  }

  // First row is the header
  const headerRow = tableRows[0];
  const headers = (headerRow.children ?? [])
    .filter((c) => c.type === "tableCell")
    .map((cell) => mdastText(cell).trim());

  // Remaining rows are data
  const rows: Record<string, string>[] = tableRows.slice(1).map((r) => {
    const cells = (r.children ?? []).filter((c) => c.type === "tableCell");
    return headers.reduce<Record<string, string>>((row, header, i) => {
      row[header] = i < cells.length ? mdastText(cells[i]).trim() : "";
      return row;
    }, {});
  });

  return { headers, rows };
}

// ── LaTeX extraction ────────────────────────────────────────────────────────

/**
 * Unescapes common LaTeX escape sequences in a string to their literal characters.
 *
 * Performs targeted replacements for common LaTeX-escaped tokens and trims
 * leading/trailing whitespace:
 *  - \textbackslash{} -> "\"
 *  - \textasciitilde{} -> "~"
 *  - \textasciicircum{} -> "^"
 *  - \& -> "&"
 *  - \% -> "%"
 *  - \$ -> "$"
 *  - \# -> "#"
 *  - \_ -> "_"
 *  - \{ -> "{"
 *  - \} -> "}"
 *
 * @param text - The input string that may contain LaTeX escape sequences.
 * @returns The input with the above LaTeX escapes converted to their literal characters and trimmed.
 *
 * @remarks
 * - This function uses simple, order-dependent string replacements and does not perform full LaTeX parsing.
 * - It does not handle complex macros, contextual escaping, or other LaTeX constructs beyond the listed sequences.
 *
 * @example
 * ```ts
 * unescapeLatex("\\% 100\\%") // returns "% 100%"
 * unescapeLatex("\\textbackslash{}path\\_to\\_file") // returns "\path_to_file"
 * ```
 */
const unescapeLatex = (text: string): string =>
  text
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\textasciicircum\{\}/g, "^")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "$")
    .replace(/\\#/g, "#")
    .replace(/\\_/g, "_")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .trim();

/**
 * Extracts a simple table representation from a LaTeX tabular-like environment.
 *
 * The function looks for the first occurrence of a tabular-like environment
 * (\begin{tabular}, \begin{tabular*}, \begin{longtable}, or \begin{array})
 * and captures its inner body up to the matching \end{...}.
 *
 * Parsing behavior:
 * - The environment header may include an optional column specification
 *   (e.g. {lcr}) or other braces; these are ignored and only the body is used.
 * - Rows are split on LaTeX row separators (`\\`). Empty rows are ignored.
 * - Common rule commands (e.g. `\hline`, `\toprule`, `\midrule`, `\bottomrule`,
 *   and `\cline{...}`) are removed/ignored whether they appear on their own
 *   row or inline at the start of a row.
 * - The first remaining (non-rule) row is treated as the header row.
 * - Cells are split by the `&` column separator. Each cell is passed through
 *   `unescapeLatex` before being returned (caller must provide that helper).
 * - If a data row has fewer cells than the number of headers, missing cells
 *   are represented as empty strings.
 *
 * Returned structure:
 * - headers: string[] — the header cell texts, in order.
 * - rows: Record<string, string>[] — an array of objects mapping each header
 *   name to the corresponding cell text for that row.
 *
 * Errors:
 * - Throws if no supported tabular/array environment is found.
 * - Throws if the environment contains no data rows after filtering rules.
 *
 * Notes / limitations:
 * - This is a lightweight parser intended for simple tables. It does not
 *   fully parse nested braces, multirow/multicolumn constructs, or complex
 *   TeX macros. For complex tables (e.g. \multicolumn, \multirow, cell
 *   spanning), pre-processing or a more complete LaTeX parser is required.
 *
 * @param tex - The LaTeX source containing a tabular/longtable/array environment.
 * @returns An object with `headers` and `rows` representing the extracted table.
 */
export function extractLatexTable(tex: string): ExtractedTable {
  // Match \begin{tabular|longtable|array}...content...\end{same}
  const envPattern =
    /\\begin\{(tabular\*?|longtable|array)\}(?:\s*\{[^}]*\})*\s*([\s\S]*?)\\end\{\1\}/;
  const match = tex.match(envPattern);
  if (!match) {
    throw new Error(
      "No tabular/longtable/array environment found in LaTeX input.",
    );
  }

  const body = match[2];

  // Split body into rows by \\
  const rawRows = body
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter((r) => r !== "");

  // Filter out rule commands
  const rulePattern =
    /^\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})$/;
  const contentRows: string[] = rawRows
    // A row may start with a rule; strip it, then filter out empty/rule-only rows
    .map((raw) =>
      raw
        .replace(/\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})\s*/g, "")
        .trim(),
    )
    .filter((cleaned) => cleaned !== "" && !rulePattern.test(cleaned));

  if (contentRows.length === 0) {
    throw new Error("LaTeX tabular environment contains no data rows.");
  }

  // Split each row by & and unescape
  const parseRow = (line: string): string[] =>
    line.split("&").map((cell) => unescapeLatex(cell));

  // First row is the header
  const headers = parseRow(contentRows[0]);

  // Remaining are data rows
  const rows: Record<string, string>[] = contentRows
    .slice(1)
    .map((line) => {
      const cells = parseRow(line);
      return headers.reduce<Record<string, string>>((row, header, i) => {
        row[header] = i < cells.length ? cells[i] : "";
        return row;
      }, {});
    });

  return { headers, rows };
}
