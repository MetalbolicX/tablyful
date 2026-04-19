/**
 * Formatter Registry
 * Manages all available formatters
 */
type formatterEntry = {
  name: string,
  extension: string,
  format: (TableData.t, Types.t) => TablyfulError.result<string>,
}

// All available formatters
let all: array<formatterEntry> = [
  {
    name: Csv.name,
    extension: Csv.extension,
    format: Csv.format,
  },
  {
    name: Tsv.name,
    extension: Tsv.extension,
    format: Tsv.format,
  },
  {
    name: Psv.name,
    extension: Psv.extension,
    format: Psv.format,
  },
  {
    name: Json.name,
    extension: Json.extension,
    format: Json.format,
  },
  {
    name: Markdown.name,
    extension: Markdown.extension,
    format: Markdown.format,
  },
  {
    name: Html.name,
    extension: Html.extension,
    format: Html.format,
  },
  {
    name: Latex.name,
    extension: Latex.extension,
    format: Latex.format,
  },
  {
    name: Sql.name,
    extension: Sql.extension,
    format: Sql.format,
  },
  {
    name: Yaml.name,
    extension: Yaml.extension,
    format: Yaml.format,
  },
  {
    name: Ndjson.name,
    extension: Ndjson.extension,
    format: Ndjson.format,
  },
]

// Get formatter by name
let get = (name: string): option<formatterEntry> => {
  RegistryUtils.findByName(~name, ~getName=formatter => formatter.name, all)
}

// Format with specific formatter
let format = (name: string, data: TableData.t, options: Types.t): TablyfulError.result<string> => {
  switch get(name) {
  | Some(formatter) => formatter.format(data, options)
  | None =>
    TablyfulError.formatError(`Unknown formatter: ${name}`)
    ->TablyfulError.withSuggestion(
      `Available formatters: ${all->Array.map(f => f.name)->Array.join(", ")}`,
    )
    ->TablyfulError.toResult
  }
}

// Get all formatter names
let getNames = (): array<string> => {
  RegistryUtils.getNames(~getName=formatter => formatter.name, all)
}
