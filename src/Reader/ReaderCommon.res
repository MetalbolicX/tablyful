let makeMetadata = (
  ~rowCount: int,
  ~columnCount: int,
  ~hasRowNumbers: bool,
  ~sourceFormat: string,
): TableData.metadata => {
  {
    rowCount,
    columnCount,
    hasRowNumbers,
    sourceFormat,
  }
}

let makeTableData = (
  ~headers: array<string>,
  ~rows: array<TableData.row>,
  ~options: Types.t,
  ~sourceFormat: string,
): TablyfulError.result<TableData.t> => {
  let columns = TableData.inferColumns(headers, rows)
  let metadata =
    makeMetadata(
      ~rowCount=rows->Bindings.Iter.fromArray->Bindings.Iter.reduce((count, _) => count + 1, 0),
      ~columnCount=headers->Bindings.Iter.fromArray->Bindings.Iter.reduce((count, _) => count + 1, 0),
      ~hasRowNumbers=options.hasRowNumbers,
      ~sourceFormat,
    )

  TableData.make(~headers, ~rows, ~columns, ~metadata)
}

let rowsFromExtracted = (headers: array<string>, extractedRows: array<dict<string>>): array<TableData.row> => {
  extractedRows->Bindings.Iter.fromArray->Bindings.Iter.map(row => {
    let dict: TableData.row = Dict.make()
    headers->Bindings.Iter.fromArray->Bindings.Iter.forEach(header => {
      let value = row->Dict.get(header)->Option.getOr("")
      dict->Dict.set(header, JSON.Encode.string(value))
    })
    dict
  })->Bindings.Iter.toArray
}

let rowsFromCells = (headers: array<string>, parsedRows: array<array<string>>): array<TableData.row> => {
  parsedRows->Bindings.Iter.fromArray->Bindings.Iter.map(cells => {
    let dict: TableData.row = Dict.make()
    Bindings.Iter.entries(headers)->Bindings.Iter.forEach(((idx, header)) => {
      let value = cells->Array.get(idx)->Option.getOr("")
      dict->Dict.set(header, JSON.Encode.string(value))
    })
    dict
  })->Bindings.Iter.toArray
}

let readExtractedTable = (
  ~extract: string => Bindings.TableExtractor.extractedTable,
  ~emptyHeadersError: string,
  ~fallbackError: string,
  ~sourceFormat: string,
  input: string,
  options: Types.t,
): TablyfulError.result<TableData.t> => {
  try {
    let extracted = extract(input)
    let headers = extracted.headers

    if headers->Array.length === 0 {
      TablyfulError.parseError(emptyHeadersError)->TablyfulError.toResult
    } else {
      let rows = rowsFromExtracted(headers, extracted.rows)
      makeTableData(~headers, ~rows, ~options, ~sourceFormat)
    }
  } catch {
  | JsExn(e) =>
    TablyfulError.parseError(
      e->JsExn.message->Option.getOr(fallbackError),
    )->TablyfulError.toResult
  }
}

let readDsvTable = (
  ~delimiter: string,
  ~emptyHeadersError: string,
  ~fallbackError: string,
  ~sourceFormat: string,
  input: string,
  options: Types.t,
): TablyfulError.result<TableData.t> => {
  try {
    let parsed = DsvParser.parse(input, ~delimiter)
    let headers = parsed.headers

    if headers->Array.length === 0 {
      TablyfulError.parseError(emptyHeadersError)->TablyfulError.toResult
    } else {
      let rows = rowsFromCells(headers, parsed.rows)
      makeTableData(~headers, ~rows, ~options, ~sourceFormat)
    }
  } catch {
  | JsExn(e) =>
    TablyfulError.parseError(
      e->JsExn.message->Option.getOr(fallbackError),
    )->TablyfulError.toResult
  }
}
