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
  -f, --format <format>   Output format (csv|tsv|psv|json|markdown|html|latex|sql|yaml)
  -i, --input <format>    Input format (optional; auto-detected when omitted)
  -o, --output <path>     Write output to file instead of stdout
      --set <key=value>   Override format option (repeatable, e.g. --set json.pretty=false)
      --list-set-keys      Print allowed --set keys and defaults
      --list-set-keys-format <format>
                           Print allowed --set keys for one format
  -C, --columns <names>   Comma-separated output columns (e.g. name,age)
      --filter <expr>     Filter rows (repeatable; supports = != > < >= <= LIKE)
      --stats             Print conversion stats to stderr
  -c, --config <path>     Path to config JSON file
  -d, --delimiter <char>  CSV delimiter override
      --no-headers        Omit headers in CSV/TSV/PSV output
  -h, --help              Show this help message
  -v, --version           Show version

Input is read from [file] when provided, otherwise from stdin when piped.

Examples:
  cat data.json | tablyful --format csv --set csv.delimiter=';'
  cat data.json | tablyful --format json --set json.pretty=false --set json.indentSize=4
  cat data.json | tablyful --format yaml --filter 'name LIKE ali%' --columns name,age
  cat data.json | tablyful --format sql --set sql.tableName=users --stats
  tablyful data.json --format csv --output out.csv
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
  let tsv = Defaults.defaultTsvOptions
  let psv = Defaults.defaultPsvOptions
  let json = Defaults.defaultJsonOptions
  let markdown = Defaults.defaultMarkdownOptions
  let html = Defaults.defaultHtmlOptions
  let latex = Defaults.defaultLatexOptions
  let sql = Defaults.defaultSqlOptions
  let yaml = Defaults.defaultYamlOptions
  let displayLiteral = (value: string): string => {
    value->String.replaceAll("\n", "\\n")->String.replaceAll("\t", "\\t")
  }

  let printSection = (name: string, entries: array<string>): unit => {
    writeStdout(`${name} options:\n`)
    entries->Array.forEach(entry => {
      writeStdout(`  ${entry}\n`)
    })
    writeStdout("\n")
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
    ])
  }

  let printYaml = () => {
    printSection("yaml", [
      `yaml.indent (int) - indentation spaces (default: ${yaml.indent->Int.toString})`,
      `yaml.quoteStrings (boolean) - quote all strings (default: ${yaml.quoteStrings->Bool.toString})`,
      `yaml.lineBreak (string) - line break (default: ${yaml.lineBreak->displayLiteral})`,
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
    }
  }

  switch filter {
  | None => [Csv, Tsv, Psv, Json, Markdown, Html, Latex, Sql, Yaml]->Array.forEach(printByFormat)
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
  outputPath: option<string>,
  setPairs: array<(string, string)>,
  columnsArg: option<array<string>>,
  filterExprs: array<string>,
  delimiterArg: option<string>,
  configPath: option<string>,
  noHeaders: bool,
  stats: bool,
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
   | Some(entries) => {
       let rec loop = (index: int, acc: list<(string, string)>): Common.result<array<(string, string)>> => {
         if index >= entries->Array.length {
           Ok(acc->List.reverse->List.toArray)
         } else {
           parseSetPair(entries->Array.getUnsafe(index))->Result.flatMap(pair => {
             loop(index + 1, list{pair, ...acc})
           })
         }
       }

       loop(0, list{})
     }
  }
}

let parseColumnsArg = (raw: option<string>): Common.result<option<array<string>>> => {
  switch raw {
  | None => Ok(None)
  | Some(value) => {
      let columns =
        value
        ->String.split(",")
        ->Array.map(column => column->String.trim)
        ->Array.filter(column => column !== "")

      if columns->Array.length === 0 {
        invalidSet("Invalid --columns value. Provide one or more comma-separated column names.")
      } else {
        Ok(Some(columns))
      }
    }
  }
}

