// Type alias for JSON
/**
 * Common utilities and types used throughout the library
 */
type json = JSON.t

// Result type alias with our Error type
type result<'a> = result<'a, TablyfulError.t>

// Helper functions for working with Results
let map = Result.map

let flatMap = Result.flatMap

let mapError = Result.mapError

let getOrElse = (result, default) => {
  switch result {
  | Ok(v) => v
  | Error(_) => default
  }
}

let getOrThrow = (result: result<'a>): 'a => {
  switch result {
  | Ok(v) => v
  | Error(err) => JsError.throwWithMessage(TablyfulError.toString(err))
  }
}

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

// String utilities
let isEmpty = (str: string): bool => str->String.trim === ""

let truncate = (str: string, maxLen: int): string => {
  if str->String.length <= maxLen {
    str
  } else {
    str->String.slice(~start=0, ~end=maxLen) ++ "..."
  }
}

// Array utilities
let arrayIsArray = (json: JSON.t): bool => {
  JSON.Decode.array(json)->Option.isSome
}

let arrayIsObject = (json: JSON.t): bool => {
  JSON.Decode.object(json)->Option.isSome
}
