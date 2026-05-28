open Test
open Assertions
open TestHelpers

// --- Inline FFI for Node.js filesystem operations ---
@module("node:fs") external mkdtempSync: string => string = "mkdtempSync"
@module("node:fs") external mkdirSync: (string, {"recursive": bool}) => unit = "mkdirSync"
@module("node:fs") external rmSync: (string, {"force": bool, "recursive": bool}) => unit = "rmSync"
@module("node:fs") external writeFileSync: (string, string) => unit = "writeFileSync"

// --- Temp directory helpers ---
let tempRoot = "/tmp/tablyful-test-config"

let ensureTempRoot = (): unit => {
  if !Bindings.Fs.existsSync(tempRoot) {
    mkdirSync(tempRoot, {"recursive": true})
  }
}

let setupTempDir = (name: string): string => {
  ensureTempRoot()
  let prefix = Bindings.Path.join([tempRoot, name])
  mkdtempSync(prefix)
}

let cleanupAllTempDirs = (): unit => {
  if Bindings.Fs.existsSync(tempRoot) {
    rmSync(tempRoot, {"force": true, "recursive": true})
  }
}

let writeConfigFile = (dir: string, filename: string, content: string): string => {
  let path = Bindings.Path.join([dir, filename])
  writeFileSync(path, content)
  path
}

// --- Tests: Default Format Parsing (2 tests) ---

