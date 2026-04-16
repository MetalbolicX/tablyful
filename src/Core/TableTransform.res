/**
 * Table transformation helpers used by CLI pipeline.
 */

type filterOp =
  | Eq
  | Neq
  | Gt
  | Lt
  | Gte
  | Lte
  | Like

type predicate = {
  column: string,
  op: filterOp,
  value: string,
}

type regex

@send external indexOf: (string, string) => int = "indexOf"
@send external slice: (string, int, int) => string = "slice"
@send external sliceFrom: (string, int) => string = "slice"
@new external makeRegex: (string, string) => regex = "RegExp"
@send external regexTest: (regex, string) => bool = "test"

let invalidTransform = (message: string): Common.result<'a> => {
  TablyfulError.validationError(message)->TablyfulError.toResult
}

let uniqueStrings = (values: array<string>): array<string> => {
  values->Array.reduce([], (acc, value) => {
    if acc->Array.includes(value) {
      acc
    } else {
      Array.concat(acc, [value])
    }
  })
}

let stripQuotes = (value: string): string => {
  let trimmed = value->String.trim
  let len = trimmed->String.length
  if len < 2 {
    trimmed
  } else {
    let first = slice(trimmed, 0, 1)
    let last = slice(trimmed, len - 1, len)
    if (first === "\"" && last === "\"") || (first === "'" && last === "'") {
      slice(trimmed, 1, len - 1)
    } else {
      trimmed
    }
  }
}

let splitAt = (~input: string, ~token: string, ~caseInsensitive=false): option<(string, string)> => {
  let haystack = if caseInsensitive { input->String.toLowerCase } else { input }
  let needle = if caseInsensitive { token->String.toLowerCase } else { token }
  let idx = indexOf(haystack, needle)

  if idx < 0 {
    None
  } else {
    let lhs = slice(input, 0, idx)->String.trim
    let rhs = sliceFrom(input, idx + token->String.length)->String.trim
    if lhs === "" || rhs === "" {
      None
    } else {
      Some((lhs, rhs))
    }
  }
}

let parsePredicate = (expression: string): Common.result<predicate> => {
  let expr = expression->String.trim
  if expr === "" {
    invalidTransform("Filter expression cannot be empty.")
  } else {
    switch splitAt(~input=expr, ~token=" like ", ~caseInsensitive=true) {
    | Some((column, value)) => Ok({column, op: Like, value: value->stripQuotes})
    | None =>
      switch splitAt(~input=expr, ~token=">=") {
      | Some((column, value)) => Ok({column, op: Gte, value: value->stripQuotes})
      | None =>
        switch splitAt(~input=expr, ~token="<=") {
        | Some((column, value)) => Ok({column, op: Lte, value: value->stripQuotes})
        | None =>
          switch splitAt(~input=expr, ~token="!=") {
          | Some((column, value)) => Ok({column, op: Neq, value: value->stripQuotes})
          | None =>
            switch splitAt(~input=expr, ~token="=") {
            | Some((column, value)) => Ok({column, op: Eq, value: value->stripQuotes})
            | None =>
              switch splitAt(~input=expr, ~token=">") {
              | Some((column, value)) => Ok({column, op: Gt, value: value->stripQuotes})
              | None =>
                switch splitAt(~input=expr, ~token="<") {
                | Some((column, value)) => Ok({column, op: Lt, value: value->stripQuotes})
                | None =>
                  invalidTransform(
                    `Invalid filter expression: ${expression}. Expected operators: =, !=, >, <, >=, <=, LIKE.`,
                  )
                }
              }
            }
          }
        }
      }
    }
  }
}

let jsonToComparableString = (json: JSON.t): string => {
  if json === JSON.Encode.null {
    ""
  } else {
    switch JSON.Decode.string(json) {
    | Some(value) => value
    | None =>
      switch JSON.Decode.float(json) {
      | Some(value) => value->Float.toString
      | None =>
        switch JSON.Decode.bool(json) {
        | Some(value) => value->Bool.toString
        | None => JSON.stringify(json)
        }
      }
    }
  }
}

let compareValues = (left: string, right: string): int => {
  switch (Float.fromString(left), Float.fromString(right)) {
  | (Some(l), Some(r)) =>
    if l < r {
      -1
    } else if l > r {
      1
    } else {
      0
    }
  | _ => {
      let lhs = left->String.toLowerCase
      let rhs = right->String.toLowerCase
      if lhs < rhs {
        -1
      } else if lhs > rhs {
        1
      } else {
        0
      }
    }
  }
}

