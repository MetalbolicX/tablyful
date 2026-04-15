// Output format type

/**
 * Configuration options types
 */
@genType
type format =
  | Csv
  | Json
  | Markdown
  | Html
  | Latex

// CSV options
@genType
type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
  includeHeaders: bool,
}

// JSON options
@genType
type jsonOptions = {
  pretty: bool,
  indentSize: int,
  asArray: bool,
}

// Markdown options
@genType
type markdownOptions = {
  align: string, // "left" | "center" | "right"
  padding: bool,
  githubFlavor: bool,
}

// HTML options
@genType
type htmlOptions = {
  tableClass: string,
  theadClass: string,
  tbodyClass: string,
  id: string,
  caption: string,
}

// LaTeX options
@genType
type latexOptions = {
  tableEnvironment: string,
  columnSpec: string,
  booktabs: bool,
  caption: string,
  label: string,
  centering: bool,
  useTableEnvironment: bool,
}

// Format options variant
@genType
type formatOptions =
  | CsvOptions(csvOptions)
  | JsonOptions(jsonOptions)
  | MarkdownOptions(markdownOptions)
  | HtmlOptions(htmlOptions)
  | LatexOptions(latexOptions)

// Main options type
@genType
type t = {
  // Input
  headers: option<array<string>>,
  hasHeaders: bool,
  rowNumberHeader: string,
  hasRowNumbers: bool,
  // Processing
  batchSize: int,
  encoding: string,
  // Output
  outputFormat: format,
  formatOptions: formatOptions,
}

// Format to string
let formatToString = (format: format): string => {
  switch format {
  | Csv => "csv"
  | Json => "json"
  | Markdown => "markdown"
  | Html => "html"
  | Latex => "latex"
  }
}

// String to format
let formatFromString = (str: string): option<format> => {
  switch str->String.toLowerCase {
  | "csv" => Some(Csv)
  | "json" => Some(Json)
  | "markdown" => Some(Markdown)
  | "html" => Some(Html)
  | "latex" => Some(Latex)
  | _ => None
  }
}
