open Test
open Assertions
open TestHelpers

let missingConfigPath = "/tmp/tablyful-cli-options-tests-missing.json"

let baseFlags = (
  ~formatArg: option<string>=None,
  ~setPairs: array<(string, string)>=[],
  ~delimiterArg: option<string>=None,
  ~configPath: option<string>=Some(missingConfigPath),
  ~noHeaders: bool=false,
  (),
): CliOptions.flags => {
  formatArg,
  inputArg: None,
  outputPath: None,
  setPairs,
  columnsArg: None,
  filterExprs: [],
  delimiterArg,
  maxFileSizeBytes: 1024,
  configPath,
  noHeaders,
  stats: false,
  stream: None,
}

let expectValidationErrorContains = (result: Common.result<'a>, ~contains: string): unit => {
  switch result {
  | Ok(_) => failTest(`Expected validation error containing ${contains}`)
  | Error(error) => {
      expectTrue(error.category == TablyfulError.ValidationError)
      expectTrue(error.message->String.toLowerCase->String.includes(contains->String.toLowerCase))
    }
  }
}

let expectResolved = (
  ~formatArg: string,
  ~setPairs: array<(string, string)>=[],
  ~assertResolved: Types.t => unit,
): unit => {
  CliOptions.resolveOptions(baseFlags(~formatArg=Some(formatArg), ~setPairs, ()))
  ->expectOk(~expected=`${formatArg} options to resolve`, ~assertOk=assertResolved)
}

test("CliOptions: parseSetPairs accepts a single pair", () => {
  CliOptions.parseSetPairs(Some(["csv.delimiter=;"]))->expectOk(~expected="single set pair", ~assertOk=pairs => {
    expectIntEqual(1, pairs->Array.length)
    let (key, value) = pairs->Array.getUnsafe(0)
    expectTextEqual("csv.delimiter", key)
    expectTextEqual(";", value)
  })
})

test("CliOptions: parseSetPairs preserves multiple ordered pairs", () => {
  CliOptions.parseSetPairs(Some(["csv.delimiter=;", "json.pretty=false"]))->expectOk(
    ~expected="multiple set pairs",
    ~assertOk=pairs => {
      expectIntEqual(2, pairs->Array.length)
      let (firstKey, firstValue) = pairs->Array.getUnsafe(0)
      let (secondKey, secondValue) = pairs->Array.getUnsafe(1)
      expectTextEqual("csv.delimiter", firstKey)
      expectTextEqual(";", firstValue)
      expectTextEqual("json.pretty", secondKey)
      expectTextEqual("false", secondValue)
    },
  )
})

test("CliOptions: parseSetPairs rejects entries without an equals sign", () => {
  CliOptions.parseSetPairs(Some(["csv.delimiter"]))->expectValidationErrorContains(~contains="Invalid --set value")
})

test("CliOptions: parseSetPairs rejects entries with an empty key", () => {
  CliOptions.parseSetPairs(Some(["=false"]))->expectValidationErrorContains(~contains="Invalid --set value")
})

test("CliOptions: parseSetPairs rejects entries with an empty value", () => {
  CliOptions.parseSetPairs(Some(["csv.delimiter="]))->expectValidationErrorContains(~contains="Invalid --set value")
})

test("CliOptions: parseColumnsArg trims names and removes empty segments", () => {
  CliOptions.parseColumnsArg(Some(" name , , age , city "))->expectOk(
    ~expected="trimmed columns",
    ~assertOk=columnsOption => {
      switch columnsOption {
      | Some(columns) => {
          expectIntEqual(3, columns->Array.length)
          expectTextEqual("name", columns->Array.getUnsafe(0))
          expectTextEqual("age", columns->Array.getUnsafe(1))
          expectTextEqual("city", columns->Array.getUnsafe(2))
        }
      | None => failTest("Expected Some(columns)")
      }
    },
  )
})

