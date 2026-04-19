module Stream: {
  type stdInput = {
    isTTY?: bool,
  }

  type stdOutput = {
    write: string => bool,
  }

  let setEncoding: (stdInput, string) => unit
  let onData: (stdInput, string => unit) => unit
  let onceData: (stdInput, string => unit) => unit
  let onEnd: (stdInput, unit => unit) => unit
  let onceEnd: (stdInput, unit => unit) => unit
  let onError: (stdInput, JsExn.t => unit) => unit
  let pause: stdInput => unit
  let resume: stdInput => unit
  let unshift: (stdInput, string) => unit
  let write: (stdOutput, string) => bool
}

module Fs: {
  type stats = {
    size: float,
  }

  let existsSync: string => bool
  let statSync: string => stats
  let readFileSyncUtf8: string => string
  let writeSyncFd: (int, string) => int
  let writeFileSyncUtf8: (string, string) => unit
}

module Path: {
  let join: array<string> => string
}

module Process: {
  let cwd: unit => string
  let argv: array<string>
  let stdin: Stream.stdInput
  let stdout: Stream.stdOutput
  let stderr: Stream.stdOutput
  let exit: int => unit
}

module Os: {
  let homedir: unit => string
}

module Util: {
  @unboxed
  type defaultValue =
    | String(string)
    | Bool(bool)

  type flatConfig = {
    @as("type") type_: string,
    short?: string,
    multiple?: bool,
    default?: defaultValue,
  }

  type cliValues = {
    help?: bool,
    format?: string,
    input?: string,
    output?: string,
    set?: array<string>,
    filter?: array<string>,
    columns?: string,
    delimiter?: string,
    @as("max-file-size") maxFileSize?: string,
    config?: string,
    stats?: bool,
    version?: bool,
    examples?: bool,
    @as("no-headers") noHeaders?: bool,
    @as("no-stream") noStream?: bool,
    stream?: bool,
    @as("list-set-keys") listSetKeys?: bool,
    @as("list-set-keys-format") listSetKeysFormat?: string,
  }

  type parseArgsResult = {
    values: cliValues,
    positionals: array<string>,
  }

  type parseConfig = {
    args: array<string>,
    options: dict<flatConfig>,
    strict?: bool,
    allowPositionals?: bool,
    tokens?: bool,
  }

  let parseArgs: parseConfig => parseArgsResult
}

module TableExtractor: {
  type extractedTable = {
    headers: array<string>,
    rows: array<dict<string>>,
  }

  let extractHtmlTable: string => extractedTable
  let extractMarkdownTable: string => extractedTable
  let extractLatexTable: string => extractedTable
  let extractYamlTable: string => extractedTable
  let extractXmlTable: string => extractedTable
  let extractSqlTable: string => extractedTable
}

module StreamMode: {
  type config = {
    inputPath: string,
    inputFormat: string,
    outputPath: string,
    outputFormat: string,
    delimiter: string,
    quote: string,
    escape: string,
    lineBreak: string,
    includeHeaders: bool,
    hasHeaders: bool,
    hasRowNumbers: bool,
    rowNumberHeader: string,
    sqlTableName: string,
    sqlIdentifierQuote: string,
    sqlIncludeCreateTable: bool,
    sqlInsertBatchSize: int,
    htmlTableClass: string,
    htmlTheadClass: string,
    htmlTbodyClass: string,
    htmlId: string,
    htmlCaption: string,
    yamlIndent: int,
    yamlQuoteStrings: bool,
    columns: array<string>,
    filters: array<string>,
    stats: bool,
  }

  let run: config => unit
}
