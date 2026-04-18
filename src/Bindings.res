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
  @send external onEnd: (stdInput, @as("end") _, unit => unit) => unit = "on"
  @send external onError: (stdInput, @as("error") _, JsExn.t => unit) => unit = "on"
  @send external write: (stdOutput, string) => bool = "write"
}

module Fs = {
  @module("node:fs")
  external existsSync: string => bool = "existsSync"

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
    config?: string,
    stats?: bool,
    version?: bool,
    @as("no-headers") noHeaders?: bool,
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

module StreamMode = {
  type config = {
    inputPath: string,
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
