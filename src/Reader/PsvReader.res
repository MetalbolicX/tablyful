/**
 * PSV Reader
 * Reads PSV (pipe-separated values) content and converts to TableData
 * Uses pure ReScript DsvParser (pipe delimiter)
 */

let name = "psv"
let extensions = [".psv"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  try {
    let parsed = DsvParser.parse(input, ~delimiter="|")

    if parsed.headers->Array.length === 0 {
      TablyfulError.parseError("PSV input has no headers.")->TablyfulError.toResult
    } else {
      let headers = parsed.headers
      let rows = parsed.rows->Array.map(cells => {
        let dict: TableData.row = Dict.make()
        headers->Array.forEachWithIndex((header, idx) => {
          let value = cells->Array.get(idx)->Option.getOr("")
          dict->Dict.set(header, JSON.Encode.string(value))
        })
        dict
      })

      let columns = TableData.inferColumns(headers, rows)

      let metadata: TableData.metadata = {
        rowCount: rows->Array.length,
        columnCount: headers->Array.length,
        hasRowNumbers: options.hasRowNumbers,
        sourceFormat: name,
      }

      TableData.make(~headers, ~rows, ~columns, ~metadata)
    }
  } catch {
  | JsExn(e) =>
    TablyfulError.parseError(
      e->JsExn.message->Option.getOr("Failed to parse PSV input"),
    )->TablyfulError.toResult
  }
}
