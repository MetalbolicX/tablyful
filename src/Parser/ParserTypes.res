/**
 * Parser module type definitions
 * Defines the contract for all parser implementations
 */
open Types

// Parser module signature
module type S = {
  // The input type this parser handles
  type input

  // Parser name for identification
  let name: string

  // Check if this parser can handle the given data
  let canParse: JSON.t => bool

  // Parse input data into table format
  let parse: (input, t) => TablyfulError.result<TableData.t>
}

// Parser registry entry
type parserEntry = {
  name: string,
  canParse: JSON.t => bool,
  parse: (JSON.t, t) => TablyfulError.result<TableData.t>,
}
