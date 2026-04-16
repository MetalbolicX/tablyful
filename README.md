# tablyful

`tablyful` is a CLI-first tool that converts JSON tabular data into `csv`, `json`, `markdown`, `html`, and `latex`.

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

# repeatable --set overrides
tablyful data.json --format json --set json.pretty=false --set json.indentSize=4

# discover valid --set keys
tablyful --list-set-keys
tablyful --list-set-keys-format csv
```

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
