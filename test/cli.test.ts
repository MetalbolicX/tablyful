import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runCli, sampleArrayOfArrays, sampleArrayOfObjects } from "./utils/runCli.ts";

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

const sampleMarkdown = `
| name  | age |
| ----- | --- |
| Alice | 30  |
| Bob   | 25  |
`;

const sampleYaml = `---
- name: Alice
  age: 30
- name: Bob
  age: 25
`;

const sampleNdjson = `{"name":"Alice","age":30}
{"name":"Bob","age":25}
`;

test("CLI: --help prints usage and exits 0", () => {
  const result = runCli({ args: ["--help"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Usage: tablyful \[options\] \[file\]/);
  assert.match(result.stdout, /--format <format>/);
});

test("CLI: --version prints version and exits 0", () => {
  const result = runCli({ args: ["--version"] });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "1.0.0");
});

test("CLI: empty piped stdin exits 1", () => {
  const result = runCli();

  assert.equal(result.code, 1);
  assert.match(result.stderr, /No input provided/);
});

test("CLI: --list-set-keys prints options and exits 0", () => {
  const result = runCli({ args: ["--list-set-keys"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /csv\.delimiter/);
  assert.match(result.stdout, /json\.pretty/);
  assert.match(result.stdout, /latex\.booktabs/);
});

test("CLI: --list-set-keys-format csv prints csv options only", () => {
  const result = runCli({ args: ["--list-set-keys-format", "csv"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /csv\.delimiter/);
  assert.match(result.stdout, /csv\.includeHeaders/);
  assert.doesNotMatch(result.stdout, /json\.pretty/);
});

test("CLI: --input wrong parser returns error code 1", () => {
  const result = runCli({
    args: ["--format", "csv", "--input", "array-of-arrays"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Table must have at least one header/);
});

test("CLI: --delimiter overrides csv delimiter", () => {
  const result = runCli({
    args: ["--format", "csv", "--delimiter", ";"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name;age/);
  assert.match(result.stdout, /Alice;30/);
});

test("CLI: --set csv.delimiter overrides delimiter", () => {
  const result = runCli({
    args: ["--format", "csv", "--set", "csv.delimiter=;"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name;age/);
  assert.match(result.stdout, /Bob;25/);
});

test("CLI: --set can override json options", () => {
  const result = runCli({
    args: ["--format", "json", "--set", "json.pretty=false", "--set", "json.asArray=true"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(Array.isArray(parsed[0]), true);
});

test("CLI: --no-headers removes header row", () => {
  const result = runCli({
    args: ["--format", "csv", "--no-headers"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("name,age"), false);
  assert.match(result.stdout, /Alice,30/);
});

test("CLI: --columns selects only requested columns", () => {
  const result = runCli({
    args: ["--format", "csv", "--columns", "name"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /^name/m);
  assert.equal(result.stdout.includes("age"), false);
  assert.match(result.stdout, /Alice/);
});

test("CLI: --filter supports numeric predicates", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "age>25"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Alice,30/);
  assert.equal(result.stdout.includes("Bob,25"), false);
});

test("CLI: --filter LIKE is case-insensitive", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "name LIKE ali%"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Alice,30/);
  assert.equal(result.stdout.includes("Bob,25"), false);
});

test("CLI: --stats prints conversion summary to stderr", () => {
  const result = runCli({
    args: ["--format", "csv", "--stats"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.match(result.stderr, /\[tablyful\] rows: 2, columns: 2/);
  assert.match(result.stderr, /format: csv/);
});

test("CLI: reads positional file input", () => {
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

test("CLI: --output writes formatted content to file", () => {
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

test("CLI: missing file exits 1", () => {
  const missingPath = join(tmpdir(), `does-not-exist-tablyful-${Date.now()}.json`);
  const result = runCli({ args: [missingPath, "--format", "csv"] });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Failed to read input file/);
});

test("CLI: --config sets default output format when --format is absent", () => {
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

test("CLI: local config overrides home config", () => {
  const homeDir = mkdtempSync(join(tmpdir(), "tablyful-home-"));
  const workDir = mkdtempSync(join(tmpdir(), "tablyful-work-"));
  const homeConfigPath = join(homeDir, ".tablyfulrc.json");
  const localConfigPath = join(workDir, ".tablyfulrc.json");

  try {
    writeFileSync(homeConfigPath, JSON.stringify({ defaultFormat: "csv", csv: { delimiter: "|" } }), "utf8");
    writeFileSync(localConfigPath, JSON.stringify({ defaultFormat: "csv", csv: { delimiter: ";" } }), "utf8");

    const result = runCli({
      cwd: workDir,
      env: { HOME: homeDir },
      input: sampleArrayOfArrays,
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name;age/);
    assert.match(result.stdout, /Alice;30/);
  } finally {
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("CLI: csv output uses real newlines", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trimEnd(), "name,age\nAlice,30\nBob,25");
  assert.equal(result.stdout.includes("\\n"), false);
});

test("CLI: tsv output uses real newlines", () => {
  const result = runCli({
    args: ["--format", "tsv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trimEnd(), "name\tage\nAlice\t30\nBob\t25");
  assert.equal(result.stdout.includes("\\n"), false);
});

test("CLI: invalid json exits 1", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: "not-json",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Invalid JSON format/);
});

test("CLI: invalid output format exits 2", () => {
  const result = runCli({
    args: ["--format", "xml"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid format: xml/);
});

test("CLI: invalid --filter expression exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "age~~20"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid filter expression/);
});

test("CLI: unknown --columns field exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--columns", "name,missing"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Unknown column\(s\) in --columns/);
});

test("CLI: invalid --set option exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--set", "csv.notAnOption=1"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Unknown --set option: csv.notAnOption/);
});

test("CLI: invalid --max-file-size exits 2", () => {
  const result = runCli({
    args: ["--max-file-size", "abc", "--format", "csv"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid --max-file-size value/);
});

test("CLI: invalid --list-set-keys-format exits 2", () => {
  const result = runCli({ args: ["--list-set-keys-format", "xml"] });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid format for --list-set-keys-format/);
});

test("CLI: malformed --set pair exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--set", "csv.delimiter"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid --set value/);
});

test("CLI: invalid json.indentSize set value exits 2", () => {
  const result = runCli({
    args: ["--format", "json", "--set", "json.indentSize=abc"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid integer for --set json.indentSize/);
});

test("CLI: invalid sql.insertBatchSize exits 2", () => {
  const result = runCli({
    args: ["--format", "sql", "--set", "sql.insertBatchSize=0"],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Value must be greater than 0/);
});

test("CLI: invalid --columns value exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--columns", " , "],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid --columns value/);
});

test("CLI: empty --filter expression exits 2", () => {
  const result = runCli({
    args: ["--format", "csv", "--filter", "   "],
    input: sampleArrayOfArrays,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid --filter value/);
});

test("CLI: rejects files over --max-file-size", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-max-size-"));
  const filePath = join(tempDir, "input.json");

  try {
    writeFileSync(filePath, sampleArrayOfArrays, "utf8");
    const result = runCli({
      args: [filePath, "--format", "csv", "--max-file-size", "1"],
    });

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Input file is too large/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: accepts files when --max-file-size is sufficient", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-max-size-ok-"));
  const filePath = join(tempDir, "input.json");

  try {
    writeFileSync(filePath, sampleArrayOfArrays, "utf8");
    const result = runCli({
      args: [filePath, "--format", "csv", "--max-file-size", "100000"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: warns about unknown config keys", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-config-warning-"));
  const configPath = join(tempDir, "config.json");

  try {
    writeFileSync(configPath, JSON.stringify({ defaultFormat: "csv", unknownOption: true }), "utf8");

    const result = runCli({
      args: ["--config", configPath, "--format", "csv"],
      input: sampleArrayOfArrays,
    });

    assert.equal(result.code, 0);
    assert.match(result.stderr, /Unknown config key\(s\): unknownOption/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: warns about unknown section config keys", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-config-section-warning-"));
  const configPath = join(tempDir, "config.json");

  try {
    writeFileSync(
      configPath,
      JSON.stringify({ defaultFormat: "csv", csv: { delimiter: ";", unknownCsvOption: true } }),
      "utf8",
    );

    const result = runCli({
      args: ["--config", configPath, "--format", "csv"],
      input: sampleArrayOfArrays,
    });

    assert.equal(result.code, 0);
    assert.match(result.stderr, /Unknown csv config key\(s\): unknownCsvOption/);
    assert.match(result.stdout, /name;age/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: reader path works with --input html", () => {
  const result = runCli({
    args: ["--input", "html", "--format", "csv"],
    input: sampleHtml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
  assert.match(result.stdout, /Bob,25/);
});

test("CLI: content-sniffs markdown from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleMarkdown,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("CLI: content-sniffs yaml from stdin", () => {
  const result = runCli({
    args: ["--format", "csv"],
    input: sampleYaml,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("CLI: --input ndjson parses piped ndjson", () => {
  const result = runCli({
    args: ["--input", "ndjson", "--format", "csv"],
    input: sampleNdjson,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /(name,age|age,name)/);
  assert.match(result.stdout, /(Alice,30|30,Alice)/);
  assert.match(result.stdout, /(Bob,25|25,Bob)/);
});

test("CLI: --input ndjson streams to ndjson output", () => {
  const result = runCli({
    args: ["--input", "ndjson", "--format", "ndjson"],
    input: sampleNdjson,
  });

  assert.equal(result.code, 0);
  const lines = result.stdout.trim().split("\n");
  assert.equal(lines.length, 2);

  const first = JSON.parse(lines[0]);
  const second = JSON.parse(lines[1]);
  assert.equal(first.name, "Alice");
  assert.equal(first.age, 30);
  assert.equal(second.name, "Bob");
  assert.equal(second.age, 25);
});

test("CLI: JSON array stdin streams to ndjson output", () => {
  const result = runCli({
    args: ["--format", "ndjson"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 0);
  const lines = result.stdout.trim().split("\n");
  assert.equal(lines.length, 2);

  const parsed = lines.map((line) => JSON.parse(line));
  assert.equal(parsed[0].name, "Alice");
  assert.equal(parsed[1].name, "Bob");
});

test("CLI: detects yaml format from file extension", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-reader-ext-"));
  const filePath = join(tempDir, "input.yaml");

  try {
    writeFileSync(filePath, sampleYaml, "utf8");
    const result = runCli({
      args: [filePath, "--format", "csv"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age/);
    assert.match(result.stdout, /Alice,30/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: reader path supports --output", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-reader-output-"));
  const outputPath = join(tempDir, "out.csv");

  try {
    const result = runCli({
      args: ["--input", "html", "--format", "csv", "--output", outputPath],
      input: sampleHtml,
    });

    assert.equal(result.code, 0);
    assert.equal(result.stdout, "");

    const output = readFileSync(outputPath, "utf8");
    assert.match(output, /name,age/);
    assert.match(output, /Alice,30/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: reader invalid markdown exits 1", () => {
  const result = runCli({
    args: ["--input", "markdown", "--format", "csv"],
    input: "# Just a heading\n\nSome text.\n",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /table/i);
});

test("CLI: --stream and --no-stream together exits 2", () => {
  const result = runCli({
    args: ["--stream", "--no-stream", "--format", "csv"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /Cannot use --stream and --no-stream together/);
});

test("CLI: --stream with unsupported output format exits 2", () => {
  const result = runCli({
    args: ["--stream", "--format", "json"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /output format does not support streaming/);
});

test("CLI: --stream invalid json emits parse error", () => {
  const result = runCli({
    args: ["--stream", "--format", "csv"],
    input: '[{"name":"Alice"},',
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /\[PARSE_ERROR\] Invalid JSON format/);
});

test("CLI: --stream invalid filter expression exits 2", () => {
  const result = runCli({
    args: ["--stream", "--format", "csv", "--filter", "age~~20"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 2);
  assert.match(result.stderr, /\[VALIDATION_ERROR\] Invalid filter expression/);
});

test("CLI: --stream with csv output succeeds", () => {
  const result = runCli({
    args: ["--stream", "--format", "csv"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /name,age/);
  assert.match(result.stdout, /Alice,30/);
});

test("CLI: --no-stream with json output succeeds", () => {
  const result = runCli({
    args: ["--no-stream", "--format", "json"],
    input: sampleArrayOfObjects,
  });

  assert.equal(result.code, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed[0].name, "Alice");
});

test("CLI: --no-stream forces batch mode for ndjson input", () => {
  const result = runCli({
    args: ["--no-stream", "--input", "ndjson", "--format", "csv"],
    input: sampleNdjson,
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /(name,age|age,name)/);
  assert.match(result.stdout, /(Alice,30|30,Alice)/);
});

test("CLI: --stream with ndjson input and ndjson output succeeds", () => {
  const result = runCli({
    args: ["--stream", "--input", "ndjson", "--format", "ndjson"],
    input: sampleNdjson,
  });

  assert.equal(result.code, 0);
  const lines = result.stdout.trim().split("\n");
  assert.equal(lines.length, 2);

  const first = JSON.parse(lines[0]);
  const second = JSON.parse(lines[1]);
  assert.equal(first.name, "Alice");
  assert.equal(second.name, "Bob");
});

test("CLI: --stream with file input and csv output succeeds", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-stream-"));
  const filePath = join(tempDir, "input.json");

  try {
    writeFileSync(filePath, sampleArrayOfObjects, "utf8");
    const result = runCli({
      args: [filePath, "--format", "csv", "--stream"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /name,age/);
    assert.match(result.stdout, /Alice,30/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: --no-stream with file input and csv output succeeds", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-nostream-"));
  const filePath = join(tempDir, "input.json");

  try {
    writeFileSync(filePath, sampleArrayOfObjects, "utf8");
    const result = runCli({
      args: [filePath, "--format", "csv", "--no-stream"],
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /(name,age|age,name)/);
    assert.match(result.stdout, /(Alice,30|30,Alice)/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: --stream with file input and unsupported format exits 2", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tablyful-cli-stream-err-"));
  const filePath = join(tempDir, "input.json");

  try {
    writeFileSync(filePath, sampleArrayOfObjects, "utf8");
    const result = runCli({
      args: [filePath, "--format", "json", "--stream"],
    });

    assert.equal(result.code, 2);
    assert.match(result.stderr, /output format does not support streaming/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CLI: --help includes --stream and --no-stream", () => {
  const result = runCli({ args: ["--help"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /--stream/);
  assert.match(result.stdout, /--no-stream/);
});

test("CLI: --help does not include examples", () => {
  const result = runCli({ args: ["--help"] });

  assert.equal(result.code, 0);
  assert.doesNotMatch(result.stdout, /Examples:/);
});

test("CLI: --format without input exits 1", () => {
  const result = runCli({ args: ["--format", "csv"] });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /No input provided/);
});

test("CLI: --examples prints examples and exits 0", () => {
  const result = runCli({ args: ["--examples"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Examples:/);
  assert.match(result.stdout, /tablyful.*--format csv/);
  assert.match(result.stdout, /tablyful.*--format ndjson/);
});

test("CLI: --help includes --examples flag", () => {
  const result = runCli({ args: ["--help"] });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /--examples/);
});
