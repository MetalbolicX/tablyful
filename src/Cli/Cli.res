open Types

@val
external version: string = "__VERSION__"

let writeStdout = (text: string): unit => {
  ignore(Bindings.Fs.writeSyncFd(1, text))
}

let writeStderr = (text: string): unit => {
  ignore(Bindings.Fs.writeSyncFd(2, text))
}

let showHelp = (): unit => {
  writeStdout(`
    Usage: tablyful [options] [file]
    Convert tabular data between formats.
    Options:
    -f, --format <format>   Output format (csv|json|markdown|html|latex)
    -i, --input <format>    Input format (json)
    -c, --config <path>     Path to config JSON file
    -d, --delimiter <char>  CSV delimiter override
        --no-headers        Omit CSV headers in output
    -h, --help              Show this help message
    -v, --version           Show version
    Input is read from [file] when provided, otherwise from stdin when piped.
    Examples:
    cat data.json | tablyful --input json --format csv
    cat data.json | tablyful --format csv --delimiter ';' --config conf.json`
  )
}

let makeStringOption = (~short=?): Bindings.Util.flatConfig => {
  switch short {
  | Some(value) => {type_: "string", short: value}
  | None => {type_: "string"}
  }
}

let makeBoolOption = (~short=?): Bindings.Util.flatConfig => {
  switch short {
  | Some(value) => {type_: "boolean", short: value}
  | None => {type_: "boolean"}
  }
}

let showVersion = (): unit => {
  writeStdout(`${version}\n`)
}

let makeParseOptions = (): dict<Bindings.Util.flatConfig> => {
  Dict.fromArray([
    ("format", makeStringOption(~short="f")),
    ("input", makeStringOption(~short="i")),
    ("config", makeStringOption(~short="c")),
    ("delimiter", makeStringOption(~short="d")),
    ("no-headers", makeBoolOption()),
    ("help", makeBoolOption(~short="h")),
    ("version", makeBoolOption(~short="v")),
  ])
}

type cliFlags = {
  formatArg: option<string>,
  inputArg: option<string>,
  delimiterArg: option<string>,
  configPath: option<string>,
  noHeaders: bool,
}

let printError = (error: TablyfulError.t): unit => {
  writeStderr(TablyfulError.toString(error) ++ "\n")
}

let parseJsonInput = (inputText: string): Common.result<JSON.t> => {
  if inputText->String.trim === "" {
    TablyfulError.validationError(
      "No input provided. Pass a file path or pipe JSON via stdin.",
    )->TablyfulError.toResult
  } else {
    Common.parseJson(inputText)
  }
}

let mergeConfig = (~configPath: option<string>): Common.result<t> => {
  switch configPath {
  | Some(path) => ConfigFile.load(~path, ())
  | None => Ok(Defaults.t)
  }
}

let overrideWithCliFlags = (options: t, flags: cliFlags): Common.result<t> => {
  let outputFormat = switch flags.formatArg {
  | Some(value) =>
    switch Types.formatFromString(value) {
    | Some(format) => Ok(format)
    | None =>
      TablyfulError.validationError(
        `Invalid format: ${value}. Expected one of: csv, json, markdown, html, latex.`,
      )->TablyfulError.toResult
    }
  | None => Ok(options.outputFormat)
  }

  outputFormat->Result.map(outputFormat => {
    let withFormat = {...options, outputFormat}

    let withDelimiter = switch flags.delimiterArg {
    | Some(delimiter) =>
      switch withFormat.formatOptions {
      | CsvOptions(csv) =>
        {
          ...withFormat,
          formatOptions: CsvOptions({...csv, delimiter}),
        }
      | _ =>
        {
          ...withFormat,
          formatOptions: CsvOptions({...Defaults.defaultCsvOptions, delimiter}),
        }
      }
    | None => withFormat
    }

    if flags.noHeaders {
      switch withDelimiter.formatOptions {
      | CsvOptions(csv) =>
        {
          ...withDelimiter,
          formatOptions: CsvOptions({...csv, includeHeaders: false}),
        }
      | _ => withDelimiter
      }
    } else {
      withDelimiter
    }
  })
}

