/*
 * Object of Objects (Nested Object) parser
 * Handles format where outer keys are row IDs and inner objects are column data
 */

open Types

// Input type
type parserInput = dict<dict<JSON.t>>

// Check if data is object of objects
let canParse = (json: JSON.t): bool => {
  switch JSON.Decode.object(json) {
  | Some(obj) => {
      let keys = obj->Dict.keysToArray
      if keys->Array.length === 0 {
        false
      } else {
        keys->Array.every(key =>
          obj
          ->Dict.get(key)
          ->Option.map(v => JSON.Decode.object(v)->Option.isSome)
          ->Option.getOr(false)
        )
      }
    }
  | None => false
  }
}

// Extract headers - add optional ID column
let extractHeaders = (data: parserInput, _options: t): Common.result<(
  array<string>,
  array<array<JSON.t>>,
)> => {
  let rowIds = data->Dict.keysToArray

  if rowIds->Array.length === 0 {
    TablyfulError.validationError("Object of objects cannot be empty")->TablyfulError.toResult
  } else {
    // Collect all column names from all inner objects
    let columnSet = rowIds->Array.reduce(Belt.Set.String.empty, (acc, rowId) => {
      data
      ->Dict.get(rowId)
      ->Option.forEach(innerObj => {
        innerObj
        ->Dict.keysToArray
        ->Array.forEach(
          key => {
            acc->Belt.Set.String.add(key)->ignore
          },
        )
      })
      acc
    })

    let columns = columnSet->Belt.Set.String.toArray

    // Convert to rows with row ID as first column
    let rows = rowIds->Array.map(rowId => {
      let innerObj = data->Dict.get(rowId)->Option.getOr(Dict.make())
      columns->Array.map(col => innerObj->Dict.get(col)->Option.getOr(JSON.Encode.null))
    })

    Ok((columns, rows))
  }
}

// Convert rows
let convertRows = (rows: array<array<JSON.t>>, headers: array<string>, _options: t): Common.result<
  array<TableData.row>,
> => {
  rows
  ->Array.map(row => {
    let dict = Dict.make()
    headers->Array.forEachWithIndex((header, idx) => {
      switch row->Array.get(idx) {
      | Some(value) => dict->Dict.set(header, value)
      | None => dict->Dict.set(header, JSON.Encode.null)
      }
    })
    dict
  })
  ->Ok
}

// Create parser using functor
include ParserMake.Make({
  type input = parserInput
  let name = "object-of-objects"
  let canParse = canParse
  let extractHeaders = extractHeaders
  let convertRows = convertRows
})
