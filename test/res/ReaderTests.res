open Test
open Assertions
open TestHelpers

let read = (~format: string, ~input: string, ~options: Types.t=Defaults.t): Common.result<TableData.t> => {
  ReaderRegistry.read(~format, input, options)
}

let expectReaderSuccess = (
  ~format: string,
  ~input: string,
  ~expected: string,
  ~options: Types.t=Defaults.t,
  assertTable: TableData.t => unit,
): unit => {
  expectOk(read(~format, ~input, ~options), ~expected, ~assertOk=assertTable)
}

let getCell = (table: TableData.t, ~rowIndex: int, ~column: string): string => {
  switch table.rows->Array.get(rowIndex) {
  | Some(row) =>
    switch row->Dict.get(column) {
    | Some(value) =>
      switch JSON.Decode.string(value) {
      | Some(text) => text
      | None => JSON.stringify(value)
      }
    | None => ""
    }
  | None => ""
  }
}

let hasCellValue = (table: TableData.t, ~column: string, ~expected: string): bool => {
  table.rows->Array.some(row => {
    switch row->Dict.get(column) {
    | Some(value) =>
      switch JSON.Decode.string(value) {
      | Some(text) => text == expected
      | None => false
      }
    | None => false
    }
  })
}

let hasCellContaining = (table: TableData.t, ~column: string, ~needle: string): bool => {
  table.rows->Array.some(row => {
    switch row->Dict.get(column) {
    | Some(value) =>
      switch JSON.Decode.string(value) {
      | Some(text) => text->String.includes(needle)
      | None => false
      }
    | None => false
    }
  })
}

let sampleHtml =
  "<table>\n  <thead>\n    <tr><th>name</th><th>age</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Alice</td><td>30</td></tr>\n    <tr><td>Bob</td><td>25</td></tr>\n  </tbody>\n</table>\n"

let sampleHtmlNoThead =
  "<table>\n  <tr><th>name</th><th>age</th></tr>\n  <tr><td>Alice</td><td>30</td></tr>\n  <tr><td>Bob</td><td>25</td></tr>\n</table>\n"

let sampleMarkdown = "| name  | age |\n| ----- | --- |\n| Alice | 30  |\n| Bob   | 25  |\n"

let sampleLatex =
  "\\begin{tabular}{ll}\n\\hline\nname & age \\\\n\\hline\nAlice & 30 \\\\nBob & 25 \\\\n\\hline\n\\end{tabular}\n"

let sampleLatexBooktabs =
  "\\begin{tabular}{ll}\n\\toprule\nname & age \\\\n\\midrule\nAlice & 30 \\\\nBob & 25 \\\\n\\bottomrule\n\\end{tabular}\n"

let sampleCsv = "name,age,city\nAlice,30,New York\nBob,25,London\n"

let sampleCsvQuoted =
  "name,age,bio\nAlice,30,\"Likes \"\"coding\"\" and coffee\"\nBob,25,\"Lives in\nLondon\"\n"

let sampleTsv = "name\tage\tcity\nAlice\t30\tNew York\nBob\t25\tLondon\n"

let samplePsv = "name|age|city\nAlice|30|New York\nBob|25|London\n"

let sampleYaml = "---\n- name: Alice\n  age: 30\n  city: New York\n- name: Bob\n  age: 25\n  city: London\n"

let sampleYamlObjectOfArrays = "name:\n  - Alice\n  - Bob\nage:\n  - 30\n  - 25\n"

let sampleNdjson =
  "{\"name\":\"Alice\",\"age\":30,\"city\":\"New York\"}\n{\"name\":\"Bob\",\"age\":25,\"city\":\"London\"}\n"

let sampleXml =
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<data>\n  <row>\n    <name>Alice</name>\n    <age>30</age>\n    <city>New York</city>\n  </row>\n  <row>\n    <name>Bob</name>\n    <age>25</age>\n    <city>London</city>\n  </row>\n</data>\n"

let sampleSqlPlaceholder =
  "-- VALUES: ('Alice', 30, 'New York')\nINSERT INTO \"people\" (\"name\", \"age\", \"city\") VALUES (?, ?, ?);\n-- VALUES: ('Bob', 25, 'London')\nINSERT INTO \"people\" (\"name\", \"age\", \"city\") VALUES (?, ?, ?);\n"

