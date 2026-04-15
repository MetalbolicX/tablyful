/**
 * Common utilities and types used throughout the library
 */
// Result type alias with our Error type
type result<'a> = result<'a, TablyfulError.t>

// Type inference helper
type dataType = String | Number | Boolean | Date | Unknown | Null

let inferType = (value: JSON.t): dataType => {
  if value === JSON.Encode.null {
    Null
  } else {
    switch JSON.Decode.string(value) {
    | Some(str) =>
      if str->String.match(/^\\d{4}-\\d{2}-\\d{2}/)->Option.isSome {
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

// Safe JSON parsing
let parseJson = (str: string): result<JSON.t> => {
  try {
    Ok(JSON.parseOrThrow(str))
  } catch {
  | _ =>
    TablyfulError.parseError("Invalid JSON format")
    ->TablyfulError.withSuggestion("Ensure the input is valid JSON. Try using a JSON linter.")
    ->TablyfulError.withCode("JSON_PARSE_ERROR")
    ->TablyfulError.toResult
  }
}
