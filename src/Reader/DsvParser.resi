/**
 * DSV Parser (Delimiter-Separated Values)
 * Parses CSV, TSV, PSV text into headers + rows.
 */

type parsed = {
  headers: array<string>,
  rows: array<array<string>>,
}

let parse: (string, ~delimiter: string) => parsed
