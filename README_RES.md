# Tablyful - ReScript Edition

`tablyful` is a CLI-first tool for converting JSON tabular data between `csv`, `tsv`, `psv`, `json`, `markdown`, `html`, `latex`, `sql`, and `yaml`.

[![ReScript](https://img.shields.io/badge/ReScript-v12.2.0-red)](https://rescript-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js->=22.0.0-blue)](https://nodejs.org/)

## Features

- Multiple input shapes: array of arrays, array of objects, object of arrays, object of objects
- Multiple output formats: CSV, TSV, PSV, JSON, Markdown, HTML, LaTeX, SQL, YAML
- Unix-friendly CLI (stdin/stdout by default, positional file input supported)
- Cascading JSON config (`.tablyfulrc.json`)
- Repeatable `--set format.option=value` overrides for format-specific options
- Row filtering with SQL-like predicates (`=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`)
- Column projection via `--columns`
- Conversion diagnostics with `--stats`
- Human-readable discoverability with `--list-set-keys`

## Installation

```bash
npm install tablyful
```

## Quick Start

```bash
# stdin -> csv
cat data.json | tablyful --format csv

# positional file -> json
tablyful data.json --format json

# auto-detect parser, filter rows, and select columns
cat data.json | tablyful --format yaml --filter 'name LIKE ali%' --columns name,age

# emit SQL inserts with placeholders
tablyful data.json --format sql --set sql.tableName=users --set sql.includeCreateTable=true

# force parser and customize csv delimiter
cat data.json | tablyful --input array-of-objects --format csv --set csv.delimiter=';'

# use config and then override one value inline
tablyful data.json --config ./.tablyfulrc.json --set json.pretty=false --format json
```

## CLI Options

```text
Usage: tablyful [options] [file]

Options:
  -f, --format <format>           Output format (csv|tsv|psv|json|markdown|html|latex|sql|yaml)
  -i, --input <format>            Input format (optional; auto-detected when omitted)
      --set <key=value>           Override format option (repeatable, e.g. --set json.pretty=false)
      --list-set-keys             Print allowed --set keys and defaults
      --list-set-keys-format <f>  Print allowed --set keys for one format
  -C, --columns <names>           Comma-separated output columns
      --filter <expr>             Filter rows (repeatable; supports = != > < >= <= LIKE)
      --stats                     Print conversion stats to stderr
  -c, --config <path>             Path to config JSON file
  -d, --delimiter <char>          CSV delimiter override
      --no-headers                Omit headers in CSV/TSV/PSV output
  -h, --help                      Show help
  -v, --version                   Show version
```

Input is read from `[file]` when provided, otherwise from stdin when piped.

## Configuration

Create a `.tablyfulrc.json` in the current directory (or home directory):

```json
{
  "defaultFormat": "csv",
  "hasHeaders": true,
  "includeRowNumbers": false,
  "csv": {
    "delimiter": ",",
    "quote": "\"",
    "escape": "\\",
    "lineBreak": "\\n",
    "includeHeaders": true
  },
  "tsv": {
    "includeHeaders": true
  },
  "psv": {
    "includeHeaders": true
  },
  "json": {
    "pretty": true,
    "indentSize": 2,
    "asArray": false
  },
  "markdown": {
    "align": "left",
    "padding": true,
    "githubFlavor": true
  },
  "html": {
    "tableClass": "tablyful-table",
    "theadClass": "",
    "tbodyClass": "",
    "id": "",
    "caption": ""
  },
  "latex": {
    "tableEnvironment": "tabular",
    "columnSpec": "",
    "booktabs": true,
    "caption": "",
    "label": "",
    "centering": true,
    "useTableEnvironment": false
  },
  "sql": {
    "tableName": "table",
    "identifierQuote": "\"",
    "includeCreateTable": false
  },
  "yaml": {
    "indent": 2,
    "quoteStrings": false,
    "lineBreak": "\n"
  }
}
```

Precedence (lowest to highest):
1. Built-in defaults
2. Config file(s)
3. Repeatable `--set` overrides
4. Explicit shallow CLI flags like `--delimiter` and `--no-headers`

## `--set` Overrides

Use repeatable `--set` values with this syntax:

```text
--set <format>.<option>=<value>
```

Examples:

```bash
# boolean + int parsing
tablyful data.json --format json --set json.pretty=false --set json.indentSize=4

# string fallback
tablyful data.json --format csv --set csv.delimiter=';'

# sql format options
tablyful data.json --format sql --set sql.tableName=users --set sql.identifierQuote='"'

# yaml format options
tablyful data.json --format yaml --set yaml.indent=4 --set yaml.quoteStrings=true

# explicit CLI flags win over --set
tablyful data.json --format csv --set csv.delimiter=';' --delimiter ','
```

Value parsing:
- `true`/`false` -> boolean
- integer strings (for numeric fields) -> int
- everything else -> string

## Filtering and Columns

```bash
# numeric filter
tablyful data.json --format csv --filter "age>25"

# case-insensitive LIKE (`%` any substring, `_` any single char)
tablyful data.json --format csv --filter "name LIKE ali%"

# combine filters (AND semantics)
tablyful data.json --format csv --filter "age>=25" --filter "name LIKE a%"

# project columns after filtering
tablyful data.json --format yaml --filter "age>=25" --columns name,age
```

## Stats

```bash
tablyful data.json --format csv --stats
```

Example stderr output:

```text
[tablyful] rows: 2, columns: 2, detected: array-of-arrays, format: csv
```

## Discoverability

```bash
# list all allowed keys for --set
tablyful --list-set-keys

# list keys for one format
tablyful --list-set-keys-format csv
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT © Jose Martinez Santana
