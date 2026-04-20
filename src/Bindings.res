/**
 * Centralized Node.js bindings.
 */

module Stream = {
  // type readable
  type stdInput = {
    isTTY?: bool,
  }

  type stdOutput = {
    write: string => bool,
  }

  @send external setEncoding: (stdInput, string) => unit = "setEncoding"
  @send external onData: (stdInput, @as("data") _, string => unit) => unit = "on"
  @send external onceData: (stdInput, @as("data") _, string => unit) => unit = "once"
  @send external onEnd: (stdInput, @as("end") _, unit => unit) => unit = "on"
  @send external onceEnd: (stdInput, @as("end") _, unit => unit) => unit = "once"
  @send external onError: (stdInput, @as("error") _, JsExn.t => unit) => unit = "on"
  @send external pause: stdInput => unit = "pause"
  @send external resume: stdInput => unit = "resume"
  @send external unshift: (stdInput, string) => unit = "unshift"
  @send external write: (stdOutput, string) => bool = "write"
}

module Fs = {
  type stats = {
    size: float,
  }

  @module("node:fs")
  external existsSync: string => bool = "existsSync"

  @module("node:fs")
  external statSync: string => stats = "statSync"

  @module("node:fs")
  external readFileSyncUtf8: (string, @as("utf8") _) => string = "readFileSync"

  @module("node:fs")
  external writeSyncFd: (int, string) => int = "writeSync"

  @module("node:fs")
  external writeFileSyncUtf8: (string, string) => unit = "writeFileSync"
}

module Path = {
  @module("node:path") @variadic
  external join: array<string> => string = "join"
}

module Process = {
  @val @module("node:process")
  external cwd: unit => string = "cwd"

  @val @module("node:process")
  external argv: array<string> = "argv"

  @val @module("node:process")
  external stdin: Stream.stdInput = "stdin"

  @val @module("node:process")
  external stdout: Stream.stdOutput = "stdout"

  @val @module("node:process")
  external stderr: Stream.stdOutput = "stderr"

  @val @module("node:process")
  external exit: int => unit = "exit"
}

module Os = {
  @module("node:os")
  external homedir: unit => string = "homedir"
}

module Util = {
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

  @module("node:util") external parseArgs: parseConfig => parseArgsResult = "parseArgs"
}

module TableExtractor = {
  type extractedTable = {
    headers: array<string>,
    rows: array<dict<string>>,
  }

  @module("./Reader/TableExtractor.mjs")
  external extractHtmlTable: string => extractedTable = "extractHtmlTable"

  @module("./Reader/TableExtractor.mjs")
  external extractMarkdownTable: string => extractedTable = "extractMarkdownTable"

  @module("./Reader/TableExtractor.mjs")
  external extractLatexTable: string => extractedTable = "extractLatexTable"

  @module("./Reader/TableExtractor.mjs")
  external extractYamlTable: string => extractedTable = "extractYamlTable"

  @module("./Reader/TableExtractor.mjs")
  external extractXmlTable: string => extractedTable = "extractXmlTable"

  @module("./Reader/TableExtractor.mjs")
  external extractSqlTable: string => extractedTable = "extractSqlTable"
}

module StreamMode = {
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

  @module("./Cli/StreamMode.mjs")
  external run: config => unit = "runStreamConversion"
}

module Iter = {
  type t<'a> = Iterator.t<'a>

  // Static factory methods (Iterator.from)
  @val @scope("Iterator") external fromArray: array<'a> => t<'a> = "from"
  @val @scope("Iterator") external fromSet: Set.t<'a> => t<'a> = "from"
  @val @scope("Iterator") external fromMap: Map.t<'k, 'v> => t<('k, 'v)> = "from"

  // Array iterator constructors
  @send external values: array<'a> => t<'a> = "values"
  @send external entries: array<'a> => t<(int, 'a)> = "entries"
  @send external keys: array<'a> => t<int> = "keys"

  // Lazy pipeline methods
  @send external map: (t<'a>, 'a => 'b) => t<'b> = "map"
  @send external filter: (t<'a>, 'a => bool) => t<'a> = "filter"
  @send external take: (t<'a>, int) => t<'a> = "take"
  @send external drop: (t<'a>, int) => t<'a> = "drop"
  @send external forEach: (t<'a>, 'a => unit) => unit = "forEach"
  @send external toArray: t<'a> => array<'a> = "toArray"
  @send external every: (t<'a>, 'a => bool) => bool = "every"
  @send external some: (t<'a>, 'a => bool) => bool = "some"
  @send external reduce: (t<'a>, ('b, 'a) => 'b, 'b) => 'b = "reduce"
  @send external reduce1: (t<'a>, ('a, 'a) => 'a) => 'a = "reduce"
  @send @return(nullable) external find: (t<'a>, 'a => bool) => option<'a> = "find"
  @send external flatMap: (t<'a>, 'a => t<'b>) => t<'b> = "flatMap"
}
