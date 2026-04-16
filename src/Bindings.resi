module Stream: {
  type stdInput = {
    isTTY?: bool,
  }

  type stdOutput = {
    write: string => bool,
  }

  let setEncoding: (stdInput, string) => unit
  let onData: (stdInput, string => unit) => unit
  let onEnd: (stdInput, unit => unit) => unit
  let onError: (stdInput, JsExn.t => unit) => unit
  let write: (stdOutput, string) => bool
}

module Fs: {
  let existsSync: string => bool
  let readFileSyncUtf8: string => string
  let writeSyncFd: (int, string) => int
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
    set?: array<string>,
    delimiter?: string,
    config?: string,
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

  let parseArgs: parseConfig => parseArgsResult
}
