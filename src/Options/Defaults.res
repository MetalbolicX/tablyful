/**
 * Default options and option merging
 */
open Types

// Default format options
let defaultCsvOptions: csvOptions = {
  delimiter: ",",
  quote: "\"",
  escape: "\\",
  lineBreak: "\n",
  includeHeaders: true,
}

let defaultTsvOptions: tsvOptions = {
  includeHeaders: true,
}

let defaultPsvOptions: psvOptions = {
  includeHeaders: true,
}

let defaultJsonOptions: jsonOptions = {
  pretty: true,
  indentSize: 2,
  asArray: false,
}

let defaultMarkdownOptions: markdownOptions = {
  align: "left",
  padding: true,
  githubFlavor: true,
}

let defaultHtmlOptions: htmlOptions = {
  tableClass: "tablyful-table",
  theadClass: "",
  tbodyClass: "",
  id: "",
  caption: "",
}

let defaultLatexOptions: latexOptions = {
  tableEnvironment: "tabular",
  columnSpec: "",
  booktabs: true,
  caption: "",
  label: "",
  centering: true,
  useTableEnvironment: false,
}

let defaultSqlOptions: sqlOptions = {
  tableName: "table",
  identifierQuote: "\"",
  includeCreateTable: false,
  insertBatchSize: 1,
}

let defaultYamlOptions: yamlOptions = {
  indent: 2,
  quoteStrings: false,
  lineBreak: "\n",
}

let defaultNdjsonOptions: ndjsonOptions = {
  lineBreak: "\n",
}

// Main default options
let t: t = {
  headers: None,
  hasHeaders: true,
  rowNumberHeader: "#",
  hasRowNumbers: false,
  outputFormat: Csv,
  formatOptions: CsvOptions(defaultCsvOptions),
}

let getFromFormatOptions = (~extract: formatOptions => option<'a>, ~defaultValue: 'a, opts: t): 'a => {
  switch extract(opts.formatOptions) {
  | Some(value) => value
  | None => defaultValue
  }
}

// Get CSV options from format options
let getCsvOptions = (opts: t): csvOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | CsvOptions(csv) => Some(csv)
      | _ => None
      },
    ~defaultValue=defaultCsvOptions,
    opts,
  )
}

// Get TSV options from format options
let getTsvOptions = (opts: t): tsvOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | TsvOptions(tsv) => Some(tsv)
      | _ => None
      },
    ~defaultValue=defaultTsvOptions,
    opts,
  )
}

// Get PSV options from format options
let getPsvOptions = (opts: t): psvOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | PsvOptions(psv) => Some(psv)
      | _ => None
      },
    ~defaultValue=defaultPsvOptions,
    opts,
  )
}

// Get JSON options from format options
let getJsonOptions = (opts: t): jsonOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | JsonOptions(json) => Some(json)
      | _ => None
      },
    ~defaultValue=defaultJsonOptions,
    opts,
  )
}

// Get Markdown options from format options
let getMarkdownOptions = (opts: t): markdownOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | MarkdownOptions(md) => Some(md)
      | _ => None
      },
    ~defaultValue=defaultMarkdownOptions,
    opts,
  )
}

// Get HTML options from format options
let getHtmlOptions = (opts: t): htmlOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | HtmlOptions(html) => Some(html)
      | _ => None
      },
    ~defaultValue=defaultHtmlOptions,
    opts,
  )
}

// Get LaTeX options from format options
let getLatexOptions = (opts: t): latexOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | LatexOptions(latex) => Some(latex)
      | _ => None
      },
    ~defaultValue=defaultLatexOptions,
    opts,
  )
}

// Get SQL options from format options
let getSqlOptions = (opts: t): sqlOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | SqlOptions(sql) => Some(sql)
      | _ => None
      },
    ~defaultValue=defaultSqlOptions,
    opts,
  )
}

// Get YAML options from format options
let getYamlOptions = (opts: t): yamlOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | YamlOptions(yaml) => Some(yaml)
      | _ => None
      },
    ~defaultValue=defaultYamlOptions,
    opts,
  )
}

// Get NDJSON options from format options
let getNdjsonOptions = (opts: t): ndjsonOptions => {
  getFromFormatOptions(
    ~extract=formatOptions =>
      switch formatOptions {
      | NdjsonOptions(ndjson) => Some(ndjson)
      | _ => None
      },
    ~defaultValue=defaultNdjsonOptions,
    opts,
  )
}
