open Test
open Assertions
open TestHelpers

let arrayOfArraysInput = (): JSON.t =>
  JSON.Encode.array([
    JSON.Encode.array([JSON.Encode.string("name"), JSON.Encode.string("age")]),
    JSON.Encode.array([JSON.Encode.string("Alice"), JSON.Encode.float(30.0)]),
    JSON.Encode.array([JSON.Encode.string("Bob"), JSON.Encode.float(25.0)]),
  ])

let arrayOfObjectsInput = (): JSON.t =>
  JSON.Encode.array([
    JSON.Encode.object(
      Dict.fromArray([("name", JSON.Encode.string("Alice")), ("age", JSON.Encode.float(30.0))]),
    ),
    JSON.Encode.object(
      Dict.fromArray([("name", JSON.Encode.string("Bob")), ("age", JSON.Encode.float(25.0))]),
    ),
  ])

let objectOfArraysInput = (): JSON.t =>
  JSON.Encode.object(
    Dict.fromArray([
      ("name", JSON.Encode.array([JSON.Encode.string("Alice"), JSON.Encode.string("Bob")])),
      ("age", JSON.Encode.array([JSON.Encode.float(30.0), JSON.Encode.float(25.0)])),
    ]),
  )

let objectOfObjectsInput = (): JSON.t =>
  JSON.Encode.object(
    Dict.fromArray([
      (
        "row1",
        JSON.Encode.object(
          Dict.fromArray([("name", JSON.Encode.string("Alice")), ("age", JSON.Encode.float(30.0))]),
        ),
      ),
      (
        "row2",
        JSON.Encode.object(
          Dict.fromArray([("name", JSON.Encode.string("Bob")), ("age", JSON.Encode.float(25.0))]),
        ),
      ),
    ]),
  )

let convert = (~input: JSON.t, ~format: string, ~options: Types.t=Defaults.t): Common.result<string> => {
  ParserRegistry.parse(input, options)
  ->Result.flatMap(tableData => FormatterRegistry.format(format, tableData, options))
}

let expectConverted = (
  ~input: JSON.t,
  ~format: string,
  ~expected: string,
  ~options: Types.t=Defaults.t,
  assertOutput: string => unit,
): unit => {
  expectOk(convert(~input, ~format, ~options), ~expected, ~assertOk=assertOutput)
}

test("E2E: detectFormat array_of_arrays", () => {
  let format = arrayOfArraysInput()->InputData.classify->InputData.shapeToString
  expectTextEqual("array_of_arrays", format)
})

test("E2E: detectFormat array_of_objects", () => {
  let format = arrayOfObjectsInput()->InputData.classify->InputData.shapeToString
  expectTextEqual("array_of_objects", format)
})

test("E2E: detectFormat object_of_arrays", () => {
  let format = objectOfArraysInput()->InputData.classify->InputData.shapeToString
  expectTextEqual("object_of_arrays", format)
})

test("E2E: detectFormat object_of_objects", () => {
  let format = objectOfObjectsInput()->InputData.classify->InputData.shapeToString
  expectTextEqual("object_of_objects", format)
})

test("E2E: toCsv handles all supported input shapes", () => {
  let inputs = [
    arrayOfArraysInput(),
    arrayOfObjectsInput(),
    objectOfArraysInput(),
    objectOfObjectsInput(),
  ]

  inputs->Array.forEach(input => {
    expectConverted(~input, ~format="csv", ~expected="CSV conversion to succeed", csv => {
      expectTrue(csv->String.includes("Alice"))
      expectTrue(csv->String.includes("30"))
    })
  })
})

test("E2E: toTsv emits tab-delimited output", () => {
  expectConverted(~input=arrayOfArraysInput(), ~format="tsv", ~expected="TSV conversion to succeed", tsv => {
    expectTrue(tsv->String.includes("name\tage"))
    expectTrue(tsv->String.includes("Alice\t30"))
  })
})

test("E2E: toPsv emits pipe-delimited output", () => {
  expectConverted(~input=arrayOfArraysInput(), ~format="psv", ~expected="PSV conversion to succeed", psv => {
    expectTrue(psv->String.includes("name|age"))
    expectTrue(psv->String.includes("Alice|30"))
  })
})

test("E2E: toJson converts and includes expected fields", () => {
  expectConverted(~input=arrayOfArraysInput(), ~format="json", ~expected="JSON conversion to succeed", json => {
    expectTrue(json->String.includes("Alice"))
    expectTrue(json->String.includes("25"))
  })
})

