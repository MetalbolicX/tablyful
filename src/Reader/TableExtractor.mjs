import { unified } from "unified";
import rehypeParse from "rehype-parse";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toText } from "hast-util-to-text";
import { parse as parseYaml } from "yaml";
import { XMLParser } from "fast-xml-parser";
let htmlProcessor = null;
let markdownProcessor = null;
let xmlParser = null;
const getHtmlProcessor = () => {
    if (htmlProcessor !== null)
        return htmlProcessor;
    htmlProcessor = unified().use(rehypeParse, { fragment: false });
    return htmlProcessor;
};
const getMarkdownProcessor = () => {
    if (markdownProcessor !== null)
        return markdownProcessor;
    markdownProcessor = unified().use(remarkParse).use(remarkGfm);
    return markdownProcessor;
};
const getXmlParser = () => {
    if (xmlParser !== null)
        return xmlParser;
    xmlParser = new XMLParser({
        ignoreAttributes: true,
        isArray: (_name, _jpath, isLeafNode) => !isLeafNode,
    });
    return xmlParser;
};
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
const findAll = (node, tag) => (node.children ?? []).reduce((acc, child) => acc.concat(findAll(child, tag)), node.tagName === tag ? [node] : []);
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
const hastText = (node) => {
    try {
        return toText(node).trim();
    }
    catch {
        // Fallback: collect raw text values recursively
        if (node.value)
            return node.value.trim();
        if (!node.children)
            return "";
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
export function extractHtmlTable(html) {
    const tree = getHtmlProcessor().parse(html);
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
    let headers = [];
    let dataStartIndex = 0;
    // Try <thead> first
    const theads = findAll(table, "thead");
    if (theads.length > 0) {
        const headerRow = findAll(theads[0], "tr")[0];
        if (headerRow) {
            const ths = findAll(headerRow, "th");
            if (ths.length > 0) {
                headers = ths.map((th) => hastText(th));
            }
            else {
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
    let dataRows;
    if (tbodies.length > 0) {
        dataRows = findAll(tbodies[0], "tr");
    }
    else {
        dataRows = allRows.slice(dataStartIndex);
    }
    // Build row records
    const rows = dataRows.map((tr) => {
        const cells = [...findAll(tr, "td"), ...findAll(tr, "th")];
        return headers.reduce((row, header, i) => {
            row[header] = i < cells.length ? hastText(cells[i]) : "";
            return row;
        }, {});
    });
    return { headers, rows };
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
const mdastFindAll = (node, type) => (node.children ?? []).reduce((acc, child) => acc.concat(mdastFindAll(child, type)), node.type === type ? [node] : []);
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
const mdastText = (node) => {
    if (node.type === "text" || node.type === "inlineCode")
        return node.value ?? "";
    if (!node.children)
        return "";
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
export function extractMarkdownTable(md) {
    const tree = getMarkdownProcessor().parse(md);
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
    const rows = tableRows.slice(1).map((r) => {
        const cells = (r.children ?? []).filter((c) => c.type === "tableCell");
        return headers.reduce((row, header, i) => {
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
const unescapeLatex = (text) => text
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
export function extractLatexTable(tex) {
    // Match \begin{tabular|longtable|array}...content...\end{same}
    const envPattern = /\\begin\{(tabular\*?|longtable|array)\}(?:\s*\{[^}]*\})*\s*([\s\S]*?)\\end\{\1\}/;
    const match = tex.match(envPattern);
    if (!match) {
        throw new Error("No tabular/longtable/array environment found in LaTeX input.");
    }
    const body = match[2];
    // Split body into rows by \\
    const rawRows = body
        .split(/\\\\/)
        .map((r) => r.trim())
        .filter((r) => r !== "");
    // Filter out rule commands
    const rulePattern = /^\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})$/;
    const contentRows = rawRows
        // A row may start with a rule; strip it, then filter out empty/rule-only rows
        .map((raw) => raw
        .replace(/\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})\s*/g, "")
        .trim())
        .filter((cleaned) => cleaned !== "" && !rulePattern.test(cleaned));
    if (contentRows.length === 0) {
        throw new Error("LaTeX tabular environment contains no data rows.");
    }
    // Split each row by & and unescape
    const parseRow = (line) => line.split("&").map((cell) => unescapeLatex(cell));
    // First row is the header
    const headers = parseRow(contentRows[0]);
    // Remaining are data rows
    const rows = contentRows
        .slice(1)
        .map((line) => {
        const cells = parseRow(line);
        return headers.reduce((row, header, i) => {
            row[header] = i < cells.length ? cells[i] : "";
            return row;
        }, {});
    });
    return { headers, rows };
}
// ── YAML extraction ─────────────────────────────────────────────────────────
/**
 * Extracts a table from YAML content.
 *
 * Supported shapes:
 * 1. Array of objects: `[{ name: "Alice", age: 30 }, ...]`
 * 2. Object of arrays: `{ name: ["Alice", "Bob"], age: [30, 25] }`
 *
 * @param input - Raw YAML string.
 * @returns An ExtractedTable with headers and rows.
 * @throws Error when the YAML does not contain a recognizable table shape.
 */
export function extractYamlTable(input) {
    const data = parseYaml(input);
    // Shape 1: array of objects
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null && !Array.isArray(data[0])) {
        const records = data;
        const headerSet = new Set();
        for (const row of records) {
            for (const key of Object.keys(row)) {
                headerSet.add(key);
            }
        }
        const headers = [...headerSet];
        const rows = records.map((record) => headers.reduce((row, header) => {
            const val = record[header];
            row[header] = val === null || val === undefined ? "" : String(val);
            return row;
        }, {}));
        return { headers, rows };
    }
    // Shape 2: object of arrays
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
        const obj = data;
        const entries = Object.entries(obj);
        const arrayEntries = entries.filter(([, v]) => Array.isArray(v));
        if (arrayEntries.length > 0) {
            const headers = arrayEntries.map(([k]) => k);
            const maxLen = Math.max(...arrayEntries.map(([, v]) => v.length));
            const rows = Array.from({ length: maxLen }, (_, i) => arrayEntries.reduce((row, [key, values]) => {
                const arr = values;
                const val = i < arr.length ? arr[i] : undefined;
                row[key] = val === null || val === undefined ? "" : String(val);
                return row;
            }, {}));
            return { headers, rows };
        }
    }
    throw new Error("YAML content does not contain a recognizable table (expected array of objects or object of arrays).");
}
// ── XML extraction ──────────────────────────────────────────────────────────
/**
 * Recursively searches the given value for the first "flat" array of objects and returns it.
 *
 * A "flat" array matches all of the following:
 * - The value is an Array.
 * - Every element is a non-null, non-Array object (i.e. Record<string, unknown>).
 * - For every object element, each property value is either null or not of type "object"
 *   (e.g. primitives or functions — any typeof !== "object").
 *
 * The search is depth-first and visits object entries (or array indices) in their natural order.
 * The function returns the original array reference (no cloning).
 *
 * @param node - Any value to search through.
 * @returns The first array satisfying the "flat" criteria, or null if none is found.
 *
 * @example
 * ```ts
 * const data = {
 *   meta: { count: 2 },
 *   items: [
 *     { id: 1, name: "Alice" },
 *     { id: 2, name: "Bob" },
 *   ],
 * };
 * findFirstFlatArray(data); // returns the items array
 * ```
 */
const findFirstFlatArray = (node) => {
    if (Array.isArray(node)) {
        if (node.length > 0 &&
            node.every((item) => typeof item === "object" &&
                item !== null &&
                !Array.isArray(item) &&
                Object.values(item).every((v) => v === null || typeof v !== "object"))) {
            return node;
        }
    }
    if (typeof node === "object" && node !== null) {
        const entries = Array.isArray(node)
            ? node.map((v, i) => [String(i), v])
            : Object.entries(node);
        for (const [, value] of entries) {
            const result = findFirstFlatArray(value);
            if (result)
                return result;
        }
    }
    return null;
};
/**
 * Extracts a tabular representation from an XML string.
 *
 * Parses the provided XML and locates the first repeated element sequence that represents
 * a table (i.e., an array of objects with flat child elements). It collects the union of
 * child element names as headers and constructs rows where every cell is converted to a string.
 *
 * @param input - XML content to parse.
 * @returns An ExtractedTable with:
 *  - headers: string[] — list of column names derived from the union of keys across records.
 *  - rows: Record<string, string>[] — array of row objects mapping each header to a string value
 *    (null/undefined values are converted to the empty string).
 *
 * Behavior notes:
 *  - XML attributes are ignored during parsing.
 *  - Non-leaf nodes are treated as arrays when detecting repeated record elements.
 *  - Header order reflects insertion order based on encountered keys but is not otherwise guaranteed.
 *
 * @throws Error If no table-like structure (repeated elements with flat children) is found or if the detected table is empty.
 */
export function extractXmlTable(input) {
    const parsed = getXmlParser().parse(input);
    const records = findFirstFlatArray(parsed);
    if (!records || records.length === 0) {
        throw new Error("No table-like structure found in XML input (expected repeated elements with flat children).");
    }
    const headerSet = new Set();
    for (const row of records) {
        for (const key of Object.keys(row)) {
            headerSet.add(key);
        }
    }
    const headers = [...headerSet];
    const rows = records.map((record) => headers.reduce((row, header) => {
        const val = record[header];
        row[header] = val === null || val === undefined ? "" : String(val);
        return row;
    }, {}));
    return { headers, rows };
}
// ── SQL extraction ──────────────────────────────────────────────────────────
/**
 * Parse a single SQL value starting at the given position in a SQL string.
 *
 * Skips leading whitespace from startPos, then parses either:
 * - A single-quoted string (handles SQL-style escaped quotes as two single quotes: `''`),
 *   returning the unescaped string and the index immediately after the closing quote
 *   (or end-of-input if the quote is unterminated).
 * - An unquoted token which ends at a comma, closing parenthesis, or any whitespace.
 *   Unquoted tokens may be identifiers, numbers, placeholders like `?`, or literals.
 *   Special-case mappings (case-insensitive):
 *     - `NULL` -> `""` (empty string)
 *     - `TRUE` -> `"true"`
 *     - `FALSE` -> `"false"`
 *
 * If startPos is at or past the end of the input, returns an empty value and the
 * original/advanced position.
 *
 * @param sql - The full SQL string to parse from.
 * @param startPos - The index within `sql` at which to begin parsing.
 * @returns A tuple where:
 *   - [0] is the parsed value as a string (unescaped for quoted strings; mapped for NULL/TRUE/FALSE),
 *   - [1] is the index in `sql` immediately after the parsed token (for quoted strings, after the closing quote;
 *         for unquoted tokens, at the delimiter which stopped the scan).
 *
 * @example
 * ```ts
 * parseSqlValue("  'O''Reilly', next", 0) // returns ["O'Reilly", 12]
 * parseSqlValue("  NULL, next", 0) // returns ["", 6]
 * ```
 */
const parseSqlValue = (sql, startPos) => {
    let pos = startPos;
    const len = sql.length;
    // Skip whitespace
    while (pos < len && (sql[pos] === " " || sql[pos] === "\t" || sql[pos] === "\n" || sql[pos] === "\r")) {
        pos++;
    }
    if (pos >= len)
        return ["", pos];
    // Single-quoted string
    if (sql[pos] === "'") {
        pos++; // skip opening quote
        let value = "";
        while (pos < len) {
            if (sql[pos] === "'") {
                // Check for escaped quote ''
                if (pos + 1 < len && sql[pos + 1] === "'") {
                    value += "'";
                    pos += 2;
                }
                else {
                    pos++; // skip closing quote
                    return [value, pos];
                }
            }
            else {
                value += sql[pos];
                pos++;
            }
        }
        return [value, pos];
    }
    // Unquoted token: NULL, TRUE, FALSE, number, or ? placeholder
    let token = "";
    while (pos < len && sql[pos] !== "," && sql[pos] !== ")" && sql[pos] !== " " && sql[pos] !== "\t" && sql[pos] !== "\n" && sql[pos] !== "\r") {
        token += sql[pos];
        pos++;
    }
    const upper = token.toUpperCase();
    if (upper === "NULL")
        return ["", pos];
    if (upper === "TRUE")
        return ["true", pos];
    if (upper === "FALSE")
        return ["false", pos];
    return [token, pos];
};
/**
 * Parses a parenthesized SQL tuple from a SQL string starting at a given index.
 *
 * Finds the next '(' at or after `startPos`, then reads a comma-separated list of
 * values using `parseSqlValue`, skipping whitespace between tokens. Parsing stops when
 * a matching closing ')' is encountered.
 *
 * @param sql - The SQL input string to parse.
 * @param startPos - The index in `sql` at which to begin searching for the opening '('.
 * @returns A tuple `[values, nextPos]` where:
 *  - `values` is an array of strings produced by `parseSqlValue` for each tuple element.
 *  - `nextPos` is the index in `sql` immediately after the closing ')' if one was found.
 *    If no opening '(' is found, an empty array and the position where the search ended is returned.
 *    If the tuple is unterminated, `nextPos` will typically be `sql.length`.
 *
 * @remarks
 * - Whitespace around tokens and commas is ignored.
 * - The function itself does not interpret value contents; handling of quoted strings,
 *   nested structures, or other SQL value forms depends on `parseSqlValue`.
 */
const parseSqlTuple = (sql, startPos) => {
    let pos = startPos;
    const len = sql.length;
    // Find opening paren
    while (pos < len && sql[pos] !== "(")
        pos++;
    if (pos >= len)
        return [[], pos];
    pos++; // skip '('
    const values = [];
    while (pos < len) {
        // Skip whitespace
        while (pos < len && (sql[pos] === " " || sql[pos] === "\t" || sql[pos] === "\n" || sql[pos] === "\r"))
            pos++;
        if (sql[pos] === ")") {
            pos++; // skip ')'
            return [values, pos];
        }
        const [value, newPos] = parseSqlValue(sql, pos);
        values.push(value);
        pos = newPos;
        // Skip whitespace and comma
        while (pos < len && (sql[pos] === " " || sql[pos] === "\t" || sql[pos] === "\n" || sql[pos] === "\r"))
            pos++;
        if (sql[pos] === ",")
            pos++;
    }
    return [values, pos];
};
/**
 * Parse a comma-separated list of column identifiers (as found in an INSERT statement)
 * into an array of cleaned column names.
 *
 * Trims whitespace around each entry and removes surrounding identifier delimiters:
 * double quotes ("..."), backticks (`...`) and square brackets ([...]) when both
 * the opening and closing characters are present.
 *
 * @param columnsPart - Comma-separated column list (e.g. `id, "name", \`age\`, [email]`)
 * @returns An array of column names with surrounding quotes/backticks/brackets removed and whitespace trimmed.
 *
 * @example
 * parseInsertColumns('id, "first name", `last`, [age]') // -> ['id', 'first name', 'last', 'age']
 *
 * @remarks
 * - Does not remove delimiters if only one side is present.
 * - Does not handle escaped delimiters or commas inside quoted identifiers.
 */
const parseInsertColumns = (columnsPart) => columnsPart.split(",").map((col) => {
    const trimmed = col.trim();
    // Remove surrounding quotes (", `, [])
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("`") && trimmed.endsWith("`"))) {
        return trimmed.slice(1, -1);
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
});
/**
 * Extracts column headers and row data from SQL INSERT statements or specially-formatted comment tuples.
 *
 * This function performs two passes over the provided SQL text:
 * 1. Comment mode: looks for `-- VALUES: (...)` comments and an `INSERT INTO ... (cols) VALUES` header; if both are found the comment tuples are used.
 * 2. Inline mode: finds an `INSERT INTO ... (cols) VALUES` header and parses tuples that follow `VALUES` clauses in the SQL body.
 *
 * Key behavior and assumptions:
 * - Column names are taken from the first matching `INSERT INTO <table> (col1, col2, ...) VALUES` clause (parsed with `parseInsertColumns`).
 * - Tuples are parsed with `parseSqlTuple`.
 * - Placeholder tuples such as `(?)` are ignored.
 * - If a row has fewer values than headers, missing values are filled with empty strings.
 * - Whitespace and multi-line `VALUES` clauses are supported to a reasonable extent.
 *
 * @param input - The SQL text to parse.
 * @returns An `ExtractedTable` object containing `headers: string[]` and `rows: Record<string, string>[]`.
 *
 * @throws If no `INSERT INTO ... (columns) VALUES` header is found.
 * @throws If no data rows are found when parsing inline `VALUES` clauses.
 *
 * @remarks
 * Depends on `parseInsertColumns` and `parseSqlTuple` to perform low-level parsing. Intended for straightforward INSERT statements and comment-embedded tuples; very complex or nonstandard SQL may not be handled.
 */
export function extractSqlTable(input) {
    const lines = input.split("\n");
    let headers = [];
    const rows = [];
    // First pass: try to extract from -- VALUES: comments (placeholder mode)
    const commentValueRows = [];
    for (const line of lines) {
        const trimmed = line.trim();
        // Extract headers from INSERT INTO ... (columns) ...
        if (headers.length === 0) {
            const insertMatch = trimmed.match(/INSERT\s+INTO\s+\S+\s*\(([^)]+)\)\s*VALUES/i);
            if (insertMatch) {
                headers = parseInsertColumns(insertMatch[1]);
            }
        }
        // Extract values from -- VALUES: (...) comments
        const commentMatch = trimmed.match(/^--\s*VALUES:\s*(.+)$/);
        if (commentMatch) {
            const valuesStr = commentMatch[1];
            // Parse all tuples in the comment
            let pos = 0;
            while (pos < valuesStr.length) {
                while (pos < valuesStr.length && valuesStr[pos] !== "(")
                    pos++;
                if (pos >= valuesStr.length)
                    break;
                const [values, newPos] = parseSqlTuple(valuesStr, pos);
                if (values.length > 0) {
                    commentValueRows.push(values);
                }
                pos = newPos;
                // Skip comma between tuples
                while (pos < valuesStr.length && (valuesStr[pos] === "," || valuesStr[pos] === " "))
                    pos++;
            }
        }
    }
    // If we found comment values, use those
    if (commentValueRows.length > 0 && headers.length > 0) {
        for (const values of commentValueRows) {
            const row = {};
            for (let i = 0; i < headers.length; i++) {
                row[headers[i]] = i < values.length ? values[i] : "";
            }
            rows.push(row);
        }
        return { headers, rows };
    }
    // Second pass: extract inline VALUES from INSERT statements
    headers = [];
    for (const line of lines) {
        const trimmed = line.trim();
        // Extract headers
        if (headers.length === 0) {
            const insertMatch = trimmed.match(/INSERT\s+INTO\s+\S+\s*\(([^)]+)\)\s*VALUES/i);
            if (insertMatch) {
                headers = parseInsertColumns(insertMatch[1]);
            }
        }
    }
    if (headers.length === 0) {
        throw new Error("No INSERT INTO ... (columns) VALUES ... statements found in SQL input.");
    }
    // Parse inline values from the full text
    // Find all VALUES clauses and extract tuples
    const fullText = input;
    const valuesPattern = /VALUES\s*\n?\s*/gi;
    let valMatch;
    while ((valMatch = valuesPattern.exec(fullText)) !== null) {
        let pos = valMatch.index + valMatch[0].length;
        // Check if this is a placeholder VALUES (?)
        const afterValues = fullText.slice(pos).trimStart();
        if (afterValues.startsWith("(") && afterValues.match(/^\(\s*\?[\s,?]*\)/)) {
            // Skip placeholder tuples
            continue;
        }
        // Parse all tuples after VALUES
        while (pos < fullText.length) {
            // Skip whitespace
            while (pos < fullText.length && (fullText[pos] === " " || fullText[pos] === "\t" || fullText[pos] === "\n" || fullText[pos] === "\r"))
                pos++;
            if (fullText[pos] !== "(")
                break;
            const [values, newPos] = parseSqlTuple(fullText, pos);
            if (values.length > 0) {
                const row = {};
                for (let i = 0; i < headers.length; i++) {
                    row[headers[i]] = i < values.length ? values[i] : "";
                }
                rows.push(row);
            }
            pos = newPos;
            // Skip comma and whitespace between tuples
            while (pos < fullText.length && (fullText[pos] === " " || fullText[pos] === "\t" || fullText[pos] === "\n" || fullText[pos] === "\r"))
                pos++;
            if (fullText[pos] === ",") {
                pos++;
            }
            else if (fullText[pos] === ";") {
                pos++;
                break;
            }
            else {
                break;
            }
        }
    }
    if (rows.length === 0) {
        throw new Error("No data rows found in SQL INSERT statements.");
    }
    return { headers, rows };
}