test("CliOptions: parseColumnsArg fails when no valid columns remain", () => {
  CliOptions.parseColumnsArg(Some(" ,  , "))->expectValidationErrorContains(~contains="Invalid --columns value")
})

test("CliOptions: parseFilterExprs trims each filter expression", () => {
  CliOptions.parseFilterExprs(Some([" status = active ", " age > 21 "]))->expectOk(
    ~expected="trimmed filters",
    ~assertOk=filters => {
      expectIntEqual(2, filters->Array.length)
      expectTextEqual("status = active", filters->Array.getUnsafe(0))
      expectTextEqual("age > 21", filters->Array.getUnsafe(1))
    },
  )
})

test("CliOptions: parseFilterExprs fails on empty expressions", () => {
  CliOptions.parseFilterExprs(Some(["status = active", "   "]))->expectValidationErrorContains(
    ~contains="Invalid --filter value",
  )
})

test("CliOptions: resolveOptions applies representative CSV overrides", () => {
  expectResolved(
    ~formatArg="csv",
    ~setPairs=[("csv.includeHeaders", "false"), ("csv.delimiter", ";")],
    ~assertResolved=options => {
      expectTrue(options.outputFormat == Csv)
      switch options.formatOptions {
      | CsvOptions(csv) => {
          expectTextEqual(";", csv.delimiter)
          expectTrue(!csv.includeHeaders)
        }
      | _ => failTest("Expected CsvOptions")
      }
    },
  )
})

test("CliOptions: resolveOptions applies representative JSON overrides", () => {
  expectResolved(
    ~formatArg="json",
    ~setPairs=[("json.pretty", "false"), ("json.indentSize", "4")],
    ~assertResolved=options => {
      expectTrue(options.outputFormat == Json)
      switch options.formatOptions {
      | JsonOptions(json) => {
          expectTrue(!json.pretty)
          expectIntEqual(4, json.indentSize)
        }
      | _ => failTest("Expected JsonOptions")
      }
    },
  )
})

test("CliOptions: resolveOptions applies representative SQL overrides", () => {
  expectResolved(
    ~formatArg="sql",
    ~setPairs=[
      ("sql.tableName", "users"),
      ("sql.includeCreateTable", "true"),
      ("sql.insertBatchSize", "50"),
    ],
    ~assertResolved=options => {
      expectTrue(options.outputFormat == Sql)
      switch options.formatOptions {
      | SqlOptions(sql) => {
          expectTextEqual("users", sql.tableName)
          expectTrue(sql.includeCreateTable)
          expectIntEqual(50, sql.insertBatchSize)
        }
      | _ => failTest("Expected SqlOptions")
      }
    },
  )
})

test("CliOptions: resolveOptions rejects malformed boolean overrides", () => {
  CliOptions.resolveOptions(
    baseFlags(~formatArg=Some("csv"), ~setPairs=[("csv.includeHeaders", "maybe")], ()),
  )->expectValidationErrorContains(~contains="Invalid boolean")
})

test("CliOptions: resolveOptions rejects malformed integer overrides", () => {
  CliOptions.resolveOptions(
    baseFlags(~formatArg=Some("json"), ~setPairs=[("json.indentSize", "abc")], ()),
  )->expectValidationErrorContains(~contains="Invalid integer")
})

test("CliOptions: resolveOptions rejects zero numeric SQL overrides", () => {
  CliOptions.resolveOptions(
    baseFlags(~formatArg=Some("sql"), ~setPairs=[("sql.insertBatchSize", "0")], ()),
  )->expectValidationErrorContains(~contains="greater than 0")
})

test("CliOptions: resolveOptions rejects unknown override keys", () => {
  CliOptions.resolveOptions(
    baseFlags(~formatArg=Some("json"), ~setPairs=[("json.unknownOption", "true")], ()),
  )->expectValidationErrorContains(~contains="Unknown --set option")
})
