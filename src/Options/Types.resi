@genType
type format =
  | Csv
  | Json
  | Markdown
  | Html
  | Latex

@genType
type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
  includeHeaders: bool,
}

@genType
type jsonOptions = {
  pretty: bool,
  indentSize: int,
  asArray: bool,
}

@genType
type markdownOptions = {
  align: string,
  padding: bool,
  githubFlavor: bool,
}

@genType
type htmlOptions = {
  tableClass: string,
  theadClass: string,
  tbodyClass: string,
  id: string,
  caption: string,
}

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

@genType
type formatOptions =
  | CsvOptions(csvOptions)
  | JsonOptions(jsonOptions)
  | MarkdownOptions(markdownOptions)
  | HtmlOptions(htmlOptions)
  | LatexOptions(latexOptions)

@genType
type t = {
  headers: option<array<string>>,
  hasHeaders: bool,
  rowNumberHeader: string,
  hasRowNumbers: bool,
  batchSize: int,
  encoding: string,
  outputFormat: format,
  formatOptions: formatOptions,
}

let formatToString: format => string
let formatFromString: string => option<format>