let sampleSqlInline =
  "INSERT INTO \"people\" (\"name\", \"age\", \"city\") VALUES\n  ('Alice', 30, 'New York'),\n  ('Bob', 25, 'London');\n"

let sampleSqlWithEscapes =
  "-- VALUES: ('O''Brien', 42, 'Dublin')\nINSERT INTO \"people\" (\"name\", \"age\", \"city\") VALUES (?, ?, ?);\n"

test("Reader: registry exposes all readers", () => {
  let names = ReaderRegistry.getNames()
  ["csv", "tsv", "psv", "html", "markdown", "latex", "yaml", "ndjson", "xml", "sql"]
  ->Array.forEach(name => expectTrue(names->Array.includes(name)))
})

test("Reader: ndjson parses newline-delimited objects", () => {
  expectReaderSuccess(~format="ndjson", ~input=sampleNdjson, ~expected="NDJSON reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("Alice", getCell(table, ~rowIndex=0, ~column="name"))
    expectTextEqual("London", getCell(table, ~rowIndex=1, ~column="city"))
  })
})

test("Reader: csv parses basic input", () => {
  expectReaderSuccess(~format="csv", ~input=sampleCsv, ~expected="CSV reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectIntEqual(3, table.metadata.columnCount)
    expectTextEqual("Alice", getCell(table, ~rowIndex=0, ~column="name"))
    expectTextEqual("London", getCell(table, ~rowIndex=1, ~column="city"))
  })
})

test("Reader: csv parses quoted values", () => {
  expectReaderSuccess(~format="csv", ~input=sampleCsvQuoted, ~expected="CSV quoted reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTrue(getCell(table, ~rowIndex=0, ~column="bio")->String.includes("\"coding\""))
    expectTrue(getCell(table, ~rowIndex=1, ~column="bio")->String.includes("London"))
  })
})

test("Reader: tsv parses input", () => {
  expectReaderSuccess(~format="tsv", ~input=sampleTsv, ~expected="TSV reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("New York", getCell(table, ~rowIndex=0, ~column="city"))
  })
})

test("Reader: psv parses input", () => {
  expectReaderSuccess(~format="psv", ~input=samplePsv, ~expected="PSV reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("Bob", getCell(table, ~rowIndex=1, ~column="name"))
  })
})

test("Reader: html parses table with thead", () => {
  expectReaderSuccess(~format="html", ~input=sampleHtml, ~expected="HTML reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("Alice", getCell(table, ~rowIndex=0, ~column="name"))
  })
})

test("Reader: html parses table without thead", () => {
  expectReaderSuccess(~format="html", ~input=sampleHtmlNoThead, ~expected="HTML no-thead reader success", table => {
    expectTrue(table.metadata.rowCount >= 2)
    expectTrue(hasCellValue(table, ~column="name", ~expected="Alice"))
    expectTrue(hasCellValue(table, ~column="name", ~expected="Bob"))
  })
})

test("Reader: markdown parses table", () => {
  expectReaderSuccess(~format="markdown", ~input=sampleMarkdown, ~expected="Markdown reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("30", getCell(table, ~rowIndex=0, ~column="age"))
  })
})

test("Reader: latex parses tabular and booktabs", () => {
  expectReaderSuccess(~format="latex", ~input=sampleLatex, ~expected="LaTeX reader success", table => {
    expectTrue(table.metadata.rowCount >= 2)
    expectTrue(hasCellContaining(table, ~column="name", ~needle="Alice"))
  })

  expectReaderSuccess(
    ~format="latex",
    ~input=sampleLatexBooktabs,
    ~expected="LaTeX booktabs reader success",
    booktabsTable => {
      expectTrue(booktabsTable.metadata.rowCount >= 2)
      expectTrue(hasCellContaining(booktabsTable, ~column="name", ~needle="Alice"))
    },
  )
})

