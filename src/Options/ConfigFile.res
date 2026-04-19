/**
 * Configuration file (.tablyfulrc.json) support
 * Cascading configuration: CLI args > ./.tablyfulrc.json > ~/.tablyfulrc.json > defaults
 */
open Types
open Defaults

// Load config file from path
let loadFile = (path: string): Common.result<option<dict<JSON.t>>> => {
  try {
    if Bindings.Fs.existsSync(path) {
      let content = Bindings.Fs.readFileSyncUtf8(path)
      switch Common.parseJson(content) {
      | Ok(json) =>
        switch JSON.Decode.object(json) {
        | Some(dict) => Ok(Some(dict))
        | None =>
          TablyfulError.validationError(
            `Config file at ${path} must be a JSON object`,
          )->TablyfulError.toResult
        }
      | Error(err) =>
        Error(err)->TablyfulError.mapError(e =>
          e->TablyfulError.withCause(`Failed to parse ${path}`)
        )
      }
    } else {
      Ok(None)
    }
  } catch {
  | JsExn(e) =>
    TablyfulError.ioError(
      `Failed to read config file: ${e->JsExn.message->Option.getOr("Unknown error")}`,
    )->TablyfulError.toResult
  }
}

// Parse format from JSON
let parseFormat = (json: JSON.t): option<format> => {
  switch JSON.Decode.string(json) {
  | Some(str) => formatFromString(str)
  | None => None
  }
}

let getString = (dict: dict<JSON.t>, key: string, default: string): string => {
  dict
  ->Dict.get(key)
  ->Option.flatMap(JSON.Decode.string)
  ->Option.getOr(default)
}

let getBool = (dict: dict<JSON.t>, key: string, default: bool): bool => {
  dict
  ->Dict.get(key)
  ->Option.flatMap(JSON.Decode.bool)
  ->Option.getOr(default)
}

let getInt = (dict: dict<JSON.t>, key: string, default: int): int => {
  dict
  ->Dict.get(key)
  ->Option.flatMap(JSON.Decode.float)
  ->Option.flatMap(value => {
    let intValue = value->Float.toInt
    if intValue->Int.toFloat === value {
      Some(intValue)
    } else {
      None
    }
  })
  ->Option.getOr(default)
}

// Parse CSV options from JSON
let parseCsvOptions = (dict: dict<JSON.t>): csvOptions => {
  {
    delimiter: getString(dict, "delimiter", defaultCsvOptions.delimiter),
    quote: getString(dict, "quote", defaultCsvOptions.quote),
    escape: getString(dict, "escape", defaultCsvOptions.escape),
    lineBreak: getString(dict, "lineBreak", defaultCsvOptions.lineBreak),
    includeHeaders: getBool(dict, "includeHeaders", defaultCsvOptions.includeHeaders),
  }
}

// Parse TSV options from JSON
let parseTsvOptions = (dict: dict<JSON.t>): tsvOptions => {
  {
    includeHeaders: getBool(dict, "includeHeaders", defaultTsvOptions.includeHeaders),
  }
}

// Parse PSV options from JSON
let parsePsvOptions = (dict: dict<JSON.t>): psvOptions => {
  {
    includeHeaders: getBool(dict, "includeHeaders", defaultPsvOptions.includeHeaders),
  }
}

// Parse JSON options from JSON
let parseJsonOptions = (dict: dict<JSON.t>): jsonOptions => {
  {
    pretty: getBool(dict, "pretty", defaultJsonOptions.pretty),
    indentSize: getInt(dict, "indentSize", defaultJsonOptions.indentSize),
    asArray: getBool(dict, "asArray", defaultJsonOptions.asArray),
  }
}

// Parse Markdown options from JSON
let parseMarkdownOptions = (dict: dict<JSON.t>): markdownOptions => {
  {
    align: getString(dict, "align", defaultMarkdownOptions.align),
    padding: getBool(dict, "padding", defaultMarkdownOptions.padding),
    githubFlavor: getBool(dict, "githubFlavor", defaultMarkdownOptions.githubFlavor),
  }
}

