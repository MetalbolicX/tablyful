open Types

type flags = CliTypes.flags

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
        ->Bindings.Iter.fromArray
        ->Bindings.Iter.map(column => column->String.trim)
        ->Bindings.Iter.filter(column => column !== "")
        ->Bindings.Iter.toArray

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
        ->Bindings.Iter.fromArray
        ->Bindings.Iter.map(entry => entry->String.trim)
        ->Bindings.Iter.filter(entry => entry !== "")
        ->Bindings.Iter.toArray

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

let unknownSetOption = (~fullKey: string, ~section: string, ~allowed: string): Common.result<'a> => {
  invalidSet(`Unknown --set option: ${fullKey}. Allowed ${section} options: ${allowed}.`)
}

let applyCsvSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
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
    unknownSetOption(
      ~fullKey,
      ~section="csv",
      ~allowed="delimiter, quote, escape, lineBreak, includeHeaders",
    )
  }
}

let applyTsvSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
  switch field {
  | "includeHeaders" =>
    parseBoolSet(~key=fullKey, value)->Result.map(includeHeaders => {
      {...options, formatOptions: TsvOptions({includeHeaders: includeHeaders})}
    })
  | _ => unknownSetOption(~fullKey, ~section="tsv", ~allowed="includeHeaders")
  }
}

let applyPsvSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
  switch field {
  | "includeHeaders" =>
    parseBoolSet(~key=fullKey, value)->Result.map(includeHeaders => {
      {...options, formatOptions: PsvOptions({includeHeaders: includeHeaders})}
    })
  | _ => unknownSetOption(~fullKey, ~section="psv", ~allowed="includeHeaders")
  }
}

let applyJsonSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
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
  | _ => unknownSetOption(~fullKey, ~section="json", ~allowed="pretty, indentSize, asArray")
  }
}

let applyMarkdownSetOverride = (
  options: t,
  ~field: string,
  ~fullKey: string,
  value: string,
): Common.result<t> => {
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
  | _ => unknownSetOption(~fullKey, ~section="markdown", ~allowed="align, padding, githubFlavor")
  }
}

let applyHtmlSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
  let html = Defaults.getHtmlOptions(options)
  switch field {
  | "tableClass" => Ok({...options, formatOptions: HtmlOptions({...html, tableClass: value})})
  | "theadClass" => Ok({...options, formatOptions: HtmlOptions({...html, theadClass: value})})
  | "tbodyClass" => Ok({...options, formatOptions: HtmlOptions({...html, tbodyClass: value})})
  | "id" => Ok({...options, formatOptions: HtmlOptions({...html, id: value})})
  | "caption" => Ok({...options, formatOptions: HtmlOptions({...html, caption: value})})
  | _ =>
    unknownSetOption(
      ~fullKey,
      ~section="html",
      ~allowed="tableClass, theadClass, tbodyClass, id, caption",
    )
  }
}

let applyLatexSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
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
    unknownSetOption(
      ~fullKey,
      ~section="latex",
      ~allowed="tableEnvironment, columnSpec, booktabs, caption, label, centering, useTableEnvironment",
    )
  }
}

let applySqlSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
  let sql = Defaults.getSqlOptions(options)
  switch field {
  | "tableName" => Ok({...options, formatOptions: SqlOptions({...sql, tableName: value})})
  | "identifierQuote" => Ok({...options, formatOptions: SqlOptions({...sql, identifierQuote: value})})
  | "includeCreateTable" =>
    parseBoolSet(~key=fullKey, value)->Result.map(includeCreateTable => {
      {...options, formatOptions: SqlOptions({...sql, includeCreateTable})}
    })
  | "insertBatchSize" =>
    parseIntSet(~key=fullKey, value)->Result.flatMap(insertBatchSize => {
      if insertBatchSize <= 0 {
        invalidSet(
          `Invalid --set ${fullKey}: ${value}. Value must be greater than 0.`,
        )
      } else {
        Ok({...options, formatOptions: SqlOptions({...sql, insertBatchSize})})
      }
    })
  | _ =>
    unknownSetOption(
      ~fullKey,
      ~section="sql",
      ~allowed="tableName, identifierQuote, includeCreateTable, insertBatchSize",
    )
  }
}

