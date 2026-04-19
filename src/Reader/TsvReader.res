/**
 * TSV Reader
 * Reads TSV content and converts to TableData
 * Uses pure ReScript DsvParser (tab delimiter)
 */

let name = "tsv"
let extensions = [".tsv"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readDsvTable(
    ~delimiter="\t",
    ~emptyHeadersError="TSV input has no headers.",
    ~fallbackError="Failed to parse TSV input",
    ~sourceFormat=name,
    input,
    options,
  )
}