test("Reader: yaml parses array-of-objects and object-of-arrays", () => {
  expectReaderSuccess(~format="yaml", ~input=sampleYaml, ~expected="YAML array-of-objects success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("New York", getCell(table, ~rowIndex=0, ~column="city"))
  })

  expectReaderSuccess(
    ~format="yaml",
    ~input=sampleYamlObjectOfArrays,
    ~expected="YAML object-of-arrays success",
    objectOfArraysTable => {
      expectIntEqual(2, objectOfArraysTable.metadata.rowCount)
      expectTextEqual("Bob", getCell(objectOfArraysTable, ~rowIndex=1, ~column="name"))
    },
  )
})

test("Reader: xml parses repeated elements", () => {
  expectReaderSuccess(~format="xml", ~input=sampleXml, ~expected="XML reader success", table => {
    expectIntEqual(2, table.metadata.rowCount)
    expectTextEqual("30", getCell(table, ~rowIndex=0, ~column="age"))
    expectTextEqual("London", getCell(table, ~rowIndex=1, ~column="city"))
  })
})

test("Reader: sql parses placeholder, inline, and escaped values", () => {
  expectReaderSuccess(
    ~format="sql",
    ~input=sampleSqlPlaceholder,
    ~expected="SQL placeholder reader success",
    placeholderTable => {
      expectIntEqual(2, placeholderTable.metadata.rowCount)
      expectTextEqual("Alice", getCell(placeholderTable, ~rowIndex=0, ~column="name"))
    },
  )

  expectReaderSuccess(~format="sql", ~input=sampleSqlInline, ~expected="SQL inline reader success", inlineTable => {
    expectIntEqual(2, inlineTable.metadata.rowCount)
    expectTextEqual("London", getCell(inlineTable, ~rowIndex=1, ~column="city"))
  })

  expectReaderSuccess(
    ~format="sql",
    ~input=sampleSqlWithEscapes,
    ~expected="SQL escaped reader success",
    escapedTable => {
      expectIntEqual(1, escapedTable.metadata.rowCount)
      expectTextEqual("O'Brien", getCell(escapedTable, ~rowIndex=0, ~column="name"))
    },
  )
})

test("Reader: output can be transformed with filters and columns", () => {
  expectReaderSuccess(~format="csv", ~input=sampleCsv, ~expected="CSV reader success", table => {
    expectOk(TableTransform.applyFilters(table, ["name = Alice"]), ~expected="filter success", ~assertOk=filtered => {
      expectOk(
        TableTransform.selectColumns(filtered, ["name", "city"]),
        ~expected="column selection success",
        ~assertOk=selected => {
        expectIntEqual(2, selected.headers->Array.length)
        expectTrue(selected.headers->Array.includes("name"))
        expectTrue(selected.headers->Array.includes("city"))
        expectIntEqual(1, selected.metadata.rowCount)
        expectTextEqual("Alice", getCell(selected, ~rowIndex=0, ~column="name"))
      },
      )
    })
  })
})

test("Reader: html with no table returns parse error", () => {
  read(~format="html", ~input="<p>no table here</p>")
  ->expectParseErrorContains(~contains="table")
})

test("Reader: markdown with no table returns parse error", () => {
  read(~format="markdown", ~input="# Just a heading\n\nSome text.\n")
  ->expectParseErrorContains(~contains="table")
})

test("Reader: latex with no tabular returns parse error", () => {
  read(~format="latex", ~input="\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}")
  ->expectParseErrorContains(~contains="tabular")
})

test("Reader: yaml with non-table data returns parse error", () => {
  read(~format="yaml", ~input="just a plain string")
  ->expectParseErrorContains(~contains="recognizable")
})

test("Reader: xml with no repeating elements returns parse error", () => {
  read(~format="xml", ~input="<root>just plain text</root>")
  ->expectParseErrorContains(~contains="structure")
})

test("Reader: sql with no INSERT returns parse error", () => {
  read(~format="sql", ~input="SELECT * FROM users;")
  ->expectParseErrorContains(~contains="INSERT")
})

test("Reader: ndjson with scalar row returns parse error", () => {
  read(~format="ndjson", ~input="{\"name\":\"Alice\"}\n42\n")
  ->expectParseErrorContains(~contains="must be a JSON object")
})
