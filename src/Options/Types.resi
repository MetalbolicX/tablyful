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

type csvOptions = {
  delimiter: string,
  quote: string,
  escape: string,
  lineBreak: string,
  includeHeaders: bool,
}

type tsvOptions = {
  includeHeaders: bool,
}

type psvOptions = {
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

type sqlOptions = {
  tableName: string,
  identifierQuote: string,
  includeCreateTable: bool,
  insertBatchSize: int,
}

type yamlOptions = {
  indent: int,
  quoteStrings: bool,
  lineBreak: string,
}

type ndjsonOptions = {
  lineBreak: string,
}

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
