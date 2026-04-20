/**
 * SQL Formatter
 * Emits INSERT statements with inline literals and optional CREATE TABLE
 */
open Types

let jsonToSqlLiteral = (json: JSON.t): string => {
  if json === JSON.Encode.null {
    "NULL"
  } else {
    switch JSON.Decode.string(json) {
    | Some(str) => {
        let escaped = str->String.replaceAll("'", "''")
        "'" ++ escaped ++ "'"
      }
    | None =>
      switch JSON.Decode.float(json) {
      | Some(n) => n->Float.toString
      | None =>
        switch JSON.Decode.bool(json) {
        | Some(true) => "TRUE"
        | Some(false) => "FALSE"
        | None => {
            let escaped = JSON.stringify(json)->String.replaceAll("'", "''")
            "'" ++ escaped ++ "'"
          }
        }
      }
    }
  }
}

let quoteIdentifier = (identifier: string, quote: string): string => {
  let normalized = quote === "" ? "\"" : quote
  switch normalized {
  | "[" => "[" ++ identifier->String.replaceAll("]", "]]") ++ "]"
  | _ => normalized ++ identifier->String.replaceAll(normalized, normalized ++ normalized) ++ normalized
  }
}

let sqlTypeForColumn = (column: TableData.column): string => {
  switch column.dataType {
  | Common.Number => "REAL"
  | Common.Boolean => "BOOLEAN"
  | _ => "TEXT"
  }
}

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getSqlOptions(options)
  let quote = opts.identifierQuote
  let tableName = quoteIdentifier(opts.tableName, quote)
  let headerNames =
    data.headers
    ->Bindings.Iter.fromArray
    ->Bindings.Iter.map(header => quoteIdentifier(header, quote))
    ->Bindings.Iter.toArray

  let lines = []

  if opts.includeCreateTable {
    lines->Array.push(`CREATE TABLE ${tableName} (`)

    let columnDefs =
      data.columns
      ->Bindings.Iter.fromArray
      ->Bindings.Iter.map(col => {
        let columnName = quoteIdentifier(col.name, quote)
        let columnType = sqlTypeForColumn(col)
        `  ${columnName} ${columnType}`
      })
      ->Bindings.Iter.toArray

    let defsLen = columnDefs->Array.length
    Bindings.Iter.entries(columnDefs)->Bindings.Iter.forEach(((idx, line)) => {
      let suffix = idx < defsLen - 1 ? "," : ""
      lines->Array.push(line ++ suffix)
    })

    lines->Array.push(");")
    lines->Array.push("")
  }

  let headerLine = headerNames->Array.join(", ")

  let batchSize = opts.insertBatchSize > 0 ? opts.insertBatchSize : 1
  let rowCount = data.rows->Array.length
  let i = ref(0)

  while i.contents < rowCount {
    let candidate = i.contents + batchSize
    let batchEnd = candidate < rowCount ? candidate : rowCount
    let batchRows = data.rows->Array.slice(~start=i.contents, ~end=batchEnd)

    if batchSize === 1 {
      let row = batchRows->Array.getUnsafe(0)
      let values =
        data.headers
        ->Bindings.Iter.fromArray
        ->Bindings.Iter.map(header =>
          row->Dict.get(header)->Option.getOr(JSON.Encode.null)->jsonToSqlLiteral
        )
        ->Bindings.Iter.toArray
        ->Array.join(", ")
      lines->Array.push(`INSERT INTO ${tableName} (${headerLine}) VALUES (${values});`)
    } else {
      let rowLiterals = batchRows->Bindings.Iter.fromArray->Bindings.Iter.map(row => {
        let vals =
          data.headers
          ->Bindings.Iter.fromArray
          ->Bindings.Iter.map(header =>
            row->Dict.get(header)->Option.getOr(JSON.Encode.null)->jsonToSqlLiteral
          )
          ->Bindings.Iter.toArray
          ->Array.join(", ")
        `(${vals})`
      })->Bindings.Iter.toArray
      lines->Array.push(`-- VALUES: ${rowLiterals->Array.join(", ")}`)
      lines->Array.push(`INSERT INTO ${tableName} (${headerLine}) VALUES`)
      let lastIdx = rowLiterals->Array.length - 1
      Bindings.Iter.entries(rowLiterals)->Bindings.Iter.forEach(((idx, literal)) => {
        let suffix = idx < lastIdx ? "," : ";"
        lines->Array.push(`  ${literal}${suffix}`)
      })
    }

    i.contents = batchEnd
  }

  lines->Array.join("\n")
}

include FormatterMake.Make({
  let name = "sql"
  let extension = ".sql"
  let formatImpl = formatImpl
})
