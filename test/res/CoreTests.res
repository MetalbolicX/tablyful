open Test
open Assertions
open TestHelpers

let makeArrayOfArraysInput = (): JSON.t =>
  JSON.Encode.array([
    JSON.Encode.array([JSON.Encode.string("name"), JSON.Encode.string("age")]),
    JSON.Encode.array([JSON.Encode.string("Alice"), JSON.Encode.float(30.0)]),
    JSON.Encode.array([JSON.Encode.string("Bob"), JSON.Encode.float(25.0)]),
  ])

let convert = (~input: JSON.t, ~format: string, ~options: Types.t=Defaults.t): Common.result<string> => {
  ParserRegistry.parse(input, options)
  ->Result.flatMap(tableData => FormatterRegistry.format(format, tableData, options))
}

let expectConverted = (
  ~format: string,
  ~options: Types.t=Defaults.t,
  ~expected: string,
  assertOutput: string => unit,
): unit => {
  expectOk(convert(~input=makeArrayOfArraysInput(), ~format, ~options), ~expected, ~assertOk=assertOutput)
}

test("Core: Position make creates empty position", () => {
  let pos = Position.make()
  assertion((left, right) => left == right, pos.row, None, ~operator="equals")
  assertion((left, right) => left == right, pos.column, None, ~operator="equals")
  assertion((left, right) => left == right, pos.path, [], ~operator="equals")
})

test("Core: Position modifiers update context", () => {
  let pos =
    Position.make()
    ->Position.atRow(2)
    ->Position.atColumn(4)
    ->Position.addPath("users")

  assertion((left, right) => left == right, pos.row, Some(2), ~operator="equals")
  assertion((left, right) => left == right, pos.column, Some(4), ~operator="equals")
  assertion((left, right) => left == right, pos.path, ["users"], ~operator="equals")
})

test("Core: TablyfulError parseError builds parse category", () => {
  let error = TablyfulError.parseError("invalid input")
  expectTrue(error.category == TablyfulError.ParseError)
  expectTextEqual("invalid input", error.message)
})

test("Core: TablyfulError withSuggestion augments error", () => {
  let error =
    TablyfulError.validationError("missing field")->TablyfulError.withSuggestion("check headers")
  assertion((left, right) => left == right, error.suggestion, Some("check headers"), ~operator="equals")
})

test("Core: pipeline detectFormat recognizes array_of_arrays", () => {
  let format = makeArrayOfArraysInput()->InputData.classify->InputData.shapeToString
  expectTextEqual("array_of_arrays", format)
})

test("Core: pipeline availableParsers exposes builtins", () => {
  let parsers = ParserRegistry.getNames()
  expectTrue(parsers->Array.includes("array-of-arrays"))
  expectTrue(parsers->Array.includes("array-of-objects"))
})

test("Core: pipeline csv conversion succeeds", () => {
  expectConverted(~format="csv", ~expected="CSV conversion to succeed", csv => {
    expectTrue(csv->String.includes("name,age"))
    expectTrue(csv->String.includes("Alice,30"))
  })
})

test("Core: pipeline tsv conversion succeeds", () => {
  expectConverted(~format="tsv", ~expected="TSV conversion to succeed", tsv => {
    expectTrue(tsv->String.includes("name\tage"))
    expectTrue(tsv->String.includes("Alice\t30"))
  })
})

test("Core: pipeline json conversion succeeds", () => {
  expectConverted(~format="json", ~expected="JSON conversion to succeed", json => {
    expectTrue(json->String.includes("Alice"))
    expectTrue(json->String.includes("25"))
  })
})

test("Core: pipeline sql conversion succeeds", () => {
  let options: Types.t = {
    ...Defaults.t,
    outputFormat: Sql,
    formatOptions: SqlOptions({...Defaults.defaultSqlOptions, tableName: "users", includeCreateTable: true}),
  }

  expectConverted(~format="sql", ~options, ~expected="SQL conversion to succeed", sql => {
    expectTrue(sql->String.includes("CREATE TABLE \"users\""))
    expectTrue(sql->String.includes("VALUES (?, ?)"))
  })
})

test("Core: pipeline yaml conversion succeeds", () => {
  expectConverted(~format="yaml", ~expected="YAML conversion to succeed", yaml => {
    expectTrue(yaml->String.includes("- name: Alice"))
    expectTrue(yaml->String.includes("  age: 30"))
  })
})
