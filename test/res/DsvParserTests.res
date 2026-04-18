open Test

test("DsvParser: strips UTF-8 BOM", () => {
  let input = "\u{feff}name,age\nAlice,30\n"
  let parsed = DsvParser.parse(input, ~delimiter=",")

  assertion((left, right) => left == right, parsed.headers->Array.length, 2, ~operator="equals")
  assertion((left, right) => left == right, parsed.headers->Array.getUnsafe(0), "name", ~operator="equals")
  assertion((left, right) => left == right, parsed.rows->Array.length, 1, ~operator="equals")
  assertion(
    (left, right) => left == right,
    parsed.rows->Array.getUnsafe(0)->Array.getUnsafe(0),
    "Alice",
    ~operator="equals",
  )
})

test("DsvParser: handles embedded newlines in quoted fields", () => {
  let input = "name,bio\nAlice,\"Line 1\nLine 2\"\n"
  let parsed = DsvParser.parse(input, ~delimiter=",")

  assertion((left, right) => left == right, parsed.rows->Array.length, 1, ~operator="equals")
  assertion(
    (left, right) => left == right,
    parsed.rows->Array.getUnsafe(0)->Array.getUnsafe(1),
    "Line 1\nLine 2",
    ~operator="equals",
  )
})

test("DsvParser: handles escaped quotes", () => {
  let input = "name,bio\nAlice,\"He said \"\"hi\"\"\"\n"
  let parsed = DsvParser.parse(input, ~delimiter=",")

  assertion(
    (left, right) => left == right,
    parsed.rows->Array.getUnsafe(0)->Array.getUnsafe(1),
    "He said \"hi\"",
    ~operator="equals",
  )
})

test("DsvParser: supports CRLF newlines", () => {
  let input = "name,age\r\nAlice,30\r\nBob,25\r\n"
  let parsed = DsvParser.parse(input, ~delimiter=",")

  assertion((left, right) => left == right, parsed.rows->Array.length, 2, ~operator="equals")
  assertion(
    (left, right) => left == right,
    parsed.rows->Array.getUnsafe(1)->Array.getUnsafe(0),
    "Bob",
    ~operator="equals",
  )
})

test("DsvParser: handles single-column input", () => {
  let input = "name\nAlice\nBob\n"
  let parsed = DsvParser.parse(input, ~delimiter=",")

  assertion((left, right) => left == right, parsed.headers->Array.length, 1, ~operator="equals")
  assertion((left, right) => left == right, parsed.rows->Array.length, 2, ~operator="equals")
  assertion(
    (left, right) => left == right,
    parsed.rows->Array.getUnsafe(0)->Array.getUnsafe(0),
    "Alice",
    ~operator="equals",
  )
})
