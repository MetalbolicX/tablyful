/**
 * Formatter module type definitions
 * Defines the contract for all formatter implementations
 */
open Types

// Formatter module signature
module type S = {
  // Formatter name
  let name: string

  // File extension
  let extension: string

  // Format table data to string
  let format: (TableData.t, t) => TablyfulError.result<string>
}

// Formatter registry entry
type formatterEntry = {
  name: string,
  extension: string,
  format: (TableData.t, t) => TablyfulError.result<string>,
}
