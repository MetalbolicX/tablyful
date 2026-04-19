/**
 * YAML Reader
 * Reads YAML content and converts to TableData
 * Uses yaml package via TypeScript bridge
 */

let name = "yaml"
let extensions = [".yaml", ".yml"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readExtractedTable(
    ~extract=Bindings.TableExtractor.extractYamlTable,
    ~emptyHeadersError="YAML input has no headers.",
    ~fallbackError="Failed to parse YAML input",
    ~sourceFormat=name,
    input,
    options,
  )
}
