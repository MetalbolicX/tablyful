/**
 * CSV Formatter
 * Converts table data to CSV format
 */
open Types

// Escape value for CSV
let escapeValue = (value: string, ~quote: string="\"", ~escape: string="\\", ()): string => {
  if value->String.includes(",") || value->String.includes("\n") || value->String.includes(quote) {
    let escaped = value->String.replaceAll(quote, escape ++ quote)
    quote ++ escaped ++ quote
  } else {
    value
  }
}

// Format implementation
let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getCsvOptions(options)

  let lines = []

  // Add headers if requested
  if opts.includeHeaders {
    let headerLine =
      data.headers
      ->Array.map(h => escapeValue(h, ~quote=opts.quote, ()))
      ->Array.join(opts.delimiter)
    lines->Array.push(headerLine)
  }

  // Format data rows
  data.rows->Array.forEach(row => {
    let values = data.headers->Array.map(header => {
      let value = row->Dict.get(header)->Option.getOr(JSON.Encode.null)->FormatterCommon.jsonToString
      escapeValue(value, ~quote=opts.quote, ~escape=opts.escape, ())
    })
    lines->Array.push(values->Array.join(opts.delimiter))
  })

  lines->Array.join(opts.lineBreak)
}

// Create formatter using functor
include FormatterMake.Make({
  let name = "csv"
  let extension = ".csv"
  let formatImpl = formatImpl
})
