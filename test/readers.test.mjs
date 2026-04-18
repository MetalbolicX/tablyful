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

// ── Sample inputs for new readers ───────────────────────────────────────────

const sampleCsv = `name,age,city
Alice,30,New York
Bob,25,London
`;

const sampleCsvQuoted = `name,age,bio
Alice,30,"Likes ""coding"" and coffee"
Bob,25,"Lives in
London"
`;

const sampleTsv = `name\tage\tcity
Alice\t30\tNew York
Bob\t25\tLondon
`;

const samplePsv = `name|age|city
Alice|30|New York
Bob|25|London
`;

const sampleYaml = `---
- name: Alice
  age: 30
  city: New York
- name: Bob
  age: 25
  city: London
`;

const sampleYamlObjectOfArrays = `name:
  - Alice
  - Bob
age:
  - 30
  - 25
`;

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <row>
    <name>Alice</name>
    <age>30</age>
    <city>New York</city>
  </row>
  <row>
    <name>Bob</name>
    <age>25</age>
    <city>London</city>
  </row>
</data>
`;

const sampleSqlPlaceholder = `-- VALUES: ('Alice', 30, 'New York')
INSERT INTO "people" ("name", "age", "city") VALUES (?, ?, ?);
-- VALUES: ('Bob', 25, 'London')
INSERT INTO "people" ("name", "age", "city") VALUES (?, ?, ?);
`;

const sampleSqlInline = `INSERT INTO "people" ("name", "age", "city") VALUES
  ('Alice', 30, 'New York'),
  ('Bob', 25, 'London');
