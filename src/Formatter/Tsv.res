/**
 * TSV Formatter
 * Converts table data to tab-separated values
 */
open Types

let escapeValue = (value: string, ~quote: string="\"", ~escape: string="\\", ()): string => {
  if value->String.includes("\t") || value->String.includes("\n") || value->String.includes(quote) {
    let escaped = value->String.replaceAll(quote, escape ++ quote)
    quote ++ escaped ++ quote
  } else {
    value
  }
}

let jsonToString = (json: JSON.t): string => {
  if json === JSON.Encode.null {
    ""
  } else {
    switch JSON.Decode.string(json) {
    | Some(str) => str
    | None =>
      switch JSON.Decode.float(json) {
      | Some(n) => n->Float.toString
      | None =>
        switch JSON.Decode.bool(json) {
        | Some(b) => b->Bool.toString
        | None => JSON.stringify(json)
        }
      }
    }
  }
}

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getTsvOptions(options)

  let lines = []
  let delimiter = "\t"

  if opts.includeHeaders {
    let headerLine =
      data.headers
      ->Array.map(h => escapeValue(h, ()))
      ->Array.join(delimiter)
    lines->Array.push(headerLine)
  }

  data.rows->Array.forEach(row => {
    let values = data.headers->Array.map(header => {
      let value = row->Dict.get(header)->Option.getOr(JSON.Encode.null)->jsonToString
      escapeValue(value, ())
    })
    lines->Array.push(values->Array.join(delimiter))
  })

  lines->Array.join(Defaults.defaultCsvOptions.lineBreak)
}

include FormatterMake.Make({
  let name = "tsv"
  let extension = ".tsv"
  let formatImpl = formatImpl
})
