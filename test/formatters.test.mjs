import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const cliPath = new URL("../dist/cli.mjs", import.meta.url).pathname;

const runCli = ({ args = [], input } = {}) => {
  const result = spawnSync("node", [cliPath, ...args], {
    input,
    encoding: "utf8",
  });

  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

test("formatter csv escapes commas and quotes", () => {
  const input = JSON.stringify([{ name: 'Smith, "John"', age: 30 }]);
  const result = runCli({ args: ["--format", "csv"], input });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes('"Smith, \\\"John\\\""'), true);
});

test("formatter html escapes special characters", () => {
  const input = JSON.stringify([{ name: '<a href="x">A & B</a>' }]);
  const result = runCli({ args: ["--format", "html"], input });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;"), true);
});

test("formatter latex escapes control characters", () => {
  const input = JSON.stringify([{ text: "A&B_%$#{}~^\\" }]);
  const result = runCli({ args: ["--format", "latex"], input });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("A\\&B\\_\\%\\$\\#\\{\\}\\textasciitilde{}\\textasciicircum{}\\textbackslash\\{\\}"), true);
});

test("formatter yaml quotes values that require quoting", () => {
  const input = JSON.stringify([{ note: "alpha: beta #tag" }]);
  const result = runCli({ args: ["--format", "yaml"], input });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("'alpha: beta #tag'"), true);
});

test("formatter yaml escapes single quotes", () => {
  const input = JSON.stringify([{ note: "it's fine" }]);
  const result = runCli({ args: ["--format", "yaml", "--set", "yaml.quoteStrings=true"], input });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("'it''s fine'"), true);
});

test("formatter sql emits escaped literals", () => {
  const input = JSON.stringify([{ name: "O'Brien", active: true, score: null }]);
  const result = runCli({ args: ["--format", "sql", "--set", "sql.tableName=users"], input });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("'O''Brien'"), true);
  assert.equal(result.stdout.includes("TRUE"), true);
  assert.equal(result.stdout.includes("NULL"), true);
});

test("formatter json supports compact output", () => {
  const input = JSON.stringify([{ name: "Alice", age: 30 }]);
  const result = runCli({
    args: ["--format", "json", "--set", "json.pretty=false"],
    input,
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("\n  "), false);
});

test("formatter markdown supports centered alignment", () => {
  const input = JSON.stringify([{ name: "Alice", age: 30 }]);
  const result = runCli({
    args: ["--format", "markdown", "--set", "markdown.align=center"],
    input,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /:[-]+:/);
});
