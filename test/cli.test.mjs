import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

test("cli --no-headers removes header row", () => {
  const result = runCli({
    args: ["--format", "csv", "--no-headers"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("name,age"), false);
  assert.match(result.stdout, /Alice,30/);
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
