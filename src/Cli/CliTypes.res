/**
 * CLI type definitions for command-line interface.
 * Represents all parsed flags from CLI arguments.
 */

type flags = {
  formatArg: option<string>,
  inputArg: option<string>,
  outputPath: option<string>,
  setPairs: array<(string, string)>,
  columnsArg: option<array<string>>,
  filterExprs: array<string>,
  delimiterArg: option<string>,
  maxFileSizeBytes: int,
  configPath: option<string>,
  noHeaders: bool,
  stats: bool,
  stream: option<bool>,
}