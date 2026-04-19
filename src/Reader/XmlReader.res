/**
 * XML Reader
 * Reads XML content and converts to TableData
 * Uses fast-xml-parser via TypeScript bridge
 */

let name = "xml"
let extensions = [".xml"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readExtractedTable(
    ~extract=Bindings.TableExtractor.extractXmlTable,
    ~emptyHeadersError="XML input has no headers.",
    ~fallbackError="Failed to parse XML input",
    ~sourceFormat=name,
    input,
    options,
  )
}
