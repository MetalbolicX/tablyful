/**
 * Format Detector
 * Detects input format from file extension and/or content sniffing.
 * Used by CLI to determine which reader/parser to use.
 */

@send external lastIndexOf: (string, string) => int = "lastIndexOf"
@send external sliceFrom: (string, int) => string = "slice"
@send external trimStart: string => string = "trimStart"
@send external test: (RegExp.t, string) => bool = "test"

// Detect format from file extension
let fromExtension = (path: string): option<string> => {
  let dotIdx = lastIndexOf(path, ".")
  if dotIdx < 0 {
    None
  } else {
    let ext = sliceFrom(path, dotIdx)->String.toLowerCase
    switch ext {
    | ".json" => Some("json")
    | _ => ReaderRegistry.getByExtension(ext)->Option.map(reader => reader.name)
    }
  }
}

let looksLikeNdjson = (trimmed: string): bool => {
  let lines =
    trimmed
    ->String.split("\n")
    ->Array.map(line => line->String.trim)
    ->Array.filter(line => line !== "")

  lines->Array.length > 1 &&
    lines->Array.every(line => line->String.startsWith("{") && line->String.endsWith("}"))
}

// Content sniffing heuristics
let fromContent = (content: string): option<string> => {
  let trimmed = trimStart(content)

  // HTML: starts with < and contains <table
  if (
    trimmed->String.startsWith("<") &&
      trimmed->String.toLowerCase->String.includes("<table")
  ) {
    Some("html")
  } else if (
    // LaTeX: contains \begin{tabular} or \begin{longtable}
    trimmed->String.includes("\\begin{tabular}") ||
      trimmed->String.includes("\\begin{longtable}") ||
      trimmed->String.includes("\\begin{array}")
  ) {
    Some("latex")
  } else if (
    // Markdown: contains pipe-separated header + separator pattern
    trimmed->String.includes("|---") ||
      trimmed->String.includes("| ---") ||
      trimmed->String.includes("|:--") ||
      trimmed->String.includes("| :--")
  ) {
    Some("markdown")
  } else if looksLikeNdjson(trimmed) {
    Some("ndjson")
  } else if trimmed->String.startsWith("[") || trimmed->String.startsWith("{") {
    // JSON: starts with [ or {
    Some("json")
  } else if trimmed->String.startsWith("<?xml") || trimmed->String.startsWith("<") && test(%re("/^<[a-zA-Z]/"), trimmed) {
    // XML: starts with <?xml or < followed by a tag name (but not <table which is HTML)
    Some("xml")
  } else if trimmed->String.startsWith("---\n") || trimmed->String.startsWith("---\r\n") {
    // YAML: starts with document separator ---
    Some("yaml")
  } else if test(%re("/INSERT\s+INTO/i"), trimmed) {
    // SQL: contains INSERT INTO
    Some("sql")
  } else {
    None
  }
}

// Combined detection: try extension first, then content sniffing
let detect = (~path: option<string>=?, ~content: string, ()): option<string> => {
  switch path {
  | Some(p) =>
    switch fromExtension(p) {
    | Some(_) as result => result
    | None => fromContent(content)
    }
  | None => fromContent(content)
  }
}
