/**
 * PSV Reader
 * Reads PSV (pipe-separated values) content and converts to TableData
 * Uses pure ReScript DsvParser (pipe delimiter)
 */

let name = "psv"
let extensions = [".psv"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  ReaderCommon.readDsvTable(
    ~delimiter="|",
    ~emptyHeadersError="PSV input has no headers.",
    ~fallbackError="Failed to parse PSV input",
    ~sourceFormat=name,
    input,
    options,
  )
}
