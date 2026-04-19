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

let printSetKeys = (filter: option<Types.format>): unit => {
  let csv = Defaults.defaultCsvOptions
  let tsv = Defaults.defaultTsvOptions
  let psv = Defaults.defaultPsvOptions
  let json = Defaults.defaultJsonOptions
  let markdown = Defaults.defaultMarkdownOptions
  let html = Defaults.defaultHtmlOptions
  let latex = Defaults.defaultLatexOptions
  let sql = Defaults.defaultSqlOptions
  let yaml = Defaults.defaultYamlOptions
  let ndjson = Defaults.defaultNdjsonOptions
  let displayLiteral = (value: string): string => {
    value->String.replaceAll("\n", "\\n")->String.replaceAll("\t", "\\t")
  }

  let printSection = (name: string, entries: array<string>): unit => {
    CliIo.writeStdout(`${name} options:\n`)
    entries->Array.forEach(entry => {
      CliIo.writeStdout(`  ${entry}\n`)
    })
    CliIo.writeStdout("\n")
  }

  let printCsv = () => {
    printSection("csv", [
      `csv.delimiter (string) - field delimiter (default: ${csv.delimiter})`,
      `csv.quote (string) - quote char (default: ${csv.quote})`,
      `csv.escape (string) - escape char (default: ${csv.escape})`,
      `csv.lineBreak (string) - line break (default: ${csv.lineBreak->displayLiteral})`,
      `csv.includeHeaders (boolean) - include headers (default: ${csv.includeHeaders->Bool.toString})`,
    ])
  }

  let printJson = () => {
    printSection("json", [
      `json.pretty (boolean) - pretty print JSON (default: ${json.pretty->Bool.toString})`,
      `json.indentSize (int) - indent size (default: ${json.indentSize->Int.toString})`,
      `json.asArray (boolean) - output arrays (default: ${json.asArray->Bool.toString})`,
    ])
  }

  let printTsv = () => {
    printSection("tsv", [
      `tsv.includeHeaders (boolean) - include headers (default: ${tsv.includeHeaders->Bool.toString})`,
    ])
  }

  let printPsv = () => {
    printSection("psv", [
      `psv.includeHeaders (boolean) - include headers (default: ${psv.includeHeaders->Bool.toString})`,
    ])
  }

  let printMarkdown = () => {
    printSection("markdown", [
      `markdown.align (string) - alignment (default: ${markdown.align})`,
      `markdown.padding (boolean) - pad columns (default: ${markdown.padding->Bool.toString})`,
      `markdown.githubFlavor (boolean) - GitHub flavor output (default: ${markdown.githubFlavor->Bool.toString})`,
    ])
  }

  let printHtml = () => {
    printSection("html", [
      `html.tableClass (string) - table class (default: ${html.tableClass})`,
      `html.theadClass (string) - thead class (default: ${html.theadClass})`,
      `html.tbodyClass (string) - tbody class (default: ${html.tbodyClass})`,
      `html.id (string) - table id (default: ${html.id})`,
      `html.caption (string) - caption text (default: ${html.caption})`,
    ])
  }

  let printLatex = () => {
    printSection("latex", [
      `latex.tableEnvironment (string) - environment name (default: ${latex.tableEnvironment})`,
      `latex.columnSpec (string) - column spec (default: ${latex.columnSpec})`,
      `latex.booktabs (boolean) - use booktabs (default: ${latex.booktabs->Bool.toString})`,
      `latex.caption (string) - caption text (default: ${latex.caption})`,
      `latex.label (string) - table label (default: ${latex.label})`,
      `latex.centering (boolean) - center table (default: ${latex.centering->Bool.toString})`,
      `latex.useTableEnvironment (boolean) - wrap in table env (default: ${latex.useTableEnvironment->Bool.toString})`,
    ])
  }

  let printSql = () => {
    printSection("sql", [
      `sql.tableName (string) - table name (default: ${sql.tableName})`,
      `sql.identifierQuote (string) - identifier quote (default: ${sql.identifierQuote})`,
      `sql.includeCreateTable (boolean) - include CREATE TABLE (default: ${sql.includeCreateTable->Bool.toString})`,
      `sql.insertBatchSize (int) - rows per INSERT statement (default: ${sql.insertBatchSize->Int.toString})`,
    ])
  }

  let printYaml = () => {
    printSection("yaml", [
      `yaml.indent (int) - indentation spaces (default: ${yaml.indent->Int.toString})`,
      `yaml.quoteStrings (boolean) - quote all strings (default: ${yaml.quoteStrings->Bool.toString})`,
      `yaml.lineBreak (string) - line break (default: ${yaml.lineBreak->displayLiteral})`,
    ])
  }

  let printNdjson = () => {
    printSection("ndjson", [
      `ndjson.lineBreak (string) - line break (default: ${ndjson.lineBreak->displayLiteral})`,
    ])
  }

  let printByFormat = (format: Types.format): unit => {
    switch format {
    | Csv => printCsv()
    | Tsv => printTsv()
    | Psv => printPsv()
    | Json => printJson()
    | Markdown => printMarkdown()
    | Html => printHtml()
    | Latex => printLatex()
    | Sql => printSql()
    | Yaml => printYaml()
    | Ndjson => printNdjson()
    }
  }

  switch filter {
  | None => [Csv, Tsv, Psv, Json, Markdown, Html, Latex, Sql, Yaml, Ndjson]->Array.forEach(printByFormat)
  | Some(format) => printByFormat(format)
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
      CliIo.printError(
        TablyfulError.validationError(
          `Argument parsing failed: ${e->JsExn.message->Option.getOr("unknown error")}`,
        ),
      )
      showHelp()
      Bindings.Process.exit(CliConstants.exitCodeValidationError)
      None
    }

  switch parsed {
  | None => ()
  | Some(parsed) =>
    let values = parsed.values
    let positionals = parsed.positionals

    let maxFileSizeBytes = switch parseMaxFileSizeBytes(values.maxFileSize) {
    | Ok(size) => size
    | Error(error) =>
      CliIo.printError(error)
      showHelp()
      Bindings.Process.exit(CliConstants.exitCodeValidationError)
      defaultMaxFileSizeBytes
    }

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

    let setPairs = switch CliOptions.parseSetPairs(values.set) {
    | Ok(pairs) => pairs
    | Error(error) =>
      CliIo.printError(error)
      showHelp()
      Bindings.Process.exit(CliConstants.exitCodeValidationError)
      []
    }

    let columnsArg = switch CliOptions.parseColumnsArg(values.columns) {
    | Ok(columns) => columns
    | Error(error) =>
      CliIo.printError(error)
      showHelp()
      Bindings.Process.exit(CliConstants.exitCodeValidationError)
      None
    }

    let filterExprs = switch CliOptions.parseFilterExprs(values.filter) {
    | Ok(filters) => filters
    | Error(error) =>
      CliIo.printError(error)
      showHelp()
      Bindings.Process.exit(CliConstants.exitCodeValidationError)
      []
    }

    let streamFlag = switch (values.stream, values.noStream) {
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
}
