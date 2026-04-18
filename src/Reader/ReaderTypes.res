/**
 * Reader module type
 * Defines the interface for format readers (raw text -> TableData)
 * Parallel to ParserTypes.S which handles JSON -> TableData
 */
module type S = {
  let name: string
  let extensions: array<string>
  let read: (string, Types.t) => TablyfulError.result<TableData.t>
}
