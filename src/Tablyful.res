// Conversion result type

/**
 * Main Tablyful API
 * Provides high-level functions for converting data between formats
 */
@genType
type result<'a> = result<'a, TablyfulError.t>

@genType
type tableData = TableData.t

@genType
type options = Types.t

@genType
let defaultOptions = Defaults.t

// Convert input data to specified format
@genType
let convert = (~input: JSON.t, ~format: string, ~options: options=Defaults.t): result<string> => {
  // 1. Parse the input data
  ParserRegistry.parse(input, options)
  // 2. Format the parsed data
  ->Result.flatMap(tableData => {
    FormatterRegistry.format(format->String.toLowerCase, tableData, options)
  })
}

// Parse input data to TableData
@genType
let parse = (~input: JSON.t, ~options: options=Defaults.t): result<TableData.t> => {
  ParserRegistry.parse(input, options)
}

// Format TableData to specified format
@genType
let format = (~data: tableData, ~format: string, ~options: options=Defaults.t): result<string> => {
  FormatterRegistry.format(format->String.toLowerCase, data, options)
}

// Convenience functions for specific formats
@genType
let toCsv = (~input: JSON.t, ~options: options=Defaults.t): result<string> => {
  convert(~input, ~format="csv", ~options)
}

@genType
let toJson = (~input: JSON.t, ~options: options=Defaults.t): result<string> => {
  convert(~input, ~format="json", ~options)
}

@genType
let toMarkdown = (~input: JSON.t, ~options: options=Defaults.t): result<string> => {
  convert(~input, ~format="markdown", ~options)
}

@genType
let toHtml = (~input: JSON.t, ~options: options=Defaults.t): result<string> => {
  convert(~input, ~format="html", ~options)
}

@genType
let toLatex = (~input: JSON.t, ~options: options=Defaults.t): result<string> => {
  convert(~input, ~format="latex", ~options)
}

// Get available parsers and formatters
@genType
let availableParsers = (): array<string> => {
  ParserRegistry.getNames()
}

@genType
let availableFormatters = (): array<string> => {
  FormatterRegistry.getNames()
}

// Detect input format
@genType
let detectFormat = (input: JSON.t): string => {
  let shape = InputData.classify(input)
  InputData.shapeToString(shape)
}
