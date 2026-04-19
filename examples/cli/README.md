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

# write to output file
node dist/cli.mjs examples/cli/sample.json --format csv --output examples/cli/out.csv

# automatic streaming for large csv/html/yaml/sql outputs
node dist/cli.mjs examples/cli/sample.json --format csv --output examples/cli/out-stream.csv

# filter + select columns
node dist/cli.mjs examples/cli/sample.json --format yaml --filter "name LIKE ali%" --columns name,age

# sql placeholders + create table
node dist/cli.mjs examples/cli/sample.json --format sql --set sql.tableName=users --set sql.includeCreateTable=true

# print conversion stats
node dist/cli.mjs examples/cli/sample.json --format csv --stats

# show available --set keys
node dist/cli.mjs --list-set-keys
node dist/cli.mjs --list-set-keys-format json
```

# NDJSON examples

# stream NDJSON stdin to CSV
node dist/cli.mjs --input ndjson --format csv < examples/cli/sample.ndjson

# produce NDJSON from a JSON file
node dist/cli.mjs examples/cli/sample.json --format ndjson > examples/cli/sample.out.ndjson


## Precedence Reminder

`defaults < config file(s) < --set < explicit shallow flags`

For example, this command still uses comma because `--delimiter` wins:

```bash
node dist/cli.mjs examples/cli/sample.json --format csv --set csv.delimiter=';' --delimiter ','
```
