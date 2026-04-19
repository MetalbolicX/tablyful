/**
 * NDJSON Formatter
 * Converts table data to newline-delimited JSON objects
 */
open Types

let rowToObject = (row: TableData.row, headers: array<string>): JSON.t => {
  let dict = Dict.make()
  headers->Array.forEach(header => {
    row
    ->Dict.get(header)
    ->Option.forEach(value => {
      dict->Dict.set(header, value)
    })
  })
  dict->JSON.Encode.object
}

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getNdjsonOptions(options)

  data.rows
  ->Array.map(row => rowToObject(row, data.headers)->JSON.stringify)
  ->Array.join(opts.lineBreak)
}

include FormatterMake.Make({
  let name = "ndjson"
  let extension = ".ndjson"
  let formatImpl = formatImpl
})
