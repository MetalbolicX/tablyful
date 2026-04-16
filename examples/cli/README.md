# CLI Examples

This folder shows practical `tablyful` CLI usage with config files and `--set` overrides.

## Files

- `sample.json`: sample array-of-objects input
- `.tablyfulrc.json`: sample local config

## Commands

```bash
# from repo root
pnpm build

# convert sample input using config defaults
node dist/cli.mjs examples/cli/sample.json --config examples/cli/.tablyfulrc.json

# override delimiter inline
node dist/cli.mjs examples/cli/sample.json --format csv --set csv.delimiter=';'

# show available --set keys
node dist/cli.mjs --list-set-keys
node dist/cli.mjs --list-set-keys-format json
```

## Precedence Reminder

`defaults < config file(s) < --set < explicit shallow flags`

For example, this command still uses comma because `--delimiter` wins:

```bash
node dist/cli.mjs examples/cli/sample.json --format csv --set csv.delimiter=';' --delimiter ','
```
