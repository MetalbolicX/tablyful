/**
 * Internal table representation
 * Standardized format used throughout the library
 */

type row = dict<JSON.t>

type column = {
  name: string,
  dataType: Common.dataType,
  nullable: bool,
}

type metadata = {
  rowCount: int,
  columnCount: int,
  hasRowNumbers: bool,
  sourceFormat: string,
}

type t = {
  headers: array<string>,
  rows: array<row>,
  columns: array<column>,
  metadata: metadata,
}

let make = (
  ~headers: array<string>,
  ~rows: array<row>,
  ~columns: array<column>,
  ~metadata: metadata,
): Common.result<t> => {
  if headers->Array.length === 0 {
    TablyfulError.validationError("Table must have at least one header")->TablyfulError.toResult
  } else if columns->Array.length !== headers->Array.length {
    TablyfulError.validationError(
      `Column count (${columns->Array.length->Int.toString}) does not match header count (${headers
        ->Array.length
        ->Int.toString})`,
    )->TablyfulError.toResult
  } else {
    Ok({headers, rows, columns, metadata})
  }
}

let isEmpty = (table: t): bool => table.rows->Array.length === 0

let addRowNumbers = (table: t, ~header="#", ()): t => {
  let newHeaders = Array.concat([header], table.headers)

  let copyRow = (inputRow: row): row => {
    let copied = Dict.make()
    inputRow
    ->Dict.keysToArray
    ->Array.forEach(key => {
      inputRow
      ->Dict.get(key)
      ->Option.forEach(value => {
        copied->Dict.set(key, value)
      })
    })
    copied
  }

  let newRows = table.rows->Array.mapWithIndex((row, idx) => {
    let newRow = copyRow(row)
    newRow->Dict.set(header, (idx + 1)->Float.fromInt->JSON.Encode.float)
    newRow
  })

  let newColumns = Array.concat([{name: header, dataType: Common.Number, nullable: false}], table.columns)

  {
    headers: newHeaders,
    rows: newRows,
    columns: newColumns,
    metadata: {
      ...table.metadata,
      columnCount: table.metadata.columnCount + 1,
      hasRowNumbers: true,
    },
  }
}

let applyHeaders = (table: t, newHeaders: array<string>): Common.result<t> => {
  if newHeaders->Array.length !== table.headers->Array.length {
    TablyfulError.validationError(
      `Header count mismatch: expected ${table.metadata.columnCount->Int.toString}, got ${newHeaders
        ->Array.length
        ->Int.toString}`,
    )->TablyfulError.toResult
  } else {
    let headerMap =
      table.headers
      ->Array.mapWithIndex((oldHeader, idx) => {
        (oldHeader, newHeaders->Array.get(idx)->Option.getOr(oldHeader))
      })
      ->Dict.fromArray

    let newRows = table.rows->Array.map(row => {
      let newRow = Dict.make()
      table.headers->Array.forEach(oldHeader => {
        let newHeader = headerMap->Dict.get(oldHeader)->Option.getOr(oldHeader)
        row
        ->Dict.get(oldHeader)
        ->Option.forEach(
          value => {
            newRow->Dict.set(newHeader, value)
          },
        )
      })
      newRow
    })

    let newColumns = table.columns->Array.mapWithIndex((col, idx) => {
      {...col, name: newHeaders->Array.get(idx)->Option.getOr(col.name)}
    })

    Ok({
      ...table,
      headers: newHeaders,
      rows: newRows,
      columns: newColumns,
    })
  }
}

let inferColumns = (headers: array<string>, rows: array<row>): array<column> => {
  headers->Array.map(header => {
    let values = rows->Array.map(row => row->Dict.get(header))->Belt.Array.keepMap(v => v)
    let nullable = values->Array.length < rows->Array.length

    let nonNullValues = values->Array.filter(v => v !== JSON.Encode.null)

    let dataType = if nonNullValues->Array.length === 0 {
      Common.Unknown
    } else {
      let firstType = nonNullValues->Array.getUnsafe(0)->Common.inferType
      let allSame = nonNullValues->Array.every(v => Common.inferType(v) === firstType)
      if allSame {
        firstType
      } else {
        Common.String
      }
    }

    {name: header, dataType, nullable}
  })
}
