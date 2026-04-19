open Types

@val
external version: string = "__VERSION__"

let defaultMaxFileSizeBytes = 500 * 1024 * 1024

let parseMaxFileSizeBytes = (raw: option<string>): Common.result<int> => {
  switch raw {
  | None => Ok(defaultMaxFileSizeBytes)
  | Some(value) =>
    switch Int.fromString(value) {
    | Some(parsed) if parsed > 0 => Ok(parsed)
    | _ =>
      TablyfulError.validationError(
        `Invalid --max-file-size value: ${value}. Expected a positive integer number of bytes.`,
      )->TablyfulError.toResult
    }
  }
}

let ensureInputFileWithinLimit = (~path: option<string>, ~maxBytes: int): unit => {
  switch path {
  | None => ()
  | Some(filePath) =>
    if Bindings.Fs.existsSync(filePath) {
      let size =
        try {
          Bindings.Fs.statSync(filePath).size->Float.toInt
        } catch {
        | JsExn(e) =>
          CliIo.exitWithError(
            ~code=1,
            TablyfulError.ioError(
              `Failed to inspect input file: ${e->JsExn.message->Option.getOr("unknown error")}`,
            ),
          )
          0
        }

      if size > maxBytes {
        CliIo.exitWithError(
          ~code=1,
          TablyfulError.ioError(
            `Input file is too large (${size->Int.toString} bytes). Maximum allowed size is ${
              maxBytes->Int.toString
            } bytes. Increase limit with --max-file-size.`,
          ),
        )
      }
    }
  }
}

let showHelp = (): unit => {
  CliIo.writeStdout(`
Usage: tablyful [options] [file]
Convert tabular data between formats.

Options:
  -f, --format <format>   Output format (csv|tsv|psv|json|markdown|html|latex|sql|yaml|ndjson)
  -i, --input <format>    Input format (json|ndjson|csv|tsv|psv|html|markdown|latex|yaml|xml|sql; auto-detected when omitted)
  -o, --output <path>     Write output to file instead of stdout
      --set <key=value>   Override format option (repeatable, e.g. --set json.pretty=false)
      --list-set-keys      Print allowed --set keys and defaults
      --list-set-keys-format <format>
                           Print allowed --set keys for one format
  -C, --columns <names>   Comma-separated output columns (e.g. name,age)
      --filter <expr>     Filter rows (repeatable; supports = != > < >= <= LIKE)
      --stats             Print conversion stats to stderr
      --stream            Force streaming mode (line-by-line processing)
      --no-stream         Force buffered mode (read entire input first)
      --examples          Show usage examples
  -c, --config <path>     Path to config JSON file
  -d, --delimiter <char>  CSV delimiter override
      --max-file-size <n>  Maximum input file size in bytes (default: 524288000)
      --no-headers        Omit headers in CSV/TSV/PSV output
  -h, --help              Show this help message
  -v, --version           Show version

Input is read from [file] when provided, otherwise from stdin when piped.
Input format is auto-detected from file extension or content. Use --input to override.
Supported input formats: json, ndjson, csv, tsv, psv, html, markdown, latex, yaml, xml, sql.

Streaming: tablyful automatically streams when input is a JSON array or NDJSON and the
output format supports streaming (csv|tsv|psv|sql|html|yaml|ndjson). Use --stream to
force streaming (useful for file input) or --no-stream to disable it.

Use --examples to see usage examples.
`
  )
}

let showExamples = (): unit => {
  CliIo.writeStdout(`
Examples:
  cat data.json | tablyful --format csv --set csv.delimiter=';'
  cat data.json | tablyful --format json --set json.pretty=false --set json.indentSize=4
  cat data.json | tablyful --format yaml --filter 'name LIKE ali%' --columns name,age
  cat data.json | tablyful --format sql --set sql.tableName=users --stats
  tablyful data.json --format csv --output out.csv
  tablyful data.html --format csv
  tablyful table.md --format json
  tablyful data.csv --format json
  tablyful data.yaml --format markdown
  tablyful data.xml --format csv
  tablyful data.sql --format yaml
  cat table.tex | tablyful --input latex --format csv
  cat data.tsv | tablyful --input tsv --format json
  cat data.ndjson | tablyful --input ndjson --format csv
  tablyful data.json --format ndjson
  tablyful data.json --format csv --stream
  tablyful data.json --format json --no-stream
  tablyful --list-set-keys
  tablyful --list-set-keys-format csv
  cat data.json | tablyful --format csv --delimiter ';' --config conf.json
`
  )
}

