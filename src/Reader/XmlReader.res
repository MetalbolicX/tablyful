/**
 * XML Reader
 * Reads XML content and converts to TableData
 * Uses fast-xml-parser via TypeScript bridge
 */

let name = "xml"
let extensions = [".xml"]

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  try {
    let extracted = Bindings.TableExtractor.extractXmlTable(input)
    let headers = extracted.headers

    if headers->Array.length === 0 {
      TablyfulError.parseError("XML input has no headers.")->TablyfulError.toResult
    } else {
      let rows = extracted.rows->Array.map(row => {
        let dict: TableData.row = Dict.make()
        headers->Array.forEach(header => {
          let value = row->Dict.get(header)->Option.getOr("")
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
      e->JsExn.message->Option.getOr("Failed to parse XML input"),
    )->TablyfulError.toResult
  }
}
