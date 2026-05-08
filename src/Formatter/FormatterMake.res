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
      let processedData = switch options.headers {
      | Some(customHeaders) =>
        switch data->TableData.applyHeaders(customHeaders) {
        | Ok(d) => Ok(d)
        | Error(e) =>
          CliIo.writeStderr(
            `[tablyful] Warning: Custom headers could not be applied: ${e.message}. Using original headers.\n`,
          )
          Ok(data)
        }
      | None => Ok(data)
      }

      processedData
      ->Result.flatMap(dataWithHeaders => {
        options.hasRowNumbers && !dataWithHeaders.metadata.hasRowNumbers
          ? Ok(dataWithHeaders->TableData.addRowNumbers(~header=options.rowNumberHeader, ()))
          : Ok(dataWithHeaders)
      })
      ->Result.map(finalData => Config.formatImpl(finalData, options))
    } catch {
    | JsExn(e) =>
      TablyfulError.formatError(
        e->JsExn.message->Option.getOr("Unknown formatting error"),
      )->TablyfulError.toResult
    }
  }
}