let makeStringOption = (~short=?, ~multiple=false): Bindings.Util.flatConfig => {
  switch (short, multiple) {
  | (Some(value), true) => {type_: "string", short: value, multiple: true}
  | (Some(value), false) => {type_: "string", short: value}
  | (None, true) => {type_: "string", multiple: true}
  | (None, false) => {type_: "string"}
  }
}

let makeBoolOption = (~short=?): Bindings.Util.flatConfig => {
  switch short {
  | Some(value) => {type_: "boolean", short: value}
  | None => {type_: "boolean"}
  }
}

let showVersion = (): unit => {
  CliIo.writeStdout(`${version}\n`)
}

let displayLiteral = (value: string): string => {
  value->String.replaceAll("\n", "\\n")->String.replaceAll("\t", "\\t")
}

let buildDisplayEntries = (format: Types.format): array<string> => {
  let name = switch format {
  | Csv => "csv"
  | Tsv => "tsv"
  | Psv => "psv"
  | Json => "json"
  | Markdown => "markdown"
  | Html => "html"
  | Latex => "latex"
  | Sql => "sql"
  | Yaml => "yaml"
  | Ndjson => "ndjson"
  }
  FormatKeys.getKnownKeys(format)->Array.map(((key, description)) => {
    switch format {
    | Csv => {
        let d = Defaults.getCsvOptions(Defaults.t)
        switch key {
        | "includeHeaders" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.includeHeaders->Bool.toString})`
        | "lineBreak" => `${name}.${key} (string) - ${description} (default: ${d.lineBreak->displayLiteral})`
        | "delimiter" => `${name}.${key} (string) - ${description} (default: ${d.delimiter})`
        | "quote" => `${name}.${key} (string) - ${description} (default: ${d.quote})`
        | "escape" => `${name}.${key} (string) - ${description} (default: ${d.escape})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Tsv => {
        let d = Defaults.getTsvOptions(Defaults.t)
        `${name}.${key} (boolean) - ${description} (default: ${d.includeHeaders->Bool.toString})`
      }
    | Psv => {
        let d = Defaults.getPsvOptions(Defaults.t)
        `${name}.${key} (boolean) - ${description} (default: ${d.includeHeaders->Bool.toString})`
      }
    | Json => {
        let d = Defaults.getJsonOptions(Defaults.t)
        switch key {
        | "pretty" | "asArray" =>
          let b = if key == "pretty" {d.pretty} else {d.asArray}
          `${name}.${key} (boolean) - ${description} (default: ${b->Bool.toString})`
        | "indentSize" => `${name}.${key} (int) - ${description} (default: ${d.indentSize->Int.toString})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Markdown => {
        let d = Defaults.getMarkdownOptions(Defaults.t)
        switch key {
        | "align" => `${name}.${key} (string) - ${description} (default: ${d.align})`
        | "padding" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.padding->Bool.toString})`
        | "githubFlavor" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.githubFlavor->Bool.toString})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Html => {
        let d = Defaults.getHtmlOptions(Defaults.t)
        switch key {
        | "tableClass" => `${name}.${key} (string) - ${description} (default: ${d.tableClass})`
        | "theadClass" => `${name}.${key} (string) - ${description} (default: ${d.theadClass})`
        | "tbodyClass" => `${name}.${key} (string) - ${description} (default: ${d.tbodyClass})`
        | "id" => `${name}.${key} (string) - ${description} (default: ${d.id})`
        | "caption" => `${name}.${key} (string) - ${description} (default: ${d.caption})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Latex => {
        let d = Defaults.getLatexOptions(Defaults.t)
        switch key {
        | "tableEnvironment" => `${name}.${key} (string) - ${description} (default: ${d.tableEnvironment})`
        | "columnSpec" => `${name}.${key} (string) - ${description} (default: ${d.columnSpec})`
        | "caption" => `${name}.${key} (string) - ${description} (default: ${d.caption})`
        | "label" => `${name}.${key} (string) - ${description} (default: ${d.label})`
        | "booktabs" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.booktabs->Bool.toString})`
        | "centering" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.centering->Bool.toString})`
        | "useTableEnvironment" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.useTableEnvironment->Bool.toString})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Sql => {
        let d = Defaults.getSqlOptions(Defaults.t)
        switch key {
        | "tableName" => `${name}.${key} (string) - ${description} (default: ${d.tableName})`
        | "identifierQuote" => `${name}.${key} (string) - ${description} (default: ${d.identifierQuote})`
        | "includeCreateTable" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.includeCreateTable->Bool.toString})`
        | "insertBatchSize" =>
          `${name}.${key} (int) - ${description} (default: ${d.insertBatchSize->Int.toString})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Yaml => {
        let d = Defaults.getYamlOptions(Defaults.t)
        switch key {
        | "indent" => `${name}.${key} (int) - ${description} (default: ${d.indent->Int.toString})`
        | "quoteStrings" =>
          `${name}.${key} (boolean) - ${description} (default: ${d.quoteStrings->Bool.toString})`
        | "lineBreak" => `${name}.${key} (string) - ${description} (default: ${d.lineBreak->displayLiteral})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    | Ndjson => {
        let d = Defaults.getNdjsonOptions(Defaults.t)
        switch key {
        | "lineBreak" => `${name}.${key} (string) - ${description} (default: ${d.lineBreak->displayLiteral})`
        | _ => `${name}.${key} - ${description}`
        }
      }
    }
  })
}

