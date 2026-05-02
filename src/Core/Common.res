/**
 * Common utilities and types used throughout the library
 */

/**
 * Result type alias using our custom error type.
 * Distinguishes from standard Belt.Result.
 */
type result<'a> = result<'a, TablyfulError.t>

/**
 * Data type inference result for table columns.
 * Used to determine how to format/serialize values.
 */
type dataType = String | Number | Boolean | Date | Unknown | Null

/**
 * Infers the data type of a JSON value by examining its structure.
 * Checks for ISO date strings (yyyy-mm-dd), numbers, booleans, or defaults to string.
 * @param value - JSON value to infer type from
 * @returns Inferred data type
 */
let inferType = (value: JSON.t): dataType => {
  if value === JSON.Encode.null {
    Null
  } else {
    switch JSON.Decode.string(value) {
    | Some(str) =>
      // ISO 8601 date pattern detection (yyyy-mm-dd)
      if str->String.match(/^\d{4}-\d{2}-\d{2}/)->Option.isSome {
        Date
      } else {
        String
      }
    | None =>
      switch JSON.Decode.float(value) {
      | Some(_) => Number
      | None =>
        switch JSON.Decode.bool(value) {
        | Some(_) => Boolean
        | None => Unknown
        }
      }
    }
  }
}

/**
 * Safely parses JSON string with custom error handling.
 * Wraps JSON.parseOrThrow with our error type.
 * @param str - JSON string to parse
 * @returns Ok(parsedJSON) or Error with context
 */
let parseJson = (str: string): result<JSON.t> => {
  try {
    Ok(JSON.parseOrThrow(str))
  } catch {
  | _ =>
    // Wrap generic parse failure with actionable context
    TablyfulError.parseError("Invalid JSON format")
    ->TablyfulError.withSuggestion("Ensure the input is valid JSON. Try using a JSON linter.")
    ->TablyfulError.withCode("JSON_PARSE_ERROR")
    ->TablyfulError.toResult
  }
}
