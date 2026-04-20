/**
 * Array of Arrays parser
 * Handles matrix format where each inner array is a row
 */
open Types

// Input type
type parserInput = array<array<JSON.t>>

// Check if data is array of arrays
let canParse = (json: JSON.t): bool => {
  switch JSON.Decode.array(json) {
  | Some(arr) if arr->Array.length > 0 =>
    arr->Bindings.Iter.fromArray->Bindings.Iter.every(row => JSON.Decode.array(row)->Option.isSome)
  | _ => false
  }
}

// Extract headers from array data
let extractHeaders = (data: parserInput, options: t): Common.result<(
  array<string>,
  array<array<JSON.t>>,
)> => {
  if data->Array.length === 0 {
    TablyfulError.validationError("Array of arrays cannot be empty")->TablyfulError.toResult
  } else {
    let firstRow = data->Array.getUnsafe(0)
    let columnCount = firstRow->Array.length

    if options.hasHeaders {
      // First row is headers
      let headers =
        firstRow
        ->Bindings.Iter.fromArray
        ->Bindings.Iter.map(val =>
          switch JSON.Decode.string(val) {
          | Some(str) => str->String.trim
          | None => ""
          }
        )
        ->Bindings.Iter.toArray
        ->Array.mapWithIndex((val, idx) =>
          if val === "" {
            `Column_${(idx + 1)->Int.toString}`
          } else {
            val
          }
        )

      let dataRows = data->Array.slice(~start=1)

      // Normalize row lengths
       let normalizedRows = dataRows->Bindings.Iter.fromArray->Bindings.Iter.map(row => {
         if row->Array.length < columnCount {
           Array.concat(row, Array.make(~length=columnCount - row->Array.length, JSON.Encode.null))
         } else if row->Array.length > columnCount {
           row->Array.slice(~start=0, ~end=columnCount)
         } else {
           row
         }
       })->Bindings.Iter.toArray

      Ok((headers, normalizedRows))
    } else {
      // Generate default headers
      let headers = Array.fromInitializer(~length=columnCount, idx =>
        `Column_${(idx + 1)->Int.toString}`
      )

      // Normalize all rows
       let normalizedRows = data->Bindings.Iter.fromArray->Bindings.Iter.map(row => {
         if row->Array.length < columnCount {
           Array.concat(row, Array.make(~length=columnCount - row->Array.length, JSON.Encode.null))
         } else if row->Array.length > columnCount {
           row->Array.slice(~start=0, ~end=columnCount)
         } else {
           row
         }
       })->Bindings.Iter.toArray

      Ok((headers, normalizedRows))
    }
  }
}

// Convert rows to objects
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
  let name = "array-of-arrays"
  let canParse = canParse
  let extractHeaders = extractHeaders
  let convertRows = convertRows
})
