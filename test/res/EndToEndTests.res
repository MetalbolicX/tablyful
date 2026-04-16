open Test

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

test("E2E detectFormat: array_of_arrays", () => {
  let format = arrayOfArraysInput()->InputData.classify->InputData.shapeToString
  assertion((left, right) => left == right, format, "array_of_arrays", ~operator="equals")
})

test("E2E detectFormat: array_of_objects", () => {
  let format = arrayOfObjectsInput()->InputData.classify->InputData.shapeToString
  assertion((left, right) => left == right, format, "array_of_objects", ~operator="equals")
})

test("E2E detectFormat: object_of_arrays", () => {
  let format = objectOfArraysInput()->InputData.classify->InputData.shapeToString
  assertion((left, right) => left == right, format, "object_of_arrays", ~operator="equals")
})

test("E2E detectFormat: object_of_objects", () => {
  let format = objectOfObjectsInput()->InputData.classify->InputData.shapeToString
  assertion((left, right) => left == right, format, "object_of_objects", ~operator="equals")
})

test("E2E toCsv: handles all supported input shapes", () => {
  let inputs = [
    arrayOfArraysInput(),
    arrayOfObjectsInput(),
    objectOfArraysInput(),
    objectOfObjectsInput(),
  ]

  inputs->Array.forEach(input => {
    switch convert(~input, ~format="csv") {
    | Ok(csv) =>
      assertion(
        (left, right) => left == right,
        csv->String.includes("Alice"),
        true,
        ~operator="equals",
      )
      assertion(
        (left, right) => left == right,
        csv->String.includes("30"),
        true,
        ~operator="equals",
      )
    | Error(error) =>
      assertion(
        (left, right) => left == right,
        error->TablyfulError.toString->String.includes(""),
        false,
        ~operator="equals",
        ~message="Expected CSV conversion to succeed",
      )
    }
  })
})

test("E2E toTsv: emits tab-delimited output", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="tsv") {
  | Ok(tsv) =>
    assertion((left, right) => left == right, tsv->String.includes("name\tage"), true, ~operator="equals")
    assertion((left, right) => left == right, tsv->String.includes("Alice\t30"), true, ~operator="equals")
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected TSV conversion to succeed",
    )
  }
})

test("E2E toPsv: emits pipe-delimited output", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="psv") {
  | Ok(psv) =>
    assertion((left, right) => left == right, psv->String.includes("name|age"), true, ~operator="equals")
    assertion((left, right) => left == right, psv->String.includes("Alice|30"), true, ~operator="equals")
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected PSV conversion to succeed",
    )
  }
})

test("E2E toJson: converts and includes expected fields", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="json") {
  | Ok(json) =>
    assertion(
      (left, right) => left == right,
      json->String.includes("Alice"),
      true,
      ~operator="equals",
    )
    assertion((left, right) => left == right, json->String.includes("25"), true, ~operator="equals")
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected JSON conversion to succeed",
    )
  }
})

test("E2E toMarkdown: renders table separators", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="markdown") {
  | Ok(markdown) =>
    assertion(
      (left, right) => left == right,
      markdown->String.includes("| name"),
      true,
      ~operator="equals",
    )
    assertion(
      (left, right) => left == right,
      markdown->String.includes("---"),
      true,
      ~operator="equals",
    )
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected Markdown conversion to succeed",
    )
  }
})

test("E2E toHtml: emits table markup", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="html") {
  | Ok(html) =>
    assertion((left, right) => left == right, html->String.includes("<table"), true, ~operator="equals")
    assertion(
      (left, right) => left == right,
      html->String.includes("<th>name</th>"),
      true,
      ~operator="equals",
    )
    assertion(
      (left, right) => left == right,
      html->String.includes("<td>Alice</td>"),
      true,
      ~operator="equals",
    )
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected HTML conversion to succeed",
    )
  }
})

test("E2E toLatex: emits tabular environment", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="latex") {
  | Ok(latex) =>
    assertion(
      (left, right) => left == right,
      latex->String.includes("\\begin{tabular}"),
      true,
      ~operator="equals",
    )
    assertion(
      (left, right) => left == right,
      latex->String.includes("name & age"),
      true,
      ~operator="equals",
    )
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected LaTeX conversion to succeed",
    )
  }
})

test("E2E toSql: emits insert placeholders", () => {
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Sql,
    formatOptions: SqlOptions({...Defaults.defaultSqlOptions, tableName: "users", includeCreateTable: true}),
  }

  switch convert(~input=arrayOfArraysInput(), ~format="sql", ~options) {
  | Ok(sql) =>
    assertion(
      (left, right) => left == right,
      sql->String.includes("CREATE TABLE \"users\""),
      true,
      ~operator="equals",
    )
    assertion(
      (left, right) => left == right,
      sql->String.includes("VALUES (?, ?)"),
      true,
      ~operator="equals",
    )
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected SQL conversion to succeed",
    )
  }
})

test("E2E toYaml: emits yaml list format", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="yaml") {
  | Ok(yaml) =>
    assertion((left, right) => left == right, yaml->String.includes("- name: Alice"), true, ~operator="equals")
    assertion((left, right) => left == right, yaml->String.includes("  age: 30"), true, ~operator="equals")
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected YAML conversion to succeed",
    )
  }
})

test("E2E convert: unknown output format returns FormatError", () => {
  switch convert(~input=arrayOfArraysInput(), ~format="xml") {
  | Ok(_) =>
    assertion((left, right) => left == right, true, false, ~operator="equals")
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error.category,
      TablyfulError.FormatError,
      ~operator="equals",
    )
  }
})

test("E2E convert: invalid scalar shape returns ParseError", () => {
  switch convert(~input=JSON.Encode.float(42.0), ~format="csv") {
  | Ok(_) => assertion((left, right) => left == right, true, false, ~operator="equals")
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error.category,
      TablyfulError.ParseError,
      ~operator="equals",
    )
  }
})

test("E2E options: CSV includeHeaders=false omits header row", () => {
  let options: Types.t = {
    ...Defaults.t,
    formatOptions: CsvOptions({...Defaults.defaultCsvOptions, includeHeaders: false}),
  }

  switch convert(~input=arrayOfArraysInput(), ~format="csv", ~options) {
  | Ok(csv) =>
    assertion(
      (left, right) => left == right,
      csv->String.includes("name,age"),
      false,
      ~operator="equals",
    )
    assertion(
      (left, right) => left == right,
      csv->String.includes("Alice,30"),
      true,
      ~operator="equals",
    )
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected CSV conversion to succeed with includeHeaders=false",
    )
  }
})

test("E2E options: hasRowNumbers adds row number column", () => {
  let options: Types.t = {
    ...Defaults.t,
    hasRowNumbers: true,
    rowNumberHeader: "#",
  }

  switch convert(~input=arrayOfArraysInput(), ~format="csv", ~options) {
  | Ok(csv) =>
    assertion(
      (left, right) => left == right,
      csv->String.includes("#,name,age"),
      true,
      ~operator="equals",
    )
    assertion(
      (left, right) => left == right,
      csv->String.includes("1,Alice,30"),
      true,
      ~operator="equals",
    )
  | Error(error) =>
    assertion(
      (left, right) => left == right,
      error->TablyfulError.toString->String.includes(""),
      false,
      ~operator="equals",
      ~message="Expected CSV conversion to succeed with hasRowNumbers=true",
    )
  }
})
