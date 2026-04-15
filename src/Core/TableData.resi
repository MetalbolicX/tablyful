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

let make: (
  ~headers: array<string>,
  ~rows: array<row>,
  ~columns: array<column>,
  ~metadata: metadata,
) => Common.result<t>
let empty: unit => t
let isEmpty: t => bool
let addRowNumbers: (t, ~header: string=?, unit) => t
let applyHeaders: (t, array<string>) => Common.result<t>
let inferColumns: (array<string>, array<row>) => array<column>