test("E2E: toMarkdown renders table separators", () => {
  expectConverted(
    ~input=arrayOfArraysInput(),
    ~format="markdown",
    ~expected="Markdown conversion to succeed",
    markdown => {
      expectTrue(markdown->String.includes("| name"))
      expectTrue(markdown->String.includes("---"))
    },
  )
})

test("E2E: toHtml emits table markup", () => {
  expectConverted(~input=arrayOfArraysInput(), ~format="html", ~expected="HTML conversion to succeed", html => {
    expectTrue(html->String.includes("<table"))
    expectTrue(html->String.includes("<th>name</th>"))
    expectTrue(html->String.includes("<td>Alice</td>"))
  })
})

test("E2E: toLatex emits tabular environment", () => {
  expectConverted(
    ~input=arrayOfArraysInput(),
    ~format="latex",
    ~expected="LaTeX conversion to succeed",
    latex => {
      expectTrue(latex->String.includes("\\begin{tabular}"))
      expectTrue(latex->String.includes("name & age"))
    },
  )
})

test("E2E: toSql emits insert placeholders", () => {
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Sql,
    formatOptions: SqlOptions({...Defaults.defaultSqlOptions, tableName: "users", includeCreateTable: true}),
  }

  expectConverted(~input=arrayOfArraysInput(), ~format="sql", ~options, ~expected="SQL conversion to succeed", sql => {
    expectTrue(sql->String.includes("CREATE TABLE \"users\""))
    expectTrue(sql->String.includes("VALUES (?, ?)"))
  })
})

test("E2E: toSql insertBatchSize groups rows into batched INSERT", () => {
  let fourRowsInput = (): JSON.t =>
    JSON.Encode.array([
      JSON.Encode.object(
        Dict.fromArray([("name", JSON.Encode.string("Alice")), ("age", JSON.Encode.float(30.0))]),
      ),
      JSON.Encode.object(
        Dict.fromArray([("name", JSON.Encode.string("Bob")), ("age", JSON.Encode.float(25.0))]),
      ),
      JSON.Encode.object(
        Dict.fromArray([("name", JSON.Encode.string("Carol")), ("age", JSON.Encode.float(28.0))]),
      ),
      JSON.Encode.object(
        Dict.fromArray([("name", JSON.Encode.string("Dave")), ("age", JSON.Encode.float(22.0))]),
      ),
    ])

  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Sql,
    formatOptions: SqlOptions({...Defaults.defaultSqlOptions, tableName: "users", insertBatchSize: 2}),
  }

  expectConverted(~input=fourRowsInput(), ~format="sql", ~options, ~expected="SQL batch conversion to succeed", sql => {
    let insertCount = sql->String.split("INSERT INTO")->Array.length - 1
    expectIntEqual(2, insertCount)
    expectTrue(sql->String.includes("'Alice'") && sql->String.includes("'Bob'"))
  })
})

test("E2E: toYaml emits yaml list format", () => {
  expectConverted(~input=arrayOfArraysInput(), ~format="yaml", ~expected="YAML conversion to succeed", yaml => {
    expectTrue(yaml->String.includes("- name: Alice"))
    expectTrue(yaml->String.includes("  age: 30"))
  })
})

test("E2E: convert unknown output format returns FormatError", () => {
  convert(~input=arrayOfArraysInput(), ~format="xml")
  ->expectErrorCategory(~category=TablyfulError.FormatError)
})

test("E2E: convert invalid scalar shape returns ParseError", () => {
  convert(~input=JSON.Encode.float(42.0), ~format="csv")
  ->expectErrorCategory(~category=TablyfulError.ParseError)
})

test("E2E: options CSV includeHeaders=false omits header row", () => {
  let options: Types.t = {
    ...Defaults.t,
    formatOptions: CsvOptions({...Defaults.defaultCsvOptions, includeHeaders: false}),
  }

  expectConverted(
    ~input=arrayOfArraysInput(),
    ~format="csv",
    ~options,
    ~expected="CSV conversion to succeed with includeHeaders=false",
    csv => {
      expectTrue(!(csv->String.includes("name,age")))
      expectTrue(csv->String.includes("Alice,30"))
    },
  )
})

test("E2E: options hasRowNumbers adds row number column", () => {
  let options: Types.t = {
    ...Defaults.t,
    hasRowNumbers: true,
    rowNumberHeader: "#",
  }

  expectConverted(
    ~input=arrayOfArraysInput(),
    ~format="csv",
    ~options,
    ~expected="CSV conversion to succeed with hasRowNumbers=true",
    csv => {
      expectTrue(csv->String.includes("#,name,age"))
      expectTrue(csv->String.includes("1,Alice,30"))
    },
  )
})