let parseFilterExprs = (raw: option<array<string>>): Common.result<array<string>> => {
  switch raw {
  | None => Ok([])
  | Some(entries) => {
      let filters =
        entries
        ->Array.map(entry => entry->String.trim)
        ->Array.filter(entry => entry !== "")

      if filters->Array.length !== entries->Array.length {
        invalidSet("Invalid --filter value. Expressions cannot be empty.")
      } else {
        Ok(filters)
      }
    }
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
    | "tsv" => {
        switch field {
        | "includeHeaders" =>
          parseBoolSet(~key=fullKey, value)->Result.map(includeHeaders => {
            {...options, formatOptions: TsvOptions({includeHeaders: includeHeaders})}
          })
        | _ =>
          invalidSet(`Unknown --set option: ${fullKey}. Allowed tsv options: includeHeaders.`)
        }
      }
    | "psv" => {
        switch field {
        | "includeHeaders" =>
          parseBoolSet(~key=fullKey, value)->Result.map(includeHeaders => {
            {...options, formatOptions: PsvOptions({includeHeaders: includeHeaders})}
          })
        | _ =>
          invalidSet(`Unknown --set option: ${fullKey}. Allowed psv options: includeHeaders.`)
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
    | "sql" => {
        let sql = Defaults.getSqlOptions(options)
        switch field {
        | "tableName" => Ok({...options, formatOptions: SqlOptions({...sql, tableName: value})})
        | "identifierQuote" =>
          Ok({...options, formatOptions: SqlOptions({...sql, identifierQuote: value})})
        | "includeCreateTable" =>
          parseBoolSet(~key=fullKey, value)->Result.map(includeCreateTable => {
            {...options, formatOptions: SqlOptions({...sql, includeCreateTable})}
          })
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed sql options: tableName, identifierQuote, includeCreateTable.`,
          )
        }
      }
    | "yaml" => {
        let yaml = Defaults.getYamlOptions(options)
        switch field {
        | "indent" =>
          parseIntSet(~key=fullKey, value)->Result.map(indent => {
            {...options, formatOptions: YamlOptions({...yaml, indent})}
          })
        | "quoteStrings" =>
          parseBoolSet(~key=fullKey, value)->Result.map(quoteStrings => {
            {...options, formatOptions: YamlOptions({...yaml, quoteStrings})}
          })
        | "lineBreak" => Ok({...options, formatOptions: YamlOptions({...yaml, lineBreak: value})})
        | _ =>
          invalidSet(
            `Unknown --set option: ${fullKey}. Allowed yaml options: indent, quoteStrings, lineBreak.`,
          )
        }
      }
    | _ =>
      invalidSet(
        `Unknown --set format: ${section}. Allowed formats: csv, tsv, psv, json, markdown, html, latex, sql, yaml.`,
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
        `Invalid format: ${value}. Expected one of: csv, tsv, psv, json, markdown, html, latex, sql, yaml.`,
      )->TablyfulError.toResult
    }
  | None => Ok(options.outputFormat)
  }

  outputFormat->Result.map(outputFormat => {
    let withFormat = {...options, outputFormat}

    let withDelimiter = switch flags.delimiterArg {
    | Some(delimiter) =>
      switch withFormat.outputFormat {
      | Csv =>
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
      | _ => withFormat
      }
    | None => withFormat
    }

    if flags.noHeaders {
      switch withDelimiter.outputFormat {
      | Csv =>
        switch withDelimiter.formatOptions {
        | CsvOptions(csv) =>
          {
            ...withDelimiter,
            formatOptions: CsvOptions({...csv, includeHeaders: false}),
          }
        | _ =>
          {
            ...withDelimiter,
            formatOptions: CsvOptions({...Defaults.defaultCsvOptions, includeHeaders: false}),
          }
        }
      | Tsv =>
        switch withDelimiter.formatOptions {
        | TsvOptions(_) =>
          {
            ...withDelimiter,
            formatOptions: TsvOptions({includeHeaders: false}),
          }
        | _ =>
          {
            ...withDelimiter,
            formatOptions: TsvOptions({includeHeaders: false}),
          }
        }
      | Psv =>
        switch withDelimiter.formatOptions {
        | PsvOptions(_) =>
          {
            ...withDelimiter,
            formatOptions: PsvOptions({includeHeaders: false}),
          }
        | _ =>
          {
            ...withDelimiter,
            formatOptions: PsvOptions({includeHeaders: false}),
          }
        }
      | _ => withDelimiter
      }
    } else {
      withDelimiter
    }
  })
}

let resolveOptions = (flags: cliFlags): Common.result<t> => {
  mergeConfig(~configPath=flags.configPath)
  ->Result.flatMap(configOptions => applySetOverrides(configOptions, flags.setPairs))
  ->Result.flatMap(withSetOverrides => overrideWithCliFlags(withSetOverrides, flags))
}

let makeBaseStreamConfig = (
  ~inputPath: option<string>,
  flags: cliFlags,
  options: t,
): Bindings.StreamMode.config => {
  {
    inputPath: inputPath->Option.getOr(""),
    outputPath: flags.outputPath->Option.getOr(""),
    outputFormat: "csv",
    delimiter: Defaults.defaultCsvOptions.delimiter,
    quote: Defaults.defaultCsvOptions.quote,
    escape: Defaults.defaultCsvOptions.escape,
    lineBreak: Defaults.defaultCsvOptions.lineBreak,
    includeHeaders: true,
    hasHeaders: options.hasHeaders,
    hasRowNumbers: options.hasRowNumbers,
    rowNumberHeader: options.rowNumberHeader,
    sqlTableName: Defaults.defaultSqlOptions.tableName,
    sqlIdentifierQuote: Defaults.defaultSqlOptions.identifierQuote,
    sqlIncludeCreateTable: false,
    htmlTableClass: Defaults.defaultHtmlOptions.tableClass,
    htmlTheadClass: Defaults.defaultHtmlOptions.theadClass,
    htmlTbodyClass: Defaults.defaultHtmlOptions.tbodyClass,
    htmlId: Defaults.defaultHtmlOptions.id,
    htmlCaption: Defaults.defaultHtmlOptions.caption,
    yamlIndent: Defaults.defaultYamlOptions.indent,
    yamlQuoteStrings: Defaults.defaultYamlOptions.quoteStrings,
    columns: flags.columnsArg->Option.getOr([]),
    filters: flags.filterExprs,
    stats: flags.stats,
  }
}

let runStreamMode = (~inputPath: option<string>, flags: cliFlags): unit => {
  switch resolveOptions(flags) {
  | Error(error) =>
    printError(error)
    Bindings.Process.exit(2)
  | Ok(options) =>
    let baseConfig = makeBaseStreamConfig(~inputPath, flags, options)

    let streamConfig = switch options.outputFormat {
    | Csv => {
        let csv = Defaults.getCsvOptions(options)
        Some({
          ...baseConfig,
          outputFormat: "csv",
          delimiter: csv.delimiter,
          quote: csv.quote,
          escape: csv.escape,
          lineBreak: csv.lineBreak,
          includeHeaders: csv.includeHeaders,
        })
      }
    | Tsv => {
        let tsv = Defaults.getTsvOptions(options)
        Some({...baseConfig, outputFormat: "tsv", delimiter: "\t", includeHeaders: tsv.includeHeaders})
      }
    | Psv => {
        let psv = Defaults.getPsvOptions(options)
        Some({...baseConfig, outputFormat: "psv", delimiter: "|", includeHeaders: psv.includeHeaders})
      }
    | Sql => {
        let sql = Defaults.getSqlOptions(options)
        Some({
          ...baseConfig,
          outputFormat: "sql",
          includeHeaders: false,
          sqlTableName: sql.tableName,
          sqlIdentifierQuote: sql.identifierQuote,
          sqlIncludeCreateTable: sql.includeCreateTable,
        })
      }
    | Html => {
        let html = Defaults.getHtmlOptions(options)
        Some({
          ...baseConfig,
          outputFormat: "html",
          includeHeaders: true,
          htmlTableClass: html.tableClass,
          htmlTheadClass: html.theadClass,
          htmlTbodyClass: html.tbodyClass,
          htmlId: html.id,
          htmlCaption: html.caption,
        })
      }
    | Yaml => {
        let yaml = Defaults.getYamlOptions(options)
        Some({
          ...baseConfig,
          outputFormat: "yaml",
          includeHeaders: true,
          lineBreak: yaml.lineBreak,
          yamlIndent: yaml.indent,
          yamlQuoteStrings: yaml.quoteStrings,
        })
      }
    | _ =>
      printError(
        TablyfulError.validationError(
          "Automatic streaming currently supports output formats: csv, tsv, psv, sql, html, yaml.",
        ),
      )
      Bindings.Process.exit(2)
      None
    }

    switch streamConfig {
    | Some(config) => Bindings.StreamMode.run(config)
    | None => ()
    }
  }
}

let runConversion = (inputText: string, flags: cliFlags): unit => {
  switch parseJsonInput(inputText) {
  | Error(error) =>
    printError(error)
    Bindings.Process.exit(1)
  | Ok(jsonInput) =>
    switch resolveOptions(flags) {
    | Error(error) =>
      printError(error)
      Bindings.Process.exit(2)
    | Ok(options) =>
      switch ParserRegistry.parse(~format=?flags.inputArg, jsonInput, options) {
      | Error(error) =>
        printError(error)
        Bindings.Process.exit(1)
      | Ok(tableData) =>
        switch TableTransform.applyFilters(tableData, flags.filterExprs) {
        | Error(error) =>
          printError(error)
          Bindings.Process.exit(1)
        | Ok(filteredData) =>
          let conversionResult =
            switch flags.columnsArg {
            | Some(columns) => TableTransform.selectColumns(filteredData, columns)
            | None => Ok(filteredData)
            }
            ->Result.flatMap(finalData => {
              let formatName = options.outputFormat->Types.formatToString
              FormatterRegistry.format(formatName, finalData, options)->Result.map(output => {
                (finalData, output)
              })
            })

          switch conversionResult {
          | Error(error) =>
            printError(error)
            Bindings.Process.exit(1)
          | Ok((finalData, output)) =>
            if flags.stats {
              let formatName = options.outputFormat->Types.formatToString
              writeStderr(
                `[tablyful] rows: ${finalData.metadata.rowCount->Int.toString}, columns: ${
                  finalData.metadata.columnCount->Int.toString
                }, detected: ${finalData.metadata.sourceFormat}, format: ${formatName}\n`,
              )
            }
            switch flags.outputPath {
            | Some(path) =>
              try {
                Bindings.Fs.writeFileSyncUtf8(path, output ++ "\n")
              } catch {
              | JsExn(e) =>
                printError(
                  TablyfulError.ioError(
                    `Failed to write output file: ${e->JsExn.message->Option.getOr("unknown error")}`,
                  ),
                )
                Bindings.Process.exit(1)
              }
            | None => writeStdout(output ++ "\n")
            }
            Bindings.Process.exit(0)
          }
        }
      }
    }
  }
}

let readInputFromStdin = (flags: cliFlags): unit => {
  Bindings.Stream.setEncoding(Bindings.Process.stdin, "utf8")

  let chunks = ref(list{})

  Bindings.Stream.onData(Bindings.Process.stdin, chunk => {
    chunks.contents = list{chunk, ...chunks.contents}
  })

  Bindings.Stream.onEnd(Bindings.Process.stdin, () => {
    runConversion(chunks.contents->List.reverse->List.toArray->Array.join(""), flags)
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
            `Invalid format for --list-set-keys-format: ${formatStr}. Expected one of: csv, tsv, psv, json, markdown, html, latex, sql, yaml.`,
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

    let columnsArg = switch parseColumnsArg(values.columns) {
    | Ok(columns) => columns
    | Error(error) =>
      printError(error)
      showHelp()
      Bindings.Process.exit(2)
      None
    }

    let filterExprs = switch parseFilterExprs(values.filter) {
    | Ok(filters) => filters
    | Error(error) =>
      printError(error)
      showHelp()
      Bindings.Process.exit(2)
      []
    }

    let flags: cliFlags = {
      formatArg: values.format,
      inputArg: values.input,
      outputPath: values.output,
      setPairs,
      columnsArg,
      filterExprs,
      delimiterArg: values.delimiter,
      configPath: values.config,
      noHeaders: values.noHeaders->Option.getOr(false),
      stats: values.stats->Option.getOr(false),
    }

    let inputPath = if positionals->Array.length > 0 {
      Some(positionals->Array.getUnsafe(0))
    } else {
      None
    }

    let runBatchMode = () => {
      switch inputPath {
      | Some(filePath) =>
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
      | None =>
        if Bindings.Process.stdin.isTTY !== Some(true) {
          readInputFromStdin(flags)
        } else {
          showHelp()
          Bindings.Process.exit(0)
        }
      }
    }

    if flags.inputArg->Option.isSome {
      runBatchMode()
    } else {
      switch resolveOptions(flags) {
      | Error(error) =>
        printError(error)
        Bindings.Process.exit(2)
      | Ok(options) =>
        switch options.outputFormat {
        | Csv | Tsv | Psv | Sql | Html | Yaml =>
          switch inputPath {
          | Some(_) => runStreamMode(~inputPath, flags)
          | None =>
            if Bindings.Process.stdin.isTTY !== Some(true) {
              runStreamMode(~inputPath, flags)
            } else {
              showHelp()
              Bindings.Process.exit(0)
            }
          }
        | _ => runBatchMode()
        }
      }
    }
  }
}
