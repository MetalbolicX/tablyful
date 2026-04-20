/**
 * JSON Formatter
 * Converts table data to JSON format
 */
open Types

// Format as array of arrays
let formatAsArray = (data: TableData.t): JSON.t => {
  let rows =
    data.rows->Bindings.Iter.fromArray->Bindings.Iter.map(row =>
      data.headers
      ->Bindings.Iter.fromArray
      ->Bindings.Iter.map(header => row->Dict.get(header)->Option.getOr(JSON.Encode.null))
      ->Bindings.Iter.toArray
      ->JSON.Encode.array
    )
    ->Bindings.Iter.toArray

  let headerRow =
    data.headers
    ->Bindings.Iter.fromArray
    ->Bindings.Iter.map(JSON.Encode.string)
    ->Bindings.Iter.toArray
    ->JSON.Encode.array

  JSON.Encode.array(Array.concat([headerRow], rows))
}

// Format as array of objects
let formatAsObjects = (data: TableData.t): JSON.t => {
  data.rows
  ->Bindings.Iter.fromArray
  ->Bindings.Iter.map(row => {
    let dict = Dict.make()
    data.headers->Bindings.Iter.fromArray->Bindings.Iter.forEach(header => {
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
  ->Bindings.Iter.toArray
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
