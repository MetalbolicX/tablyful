/**
 * Reader Registry
 * Manages all available readers for non-JSON text formats
 * Parallel to ParserRegistry which handles JSON input shapes
 */

type readerEntry = {
  name: string,
  extensions: array<string>,
  read: (string, Types.t) => TablyfulError.result<TableData.t>,
}

// All available readers
let all: array<readerEntry> = [
  {
    name: HtmlReader.name,
    extensions: HtmlReader.extensions,
    read: HtmlReader.read,
  },
  {
    name: MarkdownReader.name,
    extensions: MarkdownReader.extensions,
    read: MarkdownReader.read,
  },
  {
    name: LatexReader.name,
    extensions: LatexReader.extensions,
    read: LatexReader.read,
  },
  {
    name: CsvReader.name,
    extensions: CsvReader.extensions,
    read: CsvReader.read,
  },
  {
    name: TsvReader.name,
    extensions: TsvReader.extensions,
    read: TsvReader.read,
  },
  {
    name: PsvReader.name,
    extensions: PsvReader.extensions,
    read: PsvReader.read,
  },
  {
    name: YamlReader.name,
    extensions: YamlReader.extensions,
    read: YamlReader.read,
  },
  {
    name: NdjsonReader.name,
    extensions: NdjsonReader.extensions,
    read: NdjsonReader.read,
  },
  {
    name: XmlReader.name,
    extensions: XmlReader.extensions,
    read: XmlReader.read,
  },
  {
    name: SqlReader.name,
    extensions: SqlReader.extensions,
    read: SqlReader.read,
  },
]

// Get reader by format name
let getByName = (name: string): option<readerEntry> => {
  RegistryUtils.findByName(~name, ~getName=reader => reader.name, all)
}

// Get reader by file extension
let getByExtension = (ext: string): option<readerEntry> => {
  let lowerExt = ext->String.toLowerCase
  RegistryUtils.findFirst(~predicate=reader => reader.extensions->Array.includes(lowerExt), all)
}

// Read with a specific reader (by name)
let read = (~format: string, input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  switch getByName(format) {
  | Some(reader) => reader.read(input, options)
  | None =>
    TablyfulError.parseError(
      `Unknown reader format: ${format}. Available readers: ${all
        ->Array.map(r => r.name)
        ->Array.join(", ")}.`,
    )->TablyfulError.toResult
  }
}

// Check if a format has a reader
let hasReader = (format: string): bool => {
  getByName(format)->Option.isSome
}

// Get all reader names
let getNames = (): array<string> => {
  RegistryUtils.getNames(~getName=reader => reader.name, all)
}
