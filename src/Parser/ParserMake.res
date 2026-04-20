/**
 * Parser functor - creates parsers with common functionality
 */
open Types

// Make functor for creating parsers
module Make = (
  Config: {
    type input
    let name: string
    let canParse: JSON.t => bool
    let extractHeaders: (input, t) => Common.result<(array<string>, array<array<JSON.t>>)>
    let convertRows: (array<array<JSON.t>>, array<string>, t) => Common.result<array<TableData.row>>
  },
): (ParserTypes.S with type input = Config.input) => {
  type input = Config.input

  let name = Config.name

  let canParse = Config.canParse

  let parse = (input: input, options: t): Common.result<TableData.t> => {
    // Extract headers and data rows
    Config.extractHeaders(input, options)->Result.flatMap(((headers, dataRows)) => {
      // Convert rows
      Config.convertRows(dataRows, headers, options)->Result.flatMap(rows => {
        // Infer column definitions
        let columns = TableData.inferColumns(headers, rows)

        // Create metadata
        let metadata: TableData.metadata = {
          rowCount: rows->Bindings.Iter.fromArray->Bindings.Iter.reduce((count, _) => count + 1, 0),
          columnCount: headers->Array.length,
          hasRowNumbers: false,
          sourceFormat: Config.name,
        }

        // Create table
        TableData.make(~headers, ~rows, ~columns, ~metadata)
      })
    })
  }
}
