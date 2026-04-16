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
  -i, --input <format>    Input format (array-of-arrays|array-of-objects|object-of-arrays|object-of-objects)
      --set <key=value>   Override format option (repeatable, e.g. --set json.pretty=false)
      --list-set-keys      Print allowed --set keys and defaults
      --list-set-keys-format <format>
                           Print allowed --set keys for one format
  -c, --config <path>     Path to config JSON file
  -d, --delimiter <char>  CSV delimiter override
      --no-headers        Omit CSV headers in output
  -h, --help              Show this help message
  -v, --version           Show version

Input is read from [file] when provided, otherwise from stdin when piped.

Examples:
  cat data.json | tablyful --input array-of-objects --format csv --set csv.delimiter=';'
  cat data.json | tablyful --format json --set json.pretty=false --set json.indentSize=4
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
  writeStdout(`${version}\n`)
}

let printSetKeys = (filter: option<Types.format>): unit => {
  let csv = Defaults.defaultCsvOptions
  let json = Defaults.defaultJsonOptions
  let markdown = Defaults.defaultMarkdownOptions
  let html = Defaults.defaultHtmlOptions
  let latex = Defaults.defaultLatexOptions

  let printCsv = () => {
    writeStdout("csv options:\n")
    writeStdout(`  csv.delimiter (string) - field delimiter (default: ${csv.delimiter})\n`)
    writeStdout(`  csv.quote (string) - quote char (default: ${csv.quote})\n`)
    writeStdout(`  csv.escape (string) - escape char (default: ${csv.escape})\n`)
    writeStdout(`  csv.lineBreak (string) - line break (default: ${csv.lineBreak})\n`)
    writeStdout(
      `  csv.includeHeaders (boolean) - include headers (default: ${csv.includeHeaders->Bool.toString})\n\n`,
    )
  }

  let printJson = () => {
    writeStdout("json options:\n")
    writeStdout(
      `  json.pretty (boolean) - pretty print JSON (default: ${json.pretty->Bool.toString})\n`,
    )
    writeStdout(`  json.indentSize (int) - indent size (default: ${json.indentSize->Int.toString})\n`)
    writeStdout(`  json.asArray (boolean) - output arrays (default: ${json.asArray->Bool.toString})\n\n`)
  }

  let printMarkdown = () => {
    writeStdout("markdown options:\n")
    writeStdout(`  markdown.align (string) - alignment (default: ${markdown.align})\n`)
    writeStdout(
      `  markdown.padding (boolean) - pad columns (default: ${markdown.padding->Bool.toString})\n`,
    )
    writeStdout(
      `  markdown.githubFlavor (boolean) - GitHub flavor output (default: ${markdown.githubFlavor->Bool.toString})\n\n`,
    )
  }

  let printHtml = () => {
    writeStdout("html options:\n")
    writeStdout(`  html.tableClass (string) - table class (default: ${html.tableClass})\n`)
    writeStdout(`  html.theadClass (string) - thead class (default: ${html.theadClass})\n`)
    writeStdout(`  html.tbodyClass (string) - tbody class (default: ${html.tbodyClass})\n`)
    writeStdout(`  html.id (string) - table id (default: ${html.id})\n`)
    writeStdout(`  html.caption (string) - caption text (default: ${html.caption})\n\n`)
  }

  let printLatex = () => {
    writeStdout("latex options:\n")
    writeStdout(
      `  latex.tableEnvironment (string) - environment name (default: ${latex.tableEnvironment})\n`,
    )
    writeStdout(`  latex.columnSpec (string) - column spec (default: ${latex.columnSpec})\n`)
    writeStdout(`  latex.booktabs (boolean) - use booktabs (default: ${latex.booktabs->Bool.toString})\n`)
    writeStdout(`  latex.caption (string) - caption text (default: ${latex.caption})\n`)
    writeStdout(`  latex.label (string) - table label (default: ${latex.label})\n`)
    writeStdout(`  latex.centering (boolean) - center table (default: ${latex.centering->Bool.toString})\n`)
    writeStdout(
      `  latex.useTableEnvironment (boolean) - wrap in table env (default: ${latex.useTableEnvironment->Bool.toString})\n\n`,
    )
  }

  switch filter {
  | None => {
      printCsv()
      printJson()
      printMarkdown()
      printHtml()
      printLatex()
    }
  | Some(Csv) => printCsv()
  | Some(Json) => printJson()
  | Some(Markdown) => printMarkdown()
  | Some(Html) => printHtml()
  | Some(Latex) => printLatex()
  }
}

