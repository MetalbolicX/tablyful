import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const cliPath = new URL("../dist/cli.mjs", import.meta.url).pathname;

const runCli = ({ args = [], input, cwd } = {}) => {
  const result = spawnSync("node", [cliPath, ...args], {
    input,
    encoding: "utf8",
    cwd,
  });

  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const sampleArrayOfArrays = JSON.stringify([
  ["name", "age"],
  ["Alice", 30],
  ["Bob", 25],
]);

const sampleArrayOfObjects = JSON.stringify([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);

test("cli --help prints usage and exits 0", () => {
  const result = runCli({ args: ["--help"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Usage: tablyful \[options\] \[file\]/);
  assert.match(result.stdout, /--format <format>/);
});

test("cli --version prints version and exits 0", () => {
  const result = runCli({ args: ["--version"] });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "1.0.0");
});

test("cli stdin to csv", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("cli stdin to tsv", () => {
  const result = runCli({
    args: ["--format", "tsv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name\tage/);
  assert.match(result.stdout, /Alice\t30/);
});

test("cli stdin to psv", () => {
  const result = runCli({
    args: ["--format", "psv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name\|age/);
  assert.match(result.stdout, /Alice\|30/);
});

test("cli stdin to json", () => {
  const result = runCli({
    args: ["--format", "json"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed[0].name, "Alice");
});

test("cli stdin to markdown", () => {
  const result = runCli({
    args: ["--format", "markdown"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /\|\s*name\s*\|/);
  assert.match(result.stdout, /---/);
});

test("cli stdin to html", () => {
  const result = runCli({
    args: ["--format", "html"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /<table/);
  assert.match(result.stdout, /<td>Alice<\/td>/);
});

test("cli stdin to latex", () => {
  const result = runCli({
    args: ["--format", "latex"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /\\begin\{tabular\}/);
  assert.match(result.stdout, /Alice\s*&\s*30/);
});

test("cli stdin to sql", () => {
  const result = runCli({
    args: ["--format", "sql", "--set", "sql.tableName=users", "--set", "sql.includeCreateTable=true"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /CREATE TABLE "users"/);
  assert.match(result.stdout, /INSERT INTO "users"/);
  assert.match(result.stdout, /VALUES \(\?, \?\)/);
  assert.match(result.stdout, /-- VALUES: \('Alice', 30\)/);
});

test("cli stdin to yaml", () => {
  const result = runCli({
    args: ["--format", "yaml"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /- name: Alice/);
  assert.match(result.stdout, /  age: 30/);
});

test("cli --input forces array-of-objects parser", () => {
  const result = runCli({
    args: ["--format", "csv", "--input", "array-of-objects"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Alice/);
  assert.match(result.stdout, /30/);
});

test("cli --input wrong parser returns error code 1", () => {
  const result = runCli({
    args: ["--format", "csv", "--input", "array-of-arrays"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Table must have at least one header/);
});

test("cli --delimiter overrides csv delimiter", () => {
  const result = runCli({
    args: ["--format", "csv", "--delimiter", ";"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name;age/);
  assert.match(result.stdout, /Alice;30/);
});

test("cli --set csv.delimiter overrides delimiter", () => {
  const result = runCli({
    args: ["--format", "csv", "--set", "csv.delimiter=;"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name;age/);
  assert.match(result.stdout, /Bob;25/);
});

test("cli --set can override json options", () => {
  const result = runCli({
    args: [
      "--format",
      "json",
      "--set",
      "json.pretty=false",
      "--set",
      "json.asArray=true",
    ],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(Array.isArray(parsed[0]), true);
});

test("cli --list-set-keys prints options and exits 0", () => {
  const result = runCli({ args: ["--list-set-keys"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /csv\.delimiter/);
  assert.match(result.stdout, /json\.pretty/);
  assert.match(result.stdout, /latex\.booktabs/);
});

test("cli --list-set-keys-format csv prints csv options only", () => {
  const result = runCli({ args: ["--list-set-keys-format", "csv"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /csv\.delimiter/);
  assert.match(result.stdout, /csv\.includeHeaders/);
  assert.doesNotMatch(result.stdout, /json\.pretty/);
});

test("cli --no-headers removes header row", () => {
  const result = runCli({
    args: ["--format", "csv", "--no-headers"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("name,age"), false);
  assert.match(result.stdout, /Alice,30/);
});

test("cli --columns selects only requested columns", () => {
  const result = runCli({
    args: ["--format", "csv", "--columns", "name"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /^name/m);
  assert.equal(result.stdout.includes("age"), false);
  assert.match(result.stdout, /Alice/);
});

test("cli --filter supports numeric predicates", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "age>25"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Alice,30/);
  assert.equal(result.stdout.includes("Bob,25"), false);
});

test("cli --filter LIKE is case-insensitive", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "name LIKE ali%"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Alice,30/);
  assert.equal(result.stdout.includes("Bob,25"), false);
});

test("cli --stats prints conversion summary to stderr", () => {
  const result = runCli({
    args: ["--format", "csv", "--stats"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stderr, /\[tablyful\] rows: 2, columns: 2/);
  assert.match(result.stderr, /format: csv/);
});

test("cli auto-stream path converts csv from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("cli auto-stream path supports filters and columns", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "age>25", "--columns", "name"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /^name/m);
  assert.match(result.stdout, /Alice/);
  assert.equal(result.stdout.includes("Bob"), false);
  assert.equal(result.stdout.includes("age"), false);
});


test("cli reads positional file input", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-"));
  const filePath = join(tempDir, "input.json");

  try {
    writeFileSync(filePath, sampleArrayOfArrays, "utf8");
    const result = runCli({ args: [filePath, "--format", "csv"] });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age/);
    assert.match(result.stdout, /Bob,25/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("cli --output writes formatted content to file", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-output-"));
  const filePath = join(tempDir, "input.json");
  const outputPath = join(tempDir, "out.csv");

  try {
    writeFileSync(filePath, sampleArrayOfArrays, "utf8");
    const result = runCli({ args: [filePath, "--format", "csv", "--output", outputPath] });

    assert.equal(result.code, 0);
    assert.equal(result.stdout, "");

    const output = readFileSync(outputPath, "utf8");
    assert.match(output, /name,age/);
    assert.match(output, /Alice,30/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("cli csv with --output writes file content (auto-stream path)", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-stream-output-"));
  const filePath = join(tempDir, "input.json");
  const outputPath = join(tempDir, "out.csv");

  try {
    writeFileSync(filePath, sampleArrayOfArrays, "utf8");
    const result = runCli({
      args: [filePath, "--format", "csv", "--output", outputPath],
    });

    assert.equal(result.code, 0);
    assert.equal(result.stdout, "");

    const output = readFileSync(outputPath, "utf8");
    assert.match(output, /name,age/);
    assert.match(output, /Bob,25/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("cli with missing file exits 1", () => {
  const result = runCli({ args: ["/tmp/does-not-exist-tablyful.json", "--format", "csv"] });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Failed to read input file/);
});

test("cli --config sets default output format when --format is absent", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-config-"));
  const configPath = join(tempDir, "config.json");
  const config = {
    defaultFormat: "json",
    json: { pretty: false, asArray: true },
  };

  try {
    writeFileSync(configPath, JSON.stringify(config), "utf8");
    const result = runCli({
      args: ["--config", configPath],
      input: sampleArrayOfArrays,
    });

    assert.equal(result.code, 0);
    const parsed = JSON.parse(result.stdout);
    assert.equal(Array.isArray(parsed), true);
    assert.equal(Array.isArray(parsed[0]), true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("cli invalid json exits 1", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: "not-json",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Invalid JSON format/);
});

test("cli invalid output format exits 2", () => {
  const result = runCli({
    args: ["--format", "xml"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid format: xml/);
});

test("cli invalid --filter expression exits 1", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "age~~20"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Invalid filter expression/);
});

test("cli unknown --columns field exits 1", () => {
  const result = runCli({
    args: ["--format", "csv", "--columns", "name,missing"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown column\(s\) in --columns/);
});

test("cli invalid --set option exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--set", "csv.notAnOption=1"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Unknown --set option: csv.notAnOption/);
});
