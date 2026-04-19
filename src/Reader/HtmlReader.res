/**
 * HTML Reader
 * Reads HTML table content and converts to TableData
 * Uses Unified.js (rehype-parse) via TypeScript bridge
 */

let name = "html"
let extensions = [".html", ".htm"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readExtractedTable(
    ~extract=Bindings.TableExtractor.extractHtmlTable,
    ~emptyHeadersError="HTML table has no headers.",
    ~fallbackError="Failed to parse HTML table",
    ~sourceFormat=name,
    input,
    options,
  )
}
