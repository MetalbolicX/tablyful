open Types

let csvKeys: array<(string, string)> = [
  ("delimiter", "field delimiter"),
  ("quote", "quote char"),
  ("escape", "escape char"),
  ("lineBreak", "line break"),
  ("includeHeaders", "include headers"),
]

let tsvKeys: array<(string, string)> = [("includeHeaders", "include headers")]

let psvKeys: array<(string, string)> = [("includeHeaders", "include headers")]

let jsonKeys: array<(string, string)> = [
  ("pretty", "pretty print JSON"),
  ("indentSize", "indent size"),
  ("asArray", "output arrays"),
]

let markdownKeys: array<(string, string)> = [
  ("align", "alignment"),
  ("padding", "pad columns"),
  ("githubFlavor", "GitHub flavor output"),
]

let htmlKeys: array<(string, string)> = [
  ("tableClass", "table class"),
  ("theadClass", "thead class"),
  ("tbodyClass", "tbody class"),
  ("id", "table id"),
  ("caption", "caption text"),
]

let latexKeys: array<(string, string)> = [
  ("tableEnvironment", "environment name"),
  ("columnSpec", "column spec"),
  ("booktabs", "use booktabs"),
  ("caption", "caption text"),
  ("label", "table label"),
  ("centering", "center table"),
  ("useTableEnvironment", "wrap in table env"),
]

let sqlKeys: array<(string, string)> = [
  ("tableName", "table name"),
  ("identifierQuote", "identifier quote"),
  ("includeCreateTable", "include CREATE TABLE"),
  ("insertBatchSize", "rows per INSERT statement"),
]

let yamlKeys: array<(string, string)> = [
  ("indent", "indentation spaces"),
  ("quoteStrings", "quote all strings"),
  ("lineBreak", "line break"),
]

let ndjsonKeys: array<(string, string)> = [("lineBreak", "line break")]

let getKnownKeys = (format: format): array<(string, string)> => {
  switch format {
  | Csv => csvKeys
  | Tsv => tsvKeys
  | Psv => psvKeys
  | Json => jsonKeys
  | Markdown => markdownKeys
  | Html => htmlKeys
  | Latex => latexKeys
  | Sql => sqlKeys
  | Yaml => yamlKeys
  | Ndjson => ndjsonKeys
  }
}

let getConfigKeys = (format: format): array<string> => {
  getKnownKeys(format)->Array.map(((key, _)) => key)
}

let getConfigKeysBySectionName = (sectionName: string): array<string> => {
  getConfigKeys(
    switch sectionName {
    | "csv" => Csv
    | "tsv" => Tsv
    | "psv" => Psv
    | "json" => Json
    | "markdown" => Markdown
    | "html" => Html
    | "latex" => Latex
    | "sql" => Sql
    | "yaml" => Yaml
    | "ndjson" => Ndjson
    | _ => Csv
    },
  )
}
