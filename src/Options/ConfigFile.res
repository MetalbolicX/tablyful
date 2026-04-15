/**
 * Configuration file (.tablyfulrc.json) support
 * Cascading configuration: CLI args > ./.tablyfulrc.json > ~/.tablyfulrc.json > defaults
 */
open Types
open Defaults

@module("node:fs")
external existsSync: string => bool = "existsSync"

@module("node:fs")
external readFileSyncUtf8: (string, {"encoding": string}) => string = "readFileSync"

@module("node:path")
external joinPath: array<string> => string = "join"

@module("node:process") @val
external cwd: unit => string = "cwd"

@module("node:os")
external homedir: unit => string = "homedir"

// Config file path type
type configSource =
  | CliArg(string)
  | CurrentDirectory
  | HomeDirectory

// Load config file from path
let loadFile = (path: string): Common.result<option<dict<JSON.t>>> => {
  try {
    if existsSync(path) {
      let content = readFileSyncUtf8(path, {"encoding": "utf8"})
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

// Parse CSV options from JSON
let parseCsvOptions = (dict: dict<JSON.t>): csvOptions => {
  let getString = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.string)
    ->Option.getOr(default)

  let getBool = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.bool)
    ->Option.getOr(default)

  {
    delimiter: getString("delimiter", defaultCsvOptions.delimiter),
    quote: getString("quote", defaultCsvOptions.quote),
    escape: getString("escape", defaultCsvOptions.escape),
    lineBreak: getString("lineBreak", defaultCsvOptions.lineBreak),
    includeHeaders: getBool("includeHeaders", defaultCsvOptions.includeHeaders),
  }
}

// Parse JSON options from JSON
let parseJsonOptions = (dict: dict<JSON.t>): jsonOptions => {
  let getBool = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.bool)
    ->Option.getOr(default)

  let getInt = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.float)
    ->Option.map(Float.toInt)
    ->Option.getOr(default)

  {
    pretty: getBool("pretty", defaultJsonOptions.pretty),
    indentSize: getInt("indentSize", defaultJsonOptions.indentSize),
    asArray: getBool("asArray", defaultJsonOptions.asArray),
  }
}

// Parse Markdown options from JSON
let parseMarkdownOptions = (dict: dict<JSON.t>): markdownOptions => {
  let getString = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.string)
    ->Option.getOr(default)

  let getBool = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.bool)
    ->Option.getOr(default)

  {
    align: getString("align", defaultMarkdownOptions.align),
    padding: getBool("padding", defaultMarkdownOptions.padding),
    githubFlavor: getBool("githubFlavor", defaultMarkdownOptions.githubFlavor),
  }
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

  let getInt = (key, default) =>
    dict
    ->Dict.get(key)
    ->Option.flatMap(JSON.Decode.float)
    ->Option.map(Float.toInt)
    ->Option.getOr(default)

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
    ->Option.map(parseCsvOptions)
    ->Option.map(csv => CsvOptions(csv))
    ->Option.getOr(CsvOptions(defaultCsvOptions))
  | Json =>
    dict
    ->Dict.get("json")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(parseJsonOptions)
    ->Option.map(json => JsonOptions(json))
    ->Option.getOr(JsonOptions(defaultJsonOptions))
  | Markdown =>
    dict
    ->Dict.get("markdown")
    ->Option.flatMap(JSON.Decode.object)
    ->Option.map(parseMarkdownOptions)
    ->Option.map(md => MarkdownOptions(md))
    ->Option.getOr(MarkdownOptions(defaultMarkdownOptions))
  | _ => CsvOptions(defaultCsvOptions)
  }

  {
    headers: getStringArray("headers"),
    hasHeaders: getBool("hasHeaders", defaultCsvOptions.includeHeaders),
    rowNumberHeader: getString("rowNumberHeader", t.rowNumberHeader),
    hasRowNumbers: getBool("includeRowNumbers", t.hasRowNumbers),
    batchSize: getInt("batchSize", t.batchSize),
    encoding: getString("encoding", t.encoding),
    outputFormat: format,
    formatOptions,
  }
}

// Load configuration with cascading
let load = (~path: option<string>=?, ()): Common.result<t> => {
  // Load order: specified path -> ./.tablyfulrc.json -> ~/.tablyfulrc.json
  let paths = switch path {
  | Some(p) => [p]
  | None => [joinPath([cwd(), ".tablyfulrc.json"]), joinPath([homedir(), ".tablyfulrc.json"])]
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
        // Merge with accumulated config (later files override earlier)
        let merged = switch acc {
        | None => config
        | Some(existing) => {
            // Simple merge: new values override old
            let merged = Dict.make()
            existing
            ->Dict.keysToArray
            ->Array.forEach(key => {
              existing
              ->Dict.get(key)
              ->Option.forEach(value => {
                merged->Dict.set(key, value)
              })
            })
            config
            ->Dict.keysToArray
            ->Array.forEach(key => {
              config
              ->Dict.get(key)
              ->Option.forEach(value => {
                merged->Dict.set(key, value)
              })
            })
            merged
          }
        }
        loadConfigs(paths->Array.slice(~start=1), Some(merged))
      | Error(err) => Error(err)
      }
    }
  }

  switch loadConfigs(paths, None) {
  | Ok(None) => Ok(t) // No config found, use defaults
  | Ok(Some(dict)) => Ok(parseOptions(dict))
  | Error(err) => Error(err)
  }
}

// Example config file content
let exampleConfig: string = `{
  "input": {
    "hasHeaders": true,
    "encoding": "utf8",
    "delimiter": ","
  },
  "output": {
    "defaultFormat": "csv",
    "includeRowNumbers": false,
    "rowNumberHeader": "#"
  },
  "csv": {
    "delimiter": ",",
    "quote": "\\\"",
    "escape": "\\\\",
    "lineBreak": "\\n",
    "includeHeaders": true
  },
  "json": {
    "pretty": true,
    "indentSize": 2,
    "asArray": false
  },
  "markdown": {
    "align": "left",
    "padding": true,
    "githubFlavor": true
  }
}`
