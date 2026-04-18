
# CLI Configuration Reference

This page documents the configuration file model for the `tablyful` CLI and how to use it together with `--set` overrides and CLI flags.

## Features

`tablyful` is a CLI-first tool focused on fast, predictable conversion of JSON tabular data into common table formats. Key features:

- Multiple input shapes: array of arrays, array of objects, object of arrays, object of objects
- Multiple output formats: csv, tsv, psv, json, markdown, html, latex, sql, yaml
- Unix-friendly CLI: stdin/stdout by default, positional file input supported
- Cascading JSON config (`.tablyfulrc.json`) with repeatable `--set` overrides
- Row filtering with SQL-like predicates (`=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`)
- Column projection via `--columns`
- Conversion diagnostics via `--stats`
- Automatic streaming for large JSON arrays when output is one of: csv, tsv, psv, sql, html, yaml
- Discoverability helpers: `--list-set-keys` and `--list-set-keys-format`

## Purpose

`tablyful` reads JSON input (from a file or stdin), parses it, and formats it into one of the supported output formats. The configuration file `.tablyfulrc.json` lets you define project defaults so you don't need to repeat flags on every run.

## Where to put the config

Place a JSON file named `.tablyfulrc.json` in your project root (or in your home directory). You can also pass an explicit path with `--config <path>`.

## Example config (`.tablyfulrc.json`)

```json
{
  "input": { "hasHeaders": true, "encoding": "utf8" },
  "output": { "defaultFormat": "csv", "includeRowNumbers": false, "rowNumberHeader": "#" },
  "csv": { "delimiter": ",", "quote": "\"", "escape": "\\", "lineBreak": "\n", "includeHeaders": true },
  "json": { "pretty": true, "indentSize": 2, "asArray": false },
  "markdown": { "align": "left", "padding": true, "githubFlavor": true },
  "html": { "tableClass": "tablyful-table", "theadClass": "", "tbodyClass": "", "id": "", "caption": "" },
  "latex": { "tableEnvironment": "tabular", "columnSpec": "", "booktabs": true, "caption": "", "label": "", "centering": true, "useTableEnvironment": false },
  "sql": { "tableName": "table", "identifierQuote": "\"", "includeCreateTable": false },
  "yaml": { "indent": 2, "quoteStrings": false, "lineBreak": "\n" }
}
```

## Top-level keys

- `input` — parsing options
  - `hasHeaders` (boolean) — whether arrays-of-arrays input has a header row (default: true)
  - `encoding` (string) — file encoding for input files (default: `utf8`)

- `output` — global output defaults
  - `defaultFormat` (string) — one of: `csv`, `tsv`, `psv`, `json`, `markdown`, `html`, `latex`, `sql`, `yaml`
  - `includeRowNumbers` (boolean)
  - `rowNumberHeader` (string)

- Format-specific objects: `csv`, `json`, `markdown`, `html`, `latex`, `sql`, `yaml` — see below.

## Format-specific keys (summary)

- `csv` / `tsv` / `psv`
  - `delimiter` (string)
  - `quote` (string)
  - `escape` (string)
  - `lineBreak` (string)
  - `includeHeaders` (boolean)

- `json`
  - `pretty` (boolean)
  - `indentSize` (number)
  - `asArray` (boolean)

- `markdown`
  - `align` (`left|center|right`)
  - `padding` (boolean)
  - `githubFlavor` (boolean)

- `html`
  - `tableClass`, `theadClass`, `tbodyClass`, `id`, `caption`

- `latex`
  - `tableEnvironment`, `columnSpec`, `booktabs`, `caption`, `label`, `centering`, `useTableEnvironment`

- `sql`
  - `tableName`, `identifierQuote`, `includeCreateTable`

- `yaml`
  - `indent`, `quoteStrings`, `lineBreak`

## How precedence works

When resolving options the CLI applies values in this order (lowest → highest):

1. Built-in defaults
2. Config file(s) (`.tablyfulrc.json` in the CWD or home directory)
3. Repeatable `--set` overrides
4. Explicit shallow CLI flags (for example `--delimiter` or `--no-headers`)

Example: an explicit `--delimiter` flag overrides `--set csv.delimiter=';'`.

## `--set` overrides

Use `--set` to override nested config keys inline. Syntax:

```sh
--set <format>.<option>=<value>
```

Examples:

```sh
tablyful data.json --format json --set json.pretty=false --set json.indentSize=4
tablyful data.json --format csv --set csv.delimiter=';'
tablyful data.json --format sql --set sql.tableName=users --set sql.includeCreateTable=true
```

Value parsing rules applied by the CLI:

- `true`/`false` → boolean
- integer-like strings → number
- otherwise → string

Repeatable `--set` entries are merged shallowly into the corresponding format object.

## Useful CLI flags (summary)

```text
Usage: tablyful [options] [file]

Options:
  -f, --format <format>           Output format (csv|tsv|psv|json|markdown|html|latex|sql|yaml)
  -i, --input <format>            Input format (optional; auto-detected when omitted)
  -o, --output <path>             Write output to file instead of stdout
      --set <key=value>           Override format option (repeatable)
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