let runConversion = (inputText: string, flags: cliFlags): unit => {
  switch flags.inputArg {
  | Some(inputFormat) if inputFormat->String.toLowerCase !== "json" =>
    printError(
      TablyfulError.validationError(
        `Invalid input format: ${inputFormat}. Only json is currently supported.`,
      ),
    )
    Bindings.Process.exit(2)
  | _ =>
    switch parseJsonInput(inputText) {
    | Error(error) =>
      printError(error)
      Bindings.Process.exit(1)
    | Ok(jsonInput) =>
      switch mergeConfig(~configPath=flags.configPath) {
      | Error(error) =>
        printError(error)
        Bindings.Process.exit(2)
      | Ok(configOptions) =>
        switch overrideWithCliFlags(configOptions, flags) {
        | Error(error) =>
          printError(error)
          Bindings.Process.exit(2)
        | Ok(options) =>
          switch ParserRegistry.parse(jsonInput, options) {
          | Error(error) =>
            printError(error)
            Bindings.Process.exit(1)
          | Ok(tableData) =>
            let formatName = options.outputFormat->Types.formatToString
            switch FormatterRegistry.format(formatName, tableData, options) {
            | Error(error) =>
              printError(error)
              Bindings.Process.exit(1)
            | Ok(output) =>
              writeStdout(output ++ "\n")
              Bindings.Process.exit(0)
            }
          }
        }
      }
    }
  }
}

let readInputFromStdin = (flags: cliFlags): unit => {
  Bindings.Stream.setEncoding(Bindings.Process.stdin, "utf8")

  let buffer = ref("")

  Bindings.Stream.onData(Bindings.Process.stdin, chunk => {
    buffer.contents = buffer.contents ++ chunk
  })

  Bindings.Stream.onEnd(Bindings.Process.stdin, () => {
    runConversion(buffer.contents, flags)
  })

  Bindings.Stream.onError(Bindings.Process.stdin, e => {
    printError(
      TablyfulError.ioError(`Failed to read stdin: ${e->JsExn.message->Option.getOr("unknown error")}`),
    )
    Bindings.Process.exit(1)
  })
}

let main = (): unit => {
  let parsed =
    try {
      Some(
        Bindings.Util.parseArgs({
          args: Bindings.Process.argv->Array.slice(~start=2),
          options: makeParseOptions(),
          strict: true,
          allowPositionals: true,
        }),
      )
    } catch {
    | JsExn(e) =>
      printError(
        TablyfulError.validationError(
          `Argument parsing failed: ${e->JsExn.message->Option.getOr("unknown error")}`,
        ),
      )
      showHelp()
      Bindings.Process.exit(2)
      None
    }

  switch parsed {
  | None => ()
  | Some(parsed) =>
    let values = parsed.values
    let positionals = parsed.positionals

    if values.help->Option.getOr(false) {
      showHelp()
      Bindings.Process.exit(0)
    }

    if values.version->Option.getOr(false) {
      showVersion()
      Bindings.Process.exit(0)
    }

    let flags: cliFlags = {
      formatArg: values.format,
      inputArg: values.input,
      delimiterArg: values.delimiter,
      configPath: values.config,
      noHeaders: values.noHeaders->Option.getOr(false),
    }

    if positionals->Array.length > 0 {
      let filePath = positionals->Array.getUnsafe(0)
      let inputText = try {
        Bindings.Fs.readFileSyncUtf8(filePath)
      } catch {
      | JsExn(e) =>
        printError(
          TablyfulError.ioError(`Failed to read input file: ${e->JsExn.message->Option.getOr("unknown error")}`),
        )
        Bindings.Process.exit(1)
        ""
      }
      runConversion(inputText, flags)
    } else if Bindings.Process.stdin.isTTY !== Some(true) {
      readInputFromStdin(flags)
    } else {
      showHelp()
      Bindings.Process.exit(0)
    }
  }
}
