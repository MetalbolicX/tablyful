/**
 * Comprehensive error handling with context
 * All errors include position, suggestions, and error codes
 */
type category =
  | ParseError
  | FormatError
  | ValidationError
  | IoError
  | ConfigError
  | StreamError

type t = {
  category: category,
  message: string,
  position: Position.t,
  suggestion?: string,
  cause?: string,
  code?: string,
}

// Smart constructors
let make = (
  ~category: category,
  ~message: string,
  ~position: Position.t=Position.make(),
  ~suggestion=?,
  ~cause=?,
  ~code=?,

  (),
) => {
  category,
  message,
  position,
  ?suggestion,
  ?cause,
  ?code,
}

let parseError = (~row=?, ~column=?, ~path=[], message) =>
  make(~category=ParseError, ~message, ~position=Position.make(~row?, ~column?, ~path, ()), ())

let formatError = (~row=?, ~column=?, message) =>
  make(~category=FormatError, ~message, ~position=Position.make(~row?, ~column?, ()), ())

let validationError = (~path=[], message) =>
  make(~category=ValidationError, ~message, ~position=Position.make(~path, ()), ())

let ioError = (~cause=?, message) => make(~category=IoError, ~message, ~cause?, ())

let configError = (~code=?, message) => make(~category=ConfigError, ~message, ~code?, ())

let streamError = (~cause=?, message) => make(~category=StreamError, ~message, ~cause?, ())

// Modifiers
let atRow = (error, row) => {...error, position: error.position->Position.atRow(row)}

let atColumn = (error, column) => {...error, position: error.position->Position.atColumn(column)}

let atPath = (error, path) => {...error, position: error.position->Position.addPath(path)}

let withSuggestion = (error, suggestion) => {...error, suggestion}

let withCause = (error, cause) => {...error, cause}

let withCode = (error, code) => {...error, code}

// Category to string
let categoryToString = (cat: category): string => {
  switch cat {
  | ParseError => "parse_error"
  | FormatError => "format_error"
  | ValidationError => "validation_error"
  | IoError => "io_error"
  | ConfigError => "config_error"
  | StreamError => "stream_error"
  }
}

// Formatting
let toString = (error: t): string => {
  let parts = []

  // Error code if present
  error.code->Option.forEach(c => parts->Array.push(`[${c}]`))

  // Category and message
  parts->Array.push(`[${error.category->categoryToString->String.toUpperCase}] ${error.message}`)

  // Position
  let posStr = error.position->Position.toString
  if posStr !== "" {
    parts->Array.push(posStr)
  }

  // Cause
  error.cause->Option.forEach(c => parts->Array.push(`\nCaused by: ${c}`))

  // Suggestion
  error.suggestion->Option.forEach(s => parts->Array.push(`\n💡 Suggestion: ${s}`))

  parts->Array.join("")
}

// Result helpers
type result<'a> = result<'a, t>

let toResult = (error: t): result<'a> => Error(error)

let mapError = (result: result<'a>, f: t => t): result<'a> => {
  switch result {
  | Ok(_) as ok => ok
  | Error(err) => Error(f(err))
  }
}
