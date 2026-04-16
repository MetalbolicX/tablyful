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

# automatic streaming for large arrays (csv|tsv|psv|sql|html|yaml)
cat data.json | tablyful --format csv --output out.csv

# repeatable --set overrides
tablyful data.json --format json --set json.pretty=false --set json.indentSize=4

# row filtering + column selection
tablyful data.json --format yaml --filter "name LIKE ali%" --columns name,age

# SQL placeholders with optional table creation
tablyful data.json --format sql --set sql.tableName=users --set sql.includeCreateTable=true

# conversion diagnostics
tablyful data.json --format csv --stats

# discover valid --set keys
tablyful --list-set-keys
tablyful --list-set-keys-format csv
```

Automatic streaming is used for JSON arrays of arrays/objects when output format is: `csv`, `tsv`, `psv`, `sql`, `html`, `yaml`.

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
