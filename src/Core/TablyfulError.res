/**
 * Comprehensive error handling with context.
 * All errors include category, position, suggestions, and error codes
 * for actionable user feedback.
 */

/**
 * Error categories for classification and routing.
 * Maps to exit codes and user-facing messages.
 */
type category =
  | ParseError
  | FormatError
  | ValidationError
  | IoError
  | ConfigError
  | StreamError

/**
 * Complete error type with full context.
 */
type t = {
  category: category,
  message: string,
  position: Position.t,
  suggestion?: string,
  cause?: string,
  code?: string,
}

/**
 * Smart constructor with optional fields.
 * @param category - Error category
 * @param message - Human-readable error message
 * @param position - Error location (defaults to start)
 * @param suggestion - Actionable fix suggestion
 * @param cause - Underlying cause chain
 * @param code - Machine-readable error code
 */
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

/**
 * Creates a parse error at optional position.
 * @param row - Optional row number
 * @param column - Optional column number
 * @param path - JSON path to error location
 * @param message - Error description
 */
let parseError = (~row=?, ~column=?, ~path=[], message) =>
  make(~category=ParseError, ~message, ~position=Position.make(~row?, ~column?, ~path, ()), ())

/**
 * Creates a format error at optional position.
 * @param row - Optional row number
 * @param column - Optional column number
 * @param message - Error description
 */
let formatError = (~row=?, ~column=?, message) =>
  make(~category=FormatError, ~message, ~position=Position.make(~row?, ~column?, ()), ())

/**
 * Creates a validation error (e.g., type mismatch, missing required field).
 * @param path - JSON path to validation failure
 * @param message - Error description
 */
let validationError = (~path=[], message) =>
  make(~category=ValidationError, ~message, ~position=Position.make(~path, ()), ())

/**
 * Creates an I/O error (file not found, permission denied).
 * @param cause - Optional underlying OS error
 * @param message - Error description
 */
let ioError = (~cause=?, message) => make(~category=IoError, ~message, ~cause?, ())

/**
 * Creates a configuration error (invalid config, missing required option).
 * @param code - Optional config error code
 * @param message - Error description
 */
let configError = (~code=?, message) => make(~category=ConfigError, ~message, ~code?, ())

/**
 * Creates a stream error (malformed stream, unexpected token).
 * @param cause - Optional underlying error
 * @param message - Error description
 */
let streamError = (~cause=?, message) => make(~category=StreamError, ~message, ~cause?, ())

/**
 * Position modifier: moves error to a new row.
 * @param error - Error to modify
 * @param row - New row number
 * @returns Error at new position
 */
let atRow = (error, row) => {...error, position: error.position->Position.atRow(row)}

/**
 * Position modifier: moves error to a new column.
 * @param error - Error to modify
 * @param column - New column number
 * @returns Error at new position
 */
let atColumn = (error, column) => {...error, position: error.position->Position.atColumn(column)}

/**
 * Position modifier: adds a path segment.
 * @param error - Error to modify
 * @param path - Path segment to add
 * @returns Error at new path
 */
let atPath = (error, path) => {...error, position: error.position->Position.addPath(path)}

/**
 * Adds a suggestion to an error.
 * @param error - Error to modify
 * @param suggestion - Actionable fix description
 * @returns Error with suggestion
 */
let withSuggestion = (error, suggestion) => {...error, suggestion}

/**
 * Adds a cause chain to an error.
 * @param error - Error to modify
 * @param cause - Underlying error description
 * @returns Error with cause
 */
let withCause = (error, cause) => {...error, cause}

/**
 * Adds an error code to an error.
 * @param error - Error to modify
 * @param code - Machine-readable code
 * @returns Error with code
 */
let withCode = (error, code) => {...error, code}

/**
 * Converts category to string for display.
 * @param cat - Category to convert
 * @returns String representation
 */
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

/**
 * Formats error for user display.
 * Includes category, message, position, cause, and suggestion.
 * @param error - Error to format
 * @returns Formatted error string
 */
let toString = (error: t): string => {
  let parts = []

  // Error code if present (machine-readable)
  error.code->Option.forEach(c => parts->Array.push(`[${c}]`))

  // Category and message (human-readable)
  parts->Array.push(`[${error.category->categoryToString->String.toUpperCase}] ${error.message}`)

  // Position (if not at root)
  let posStr = error.position->Position.toString
  if posStr !== "" {
    parts->Array.push(posStr)
  }

  // Cause (underlying error)
  error.cause->Option.forEach(c => parts->Array.push(`\nCaused by: ${c}`))

  // Suggestion (actionable fix)
  error.suggestion->Option.forEach(s => parts->Array.push(`\n💡 Suggestion: ${s}`))

  parts->Array.join("")
}

/**
 * Result type alias for convenience.
 */
type result<'a> = result<'a, t>

/**
 * Converts error to Error result.
 * @param error - Error to wrap
 * @returns Error(result)
 */
let toResult = (error: t): result<'a> => Error(error)

/**
 * Maps over error in result.
 * @param result - Result to transform
 * @param f - Error transformation function
 * @returns Result with transformed error
 */
let mapError = (result: result<'a>, f: t => t): result<'a> => {
  switch result {
  | Ok(_) as ok => ok
  | Error(err) => Error(f(err))
  }
}
