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
    arr->Array.every(row => JSON.Decode.array(row)->Option.isSome)
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
        ->Array.map(val =>
          switch JSON.Decode.string(val) {
          | Some(str) => str->String.trim
          | None => ""
          }
        )
        ->Array.mapWithIndex((val, idx) =>
          if val === "" {
            `Column_${(idx + 1)->Int.toString}`
          } else {
            val
          }
        )

      let dataRows = data->Array.slice(~start=1)

      // Normalize row lengths
      let normalizedRows = dataRows->Array.map(row => {
        if row->Array.length < columnCount {
          Array.concat(row, Array.make(~length=columnCount - row->Array.length, JSON.Encode.null))
        } else if row->Array.length > columnCount {
          row->Array.slice(~start=0, ~end=columnCount)
        } else {
          row
        }
      })

      Ok((headers, normalizedRows))
    } else {
      // Generate default headers
      let headers = Array.fromInitializer(~length=columnCount, idx =>
        `Column_${(idx + 1)->Int.toString}`
      )

      // Normalize all rows
      let normalizedRows = data->Array.map(row => {
        if row->Array.length < columnCount {
          Array.concat(row, Array.make(~length=columnCount - row->Array.length, JSON.Encode.null))
        } else if row->Array.length > columnCount {
          row->Array.slice(~start=0, ~end=columnCount)
        } else {
          row
        }
      })

      Ok((headers, normalizedRows))
    }
  }
}

// Convert rows to objects
let convertRows = (rows: array<array<JSON.t>>, headers: array<string>, _options: t): Common.result<
  array<TableData.row>,
> => {
  rows
  ->Array.mapWithIndex((row, _rowIdx) => {
    let dict = Dict.make()
    headers->Array.forEachWithIndex((header, colIdx) => {
      switch row->Array.get(colIdx) {
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
  let name = "array-of-arrays"
  let canParse = canParse
  let extractHeaders = extractHeaders
  let convertRows = convertRows
})
