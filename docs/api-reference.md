
# CLI Configuration Reference

This page documents the configuration file model for the `tablyful` CLI and how to use it together with `--set` overrides and CLI flags.

## Useful CLI flags (summary)

```text
Usage: tablyful [options] [file]
Convert tabular data between formats.

Options:
  -f, --format <format>   Output format (csv|tsv|psv|json|markdown|html|latex|sql|yaml|ndjson)
  -i, --input <format>    Input format (json|ndjson|csv|tsv|psv|html|markdown|latex|yaml|xml|sql; auto-detected when omitted)
  -o, --output <path>     Write output to file instead of stdout
      --set <key=value>   Override format option (repeatable, e.g. --set json.pretty=false)
      --list-set-keys      Print allowed --set keys and defaults
      --list-set-keys-format <format>
                           Print allowed --set keys for one format
  -C, --columns <names>   Comma-separated output columns (e.g. name,age)
      --filter <expr>     Filter rows (repeatable; supports = != > < >= <= LIKE)
      --stats             Print conversion stats to stderr
      --stream            Force streaming mode (line-by-line processing)
      --no-stream         Force buffered mode (read entire input first)
      --examples          Show usage examples
  -c, --config <path>     Path to config JSON file
  -d, --delimiter <char>  CSV delimiter override
      --max-file-size <n>  Maximum input file size in bytes (default: 524288000)
      --no-headers        Omit headers in CSV/TSV/PSV output
  -h, --help              Show this help message
  -v, --version           Show version
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
