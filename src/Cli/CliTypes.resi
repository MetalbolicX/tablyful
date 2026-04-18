type flags = {
  formatArg: option<string>,
  inputArg: option<string>,
  outputPath: option<string>,
  setPairs: array<(string, string)>,
  columnsArg: option<array<string>>,
  filterExprs: array<string>,
  delimiterArg: option<string>,
  configPath: option<string>,
  noHeaders: bool,
  stats: bool,
}
