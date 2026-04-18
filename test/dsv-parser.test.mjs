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

test("dsv parser strips UTF-8 BOM", () => {
  const input = "\uFEFFname,age\nAlice,30\n";
  const result = runCli({ args: ["--input", "csv", "--format", "json"], input });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
});

test("dsv parser handles embedded newlines in quoted fields", () => {
  const input = 'name,bio\nAlice,"Line 1\nLine 2"\n';
  const result = runCli({ args: ["--input", "csv", "--format", "json"], input });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data[0].bio, "Line 1\nLine 2");
});

test("dsv parser handles escaped quotes", () => {
  const input = 'name,bio\nAlice,"He said ""hi"""\n';
  const result = runCli({ args: ["--input", "csv", "--format", "json"], input });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data[0].bio, 'He said "hi"');
});

test("dsv parser supports CRLF newlines", () => {
  const input = "name,age\r\nAlice,30\r\nBob,25\r\n";
  const result = runCli({ args: ["--input", "csv", "--format", "json"], input });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[1].name, "Bob");
});

test("dsv parser handles single-column input", () => {
  const input = "name\nAlice\nBob\n";
  const result = runCli({ args: ["--input", "csv", "--format", "json"], input });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
});
