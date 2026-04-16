/**
 * SQL Formatter
 * Emits INSERT statements with placeholders and optional CREATE TABLE
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
  let headerNames = data.headers->Array.map(header => quoteIdentifier(header, quote))

  let lines = []

  if opts.includeCreateTable {
    lines->Array.push(`CREATE TABLE ${tableName} (`)

    let columnDefs =
      data.columns
      ->Array.map(col => {
        let columnName = quoteIdentifier(col.name, quote)
        let columnType = sqlTypeForColumn(col)
        `  ${columnName} ${columnType}`
      })

    let defsLen = columnDefs->Array.length
    columnDefs->Array.forEachWithIndex((line, idx) => {
      let suffix = idx < defsLen - 1 ? "," : ""
      lines->Array.push(line ++ suffix)
    })

    lines->Array.push(");")
    lines->Array.push("")
  }

  let placeholderLine = data.headers->Array.map(_ => "?")->Array.join(", ")
  let headerLine = headerNames->Array.join(", ")

  data.rows->Array.forEach(row => {
    let values =
      data.headers
      ->Array.map(header => row->Dict.get(header)->Option.getOr(JSON.Encode.null)->jsonToSqlLiteral)
      ->Array.join(", ")

    lines->Array.push(`-- VALUES: (${values})`)
    lines->Array.push(`INSERT INTO ${tableName} (${headerLine}) VALUES (${placeholderLine});`)
  })

  lines->Array.join("\n")
}

include FormatterMake.Make({
  let name = "sql"
  let extension = ".sql"
  let formatImpl = formatImpl
})
