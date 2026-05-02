/**
 * Configuration options types for all supported output formats.
 * Defines format variants and options for CSV, TSV, PSV, JSON, Markdown, HTML, LaTeX, SQL, YAML, and NDJSON.
 */

// Output format type - discriminated union for all supported formats

/**
 * All supported output formats for table data conversion.
 */
type format =
  | Csv
  | Tsv
  | Psv
  | Json
  | Markdown
  | Html
  | Latex
  | Sql
  | Yaml
  | Ndjson

/**
 * CSV/DSV-specific options with delimiter, quote, and escape characters.
 */
type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
  includeHeaders: bool,
}

/**
 * TSV (Tab-Separated Values) options.
 */
type tsvOptions = {
  includeHeaders: bool,
}

/**
 * PSV (Pipe-Separated Values) options.
 */
type psvOptions = {
  includeHeaders: bool,
}

/**
 * JSON output options for formatting and structure.
 */
type jsonOptions = {
  pretty: bool,
  indentSize: int,
  asArray: bool,
}

/**
 * Markdown table options for alignment and flavor.
 */
type markdownOptions = {
  align: string, // "left" | "center" | "right"
  padding: bool,
  githubFlavor: bool,
}

/**
 * HTML table options for CSS classes and caption.
 */
type htmlOptions = {
  tableClass: string,
  theadClass: string,
  tbodyClass: string,
  id: string,
  caption: string,
}

/**
 * LaTeX table options for environment and styling.
 */
type latexOptions = {
  tableEnvironment: string,
  columnSpec: string,
  booktabs: bool,
  caption: string,
  label: string,
  centering: bool,
  useTableEnvironment: bool,
}

/**
 * SQL output options for table naming and DDL.
 */
type sqlOptions = {
  tableName: string,
  identifierQuote: string,
  includeCreateTable: bool,
  insertBatchSize: int,
}

/**
 * YAML output options for formatting.
 */
type yamlOptions = {
  indent: int,
  quoteStrings: bool,
  lineBreak: string,
}

/**
 * NDJSON output options.
 */
type ndjsonOptions = {
  lineBreak: string,
}

/**
 * Format options variant - discriminated union over all format-specific options.
 */
type formatOptions =
  | CsvOptions(csvOptions)
  | TsvOptions(tsvOptions)
  | PsvOptions(psvOptions)
  | JsonOptions(jsonOptions)
  | MarkdownOptions(markdownOptions)
  | HtmlOptions(htmlOptions)
  | LatexOptions(latexOptions)
  | SqlOptions(sqlOptions)
  | YamlOptions(yamlOptions)
  | NdjsonOptions(ndjsonOptions)

/**
 * Main options type combining input and output configuration.
 */
type t = {
  // Input
  headers: option<array<string>>,
  hasHeaders: bool,
  rowNumberHeader: string,
  hasRowNumbers: bool,
  // Output
  outputFormat: format,
  formatOptions: formatOptions,
}

/**
 * Converts format to string for CLI display.
 * @param format - Format variant
 * @returns String representation (e.g., "csv", "json")
 */
let formatToString = (format: format): string => {
  switch format {
  | Csv => "csv"
  | Tsv => "tsv"
  | Psv => "psv"
  | Json => "json"
  | Markdown => "markdown"
  | Html => "html"
  | Latex => "latex"
  | Sql => "sql"
  | Yaml => "yaml"
  | Ndjson => "ndjson"
  }
}

// String to format (case-insensitive)
/**
 * Parses string to format option.
 * @param str - String to parse (case-insensitive)
 * @returns Some(format) or None
 */
let formatFromString = (str: string): option<format> => {
  switch str->String.toLowerCase {
  | "csv" => Some(Csv)
  | "tsv" => Some(Tsv)
  | "psv" => Some(Psv)
  | "json" => Some(Json)
  | "markdown" => Some(Markdown)
  | "html" => Some(Html)
  | "latex" => Some(Latex)
  | "sql" => Some(Sql)
  | "yaml" => Some(Yaml)
  | "ndjson" => Some(Ndjson)
  | _ => None
  }
}