let printSetKeys = (filter: option<Types.format>): unit => {
  let printSection = (name: string, entries: array<string>): unit => {
    CliIo.writeStdout(`${name} options:\n`)
    entries->Array.forEach(entry => {
      CliIo.writeStdout(`  ${entry}\n`)
    })
    CliIo.writeStdout("\n")
  }

  let printFormat = (format: Types.format): unit => {
    let name = switch format {
    | Csv => "csv"
    | Tsv => "tsv"
    | Psv => "psv"
    | Json => "json"
    | Markdown => "markdown"
    | Html => "html"
    | Latex => "latex"
    | Sql => "sql"
    | Yaml => "yaml"
    | Ndjson => "ndjson"
    }
    printSection(name, buildDisplayEntries(format))
  }

  let allFormats: array<Types.format> = [Csv, Tsv, Psv, Json, Markdown, Html, Latex, Sql, Yaml, Ndjson]
  switch filter {
  | None => allFormats->Array.forEach(printFormat)
  | Some(format) => printFormat(format)
  }
}

let makeParseOptions = (): dict<Bindings.Util.flatConfig> => {
  Dict.fromArray([
    ("format", makeStringOption(~short="f")),
    ("input", makeStringOption(~short="i")),
    ("output", makeStringOption(~short="o")),
    ("set", makeStringOption(~multiple=true)),
    ("columns", makeStringOption(~short="C")),
    ("filter", makeStringOption(~multiple=true)),
    ("stats", makeBoolOption()),
    ("stream", makeBoolOption()),
    ("no-stream", makeBoolOption()),
    ("examples", makeBoolOption()),
    ("list-set-keys", makeBoolOption()),
    ("list-set-keys-format", makeStringOption()),
    ("config", makeStringOption(~short="c")),
    ("delimiter", makeStringOption(~short="d")),
    ("max-file-size", makeStringOption()),
    ("no-headers", makeBoolOption()),
    ("help", makeBoolOption(~short="h")),
    ("version", makeBoolOption(~short="v")),
  ])
}

type flags = CliTypes.flags

let shouldStreamStdin = (firstChunk: string, flags: flags, streamOptions: option<t>): bool => {
  switch flags.stream {
  | Some(true) =>
    switch streamOptions {
    | Some(options) =>
      if CliConstants.isStreamableOutputFormat(options.outputFormat) {
        true
      } else {
        TablyfulError.validationError(CliConstants.streamUnsupportedOutputMessage)->CliIo.printError
        Bindings.Process.exit(CliConstants.exitCodeValidationError)
        false
      }
    | None => false
    }
  | Some(false) => false
  | None =>
    let trimmed = firstChunk->String.trim
    let requestedInput = flags.inputArg->Option.map(String.toLowerCase)
    let looksLikeJsonArray = trimmed->String.startsWith("[")
    let looksLikeNdjsonObject =
      switch requestedInput {
      | Some("ndjson") => trimmed->String.startsWith("{")
      | _ => false
      }
    if !looksLikeJsonArray && !looksLikeNdjsonObject {
      false
    } else {
      switch streamOptions {
      | Some(options) => CliConstants.isStreamableOutputFormat(options.outputFormat)
      | None => false
      }
    }
  }
}

