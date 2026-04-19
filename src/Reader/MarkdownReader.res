/**
 * Markdown Reader
 * Reads Markdown table content and converts to TableData
 * Uses Unified.js (remark-parse + remark-gfm) via TypeScript bridge
 */

let name = "markdown"
let extensions = [".md", ".markdown"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readExtractedTable(
    ~extract=Bindings.TableExtractor.extractMarkdownTable,
    ~emptyHeadersError="Markdown table has no headers.",
    ~fallbackError="Failed to parse Markdown table",
    ~sourceFormat=name,
    input,
    options,
  )
}
