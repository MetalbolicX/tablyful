/**
 * PSV Formatter
 * Converts table data to pipe-separated values
 */
open Types

let escapeValue = (value: string, ~quote: string="\"", ~escape: string="\\", ()): string => {
  if value->String.includes("|") || value->String.includes("\n") || value->String.includes(quote) {
    let escaped = value->String.replaceAll(quote, escape ++ quote)
    quote ++ escaped ++ quote
  } else {
    value
  }
}

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getPsvOptions(options)

  let lines = []
  let delimiter = "|"

  if opts.includeHeaders {
    let headerLine =
      data.headers
      ->Array.map(h => escapeValue(h, ()))
      ->Array.join(delimiter)
    lines->Array.push(headerLine)
  }

  data.rows->Array.forEach(row => {
    let values = data.headers->Array.map(header => {
      let value = row->Dict.get(header)->Option.getOr(JSON.Encode.null)->FormatterCommon.jsonToString
      escapeValue(value, ())
    })
    lines->Array.push(values->Array.join(delimiter))
  })

  lines->Array.join("\n")
}

include FormatterMake.Make({
  let name = "psv"
  let extension = ".psv"
  let formatImpl = formatImpl
})