let readInputFromStdin = (flags: flags, ~streamOptions=?,): unit => {
  let stdin = Bindings.Process.stdin
  Bindings.Stream.setEncoding(stdin, "utf8")

  let sawData = ref(false)

  let runBufferedMode = (firstChunk: string): unit => {
    let chunks = ref(list{firstChunk})

    Bindings.Stream.onData(stdin, chunk => {
      chunks.contents = list{chunk, ...chunks.contents}
    })

    Bindings.Stream.onEnd(stdin, () => {
      CliConvert.runConversion(chunks.contents->List.reverse->List.toArray->Array.join(""), flags)
    })

    Bindings.Stream.resume(stdin)
  }

  Bindings.Stream.onceData(stdin, firstChunk => {
    sawData.contents = true
    Bindings.Stream.pause(stdin)

    if shouldStreamStdin(firstChunk, flags, streamOptions) {
      Bindings.Stream.unshift(stdin, firstChunk)
      switch streamOptions {
      | Some(options) => CliConvert.runStreamMode(~inputPath=None, flags, options)
      | None => runBufferedMode(firstChunk)
      }
    } else {
      runBufferedMode(firstChunk)
    }
  })

  Bindings.Stream.onceEnd(stdin, () => {
    if !sawData.contents {
      CliConvert.runConversion("", flags)
    }
  })

  Bindings.Stream.onError(stdin, e => {
    CliIo.printError(
      TablyfulError.ioError(`Failed to read stdin: ${e->JsExn.message->Option.getOr("unknown error")}`),
    )
    Bindings.Process.exit(CliConstants.exitCodeRuntimeError)
  })
}

let isStdinPiped = (): bool => {
  Bindings.Process.stdin.isTTY !== Some(true)
}

let resolveRoutingInputFormat = (
  normalizedInputArg: option<string>,
  inputPath: option<string>,
): option<string> => {
  switch normalizedInputArg {
  | Some(fmt) => Some(fmt)
  | None =>
    switch inputPath {
    | Some(path) => FormatDetector.fromExtension(path)
    | None => None
    }
  }
}

let shouldForceBatchFromInputArg = (normalizedInputArg: option<string>): bool => {
  switch normalizedInputArg {
  | Some("json") => false
  | Some("ndjson") => false
  | Some(_) => true
  | None => false
  }
}

let shouldRouteBatchMode = (
  flags: flags,
  ~forceBatchFromInputArg: bool,
  ~isReaderInput: bool,
  ~isNdjsonInput: bool,
): bool => {
  if flags.stream == Some(false) {
    true
  } else {
    flags.stream != Some(true) && (forceBatchFromInputArg || (isReaderInput && !isNdjsonInput))
  }
}

let parseArgsOrExit = (): Bindings.Util.parseArgsResult => {
  try {
    Bindings.Util.parseArgs({
      args: Bindings.Process.argv->Array.slice(~start=2),
      options: makeParseOptions(),
      strict: true,
      allowPositionals: true,
    })
  } catch {
  | JsExn(e) =>
    CliIo.printError(
      TablyfulError.validationError(
        `Argument parsing failed: ${e->JsExn.message->Option.getOr("unknown error")}`,
      ),
    )
    showHelp()
    Bindings.Process.exit(CliConstants.exitCodeValidationError)
    {
      values: {},
      positionals: [],
    }
  }
}

let parseMaxFileSizeOrExit = (raw: option<string>): int => {
  switch parseMaxFileSizeBytes(raw) {
  | Ok(size) => size
  | Error(error) =>
    CliIo.printError(error)
    showHelp()
    Bindings.Process.exit(CliConstants.exitCodeValidationError)
    defaultMaxFileSizeBytes
  }
}

let parseSetPairsOrExit = (raw: option<array<string>>): array<(string, string)> => {
  switch CliOptions.parseSetPairs(raw) {
  | Ok(pairs) => pairs
  | Error(error) =>
    CliIo.printError(error)
    showHelp()
    Bindings.Process.exit(CliConstants.exitCodeValidationError)
    []
  }
}

let parseColumnsArgOrExit = (raw: option<string>): option<array<string>> => {
  switch CliOptions.parseColumnsArg(raw) {
  | Ok(columns) => columns
  | Error(error) =>
    CliIo.printError(error)
    showHelp()
    Bindings.Process.exit(CliConstants.exitCodeValidationError)
    None
  }
}

let parseFilterExprsOrExit = (raw: option<array<string>>): array<string> => {
  switch CliOptions.parseFilterExprs(raw) {
  | Ok(filters) => filters
  | Error(error) =>
    CliIo.printError(error)
    showHelp()
    Bindings.Process.exit(CliConstants.exitCodeValidationError)
    []
  }
}

let parseStreamFlagOrExit = (stream: option<bool>, noStream: option<bool>): option<bool> => {
  switch (stream, noStream) {
  | (Some(true), Some(true)) =>
    CliIo.printError(
      TablyfulError.validationError("Cannot use --stream and --no-stream together."),
    )
    showHelp()
    Bindings.Process.exit(CliConstants.exitCodeValidationError)
    None
  | (Some(true), _) => Some(true)
  | (_, Some(true)) => Some(false)
  | _ => None
  }
}

