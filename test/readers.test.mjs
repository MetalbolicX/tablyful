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

// ── Sample inputs ─────────────────────────────────────────────────────────────

const sampleHtml = `
<table>
  <thead>
    <tr><th>name</th><th>age</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>30</td></tr>
    <tr><td>Bob</td><td>25</td></tr>
  </tbody>
</table>
`;

const sampleHtmlNoThead = `
<table>
  <tr><th>name</th><th>age</th></tr>
  <tr><td>Alice</td><td>30</td></tr>
  <tr><td>Bob</td><td>25</td></tr>
</table>
`;

const sampleMarkdown = `
| name  | age |
| ----- | --- |
| Alice | 30  |
| Bob   | 25  |
`;

const sampleLatex = `
\\begin{tabular}{ll}
\\hline
name & age \\\\
\\hline
Alice & 30 \\\\
Bob & 25 \\\\
\\hline
\\end{tabular}
`;

const sampleLatexBooktabs = `
\\begin{tabular}{ll}
\\toprule
name & age \\\\
\\midrule
Alice & 30 \\\\
Bob & 25 \\\\
\\bottomrule
\\end{tabular}
`;

// ── HTML Reader via stdin ────────────────────────────────────────────────────

test("reader html stdin to csv", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "csv"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
  assert.match(result.stdout, /Bob,25/);
});

test("reader html stdin to json", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "json"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
  assert.equal(data[1].name, "Bob");
});

test("reader html without thead to csv", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "csv"],
    input: sampleHtmlNoThead,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("reader html stdin to markdown", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "markdown"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name/);
  assert.match(result.stdout, /Alice/);
  assert.match(result.stdout, /\|/);
});

// ── Markdown Reader via stdin ───────────────────────────────────────────────

test("reader markdown stdin to csv", () => {
  const result = runCli({
    args: ["--input", "markdown", "--format", "csv"],
    input: sampleMarkdown,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
  assert.match(result.stdout, /Bob,25/);
});

test("reader markdown stdin to json", () => {
  const result = runCli({
    args: ["--input", "markdown", "--format", "json"],
    input: sampleMarkdown,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
});

test("reader markdown stdin to sql", () => {
  const result = runCli({
    args: ["--input", "markdown", "--format", "sql", "--set", "sql.tableName=people"],
    input: sampleMarkdown,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /INSERT INTO/);
  assert.match(result.stdout, /people/);
  assert.match(result.stdout, /Alice/);
});

// ── LaTeX Reader via stdin ──────────────────────────────────────────────────

test("reader latex stdin to csv", () => {
  const result = runCli({
    args: ["--input", "latex", "--format", "csv"],
    input: sampleLatex,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
  assert.match(result.stdout, /Bob,25/);
});

test("reader latex booktabs to csv", () => {
  const result = runCli({
    args: ["--input", "latex", "--format", "csv"],
    input: sampleLatexBooktabs,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("reader latex stdin to json", () => {
  const result = runCli({
    args: ["--input", "latex", "--format", "json"],
    input: sampleLatex,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
});

test("reader latex stdin to yaml", () => {
  const result = runCli({
    args: ["--input", "latex", "--format", "yaml"],
    input: sampleLatex,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name/);
  assert.match(result.stdout, /Alice/);
});

// ── File-based input with auto-detection ────────────────────────────────────

test("reader auto-detects html from file extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.html");
  writeFileSync(inputFile, sampleHtml);

  try {
    const result = runCli({
      args: [inputFile, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age/);
    assert.match(result.stdout, /Alice,30/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

test("reader auto-detects markdown from .md extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.md");
  writeFileSync(inputFile, sampleMarkdown);

  try {
    const result = runCli({
      args: [inputFile, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age/);
    assert.match(result.stdout, /Alice,30/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

test("reader auto-detects latex from .tex extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.tex");
  writeFileSync(inputFile, sampleLatex);

  try {
    const result = runCli({
      args: [inputFile, "--format", "json"],
    });

    assert.equal(result.code, 0);
    const data = JSON.parse(result.stdout);
    assert.equal(data.length, 2);
    assert.equal(data[0].name, "Alice");
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

// ── Content sniffing (stdin without --input) ────────────────────────────────

test("reader content-sniffs html from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("reader content-sniffs markdown from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleMarkdown,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("reader content-sniffs latex from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleLatex,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

// ── Readers with --columns and --filter ─────────────────────────────────────

test("reader html with --columns selects subset", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "csv", "--columns", "name"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name/);
  assert.doesNotMatch(result.stdout, /age/);
  assert.match(result.stdout, /Alice/);
});

test("reader markdown with --filter filters rows", () => {
  const result = runCli({
    args: ["--input", "markdown", "--format", "csv", "--filter", "name = Alice"],
    input: sampleMarkdown,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Alice/);
  assert.doesNotMatch(result.stdout, /Bob/);
});

test("reader html with --stats prints stats to stderr", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "csv", "--stats"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stderr, /rows: 2/);
  assert.match(result.stderr, /columns: 2/);
  assert.match(result.stderr, /detected: html/);
});

// ── Output to file ──────────────────────────────────────────────────────────

test("reader html with --output writes to file", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const outFile = join(tmp, "out.csv");

  try {
    const result = runCli({
      args: ["--input", "html", "--format", "csv", "--output", outFile],
      input: sampleHtml,
    });

    assert.equal(result.code, 0);
    const content = readFileSync(outFile, "utf8");
    assert.match(content, /name,age/);
    assert.match(content, /Alice,30/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

// ── Error cases ─────────────────────────────────────────────────────────────

test("reader html with no table exits 1", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "csv"],
    input: "<p>no table here</p>",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /table/i);
});

test("reader markdown with no table exits 1", () => {
  const result = runCli({
    args: ["--input", "markdown", "--format", "csv"],
    input: "# Just a heading\n\nSome text.\n",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /table/i);
});

test("reader latex with no tabular exits 1", () => {
  const result = runCli({
    args: ["--input", "latex", "--format", "csv"],
    input: "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /tabular|environment/i);
});
