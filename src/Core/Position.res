/**
 * Position tracking for errors
 * Provides contextual information about where errors occur
 */
type t = {
  row: option<int>,
  column: option<int>,
  path: array<string>,
}

let make = (~row=?, ~column=?, ~path=[], ()) => {
  row,
  column,
  path,
}

let atRow = (pos, row) => {...pos, row: Some(row)}

let atColumn = (pos, column) => {...pos, column: Some(column)}

let addPath = (pos, segment) => {...pos, path: pos.path->Array.concat([segment])}

let toString = (pos: t): string => {
  let parts = []

  pos.row->Option.forEach(r => parts->Array.push(`row ${r->Int.toString}`))
  pos.column->Option.forEach(c => parts->Array.push(`column ${c->Int.toString}`))

  let pathStr = pos.path->Array.join(".")
  if pathStr !== "" {
    parts->Array.push(`at .${pathStr}`)
  }

  if parts->Array.length > 0 {
    `(${parts->Array.join(", ")})`
  } else {
    ""
  }
}
