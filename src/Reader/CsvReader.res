/**
 * CSV Reader
 * Reads CSV content and converts to TableData
 * Uses pure ReScript DsvParser (comma delimiter)
 */

let name = "csv"
let extensions = [".csv"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readDsvTable(
    ~delimiter=",",
    ~emptyHeadersError="CSV input has no headers.",
    ~fallbackError="Failed to parse CSV input",
    ~sourceFormat=name,
    input,
    options,
  )
}