// Parse HTML options from JSON
let parseHtmlOptions = (dict: dict<JSON.t>): htmlOptions => {
  {
    tableClass: getString(dict, "tableClass", defaultHtmlOptions.tableClass),
    theadClass: getString(dict, "theadClass", defaultHtmlOptions.theadClass),
    tbodyClass: getString(dict, "tbodyClass", defaultHtmlOptions.tbodyClass),
    id: getString(dict, "id", defaultHtmlOptions.id),
    caption: getString(dict, "caption", defaultHtmlOptions.caption),
  }
}

// Parse LaTeX options from JSON
let parseLatexOptions = (dict: dict<JSON.t>): latexOptions => {
  {
    tableEnvironment: getString(dict, "tableEnvironment", defaultLatexOptions.tableEnvironment),
    columnSpec: getString(dict, "columnSpec", defaultLatexOptions.columnSpec),
    booktabs: getBool(dict, "booktabs", defaultLatexOptions.booktabs),
    caption: getString(dict, "caption", defaultLatexOptions.caption),
    label: getString(dict, "label", defaultLatexOptions.label),
    centering: getBool(dict, "centering", defaultLatexOptions.centering),
    useTableEnvironment: getBool(dict, "useTableEnvironment", defaultLatexOptions.useTableEnvironment),
  }
}

// Parse SQL options from JSON
let parseSqlOptions = (dict: dict<JSON.t>): sqlOptions => {
  let insertBatchSize = getInt(dict, "insertBatchSize", defaultSqlOptions.insertBatchSize)
  let insertBatchSize = if insertBatchSize > 0 {insertBatchSize} else {defaultSqlOptions.insertBatchSize}

  {
    tableName: getString(dict, "tableName", defaultSqlOptions.tableName),
    identifierQuote: getString(dict, "identifierQuote", defaultSqlOptions.identifierQuote),
    includeCreateTable: getBool(dict, "includeCreateTable", defaultSqlOptions.includeCreateTable),
    insertBatchSize,
  }
}

// Parse YAML options from JSON
let parseYamlOptions = (dict: dict<JSON.t>): yamlOptions => {
  let indent = getInt(dict, "indent", defaultYamlOptions.indent)
  let indent = if indent > 0 {indent} else {defaultYamlOptions.indent}

  {
    indent,
    quoteStrings: getBool(dict, "quoteStrings", defaultYamlOptions.quoteStrings),
    lineBreak: getString(dict, "lineBreak", defaultYamlOptions.lineBreak),
  }
}

// Parse NDJSON options from JSON
let parseNdjsonOptions = (dict: dict<JSON.t>): ndjsonOptions => {
  {
    lineBreak: getString(dict, "lineBreak", defaultNdjsonOptions.lineBreak),
  }
}

// Recursively merge two dicts (override values win; sub-objects merge recursively)
let rec mergeDicts = (base: dict<JSON.t>, override: dict<JSON.t>): dict<JSON.t> => {
  let merged = Dict.make()

  base
  ->Dict.keysToArray
  ->Array.forEach(key => {
    base->Dict.get(key)->Option.forEach(value => merged->Dict.set(key, value))
  })

  override
  ->Dict.keysToArray
  ->Array.forEach(key => {
    switch (base->Dict.get(key), override->Dict.get(key)) {
    | (Some(baseJson), Some(overJson)) =>
      switch (JSON.Decode.object(baseJson), JSON.Decode.object(overJson)) {
      | (Some(baseObj), Some(overObj)) =>
        merged->Dict.set(key, mergeDicts(baseObj, overObj)->JSON.Encode.object)
      | _ =>
        merged->Dict.set(key, overJson)
      }
    | (_, Some(overJson)) =>
      merged->Dict.set(key, overJson)
    | _ => ()
    }
  })

  merged
}

