/**
 * Common utilities for reader implementations.
 * Provides reusable functions for metadata creation and table conversion.
 */

/**
 * Creates TableData metadata from counts.
 * @param rowCount - Number of data rows
 * @param columnCount - Number of columns
 * @param hasRowNumbers - Whether row numbers were added
 * @param sourceFormat - Name of source format
 * @returns Metadata record
 */
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

/**
 * Creates TableData from headers and rows.
 * Infers column types and creates metadata.
 * @param headers - Column header names
 * @param rows - Data rows as dictionaries
 * @param options - Processing options
 * @param sourceFormat - Source format name
 * @returns Ok(TableData) or Error
 */
let makeTableData = (
  ~headers: array<string>,
  ~rows: array<TableData.row>,
  ~options: Types.t,
  ~sourceFormat: string,
): TablyfulError.result<TableData.t> => {
  let columns = TableData.inferColumns(headers, rows)
  let metadata =
    makeMetadata(
      ~rowCount=rows->Array.length,
      ~columnCount=headers->Array.length,
      ~hasRowNumbers=options.hasRowNumbers,
      ~sourceFormat,
    )

  TableData.make(~headers, ~rows, ~columns, ~metadata)
}

/**
 * Converts extracted table rows to TableData rows.
 * @param headers - Column names
 * @param extractedRows - Rows from extraction library
 * @returns Array of row dictionaries
 */
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

/**
 * Converts parsed cell arrays to TableData rows.
 * @param headers - Column names
 * @param parsedRows - Rows as cell arrays
 * @returns Array of row dictionaries
 */
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
      ~rowCount=rows->Array.length,
      ~columnCount=headers->Array.length,
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

/**
 * Reads table using extraction library (HtmlReader, LatexReader, etc.).
 * Wraps extraction, validates headers, creates TableData.
 * @param extract - Extraction function
 * @param emptyHeadersError - Error if no headers found
 * @param fallbackError - Generic parse error message
 * @param sourceFormat - Format name for metadata
 * @param input - Raw input string
 * @param options - Processing options
 * @returns Ok(TableData) or Error
 */
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
