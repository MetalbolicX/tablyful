import { unified } from "unified";
import rehypeParse from "rehype-parse";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toText } from "hast-util-to-text";
/**
 * Recursively find all descendant nodes with a given tagName.
 */
const findAll = (node, tag) => {
    const results = [];
    if (node.tagName === tag)
        results.push(node);
    if (node.children) {
        for (const child of node.children) {
            results.push(...findAll(child, tag));
        }
    }
    return results;
};
/**
 * Extract text content from a HAST node using hast-util-to-text.
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
    const tree = unified()
        .use(rehypeParse, { fragment: false })
        .parse(html);
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
    const rows = [];
    for (const tr of dataRows) {
        const cells = [...findAll(tr, "td"), ...findAll(tr, "th")];
        const row = {};
        for (let i = 0; i < headers.length; i++) {
            row[headers[i]] = i < cells.length ? hastText(cells[i]) : "";
        }
        rows.push(row);
    }
    return { headers, rows };
}
/**
 * Recursively find first node of a given type in an mdast tree.
 */
const mdastFindAll = (node, type) => {
    const results = [];
    if (node.type === type)
        results.push(node);
    if (node.children) {
        for (const child of node.children) {
            results.push(...mdastFindAll(child, type));
        }
    }
    return results;
};
/**
 * Extract plain text from an mdast node by recursively collecting text/inlineCode values.
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
 * Parse a GFM Markdown string and extract the first table.
 *
 * @param md - Raw Markdown string.
 * @returns An ExtractedTable with headers and rows.
 * @throws Error when no table is found.
 */
export function extractMarkdownTable(md) {
    const tree = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .parse(md);
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
    const rows = [];
    for (let i = 1; i < tableRows.length; i++) {
        const cells = (tableRows[i].children ?? []).filter((c) => c.type === "tableCell");
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = j < cells.length ? mdastText(cells[j]).trim() : "";
        }
        rows.push(row);
    }
    return { headers, rows };
}
// ── LaTeX extraction ────────────────────────────────────────────────────────
/**
 * Unescape common LaTeX special characters in cell text.
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
 * Parse a LaTeX string and extract the first tabular/longtable environment.
 *
 * Supports `\begin{tabular}`, `\begin{longtable}`, and `\begin{array}`.
 * Skips rule commands: `\hline`, `\toprule`, `\midrule`, `\bottomrule`, `\cline`.
 * The first non-rule row is treated as the header row.
 *
 * @param tex - Raw LaTeX string.
 * @returns An ExtractedTable with headers and rows.
 * @throws Error when no tabular environment is found.
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
    const contentRows = [];
    for (const raw of rawRows) {
        // A row may start with a rule; strip it
        const cleaned = raw
            .replace(/\\(?:hline|toprule|midrule|bottomrule|cline\{[^}]*\})\s*/g, "")
            .trim();
        if (cleaned === "" || rulePattern.test(cleaned))
            continue;
        contentRows.push(cleaned);
    }
    if (contentRows.length === 0) {
        throw new Error("LaTeX tabular environment contains no data rows.");
    }
    // Split each row by & and unescape
    const parseRow = (line) => line.split("&").map((cell) => unescapeLatex(cell));
    // First row is the header
    const headers = parseRow(contentRows[0]);
    // Remaining are data rows
    const rows = [];
    for (let i = 1; i < contentRows.length; i++) {
        const cells = parseRow(contentRows[i]);
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = j < cells.length ? cells[j] : "";
        }
        rows.push(row);
    }
    return { headers, rows };
}