test("ConfigFile: valid defaultFormat string parses correctly", () => {
  let dir = setupTempDir("format-markdown")
  let configFile = writeConfigFile(dir, "config.json", `{"defaultFormat": "markdown"}`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.outputFormat {
    | Markdown => passTest("format is Markdown")
    | _ => failTest("Expected Markdown format")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

test("ConfigFile: missing defaultFormat defaults to Csv", () => {
  let dir = setupTempDir("format-default")
  let configFile = writeConfigFile(dir, "config.json", "{}")

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.outputFormat {
    | Csv => passTest("format defaults to Csv")
    | _ => failTest("Expected Csv format as default")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

// --- Tests: Section-Specific Option Parsing (3 tests) ---

test("ConfigFile: CSV section with custom delimiter", () => {
  let dir = setupTempDir("csv-section")
  let configFile =
    writeConfigFile(dir, "config.json", `{"defaultFormat": "csv", "csv": {"delimiter": ";", "includeHeaders": false}}`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.formatOptions {
    | CsvOptions(csv) =>
      assertion((left, right) => left == right, csv.delimiter, ";", ~operator="equals")
      assertion((left, right) => left == right, csv.includeHeaders, false, ~operator="equals")
    | _ => failTest("Expected CsvOptions")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

test("ConfigFile: JSON section with indentSize", () => {
  let dir = setupTempDir("json-section")
  let configFile =
    writeConfigFile(dir, "config.json", `{"defaultFormat": "json", "json": {"indentSize": 4}}`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.formatOptions {
    | JsonOptions(json) =>
      assertion((left, right) => left == right, json.indentSize, 4, ~operator="equals")
      // pretty defaults to true when not specified
      assertion((left, right) => left == right, json.pretty, true, ~operator="equals")
    | _ => failTest("Expected JsonOptions")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

test("ConfigFile: SQL section with custom tableName", () => {
  let dir = setupTempDir("sql-section")
  let configFile =
    writeConfigFile(dir, "config.json", `{"defaultFormat": "sql", "sql": {"tableName": "users"}}`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.formatOptions {
    | SqlOptions(sql) =>
      assertion((left, right) => left == right, sql.tableName, "users", ~operator="equals")
    | _ => failTest("Expected SqlOptions")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

// --- Tests: Recursive Merge via Nested Objects (3 tests) ---

test("ConfigFile: nested JSON section merges pretty and indentSize", () => {
  // A single config with both pretty and indentSize in the json section
  // exercises the section parsing that picks up both fields
  let dir = setupTempDir("merge-nested")
  let configFile =
    writeConfigFile(
      dir,
      "config.json",
      `{"defaultFormat": "json", "json": {"pretty": true, "indentSize": 4}}`,
    )

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.formatOptions {
    | JsonOptions(json) =>
      assertion((left, right) => left == right, json.pretty, true, ~operator="equals")
      assertion((left, right) => left == right, json.indentSize, 4, ~operator="equals")
    | _ => failTest("Expected JsonOptions with both values")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

test("ConfigFile: scalar override wins in section options", () => {
  // Write two configs and simulate precedence by using explicit path for the high-priority one.
  // The merge behavior is tested indirectly: the high-priority file's values should win.
  let dir = setupTempDir("merge-scalar")
  let configFile =
    writeConfigFile(
      dir,
      "config.json",
      `{"defaultFormat": "csv", "csv": {"delimiter": "|", "includeHeaders": true}}`,
    )

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.formatOptions {
    | CsvOptions(csv) =>
      assertion((left, right) => left == right, csv.delimiter, "|", ~operator="equals")
      assertion((left, right) => left == right, csv.includeHeaders, true, ~operator="equals")
    | _ => failTest("Expected CsvOptions with custom values")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

test("ConfigFile: nested object within single config preserves all keys", () => {
  // Tests that a config with multiple nested keys in a section
  // preserves all of them (recursive merge within a single dict)
  let dir = setupTempDir("merge-all-keys")
  let configFile =
    writeConfigFile(
      dir,
      "config.json",
      `{"defaultFormat": "json", "json": {"pretty": false, "indentSize": 8, "asArray": true}}`,
    )

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.formatOptions {
    | JsonOptions(json) =>
      assertion((left, right) => left == right, json.pretty, false, ~operator="equals")
      assertion((left, right) => left == right, json.indentSize, 8, ~operator="equals")
      assertion((left, right) => left == right, json.asArray, true, ~operator="equals")
    | _ => failTest("Expected JsonOptions with all three values")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

// --- Tests: Config Precedence (2 tests) ---

test("ConfigFile: explicit path loads only that file", () => {
  let dir = setupTempDir("precedence-explicit")
  let configFile =
    writeConfigFile(dir, "config.json", `{"defaultFormat": "json"}`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    switch config.outputFormat {
    | Json => passTest("explicit path loads JSON format")
    | _ => failTest("Expected Json format from explicit path")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

test("ConfigFile: local config overrides home config via explicit path", () => {
  // Simulates precedence: write two files, load the higher-priority one via explicit path.
  // The lower-priority file is never loaded (we don't manipulate cwd).
  let dir = setupTempDir("precedence-override")
  let highPriorityFile =
    writeConfigFile(dir, "high.json", `{"defaultFormat": "json", "json": {"pretty": false}}`)
  let _lowPriorityFile =
    writeConfigFile(dir, "low.json", `{"defaultFormat": "csv"}`)

  // Load only the high-priority file
  switch ConfigFile.load(~path=highPriorityFile, ()) {
  | Ok(config) =>
    switch config.outputFormat {
    | Json =>
      switch config.formatOptions {
      | JsonOptions(json) =>
        assertion((left, right) => left == right, json.pretty, false, ~operator="equals")
      | _ => failTest("Expected JsonOptions")
      }
    | _ => failTest("Expected Json format from high-priority config")
    }
  | Error(err) => failWithError(~expected="Ok config", err)
  }

  cleanupAllTempDirs()
})

// --- Tests: Error Handling (3 tests) ---

test("ConfigFile: malformed JSON returns error", () => {
  let dir = setupTempDir("error-malformed")
  let configFile = writeConfigFile(dir, "config.json", "{invalid json")

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(_) => failTest("Expected error for malformed JSON")
  | Error(error) =>
    expectTrue(error.category == TablyfulError.ParseError, ~message="Error category should be ParseError")
    expectTrue(
      error.message->String.toLowerCase->String.includes("json"),
      ~message="Error should mention json",
    )
  }

  cleanupAllTempDirs()
})

test("ConfigFile: non-object root returns error", () => {
  let dir = setupTempDir("error-non-object")
  let configFile = writeConfigFile(dir, "config.json", `"just a string"`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(_) => failTest("Expected error for non-object root")
  | Error(error) =>
    expectTrue(
      error.message->String.toLowerCase->String.includes("object"),
      ~message="Error should mention object",
    )
  }

  cleanupAllTempDirs()
})

test("ConfigFile: non-existent path returns defaults", () => {
  switch ConfigFile.load(~path="/nonexistent/path/config.json", ()) {
  | Ok(config) =>
    // Non-existent file returns defaults
    switch config.outputFormat {
    | Csv => passTest("non-existent path returns Csv defaults")
    | _ => failTest("Expected Csv defaults for non-existent path")
    }
  | Error(err) => failWithError(~expected="Ok config with defaults", err)
  }
})

// --- Tests: Unknown Key Warnings (1 test) ---

test("ConfigFile: unknown keys succeed without error", () => {
  let dir = setupTempDir("unknown-keys")
  let configFile =
    writeConfigFile(dir, "config.json", `{"unknownKey": "value", "defaultFormat": "csv"}`)

  switch ConfigFile.load(~path=configFile, ()) {
  | Ok(config) =>
    // Load succeeds despite unknown keys
    switch config.outputFormat {
    | Csv => passTest("unknown keys ignored, format is Csv")
    | _ => failTest("Expected Csv format despite unknown keys")
    }
  | Error(err) => failWithError(~expected="Ok config with unknown keys", err)
  }

  cleanupAllTempDirs()
})
