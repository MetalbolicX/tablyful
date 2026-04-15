/**
 * Array of Objects parser
 * Handles format where each object in array represents a row
 */
open Types

// Input type
type parserInput = array<dict<JSON.t>>

// Check if data is array of objects
let canParse = (json: JSON.t): bool => {
  switch JSON.Decode.array(json) {
  | Some(arr) if arr->Array.length > 0 =>
    arr->Array.every(row => JSON.Decode.object(row)->Option.isSome)
  | _ => false
  }
}

// Extract headers from object keys
let extractHeaders = (data: parserInput, _options: t): Common.result<(
  array<string>,
  array<array<JSON.t>>,
)> => {
  if data->Array.length === 0 {
    TablyfulError.validationError("Array of objects cannot be empty")->TablyfulError.toResult
  } else {
    // Collect all unique keys from all objects
    let headerSet = data->Array.reduce(Belt.Set.String.empty, (acc, obj) => {
      obj
      ->Dict.keysToArray
      ->Array.forEach(key => {
        acc->Belt.Set.String.add(key)->ignore
      })
      acc
    })

    let headers = headerSet->Belt.Set.String.toArray

    // Convert objects to arrays based on headers
    let rows = data->Array.map(obj => {
      headers->Array.map(header => obj->Dict.get(header)->Option.getOr(JSON.Encode.null))
    })

    Ok((headers, rows))
  }
}

// Convert is identity since we already have objects
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
  let name = "array-of-objects"
  let canParse = canParse
  let extractHeaders = extractHeaders
  let convertRows = convertRows
})
