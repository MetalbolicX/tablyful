// Output format type

/**
 * Configuration options types
 */
type format =
  | Csv
  | Json
  | Markdown
  | Html
  | Latex

// CSV options
type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
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

// Format options variant
type formatOptions =
  | CsvOptions(csvOptions)
  | JsonOptions(jsonOptions)
  | MarkdownOptions(markdownOptions)
  | HtmlOptions(htmlOptions)
  | LatexOptions(latexOptions)

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
