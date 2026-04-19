# tablyful

`tablyful` is a CLI-first tool that converts JSON tabular data into `csv`, `tsv`, `psv`, `json`, `markdown`, `html`, `latex`, `sql`, and `yaml`.

![Node.js version](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-blue)

## Install

```bash
npm install tablyful
```

## Quick Usage

```bash
# stdin -> csv
cat data.json | tablyful --format csv

# file -> json
tablyful data.json --format json

# write to file
tablyful data.json --format csv --output out.csv

# automatic streaming for large arrays (csv|tsv|psv|sql|html|yaml|ndjson)
cat data.json | tablyful --format csv --output out.csv

# NDJSON stdin -> csv
cat data.ndjson | tablyful --input ndjson --format csv

# emit NDJSON (one JSON object per line)
tablyful data.json --format ndjson --output data.ndjson

# repeatable --set overrides
tablyful data.json --format json --set json.pretty=false --set json.indentSize=4

# row filtering + column selection
tablyful data.json --format yaml --filter "name LIKE ali%" --columns name,age

# SQL inserts with optional table creation
tablyful data.json --format sql --set sql.tableName=users --set sql.includeCreateTable=true

# conversion diagnostics
tablyful data.json --format csv --stats

# discover valid --set keys
tablyful --list-set-keys
tablyful --list-set-keys-format csv
```

Streaming & NDJSON

tablyful now supports NDJSON (newline-delimited JSON) as both an input and an output format. NDJSON input is parsed line-by-line so it composes well with Unix pipelines and uses constant memory.

When stdin is a pipe the CLI decides between streaming and buffered (batch) processing as follows:

- If the producer writes a JSON array (input begins with `[`), and the chosen output format is streamable (csv, tsv, psv, sql, html, yaml, ndjson), the CLI will stream the array elements as they arrive (no full buffering).
- If you pass `--input ndjson` or supply a `.ndjson`/`.jsonl` file, the CLI will stream input line-by-line using NDJSON semantics.
- If either the input format or the output format is not streamable (for example when you request pretty-printed JSON as a single array), the CLI will fall back to buffered processing (reads entire input before converting).

Examples:

- Stream NDJSON to CSV:
  cat data.ndjson | tablyful --input ndjson --format csv
- Produce NDJSON from a JSON file (one object per line):
  tablyful data.json --format ndjson > data.ndjson
- Pipe a producer into tablyful and consume immediately (streaming):
  producer-tool | tablyful --format ndjson | jq '.'

Streaming reduces memory usage and enables you to start consuming output before the input producer has finished.

## Configuration and Precedence

`tablyful` supports `.tablyfulrc.json` config files and CLI overrides.

Priority order:

1. Built-in defaults
2. Config file(s)
3. `--set format.option=value`
4. Explicit shallow flags (`--delimiter`, `--no-headers`)

See `README_RES.md` for full CLI documentation and `examples/cli/` for runnable examples.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

Released under [MIT](/LICENSE) by [@MetalbolicX](https://github.com/MetalbolicX).
