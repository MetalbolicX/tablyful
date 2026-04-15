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
]

// Get formatter by name
let get = (name: string): option<formatterEntry> => {
  all->Array.find(formatter => formatter.name === name->String.toLowerCase)
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

// Check if formatter exists
let exists = (name: string): bool => {
  get(name)->Option.isSome
}

// Get all formatter names
let getNames = (): array<string> => {
  all->Array.map(formatter => formatter.name)
}

// Get extension for format
let getExtension = (name: string): option<string> => {
  get(name)->Option.map(formatter => formatter.extension)
}
