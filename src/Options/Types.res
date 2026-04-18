// Output format type

/**
 * Configuration options types
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

// CSV options
type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
  includeHeaders: bool,
}

// TSV options
type tsvOptions = {
  includeHeaders: bool,
}

// PSV options
type psvOptions = {
  includeHeaders: bool,
}

// JSON options
type jsonOptions = {
  pretty: bool,
  indentSize: int,
  asArray: bool,
}

// Markdown options
type markdownOptions = {
  align: string, // "left" | "center" | "right"
  padding: bool,
  githubFlavor: bool,
}

// HTML options
type htmlOptions = {
  tableClass: string,
  theadClass: string,
  tbodyClass: string,
  id: string,
  caption: string,
}

// LaTeX options
type latexOptions = {
  tableEnvironment: string,
  columnSpec: string,
  booktabs: bool,
  caption: string,
  label: string,
  centering: bool,
  useTableEnvironment: bool,
}

// SQL options
type sqlOptions = {
  tableName: string,
  identifierQuote: string,
  includeCreateTable: bool,
  insertBatchSize: int,
}

// YAML options
type yamlOptions = {
  indent: int,
  quoteStrings: bool,
  lineBreak: string,
}

// Format options variant
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

// Main options type
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

// Format to string
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
  }
}

// String to format
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
  | _ => None
  }
}
