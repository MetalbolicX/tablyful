/**
 * SQL Reader
 * Reads SQL INSERT statements and converts to TableData
 * Handles both placeholder mode (-- VALUES: comments) and inline values
 */

let name = "sql"
let extensions = [".sql"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readExtractedTable(
    ~extract=Bindings.TableExtractor.extractSqlTable,
    ~emptyHeadersError="SQL input has no headers.",
    ~fallbackError="Failed to parse SQL input",
    ~sourceFormat=name,
    input,
    options,
  )
}
