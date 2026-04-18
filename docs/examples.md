# Examples

This page provides small, runnable CLI examples. Each example shows a sample input (JSON), the `tablyful` command used (including flags and `--set` overrides where applicable), and the expected output.

## 1 — Basic array-of-objects to CSV (positional file)

Input (examples/cli/sample.json):

```json
[
  {"name": "Alice", "age": 30, "city": "NYC"},
  {"name": "Bob", "age": 25, "city": "LA"}
]
```

Command:

```sh
tablyful examples/cli/sample.json --format csv
```

Output (stdout):

```txt
name,age,city
Alice,30,NYC
Bob,25,LA
```

## 2 — Read from stdin, write pretty JSON with config override

Input (stdin) — same as Example 1.

Command:

```sh
cat examples/cli/sample.json | tablyful --format json --set json.pretty=true
```

Output (stdout):

```json
[
  {
    "name": "Alice",
    "age": 30,
    "city": "NYC"
  },
  {
    "name": "Bob",
    "age": 25,
    "city": "LA"
  }
]
```

## 3 — Filter rows and select columns, output YAML

Command:

```sh
tablyful examples/cli/sample.json --format yaml --filter "age>25" --columns name,city
```

Output (stdout):

```yaml
- name: Alice
  city: NYC
```

## 4 — Generate SQL INSERTs with `--set` overrides

Command:

```sh
tablyful examples/cli/sample.json --format sql --set sql.tableName=people --set sql.includeCreateTable=true
```

Output (stdout) (abbreviated):

```sql
CREATE TABLE "people" (
  "name" TEXT,
  "age" INTEGER,
  "city" TEXT
);

INSERT INTO "people" ("name","age","city") VALUES ('Alice',30,'NYC');
INSERT INTO "people" ("name","age","city") VALUES ('Bob',25,'LA');
```

## 5 — Force CSV delimiter and omit headers

Command:

```sh
tablyful examples/cli/sample.json --format csv --set csv.delimiter=';' --no-headers
```

Output (stdout):

```txt
Alice;30;NYC
Bob;25;LA
```

## 6 — Show conversion stats and write to file

Command:

```sh
tablyful examples/cli/sample.json --format csv --output examples/cli/out.csv --stats
```

Expected stderr (example):

```sh
[tablyful] rows: 2, columns: 3, detected: array-of-objects, format: csv
```

The file `examples/cli/out.csv` will contain the CSV output.

## 7 — Discover `--set` keys for a format

Command:

```sh
tablyful --list-set-keys-format csv
```

This will print the allowed `csv.*` keys and their defaults so you can craft `--set csv.<key>=<value>` overrides.

## 8 — Markdown table output (center aligned)

Input: (examples/cli/sample.json)

```json
[
  {"name": "Alice", "age": 30, "city": "NYC"},
  {"name": "Bob", "age": 25, "city": "LA"}
]
```

Command:

```sh
tablyful examples/cli/sample.json --format markdown --set markdown.align=center
```

Output (stdout):

```md
| name  | age | city |
|:-----:|:---:|:----:|
| Alice | 30  | NYC  |
| Bob   | 25  | LA   |
```

## 9 — HTML output with class and caption (write to file)

Command:

```sh
tablyful examples/cli/sample.json --format html --set html.tableClass=report --set html.caption="User list" --output examples/cli/out.html
```

Output (examples/cli/out.html) (snippet):

```html
<table class="report">
  <caption>User list</caption>
  <thead>
    <tr><th>name</th><th>age</th><th>city</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>30</td><td>NYC</td></tr>
    <tr><td>Bob</td><td>25</td><td>LA</td></tr>
  </tbody>
</table>
```

## 10 — LaTeX output with booktabs and caption

Command:

```sh
tablyful examples/cli/sample.json --format latex --set latex.booktabs=true --set latex.caption="User list"
```

Output (stdout) (snippet):

```txt
\begin{tabular}{l r l}
\toprule
name & age & city \\
\midrule
Alice & 30 & NYC \\
Bob & 25 & LA \\
\bottomrule
\end{tabular}
```

## 11 — Filter with LIKE and project columns

Command:

```sh
tablyful examples/cli/sample.json --format csv --filter 'name LIKE A%' --columns name,age
```

Output (stdout):

```txt
name,age
Alice,30
```

## 12 — YAML output with quoted strings and custom indent (write to file)

Command:

```sh
tablyful examples/cli/sample.json --format yaml --set yaml.indent=4 --set yaml.quoteStrings=true --output examples/cli/out.yaml
```

Output (examples/cli/out.yaml):

```yaml
- name: "Alice"
    age: 30
    city: "NYC"
- name: "Bob"
    age: 25
    city: "LA"
```

## 13 — Force input parser (array-of-arrays)

Input (examples/cli/sample-arrays.json):

```json
[
  ["name", "age", "city"],
  ["Alice", 30, "NYC"],
  ["Bob", 25, "LA"]
]
```

Command:

```sh
tablyful examples/cli/sample-arrays.json --input array-of-arrays --format csv
```

Output (stdout):

```txt
name,age,city
Alice,30,NYC
Bob,25,LA
```

## 14 — Input as object-of-arrays (force parser) and output TSV

Input (examples/cli/sample-object-arrays.json):

```json
{
  "name": ["Alice", "Bob"],
  "age": [30, 25],
  "city": ["NYC", "LA"]
}
```

Command:

```sh
tablyful examples/cli/sample-object-arrays.json --input object-of-arrays --format tsv
```

Output (stdout):

```txt
name	age	city
Alice	30	NYC
Bob	25	LA
```

## 15 — Combine `--config` with `--set` (precedence)

Assume the project has `.tablyfulrc.json` with `csv.delimiter` set to `","`.

Command:

```sh
tablyful examples/cli/sample.json --config ./.tablyfulrc.json --set csv.delimiter=';' --format csv
```

Because explicit `--set` and `--config` merge, and `--set` wins over the config file, the output will use `;` as the CSV delimiter.