let applyYamlSetOverride = (options: t, ~field: string, ~fullKey: string, value: string): Common.result<t> => {
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
  | _ => unknownSetOption(~fullKey, ~section="yaml", ~allowed="indent, quoteStrings, lineBreak")
  }
}

let applyNdjsonSetOverride = (
  options: t,
  ~field: string,
  ~fullKey: string,
  value: string,
): Common.result<t> => {
  switch field {
  | "lineBreak" => Ok({...options, formatOptions: NdjsonOptions({lineBreak: value})})
  | _ => unknownSetOption(~fullKey, ~section="ndjson", ~allowed="lineBreak")
  }
}

type setOverrideHandler = (t, ~field: string, ~fullKey: string, string) => Common.result<t>

let formatHandlers: Dict.t<setOverrideHandler> = {
  let dict = Dict.make()
  dict->Dict.set("csv", applyCsvSetOverride)
  dict->Dict.set("tsv", applyTsvSetOverride)
  dict->Dict.set("psv", applyPsvSetOverride)
  dict->Dict.set("json", applyJsonSetOverride)
  dict->Dict.set("markdown", applyMarkdownSetOverride)
  dict->Dict.set("html", applyHtmlSetOverride)
  dict->Dict.set("latex", applyLatexSetOverride)
  dict->Dict.set("sql", applySqlSetOverride)
  dict->Dict.set("yaml", applyYamlSetOverride)
  dict->Dict.set("ndjson", applyNdjsonSetOverride)
  dict
}

let supportedFormats = "csv, tsv, psv, json, markdown, html, latex, sql, yaml, ndjson"

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

    switch formatHandlers->Dict.get(section) {
    | Some(handler) => handler(options, ~field, ~fullKey, value)
    | None =>
      invalidSet(
        `Unknown --set format: ${section}. Allowed formats: ${supportedFormats}.`,
      )
    }
  }
}

let applySetOverrides = (options: t, pairs: array<(string, string)>): Common.result<t> => {
  pairs
  ->Bindings.Iter.fromArray
  ->Bindings.Iter.reduce((acc, pair) => acc->Result.flatMap(opts => applySetOverride(opts, pair)), Ok(options))
}

let overrideWithCliFlags = (options: t, flags: flags): Common.result<t> => {
  let disableDelimitedHeaders = (opts: t): t => {
    switch opts.outputFormat {
    | Csv =>
      switch opts.formatOptions {
      | CsvOptions(csv) => {
          ...opts,
          formatOptions: CsvOptions({...csv, includeHeaders: false}),
        }
      | _ => {
          ...opts,
          formatOptions: CsvOptions({...Defaults.defaultCsvOptions, includeHeaders: false}),
        }
      }
    | Tsv => {
        ...opts,
        formatOptions: TsvOptions({includeHeaders: false}),
      }
    | Psv => {
        ...opts,
        formatOptions: PsvOptions({includeHeaders: false}),
      }
    | _ => opts
    }
  }

  let outputFormat = switch flags.formatArg {
  | Some(value) =>
    switch Types.formatFromString(value) {
    | Some(format) => Ok(format)
    | None =>
      TablyfulError.validationError(
        `Invalid format: ${value}. Expected one of: ${CliConstants.supportedOutputFormats}.`,
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
      disableDelimitedHeaders(withDelimiter)
    } else {
      withDelimiter
    }
  })
}

let mergeConfig = (~configPath: option<string>): Common.result<t> => {
  switch configPath {
  | Some(path) => ConfigFile.load(~path, ())
  | None => ConfigFile.load(())
  }
}

let resolveOptions = (flags: flags): Common.result<t> => {
  mergeConfig(~configPath=flags.configPath)
  ->Result.flatMap(configOptions => applySetOverrides(configOptions, flags.setPairs))
  ->Result.flatMap(withSetOverrides => overrideWithCliFlags(withSetOverrides, flags))
}
