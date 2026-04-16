/**
 * YAML Formatter
 * Converts table data to YAML list of objects
 */
open Types

let escapeSingleQuoted = (value: string): string => value->String.replaceAll("'", "''")

let needsQuotes = (value: string): bool => {
  value === "" ||
  value->String.includes(":") ||
  value->String.includes("#") ||
  value->String.includes("\n") ||
  value->String.includes("\t") ||
  value->String.trim !== value
}

let yamlString = (value: string, ~quoteStrings: bool, ()): string => {
  if quoteStrings || needsQuotes(value) {
    "'" ++ value->escapeSingleQuoted ++ "'"
  } else {
    value
  }
}

let jsonToYamlScalar = (json: JSON.t, ~quoteStrings: bool): string => {
  if json === JSON.Encode.null {
    "null"
  } else {
    switch JSON.Decode.string(json) {
    | Some(str) => yamlString(str, ~quoteStrings, ())
    | None =>
      switch JSON.Decode.float(json) {
      | Some(n) => n->Float.toString
      | None =>
        switch JSON.Decode.bool(json) {
        | Some(b) => b->Bool.toString
        | None => yamlString(JSON.stringify(json), ~quoteStrings=true, ())
        }
      }
    }
  }
}

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getYamlOptions(options)
  let indent = opts.indent > 0 ? opts.indent : 2
  let padding = " "->String.repeat(indent)
  let lines = []

  data.rows->Array.forEach(row => {
    switch data.headers->Array.get(0) {
    | None => lines->Array.push("- {}")
    | Some(firstHeader) => {
        let firstValue =
          row
          ->Dict.get(firstHeader)
          ->Option.getOr(JSON.Encode.null)
          ->jsonToYamlScalar(~quoteStrings=opts.quoteStrings)
        lines->Array.push(`- ${firstHeader}: ${firstValue}`)

        data.headers
        ->Array.slice(~start=1)
        ->Array.forEach(header => {
          let value =
            row
            ->Dict.get(header)
            ->Option.getOr(JSON.Encode.null)
            ->jsonToYamlScalar(~quoteStrings=opts.quoteStrings)
          lines->Array.push(`${padding}${header}: ${value}`)
        })
      }
    }
  })

  lines->Array.join(opts.lineBreak)
}

include FormatterMake.Make({
  let name = "yaml"
  let extension = ".yaml"
  let formatImpl = formatImpl
})
