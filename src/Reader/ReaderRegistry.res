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
]

// Get reader by format name
let getByName = (name: string): option<readerEntry> => {
  all->Array.find(reader => reader.name === name->String.toLowerCase)
}

// Get reader by file extension
let getByExtension = (ext: string): option<readerEntry> => {
  let lowerExt = ext->String.toLowerCase
  all->Array.find(reader => reader.extensions->Array.includes(lowerExt))
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
  all->Array.map(reader => reader.name)
}
