/**
 * Default options and option merging
 */
open Types

// Default format options
let defaultCsvOptions: csvOptions = {
  delimiter: ",",
  quote: "\"",
  escape: "\\",
  lineBreak: "\\n",
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

// Main default options
let t: t = {
  headers: None,
  hasHeaders: true,
  rowNumberHeader: "#",
  hasRowNumbers: false,
  outputFormat: Csv,
  formatOptions: CsvOptions(defaultCsvOptions),
}

// Get CSV options from format options
let getCsvOptions = (opts: t): csvOptions => {
  switch opts.formatOptions {
  | CsvOptions(csv) => csv
  | _ => defaultCsvOptions
  }
}

// Get JSON options from format options
let getJsonOptions = (opts: t): jsonOptions => {
  switch opts.formatOptions {
  | JsonOptions(json) => json
  | _ => defaultJsonOptions
  }
}

// Get Markdown options from format options
let getMarkdownOptions = (opts: t): markdownOptions => {
  switch opts.formatOptions {
  | MarkdownOptions(md) => md
  | _ => defaultMarkdownOptions
  }
}

// Get HTML options from format options
let getHtmlOptions = (opts: t): htmlOptions => {
  switch opts.formatOptions {
  | HtmlOptions(html) => html
  | _ => defaultHtmlOptions
  }
}

// Get LaTeX options from format options
let getLatexOptions = (opts: t): latexOptions => {
  switch opts.formatOptions {
  | LatexOptions(latex) => latex
  | _ => defaultLatexOptions
  }
}
