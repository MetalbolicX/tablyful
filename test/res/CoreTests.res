open Test

let makeArrayOfArraysInput = (): JSON.t =>
  JSON.Encode.array([
    JSON.Encode.array([JSON.Encode.string("name"), JSON.Encode.string("age")]),
    JSON.Encode.array([JSON.Encode.string("Alice"), JSON.Encode.float(30.0)]),
    JSON.Encode.array([JSON.Encode.string("Bob"), JSON.Encode.float(25.0)]),
  ])

test("Core Position: make creates empty position", () => {
  let pos = Position.make()
  assertion((left, right) => left == right, pos.row, None, ~operator="equals")
  assertion((left, right) => left == right, pos.column, None, ~operator="equals")
  assertion((left, right) => left == right, pos.path, [], ~operator="equals")
})

test("Core Position: modifiers update context", () => {
  let pos =
    Position.make()
    ->Position.atRow(2)
    ->Position.atColumn(4)
    ->Position.addPath("users")

  assertion((left, right) => left == right, pos.row, Some(2), ~operator="equals")
  assertion((left, right) => left == right, pos.column, Some(4), ~operator="equals")
  assertion((left, right) => left == right, pos.path, ["users"], ~operator="equals")
})

test("Core TablyfulError: parseError builds parse category", () => {
  let error = TablyfulError.parseError("invalid input")
  assertion(
    (left, right) => left == right,
    error.category,
    TablyfulError.ParseError,
    ~operator="equals",
  )
  assertion((left, right) => left == right, error.message, "invalid input", ~operator="equals")
})

test("Core TablyfulError: withSuggestion augments error", () => {
  let error =
    TablyfulError.validationError("missing field")->TablyfulError.withSuggestion("check headers")
  assertion(
    (left, right) => left == right,
    error.suggestion,
    Some("check headers"),
    ~operator="equals",
  )
})

test("Tablyful API: detectFormat recognizes array_of_arrays", () => {
  let format = Tablyful.detectFormat(makeArrayOfArraysInput())
  assertion((left, right) => left == right, format, "array_of_arrays", ~operator="equals")
})

test("Tablyful API: availableParsers exposes builtins", () => {
  let parsers = Tablyful.availableParsers()
  assertion(
    (left, right) => left == right,
    parsers->Array.includes("array-of-arrays"),
    true,
    ~operator="equals",
  )
  assertion(
    (left, right) => left == right,
    parsers->Array.includes("array-of-objects"),
    true,
    ~operator="equals",
  )
})

test("Tablyful API: toCsv converts matrix input", () => {
  switch Tablyful.toCsv(~input=makeArrayOfArraysInput()) {
  | Ok(csv) =>
    assertion(
      (left, right) => left == right,
      csv->String.includes("name,age"),
      true,
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
      ~message="Expected conversion to succeed",
    )
  }
})

test("Tablyful API: toJson converts matrix input", () => {
  switch Tablyful.toJson(~input=makeArrayOfArraysInput()) {
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
      ~message="Expected conversion to succeed",
    )
  }
})
