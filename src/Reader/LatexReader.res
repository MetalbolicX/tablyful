/**
 * LaTeX Reader
 * Reads LaTeX tabular content and converts to TableData
 * Uses custom regex-based parser via TypeScript bridge
 */

let name = "latex"
let extensions = [".tex", ".latex"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readExtractedTable(
    ~extract=Bindings.TableExtractor.extractLatexTable,
    ~emptyHeadersError="LaTeX tabular has no headers.",
    ~fallbackError="Failed to parse LaTeX table",
    ~sourceFormat=name,
    input,
    options,
  )
}
