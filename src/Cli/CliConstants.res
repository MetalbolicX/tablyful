open Types

let supportedOutputFormats = "csv, tsv, psv, json, markdown, html, latex, sql, yaml, ndjson"
let streamableOutputFormats = "csv, tsv, psv, sql, html, yaml, ndjson"

let streamableOutputFormatsList: array<format> = [Csv, Tsv, Psv, Sql, Html, Yaml, Ndjson]

let isStreamableOutputFormat = (format: format): bool => {
  streamableOutputFormatsList->Array.some(value => value == format)
}

let streamUnsupportedOutputMessage =
  `--stream: output format does not support streaming. Use ${streamableOutputFormats}.`

let exitCodeSuccess = 0
let exitCodeRuntimeError = 1
let exitCodeValidationError = 2