`;

const sampleSqlWithEscapes = `-- VALUES: ('O''Brien', 42, 'Dublin')
INSERT INTO "people" ("name", "age", "city") VALUES (?, ?, ?);
`;

// ── CSV Reader ──────────────────────────────────────────────────────────────

test("reader csv stdin to json", () => {
  const result = runCli({
    args: ["--input", "csv", "--format", "json"],
    input: sampleCsv,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
  assert.equal(data[0].city, "New York");
});

test("reader csv with quoted fields to json", () => {
  const result = runCli({
    args: ["--input", "csv", "--format", "json"],
    input: sampleCsvQuoted,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.match(data[0].bio, /Likes "coding" and coffee/);
  assert.match(data[1].bio, /London/);
});

test("reader csv auto-detect from .csv extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.csv");
  writeFileSync(inputFile, sampleCsv);

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

test("reader csv with --columns and --filter", () => {
  const result = runCli({
    args: ["--input", "csv", "--format", "csv", "--columns", "name,city", "--filter", "name = Alice"],
    input: sampleCsv,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,city/);
  assert.match(result.stdout, /Alice/);
  assert.doesNotMatch(result.stdout, /Bob/);
  assert.doesNotMatch(result.stdout, /age/);
});

// ── TSV Reader ──────────────────────────────────────────────────────────────

test("reader tsv stdin to json", () => {
  const result = runCli({
    args: ["--input", "tsv", "--format", "json"],
    input: sampleTsv,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].city, "New York");
});

test("reader tsv auto-detect from .tsv extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.tsv");
  writeFileSync(inputFile, sampleTsv);

  try {
    const result = runCli({
      args: [inputFile, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age,city/);
    assert.match(result.stdout, /Alice,30,New York/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

// ── PSV Reader ──────────────────────────────────────────────────────────────

test("reader psv stdin to json", () => {
  const result = runCli({
    args: ["--input", "psv", "--format", "json"],
    input: samplePsv,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].city, "New York");
});

test("reader psv auto-detect from .psv extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.psv");
  writeFileSync(inputFile, samplePsv);

  try {
    const result = runCli({
      args: [inputFile, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age,city/);
    assert.match(result.stdout, /Alice,30,New York/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

// ── YAML Reader ─────────────────────────────────────────────────────────────

test("reader yaml stdin (array of objects) to json", () => {
  const result = runCli({
    args: ["--input", "yaml", "--format", "json"],
    input: sampleYaml,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
  assert.equal(data[0].city, "New York");
});

test("reader yaml stdin (object of arrays) to csv", () => {
  const result = runCli({
    args: ["--input", "yaml", "--format", "csv"],
    input: sampleYamlObjectOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
  assert.match(result.stdout, /Bob,25/);
});

test("reader yaml auto-detect from .yaml extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.yaml");
  writeFileSync(inputFile, sampleYaml);

  try {
    const result = runCli({
      args: [inputFile, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age,city/);
    assert.match(result.stdout, /Alice/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

test("reader yaml auto-detect from .yml extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.yml");
  writeFileSync(inputFile, sampleYaml);

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

test("reader yaml content-sniff from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleYaml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age,city/);
  assert.match(result.stdout, /Alice/);
});

// ── XML Reader ──────────────────────────────────────────────────────────────

test("reader xml stdin to json", () => {
  const result = runCli({
    args: ["--input", "xml", "--format", "json"],
    input: sampleXml,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
  assert.equal(data[0].city, "New York");
});

test("reader xml auto-detect from .xml extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.xml");
  writeFileSync(inputFile, sampleXml);

  try {
    const result = runCli({
      args: [inputFile, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age,city/);
    assert.match(result.stdout, /Alice,30,New York/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

test("reader xml content-sniff from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleXml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age,city/);
  assert.match(result.stdout, /Alice/);
});

test("reader xml with --columns selects subset", () => {
  const result = runCli({
    args: ["--input", "xml", "--format", "json", "--columns", "name,city"],
    input: sampleXml,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(Object.keys(data[0]).length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].city, "New York");
});

// ── SQL Reader ──────────────────────────────────────────────────────────────

test("reader sql placeholder mode to json", () => {
  const result = runCli({
    args: ["--input", "sql", "--format", "json"],
    input: sampleSqlPlaceholder,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].age, "30");
  assert.equal(data[0].city, "New York");
  assert.equal(data[1].name, "Bob");
});

test("reader sql inline mode to csv", () => {
  const result = runCli({
    args: ["--input", "sql", "--format", "csv"],
    input: sampleSqlInline,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age,city/);
  assert.match(result.stdout, /Alice,30,New York/);
  assert.match(result.stdout, /Bob,25,London/);
});

test("reader sql with escaped quotes to json", () => {
  const result = runCli({
    args: ["--input", "sql", "--format", "json"],
    input: sampleSqlWithEscapes,
  });

  assert.equal(result.code, 0);
  const data = JSON.parse(result.stdout);
  assert.equal(data.length, 1);
  assert.equal(data[0].name, "O'Brien");
  assert.equal(data[0].age, "42");
  assert.equal(data[0].city, "Dublin");
});

test("reader sql auto-detect from .sql extension", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tablyful-reader-"));
  const inputFile = join(tmp, "data.sql");
  writeFileSync(inputFile, sampleSqlInline);

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

test("reader sql content-sniff from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleSqlInline,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age,city/);
  assert.match(result.stdout, /Alice/);
});

// ── Error cases for new readers ─────────────────────────────────────────────

test("reader yaml with non-table data exits 1", () => {
  const result = runCli({
    args: ["--input", "yaml", "--format", "csv"],
    input: "just a plain string",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /table|recognizable/i);
});

test("reader xml with no repeating elements exits 1", () => {
  const result = runCli({
    args: ["--input", "xml", "--format", "csv"],
    input: "<root>just plain text</root>",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /table|structure/i);
});

test("reader sql with no INSERT exits 1", () => {
  const result = runCli({
    args: ["--input", "sql", "--format", "csv"],
    input: "SELECT * FROM users;",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /INSERT/i);
});

// ── Roundtrip test: JSON → SQL → JSON ───────────────────────────────────────

test("roundtrip json to sql to json", () => {
  const jsonInput = JSON.stringify([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);

  // Step 1: JSON → SQL
  const sqlResult = runCli({
    args: ["--format", "sql", "--set", "sql.tableName=t", "--set", "sql.insertBatchSize=2"],
    input: jsonInput,
  });
  assert.equal(sqlResult.code, 0);

  // Step 2: SQL → JSON
  const jsonResult = runCli({
    args: ["--input", "sql", "--format", "json"],
    input: sqlResult.stdout,
  });
  assert.equal(jsonResult.code, 0);
  const data = JSON.parse(jsonResult.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[1].name, "Bob");
});

// ── Roundtrip test: JSON → CSV → JSON ──────────────────────────────────────

test("roundtrip json to csv to json", () => {
  const jsonInput = JSON.stringify([
    { name: "Alice", city: "New York" },
    { name: "Bob", city: "London" },
  ]);

  // Step 1: JSON → CSV
  const csvResult = runCli({
    args: ["--format", "csv"],
    input: jsonInput,
  });
  assert.equal(csvResult.code, 0);

  // The default CSV lineBreak is literal \n (two chars) — normalize to real newlines
  const csvNormalized = csvResult.stdout.replace(/\\n/g, "\n");

  // Step 2: CSV → JSON
  const jsonResult = runCli({
    args: ["--input", "csv", "--format", "json"],
    input: csvNormalized,
  });
  assert.equal(jsonResult.code, 0);
  const data = JSON.parse(jsonResult.stdout);
  assert.equal(data.length, 2);
  assert.equal(data[0].name, "Alice");
  assert.equal(data[0].city, "New York");
});