let makeParseOptions = (): dict<Bindings.Util.flatConfig> => {
  Dict.fromArray([
    ("format", makeStringOption(~short="f")),
    ("input", makeStringOption(~short="i")),
    ("set", makeStringOption(~multiple=true)),
    ("list-set-keys", makeBoolOption()),
    ("list-set-keys-format", makeStringOption()),
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
  setPairs: array<(string, string)>,
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

let invalidSet = (message: string): Common.result<'a> => {
  TablyfulError.validationError(message)->TablyfulError.toResult
}

let parseSetPair = (entry: string): Common.result<(string, string)> => {
  let parts = entry->String.split("=")
  if parts->Array.length < 2 {
    invalidSet(
      `Invalid --set value: ${entry}. Expected format: <format>.<option>=<value>.`,
    )
  } else {
    let key = parts->Array.getUnsafe(0)->String.trim
    let value = parts->Array.slice(~start=1)->Array.join("=")->String.trim
    if key === "" || value === "" {
      invalidSet(
        `Invalid --set value: ${entry}. Expected format: <format>.<option>=<value>.`,
      )
    } else {
      Ok((key, value))
    }
  }
}

let parseSetPairs = (raw: option<array<string>>): Common.result<array<(string, string)>> => {
  switch raw {
  | None => Ok([])
  | Some(entries) =>
    entries->Array.reduce(Ok([]), (acc, entry) => {
      acc->Result.flatMap(pairs => {
        parseSetPair(entry)->Result.map(pair => Array.concat(pairs, [pair]))
      })
    })
  }
}

let parseBoolValue = (value: string): option<bool> => {
  switch value->String.toLowerCase {
  | "true" => Some(true)
  | "false" => Some(false)
  | _ => None
  }
}

let parseBoolSet = (~key: string, value: string): Common.result<bool> => {
  switch parseBoolValue(value) {
  | Some(v) => Ok(v)
  | None => invalidSet(`Invalid boolean for --set ${key}: ${value}. Use true or false.`)
  }
}

let parseIntSet = (~key: string, value: string): Common.result<int> => {
  switch Int.fromString(value) {
  | Some(v) => Ok(v)
  | None => invalidSet(`Invalid integer for --set ${key}: ${value}.`)
  }
}

let applySetOverride = (options: t, ((key, value): (string, string))): Common.result<t> => {
  let parts = key->String.split(".")
  if parts->Array.length !== 2 {
    invalidSet(
      `Invalid --set key: ${key}. Expected format: <format>.<option>, e.g. csv.delimiter.`,
    )
  } else {
    let section = parts->Array.getUnsafe(0)->String.toLowerCase
    let field = parts->Array.getUnsafe(1)
    let fullKey = `${section}.${field}`

    switch section {
    | "csv" => {
        let csv = Defaults.getCsvOptions(options)
        switch field {
        | "delimiter" => Ok({...options, formatOptions: CsvOptions({...csv, delimiter: value})})
        | "quote" => Ok({...options, formatOptions: CsvOptions({...csv, quote: value})})
        | "escape" => Ok({...options, formatOptions: CsvOptions({...csv, escape: value})})
        | "lineBreak" => Ok({...options, formatOptions: CsvOptions({...csv, lineBreak: value})})
        | "includeHeaders" =>
          parseBoolSet(~key=fullKey, value)->Result.map(includeHeaders => {
            {...options, formatOptions: CsvOptions({...csv, includeHeaders})}
          })
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed csv options: delimiter, quote, escape, lineBreak, includeHeaders.`,
          )
        }
      }
    | "json" => {
        let json = Defaults.getJsonOptions(options)
        switch field {
        | "pretty" =>
          parseBoolSet(~key=fullKey, value)->Result.map(pretty => {
            {...options, formatOptions: JsonOptions({...json, pretty})}
          })
        | "indentSize" =>
          parseIntSet(~key=fullKey, value)->Result.map(indentSize => {
            {...options, formatOptions: JsonOptions({...json, indentSize})}
          })
        | "asArray" =>
          parseBoolSet(~key=fullKey, value)->Result.map(asArray => {
            {...options, formatOptions: JsonOptions({...json, asArray})}
          })
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed json options: pretty, indentSize, asArray.`,
          )
        }
      }
    | "markdown" => {
        let markdown = Defaults.getMarkdownOptions(options)
        switch field {
        | "align" => Ok({...options, formatOptions: MarkdownOptions({...markdown, align: value})})
        | "padding" =>
          parseBoolSet(~key=fullKey, value)->Result.map(padding => {
            {...options, formatOptions: MarkdownOptions({...markdown, padding})}
          })
        | "githubFlavor" =>
          parseBoolSet(~key=fullKey, value)->Result.map(githubFlavor => {
            {...options, formatOptions: MarkdownOptions({...markdown, githubFlavor})}
          })
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed markdown options: align, padding, githubFlavor.`,
          )
        }
      }
    | "html" => {
        let html = Defaults.getHtmlOptions(options)
        switch field {
        | "tableClass" => Ok({...options, formatOptions: HtmlOptions({...html, tableClass: value})})
        | "theadClass" => Ok({...options, formatOptions: HtmlOptions({...html, theadClass: value})})
        | "tbodyClass" => Ok({...options, formatOptions: HtmlOptions({...html, tbodyClass: value})})
        | "id" => Ok({...options, formatOptions: HtmlOptions({...html, id: value})})
        | "caption" => Ok({...options, formatOptions: HtmlOptions({...html, caption: value})})
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed html options: tableClass, theadClass, tbodyClass, id, caption.`,
          )
        }
      }
    | "latex" => {
        let latex = Defaults.getLatexOptions(options)
        switch field {
        | "tableEnvironment" =>
          Ok({...options, formatOptions: LatexOptions({...latex, tableEnvironment: value})})
        | "columnSpec" => Ok({...options, formatOptions: LatexOptions({...latex, columnSpec: value})})
        | "booktabs" =>
          parseBoolSet(~key=fullKey, value)->Result.map(booktabs => {
            {...options, formatOptions: LatexOptions({...latex, booktabs})}
          })
        | "caption" => Ok({...options, formatOptions: LatexOptions({...latex, caption: value})})
        | "label" => Ok({...options, formatOptions: LatexOptions({...latex, label: value})})
        | "centering" =>
          parseBoolSet(~key=fullKey, value)->Result.map(centering => {
            {...options, formatOptions: LatexOptions({...latex, centering})}
          })
        | "useTableEnvironment" =>
          parseBoolSet(~key=fullKey, value)->Result.map(useTableEnvironment => {
            {...options, formatOptions: LatexOptions({...latex, useTableEnvironment})}
          })
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed latex options: tableEnvironment, columnSpec, booktabs, caption, label, centering, useTableEnvironment.`,
          )
        }
      }
    | _ =>
      invalidSet(
        `Unknown --set format: ${section}. Allowed formats: csv, json, markdown, html, latex.`,
      )
    }
  }
}

let applySetOverrides = (options: t, pairs: array<(string, string)>): Common.result<t> => {
  pairs->Array.reduce(Ok(options), (acc, pair) => {
    acc->Result.flatMap(opts => applySetOverride(opts, pair))
  })
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
      switch applySetOverrides(configOptions, flags.setPairs) {
      | Error(error) =>
        printError(error)
        Bindings.Process.exit(2)
      | Ok(withSetOverrides) =>
        switch overrideWithCliFlags(withSetOverrides, flags) {
        | Error(error) =>
          printError(error)
          Bindings.Process.exit(2)
        | Ok(options) =>
          switch ParserRegistry.parse(~format=?flags.inputArg, jsonInput, options) {
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

    if values.listSetKeys->Option.getOr(false) {
      printSetKeys(None)
      Bindings.Process.exit(0)
    }

    switch values.listSetKeysFormat {
    | Some(formatStr) =>
      switch Types.formatFromString(formatStr) {
      | Some(format) =>
        printSetKeys(Some(format))
        Bindings.Process.exit(0)
      | None =>
        printError(
          TablyfulError.validationError(
            `Invalid format for --list-set-keys-format: ${formatStr}. Expected one of: csv, json, markdown, html, latex.`,
          ),
        )
        Bindings.Process.exit(2)
      }
    | None => ()
    }

    let setPairs = switch parseSetPairs(values.set) {
    | Ok(pairs) => pairs
    | Error(error) =>
      printError(error)
      showHelp()
      Bindings.Process.exit(2)
      []
    }

    let flags: cliFlags = {
      formatArg: values.format,
      inputArg: values.input,
      setPairs,
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