let main = (): unit => {
  let parsed = parseArgsOrExit()
    let values = parsed.values
    let positionals = parsed.positionals

    let maxFileSizeBytes = parseMaxFileSizeOrExit(values.maxFileSize)

    if values.help->Option.getOr(false) {
      showHelp()
      Bindings.Process.exit(CliConstants.exitCodeSuccess)
    }

    if values.examples->Option.getOr(false) {
      showExamples()
      Bindings.Process.exit(CliConstants.exitCodeSuccess)
    }

    if values.version->Option.getOr(false) {
      showVersion()
      Bindings.Process.exit(CliConstants.exitCodeSuccess)
    }

    if values.listSetKeys->Option.getOr(false) {
      printSetKeys(None)
      Bindings.Process.exit(CliConstants.exitCodeSuccess)
    }

    switch values.listSetKeysFormat {
    | Some(formatStr) =>
      switch Types.formatFromString(formatStr) {
      | Some(format) =>
        printSetKeys(Some(format))
        Bindings.Process.exit(CliConstants.exitCodeSuccess)
      | None =>
        CliIo.printError(
          TablyfulError.validationError(
            `Invalid format for --list-set-keys-format: ${formatStr}. Expected one of: ${CliConstants.supportedOutputFormats}.`,
          ),
        )
        Bindings.Process.exit(CliConstants.exitCodeValidationError)
      }
    | None => ()
    }

    let setPairs = parseSetPairsOrExit(values.set)
    let columnsArg = parseColumnsArgOrExit(values.columns)
    let filterExprs = parseFilterExprsOrExit(values.filter)
    let streamFlag = parseStreamFlagOrExit(values.stream, values.noStream)

    let flags: flags = {
      formatArg: values.format,
      inputArg: values.input,
      outputPath: values.output,
      setPairs,
      columnsArg,
      filterExprs,
      delimiterArg: values.delimiter,
      maxFileSizeBytes,
      configPath: values.config,
      noHeaders: values.noHeaders->Option.getOr(false),
      stats: values.stats->Option.getOr(false),
      stream: streamFlag,
    }

    let inputPath = if positionals->Array.length > 0 {
      Some(positionals->Array.getUnsafe(0))
    } else {
      None
    }

    ensureInputFileWithinLimit(~path=inputPath, ~maxBytes=maxFileSizeBytes)

    let runBatchMode = () => {
      switch inputPath {
      | Some(filePath) =>
        let inputText = try {
          Bindings.Fs.readFileSyncUtf8(filePath)
        } catch {
        | JsExn(e) =>
          CliIo.printError(
            TablyfulError.ioError(`Failed to read input file: ${e->JsExn.message->Option.getOr("unknown error")}`),
          )
          Bindings.Process.exit(CliConstants.exitCodeRuntimeError)
          ""
        }
        CliConvert.runConversion(inputText, flags, ~inputPath=filePath)
      | None =>
        if isStdinPiped() {
          readInputFromStdin(flags)
        } else {
          showHelp()
          Bindings.Process.exit(CliConstants.exitCodeSuccess)
        }
      }
    }

    let normalizedInputArg = flags.inputArg->Option.map(String.toLowerCase)
    let routingInputFormat = resolveRoutingInputFormat(normalizedInputArg, inputPath)
    let forceBatchFromInputArg = shouldForceBatchFromInputArg(normalizedInputArg)

    let isReaderInput = switch routingInputFormat {
    | Some(fmt) => ReaderRegistry.hasReader(fmt)
    | None => false
    }

    let isNdjsonInput = switch routingInputFormat {
    | Some("ndjson") => true
    | _ => false
    }

    if shouldRouteBatchMode(flags, ~forceBatchFromInputArg, ~isReaderInput, ~isNdjsonInput) {
      runBatchMode()
    } else {
      switch CliOptions.resolveOptions(flags) {
      | Error(error) =>
        CliIo.printError(error)
        Bindings.Process.exit(CliConstants.exitCodeValidationError)
      | Ok(options) =>
        if CliConstants.isStreamableOutputFormat(options.outputFormat) {
          switch inputPath {
          | Some(_) => CliConvert.runStreamMode(~inputPath, flags, options)
          | None =>
            if isStdinPiped() {
              readInputFromStdin(flags, ~streamOptions=options)
            } else {
              showHelp()
              Bindings.Process.exit(CliConstants.exitCodeSuccess)
            }
          }
        } else {
          if flags.stream == Some(true) {
            CliIo.printError(TablyfulError.validationError(CliConstants.streamUnsupportedOutputMessage))
            Bindings.Process.exit(CliConstants.exitCodeValidationError)
          } else {
            runBatchMode()
          }
        }
      }
    }
}
