/**
 * Formatter functor - creates formatters with common functionality
 */
open Types

// Make functor for creating formatters
module Make = (
  Config: {
    let name: string
    let extension: string
    let formatImpl: (TableData.t, t) => string
  },
): FormatterTypes.S => {
  let name = Config.name
  let extension = Config.extension

  let format = (data: TableData.t, options: t): TablyfulError.result<string> => {
    try {
      // Apply custom headers if specified
      let processedData = switch options.headers {
      | Some(customHeaders) =>
        switch data->TableData.applyHeaders(customHeaders) {
        | Ok(d) => d
        | Error(_) => data
        }
      | None => data
      }

      // Add row numbers if requested
      let finalData = if options.hasRowNumbers && !processedData.metadata.hasRowNumbers {
        processedData->TableData.addRowNumbers(~header=options.rowNumberHeader, ())
      } else {
        processedData
      }

      Ok(Config.formatImpl(finalData, options))
    } catch {
    | JsExn(e) =>
      TablyfulError.formatError(
        e->JsExn.message->Option.getOr("Unknown formatting error"),
      )->TablyfulError.toResult
    }
  }
}
