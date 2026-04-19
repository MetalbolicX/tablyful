/**
 * Pure stream formatting helpers.
 * No Node.js imports, no stream dependencies, no orchestration logic.
 * Used by StreamMode.mts for value conversion, escaping, and filtering.
 */
// Value normalization
export const normalizeValue = (value) => {
    if (value === null || value === undefined) {
        return { kind: "null" };
    }
    if (typeof value === "string") {
        return { kind: "string", value };
    }
    if (typeof value === "number") {
        return { kind: "number", value };
    }
    if (typeof value === "boolean") {
        return { kind: "boolean", value };
    }
    return { kind: "other", value: JSON.stringify(value) };
};
// Type guards
export const isRecord = (value) => typeof value === "object" && value !== null;
export const isObjectRecord = (value) => isRecord(value) && !Array.isArray(value);
// Comparable string for comparisons
export const toComparableString = (value) => {
    const normalized = normalizeValue(value);
    switch (normalized.kind) {
        case "null":
            return "";
        case "string":
            return normalized.value;
        case "number":
        case "boolean":
            return String(normalized.value);
        case "other":
            return normalized.value;
    }
};
// HTML escaping
export const escapeHtml = (value) => value.replace(/[&<>"]/g, (char) => {
    if (char === "&")
        return "&amp;";
    if (char === "<")
        return "&lt;";
    if (char === ">")
        return "&gt;";
    return "&quot;";
});
export const toHtmlCell = (value) => {
    const normalized = normalizeValue(value);
    switch (normalized.kind) {
        case "null":
            return "";
        case "string":
            return escapeHtml(normalized.value);
        case "number":
        case "boolean":
            return String(normalized.value);
        case "other":
            return escapeHtml(normalized.value);
    }
};
// YAML escaping
export const escapeYamlSingleQuoted = (value) => value.replaceAll("'", "''");
export const yamlNeedsQuotes = (value) => {
    return (value === "" ||
        value.includes(":") ||
        value.includes("#") ||
        value.includes("\n") ||
        value.includes("\t") ||
        value.trim() !== value);
};
export const toYamlString = (value, quoteStrings) => {
    if (quoteStrings || yamlNeedsQuotes(value)) {
        return `'${escapeYamlSingleQuoted(value)}'`;
    }
    return value;
};
export const toYamlScalar = (value, quoteStrings) => {
    const normalized = normalizeValue(value);
    switch (normalized.kind) {
        case "null":
            return "null";
        case "string":
            return toYamlString(normalized.value, quoteStrings);
        case "number":
        case "boolean":
            return String(normalized.value);
        case "other":
            return toYamlString(normalized.value, true);
    }
};
// SQL escaping
export const quoteIdentifier = (identifier, quote) => {
    const actualQuote = quote || '"';
    if (actualQuote === "[") {
        return `[${identifier.replaceAll("]", "]]")}]`;
    }
    return `${actualQuote}${identifier.replaceAll(actualQuote, `${actualQuote}${actualQuote}`)}${actualQuote}`;
};
export const toSqlLiteral = (value) => {
    const normalized = normalizeValue(value);
    switch (normalized.kind) {
        case "null":
            return "NULL";
        case "string":
            return `'${normalized.value.replaceAll("'", "''")}'`;
        case "number":
            return String(normalized.value);
        case "boolean":
            return normalized.value ? "TRUE" : "FALSE";
        case "other":
            return `'${normalized.value.replaceAll("'", "''")}'`;
    }
};
// Delimited text escaping
export const escapeDelimitedValue = (value, { delimiter, quote, escape, lineBreak, }) => {
    const text = toComparableString(value);
    if (text.includes(delimiter) ||
        text.includes(lineBreak) ||
        text.includes(quote)) {
        return `${quote}${text.replaceAll(quote, `${escape}${quote}`)}${quote}`;
    }
    return text;
};
// Quote stripping
export const stripQuotes = (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 2)
        return trimmed;
    const first = trimmed.at(0);
    const last = trimmed.at(-1);
    if ((first === '"' && last === '"') ||
        (first === "'" && last === "'")) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
};
const OPERATOR_PATTERN = /^(.+?)\s*(>=|<=|!=|>|<|=|LIKE)\s*(.+)$/s;
export const compileLikePattern = (sqlPattern) => {
    const escaped = sqlPattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replaceAll("%", ".*")
        .replaceAll("_", ".");
    return new RegExp(`^${escaped}$`, "i");
};
export const parsePredicate = (expression) => {
    const expr = expression.trim();
    if (!expr) {
        throw new Error("Filter expression cannot be empty.");
    }
    const match = expr.match(OPERATOR_PATTERN);
    if (!match) {
        throw new Error(`Invalid filter expression: ${expression}. Expected operators: =, !=, >, <, >=, <=, LIKE.`);
    }
    const column = match[1].trim();
    const op = match[2].toUpperCase();
    const rawValue = match[3].trim();
    const value = stripQuotes(rawValue);
    if (op === "LIKE") {
        return { column, op, value, likePattern: compileLikePattern(value) };
    }
    return { column, op, value };
};
export const compileLikeExpression = (rawExpression) => {
    const expressions = rawExpression
        .split(" AND ")
        .map((s) => s.trim())
        .filter(Boolean);
    return expressions.map((expr) => parsePredicate(expr));
};
export const processRowValue = (row, headers, shape, predicates, firstRowNumber) => {
    let rowValues = null;
    if (shape === "array-of-arrays" && Array.isArray(row)) {
        const record = {};
        for (const header of headers) {
            const colIndex = Number(header.replace("column", "")) - 1;
            record[header] = colIndex >= 0 && colIndex < row.length ? row[colIndex] : null;
        }
        rowValues = record;
    }
    else if (shape === "array-of-objects" && isObjectRecord(row)) {
        rowValues = row;
    }
    if (!rowValues) {
        return { rejectedByFilter: true, rowValues: {}, matchCount: firstRowNumber };
    }
    if (predicates.length === 0) {
        return { rejectedByFilter: false, rowValues, matchCount: firstRowNumber };
    }
    const filterMatched = predicates.every((p) => {
        const cellValue = rowValues[p.column];
        if (p.op === "LIKE" && p.likePattern) {
            return p.likePattern.test(toComparableString(cellValue));
        }
        const cellStr = toComparableString(cellValue);
        const valueStr = p.value;
        const cellNum = Number(cellStr);
        const valueNum = Number(valueStr);
        if (!Number.isNaN(cellNum) && !Number.isNaN(valueNum)) {
            switch (p.op) {
                case "=":
                    return cellNum === valueNum;
                case "!=":
                    return cellNum !== valueNum;
                case ">":
                    return cellNum > valueNum;
                case "<":
                    return cellNum < valueNum;
                case ">=":
                    return cellNum >= valueNum;
                case "<=":
                    return cellNum <= valueNum;
            }
        }
        switch (p.op) {
            case "=":
                return cellStr === valueStr;
            case "!=":
                return cellStr !== valueStr;
            case ">":
                return cellStr > valueStr;
            case "<":
                return cellStr < valueStr;
            case ">=":
                return cellStr >= valueStr;
            case "<=":
                return cellStr <= valueStr;
        }
        return false;
    });
    return {
        rejectedByFilter: !filterMatched,
        rowValues,
        matchCount: firstRowNumber,
    };
};
