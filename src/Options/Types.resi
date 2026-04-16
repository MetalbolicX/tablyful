type format =
  | Csv
  | Json
  | Markdown
  | Html
  | Latex

type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
  includeHeaders: bool,
}

type jsonOptions = {
  pretty: bool,
  indentSize: int,
  asArray: bool,
}

type markdownOptions = {
  align: string,
  padding: bool,
  githubFlavor: bool,
}

type htmlOptions = {
  tableClass: string,
  theadClass: string,
  tbodyClass: string,
  id: string,
  caption: string,
}

type latexOptions = {
  tableEnvironment: string,
  columnSpec: string,
  booktabs: bool,
  caption: string,
  label: string,
  centering: bool,
  useTableEnvironment: bool,
}

type formatOptions =
  | CsvOptions(csvOptions)
  | JsonOptions(jsonOptions)
  | MarkdownOptions(markdownOptions)
  | HtmlOptions(htmlOptions)
  | LatexOptions(latexOptions)

type t = {
  headers: option<array<string>>,
  hasHeaders: bool,
  rowNumberHeader: string,
  hasRowNumbers: bool,
  outputFormat: format,
  formatOptions: formatOptions,
}

let formatToString: format => string
let formatFromString: string => option<format>
