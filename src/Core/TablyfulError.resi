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
  suggestion: option<string>,
  cause: option<string>,
  code: option<string>,
}

type result<'a> = result<'a, t>

let make: (
  ~category: category,
  ~message: string,
  ~position: Position.t=?,
  ~suggestion: string=?,
  ~cause: string=?,
  ~code: string=?,
  unit,
) => t
let parseError: (~row: int=?, ~column: int=?, ~path: array<string>=?, string) => t
let formatError: (~row: int=?, ~column: int=?, string) => t
let validationError: (~path: array<string>=?, string) => t
let ioError: (~cause: string=?, string) => t
let configError: (~code: string=?, string) => t
let streamError: (~cause: string=?, string) => t
let atRow: (t, int) => t
let atColumn: (t, int) => t
let atPath: (t, string) => t
let withSuggestion: (t, string) => t
let withCause: (t, string) => t
let withCode: (t, string) => t
let categoryToString: category => string
let toString: t => string
let toResult: t => result<'a>
let mapError: (result<'a>, t => t) => result<'a>
