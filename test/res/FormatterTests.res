open Test
open Assertions
open TestHelpers

let parseTable = (~input: JSON.t, ~options: Types.t=Defaults.t): Common.result<TableData.t> => {
  ParserRegistry.parse(input, options)
}

let formatTable = (
  ~input: JSON.t,
  ~format: string,
  ~options: Types.t=Defaults.t,
): Common.result<string> => {
  parseTable(~input, ~options)->Result.flatMap(table => FormatterRegistry.format(format, table, options))
}

let expectFormatOk = (
  ~input: JSON.t,
  ~format: string,
  ~expected: string,
  ~options: Types.t=Defaults.t,
  assertOutput: string => unit,
): unit => {
  expectOk(formatTable(~input, ~format, ~options), ~expected, ~assertOk=assertOutput)
}

let sampleArrayOfObjects = (): JSON.t =>
  JSON.Encode.array([
    JSON.Encode.object(
      Dict.fromArray([
        ("name", JSON.Encode.string("Alice")),
        ("age", JSON.Encode.float(30.0)),
      ]),
    ),
  ])

test("Formatter: csv escapes commas and quotes", () => {
  let input =
    JSON.Encode.array([
      JSON.Encode.object(
        Dict.fromArray([
          ("name", JSON.Encode.string("Smith, \"John\"")),
          ("age", JSON.Encode.float(30.0)),
        ]),
      ),
    ])

  expectFormatOk(~input, ~format="csv", ~expected="CSV formatter success", csv => {
    expectTrue(csv->String.includes("\"Smith, \\\"John\\\"\""))
  })
})

test("Formatter: csv uses actual newline separator", () => {
  expectFormatOk(~input=sampleArrayOfObjects(), ~format="csv", ~expected="CSV newline formatter success", csv => {
    expectTrue(csv->String.includes("\n"))
    expectTrue(!(csv->String.includes("\\n")))
  })
})

test("Formatter: html escapes special characters", () => {
  let input =
    JSON.Encode.array([
      JSON.Encode.object(Dict.fromArray([("name", JSON.Encode.string("<a href=\"x\">A & B</a>"))])),
    ])

  expectFormatOk(~input, ~format="html", ~expected="HTML formatter success", html => {
    expectTrue(html->String.includes("&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;"))
  })
})

test("Formatter: latex escapes control characters", () => {
  let input =
    JSON.Encode.array([
      JSON.Encode.object(Dict.fromArray([("text", JSON.Encode.string("A&B_%$#{}~^\\"))])),
    ])

  expectFormatOk(~input, ~format="latex", ~expected="LaTeX formatter success", latex => {
    expectTrue(
      latex
      ->String.includes(
          "A\\&B\\_\\%\\$\\#\\{\\}\\textasciitilde{}\\textasciicircum{}\\textbackslash\\{\\}",
        ),
    )
  })
})

test("Formatter: yaml quotes values that require quoting", () => {
  let input =
    JSON.Encode.array([
      JSON.Encode.object(Dict.fromArray([("note", JSON.Encode.string("alpha: beta #tag"))])),
    ])

  expectFormatOk(~input, ~format="yaml", ~expected="YAML formatter success", yaml => {
    expectTrue(yaml->String.includes("'alpha: beta #tag'"))
  })
})

test("Formatter: yaml escapes single quotes", () => {
  let input =
    JSON.Encode.array([
      JSON.Encode.object(Dict.fromArray([("note", JSON.Encode.string("it's fine"))])),
    ])
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Yaml,
    formatOptions: YamlOptions({...Defaults.defaultYamlOptions, quoteStrings: true}),
  }

  expectFormatOk(~input, ~format="yaml", ~options, ~expected="YAML quoted formatter success", yaml => {
    expectTrue(yaml->String.includes("'it''s fine'"))
  })
})

test("Formatter: sql emits escaped literals", () => {
  let input =
    JSON.Encode.array([
      JSON.Encode.object(
        Dict.fromArray([
          ("name", JSON.Encode.string("O'Brien")),
          ("active", JSON.Encode.bool(true)),
          ("score", JSON.Encode.null),
        ]),
      ),
    ])
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Sql,
    formatOptions: SqlOptions({...Defaults.defaultSqlOptions, tableName: "users"}),
  }

  expectFormatOk(~input, ~format="sql", ~options, ~expected="SQL formatter success", sql => {
    expectTrue(sql->String.includes("'O''Brien'"))
    expectTrue(sql->String.includes("TRUE"))
    expectTrue(sql->String.includes("NULL"))
  })
})

test("Formatter: json supports compact output", () => {
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Json,
    formatOptions: JsonOptions({...Defaults.defaultJsonOptions, pretty: false}),
  }

  expectFormatOk(
    ~input=sampleArrayOfObjects(),
    ~format="json",
    ~options,
    ~expected="JSON formatter success",
    json => {
      expectTrue(!(json->String.includes("\n  ")))
    },
  )
})

test("Formatter: markdown supports centered alignment", () => {
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Markdown,
    formatOptions: MarkdownOptions({...Defaults.defaultMarkdownOptions, align: "center"}),
  }

  expectFormatOk(
    ~input=sampleArrayOfObjects(),
    ~format="markdown",
    ~options,
    ~expected="Markdown formatter success",
    markdown => {
      expectTrue(markdown->String.match(%re("/:[-]+:/"))->Option.isSome)
    },
  )
})

test("Formatter: ndjson emits one object per line", () => {
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Ndjson,
    formatOptions: NdjsonOptions(Defaults.defaultNdjsonOptions),
  }

  expectFormatOk(
    ~input=sampleArrayOfObjects(),
    ~format="ndjson",
    ~options,
    ~expected="NDJSON formatter success",
    ndjson => {
      let lines = ndjson->String.split("\n")
      expectIntEqual(1, lines->Array.length)
      expectTrue(lines->Array.getUnsafe(0)->String.includes("\"name\":\"Alice\""))
      expectTrue(lines->Array.getUnsafe(0)->String.includes("\"age\":30"))
    },
  )
})