let escapeRegex = (pattern: string): string => {
  pattern
  ->String.replaceAll("\\", "\\\\")
  ->String.replaceAll(".", "\\.")
  ->String.replaceAll("+", "\\+")
  ->String.replaceAll("*", "\\*")
  ->String.replaceAll("?", "\\?")
  ->String.replaceAll("^", "\\^")
  ->String.replaceAll("$", "\\$")
  ->String.replaceAll("{", "\\{")
  ->String.replaceAll("}", "\\}")
  ->String.replaceAll("(", "\\(")
  ->String.replaceAll(")", "\\)")
  ->String.replaceAll("|", "\\|")
  ->String.replaceAll("[", "\\[")
  ->String.replaceAll("]", "\\]")
}

let matchesLike = (value: string, pattern: string): bool => {
  let source =
    "^" ++
    (
      pattern
      ->escapeRegex
      ->String.replaceAll("%", ".*")
      ->String.replaceAll("_", ".")
    ) ++
    "$"
  let regex = makeRegex(source, "i")
  regexTest(regex, value)
}

let evaluatePredicate = (row: TableData.row, pred: predicate): bool => {
  let rowValue = row->Dict.get(pred.column)->Option.getOr(JSON.Encode.null)->jsonToComparableString
  let value = pred.value

  switch pred.op {
  | Eq => compareValues(rowValue, value) === 0
  | Neq => compareValues(rowValue, value) !== 0
  | Gt => compareValues(rowValue, value) > 0
  | Lt => compareValues(rowValue, value) < 0
  | Gte => compareValues(rowValue, value) >= 0
  | Lte => compareValues(rowValue, value) <= 0
  | Like => matchesLike(rowValue, value)
  }
}

let selectColumns = (table: TableData.t, requestedColumns: array<string>): Common.result<TableData.t> => {
  let selected =
    requestedColumns
    ->Array.map(column => column->String.trim)
    ->Array.filter(column => column !== "")
    ->uniqueStrings

  if selected->Array.length === 0 {
    invalidTransform("--columns requires at least one column name.")
  } else {
    let missing = selected->Array.filter(column => !(table.headers->Array.includes(column)))
    if missing->Array.length > 0 {
      invalidTransform(
        `Unknown column(s) in --columns: ${missing->Array.join(", ")}. Available columns: ${table.headers
          ->Array.join(", ")}.`,
      )
    } else {
      let rows = table.rows->Array.map(row => {
        let newRow = Dict.make()
        selected->Array.forEach(column => {
          newRow->Dict.set(column, row->Dict.get(column)->Option.getOr(JSON.Encode.null))
        })
        newRow
      })

      let columns =
        selected
        ->Array.map(name => {
          switch table.columns->Array.find(col => col.name === name) {
          | Some(column) => column
          | None => {name, dataType: Common.Unknown, nullable: true}
          }
        })

      Ok({
        headers: selected,
        rows,
        columns,
        metadata: {
          ...table.metadata,
          columnCount: selected->Array.length,
        },
      })
    }
  }
}

let applyFilters = (table: TableData.t, expressions: array<string>): Common.result<TableData.t> => {
  if expressions->Array.length === 0 {
    Ok(table)
  } else {
    expressions->Array.reduce(Ok([]), (acc, expression) => {
      acc->Result.flatMap(predicates => {
        parsePredicate(expression)->Result.map(predicate => Array.concat(predicates, [predicate]))
      })
    })->Result.flatMap(predicates => {
      let missingColumns =
        predicates
        ->Array.map(predicate => predicate.column)
        ->uniqueStrings
        ->Array.filter(column => !(table.headers->Array.includes(column)))

      if missingColumns->Array.length > 0 {
        invalidTransform(
          `Unknown column(s) in --filter: ${missingColumns->Array.join(", ")}. Available columns: ${table.headers
            ->Array.join(", ")}.`,
        )
      } else {
        let rows = table.rows->Array.filter(row => predicates->Array.every(pred => evaluatePredicate(row, pred)))
        Ok({
          ...table,
          rows,
          metadata: {
            ...table.metadata,
            rowCount: rows->Array.length,
          },
        })
      }
    })
  }
}