let knownTopLevelKeys = [
  "defaultFormat",
  "headers",
  "hasHeaders",
  "rowNumberHeader",
  "includeRowNumbers",
  "csv",
  "tsv",
  "psv",
  "json",
  "markdown",
  "html",
  "latex",
  "sql",
  "yaml",
  "ndjson",
]

let knownSectionKeys = (sectionName: string): array<string> =>
  FormatKeys.getConfigKeysBySectionName(sectionName)

let warnUnknownConfigKeys = (~scope: string, ~keys: array<string>): unit => {
  if keys->Array.length > 0 {
    ignore(
      Bindings.Stream.write(
        Bindings.Process.stderr,
        `[tablyful] Warning: Unknown ${scope} key(s): ${keys->Array.join(", ")}. These keys are ignored.\n`,
      ),
    )
  }
}

let warnUnknownSectionKeys = (~sectionName: string, dict: dict<JSON.t>, knownKeys: array<string>): unit => {
  let unknown =
    dict
    ->Dict.keysToArray
    ->Array.filter(key => !(knownKeys->Array.includes(key)))

  warnUnknownConfigKeys(~scope=`${sectionName} config`, ~keys=unknown)
}

let warnUnknownKeys = (dict: dict<JSON.t>): unit => {
  let unknown =
    dict
    ->Dict.keysToArray
    ->Array.filter(key => !(knownTopLevelKeys->Array.includes(key)))

  warnUnknownConfigKeys(~scope="config", ~keys=unknown)
}

