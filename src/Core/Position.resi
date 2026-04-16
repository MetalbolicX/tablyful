type t = {
  row?: int,
  column?: int,
  path: array<string>,
}

let make: (~row: int=?, ~column: int=?, ~path: array<string>=?, unit) => t
let atRow: (t, int) => t
let atColumn: (t, int) => t
let addPath: (t, string) => t
let toString: t => string
