/*
 * Object of Arrays parser
 * Handles format where keys are column names and values are arrays of data
 */

open Types

// Input type
type parserInput = dict<array<JSON.t>>

// Check if data is object of arrays
let canParse = (json: JSON.t): bool => {
  switch JSON.Decode.object(json) {
  | Some(obj) => {
      let keys = obj->Dict.keysToArray
      if keys->Array.length === 0 {
        false
      } else {
        keys->Bindings.Iter.fromArray->Bindings.Iter.every(key =>
          obj
          ->Dict.get(key)
          ->Option.map(v => JSON.Decode.array(v)->Option.isSome)
          ->Option.getOr(false)
        )
      }
    }
  | None => false
  }
}

// Extract headers (keys are headers)
let extractHeaders = (data: parserInput, _options: t): Common.result<(
  array<string>,
  array<array<JSON.t>>,
)> => {
  let keys = data->Dict.keysToArray

  if keys->Array.length === 0 {
    TablyfulError.validationError("Object of arrays cannot be empty")->TablyfulError.toResult
  } else {
    // Get the length of arrays (all should be same)
    let firstKey = keys->Array.getUnsafe(0)
    let rowCount =
      data
      ->Dict.get(firstKey)
      ->Option.map(arr => arr->Array.length)
      ->Option.getOr(0)

    // Transpose: columns -> rows
    let rows = Array.fromInitializer(~length=rowCount, rowIdx => {
      keys->Bindings.Iter.fromArray->Bindings.Iter.map(key => {
        data
        ->Dict.get(key)
        ->Option.flatMap(arr => arr->Array.get(rowIdx))
        ->Option.getOr(JSON.Encode.null)
      })->Bindings.Iter.toArray
    })

    Ok((keys, rows))
  }
}

// Convert rows
let convertRows = (rows: array<array<JSON.t>>, headers: array<string>, _options: t): Common.result<
  array<TableData.row>,
> => {
    rows
  ->Bindings.Iter.fromArray
  ->Bindings.Iter.map(row => {
    let dict = Dict.make()
    Bindings.Iter.entries(headers)->Bindings.Iter.forEach(((idx, header)) => {
      switch row->Array.get(idx) {
      | Some(value) => dict->Dict.set(header, value)
      | None => dict->Dict.set(header, JSON.Encode.null)
      }
    })
    dict
  })
  ->Bindings.Iter.toArray
  ->Ok
}

// Create parser using functor
include ParserMake.Make({
  type input = parserInput
  let name = "object-of-arrays"
  let canParse = canParse
  let extractHeaders = extractHeaders
  let convertRows = convertRows
})