// Parse options from config dict
let parseOptions = (dict: dict<JSON.t>): t => {
  let getBool = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.bool)
    ->Option.getOr(default)

  let getString = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.string)
    ->Option.getOr(default)

  let getStringArray = key =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.array)
    ->Option.map(arr => arr->Belt.Array.keepMap(JSON.Decode.string))

  // Determine output format
  let format =
    dict
    ->Dict.get("defaultFormat")
    ->Option.flatMap(parseFormat)
    ->Option.getOr(Csv)

  // Parse format-specific options
  let formatOptions = switch format {
  | Csv =>
    dict
    ->Dict.get("csv")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(csvDict => {
      warnUnknownSectionKeys(~sectionName="csv", csvDict, knownSectionKeys("csv"))
      parseCsvOptions(csvDict)
    })
    ->Option.map(csv => CsvOptions(csv))
    ->Option.getOr(CsvOptions(defaultCsvOptions))
  | Tsv =>
    dict
    ->Dict.get("tsv")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(tsvDict => {
      warnUnknownSectionKeys(~sectionName="tsv", tsvDict, knownSectionKeys("tsv"))
      parseTsvOptions(tsvDict)
    })
    ->Option.map(tsv => TsvOptions(tsv))
    ->Option.getOr(TsvOptions(defaultTsvOptions))
  | Psv =>
    dict
    ->Dict.get("psv")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(psvDict => {
      warnUnknownSectionKeys(~sectionName="psv", psvDict, knownSectionKeys("psv"))
      parsePsvOptions(psvDict)
    })
    ->Option.map(psv => PsvOptions(psv))
    ->Option.getOr(PsvOptions(defaultPsvOptions))
  | Json =>
    dict
    ->Dict.get("json")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(jsonDict => {
      warnUnknownSectionKeys(~sectionName="json", jsonDict, knownSectionKeys("json"))
      parseJsonOptions(jsonDict)
    })
    ->Option.map(json => JsonOptions(json))
    ->Option.getOr(JsonOptions(defaultJsonOptions))
  | Markdown =>
    dict
    ->Dict.get("markdown")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(markdownDict => {
      warnUnknownSectionKeys(~sectionName="markdown", markdownDict, knownSectionKeys("markdown"))
      parseMarkdownOptions(markdownDict)
    })
    ->Option.map(md => MarkdownOptions(md))
    ->Option.getOr(MarkdownOptions(defaultMarkdownOptions))
  | Html =>
    dict
    ->Dict.get("html")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(htmlDict => {
      warnUnknownSectionKeys(~sectionName="html", htmlDict, knownSectionKeys("html"))
      parseHtmlOptions(htmlDict)
    })
    ->Option.map(html => HtmlOptions(html))
    ->Option.getOr(HtmlOptions(defaultHtmlOptions))
  | Latex =>
    dict
    ->Dict.get("latex")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(latexDict => {
      warnUnknownSectionKeys(~sectionName="latex", latexDict, knownSectionKeys("latex"))
      parseLatexOptions(latexDict)
    })
    ->Option.map(latex => LatexOptions(latex))
    ->Option.getOr(LatexOptions(defaultLatexOptions))
  | Sql =>
    dict
    ->Dict.get("sql")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(sqlDict => {
      warnUnknownSectionKeys(~sectionName="sql", sqlDict, knownSectionKeys("sql"))
      parseSqlOptions(sqlDict)
    })
    ->Option.map(sql => SqlOptions(sql))
    ->Option.getOr(SqlOptions(defaultSqlOptions))
  | Yaml =>
    dict
    ->Dict.get("yaml")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(yamlDict => {
      warnUnknownSectionKeys(~sectionName="yaml", yamlDict, knownSectionKeys("yaml"))
      parseYamlOptions(yamlDict)
    })
    ->Option.map(yaml => YamlOptions(yaml))
    ->Option.getOr(YamlOptions(defaultYamlOptions))
  | Ndjson =>
    dict
    ->Dict.get("ndjson")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(ndjsonDict => {
      warnUnknownSectionKeys(~sectionName="ndjson", ndjsonDict, knownSectionKeys("ndjson"))
      parseNdjsonOptions(ndjsonDict)
    })
    ->Option.map(ndjson => NdjsonOptions(ndjson))
    ->Option.getOr(NdjsonOptions(defaultNdjsonOptions))
  }

  {
    headers: getStringArray("headers"),
    hasHeaders: getBool("hasHeaders", t.hasHeaders),
    rowNumberHeader: getString("rowNumberHeader", t.rowNumberHeader),
    hasRowNumbers: getBool("includeRowNumbers", t.hasRowNumbers),
    outputFormat: format,
    formatOptions,
  }
}

// Load configuration with cascading
let load = (~path=?, ()): Common.result<t> => {
  // Load order: specified path -> ./.tablyfulrc.json -> ~/.tablyfulrc.json
  let paths = switch path {
  | Some(p) => [p]
  | None =>
    [
      Bindings.Path.join([Bindings.Process.cwd(), ".tablyfulrc.json"]),
      Bindings.Path.join([Bindings.Os.homedir(), ".tablyfulrc.json"]),
    ]
  }

  // Try to load config files in order
  let rec loadConfigs = (paths: array<string>, acc: option<dict<JSON.t>>): Common.result<
    option<dict<JSON.t>>,
  > => {
    switch paths->Array.get(0) {
    | None => Ok(acc)
    | Some(path) =>
      switch loadFile(path) {
      | Ok(None) => loadConfigs(paths->Array.slice(~start=1), acc)
      | Ok(Some(config)) =>
        let merged = switch acc {
        | None => config
        | Some(existingHigherPriority) =>
          // Keep previously loaded (higher-priority) config values when keys overlap.
          mergeDicts(config, existingHigherPriority)
        }
        loadConfigs(paths->Array.slice(~start=1), Some(merged))
      | Error(err) => Error(err)
      }
    }
  }

  switch loadConfigs(paths, None) {
  | Ok(None) => Ok(t) // No config found, use defaults
  | Ok(Some(dict)) =>
    warnUnknownKeys(dict)
    Ok(parseOptions(dict))
  | Error(err) => Error(err)
  }
}
