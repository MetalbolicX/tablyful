# Tablyful - ReScript Edition

`tablyful` is a CLI-first tool for converting JSON tabular data between `csv`, `json`, `markdown`, `html`, and `latex`.

[![ReScript](https://img.shields.io/badge/ReScript-v12.2.0-red)](https://rescript-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js->=22.0.0-blue)](https://nodejs.org/)

## Features

- Multiple input shapes: array of arrays, array of objects, object of arrays, object of objects
- Multiple output formats: CSV, JSON, Markdown, HTML, LaTeX
- Unix-friendly CLI (stdin/stdout by default, positional file input supported)
- Cascading JSON config (`.tablyfulrc.json`)
- Repeatable `--set format.option=value` overrides for format-specific options
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

# force parser and customize csv delimiter
cat data.json | tablyful --input array-of-objects --format csv --set csv.delimiter=';'

# use config and then override one value inline
tablyful data.json --config ./.tablyfulrc.json --set json.pretty=false --format json
```

## CLI Options

```text
Usage: tablyful [options] [file]

Options:
  -f, --format <format>           Output format (csv|json|markdown|html|latex)
  -i, --input <format>            Input format (array-of-arrays|array-of-objects|object-of-arrays|object-of-objects)
      --set <key=value>           Override format option (repeatable, e.g. --set json.pretty=false)
      --list-set-keys             Print allowed --set keys and defaults
      --list-set-keys-format <f>  Print allowed --set keys for one format
  -c, --config <path>             Path to config JSON file
  -d, --delimiter <char>          CSV delimiter override
      --no-headers                Omit CSV headers in output
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

# explicit CLI flags win over --set
tablyful data.json --format csv --set csv.delimiter=';' --delimiter ','
```

Value parsing:
- `true`/`false` -> boolean
- integer strings (for numeric fields) -> int
- everything else -> string

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
