/**
 * JSON Formatter
 * Converts table data to JSON format
 */
open Types

// Format as array of arrays
let formatAsArray = (data: TableData.t): JSON.t => {
  let rows =
    data.rows->Array.map(row =>
      data.headers
      ->Array.map(header => row->Dict.get(header)->Option.getOr(JSON.Encode.null))
      ->JSON.Encode.array
    )

  JSON.Encode.array(
    Array.concat([data.headers->Array.map(JSON.Encode.string)->JSON.Encode.array], rows),
  )
}

// Format as array of objects
let formatAsObjects = (data: TableData.t): JSON.t => {
  data.rows
  ->Array.map(row => {
    let dict = Dict.make()
    data.headers->Array.forEach(header => {
      row
      ->Dict.get(header)
      ->Option.forEach(
        value => {
          dict->Dict.set(header, value)
        },
      )
    })
    dict->JSON.Encode.object
  })
  ->JSON.Encode.array
}

// Format implementation
let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getJsonOptions(options)

  let json = if opts.asArray {
    formatAsArray(data)
  } else {
    formatAsObjects(data)
  }

  if opts.pretty {
    JSON.stringify(json, ~space=opts.indentSize)
  } else {
    JSON.stringify(json)
  }
}

// Create formatter using functor
include FormatterMake.Make({
  let name = "json"
  let extension = ".json"
  let formatImpl = formatImpl
})
