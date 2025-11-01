# API Reference

This page documents the core functions and types of the tablyful module, which you can use to build your application.

## Input Data Types

Tablyful accepts the following input data formats:

- Array of Arrays: `Array<Array<unknown>>`
- Array of Objects: `Array<Record<string, unknown>>`
- Object of Arrays: `Record<string, Array<unknown>>`
- Object of Objects: `Record<string, Record<string, unknown>>`

## Core Functions

All formatting functions accept your data and an optional options object.

1. toCsv(data, options?)

Converts your data to a CSV string.

**Options** (CsvFormatterOptions):

- delimiter (string, default: `,`)
- quote (string, default: `"`
- escape (string, default: `"`
- lineBreak (string, default: `\n`)
- includeHeaders (boolean, default: true)

Example:

```javascript
import { toCsv } from "tablyful";
const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
const csv = toCsv(data);
```

Outputs:

```txt
name,age
Alice,30
Bob,25
```

2. toJson(data, options?)

Converts your data to a JSON string.

**Options** (JsonFormatterOptions):

- pretty (boolean, default: false)
- indentSize (number, default: 2)
- asArray (boolean, default: true)

Example:

```javascript
import { toJson } from "tablyful";
const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
const json = toJson(data);
```

Outputs:

```json
[
  {
    "name": "Alice",
    "age": 30
  },
  {
    "name": "Bob",
    "age": 25
  }
]
```

3. toMarkdown(data, options?)

Converts your data to a Markdown table string.

**Options** (MarkdownFormatterOptions):

- align (`left` | `center` | `right`, default: `left`)
- padding (boolean, default: true)
- githubFlavor (boolean, default: true)

Example:

```javascript
import { toMarkdown } from "tablyful";
const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
const markdown = toMarkdown(data);
```

Outputs:

```txt
| name  | age |
|-------|-----|
| Alice | 30  |
| Bob   | 25  |
```

4. toHtml(data, options?)

Converts your data to an HTML table string.

**Options** (HtmlFormatterOptions):

- tableClass (string)
- theadClass (string)
- tbodyClass (string)
- id (string)
- caption (string)

Example:

```javascript
import { toHtml } from "tablyful";
const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
const html = toHtml(data);
```

Outputs:

```html
<table>
  <thead>
    <tr>
      <th>name</th>
      <th>age</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice</td>
      <td>30</td>
    </tr>
    <tr>
      <td>Bob</td>
      <td>25</td>
    </tr>
  </tbody>
</table>
```

5. toLatex(data, options?)

Converts your data to a LaTeX table string.

**Options** (LatexFormatterOptions):

- align (`left` | `center` | `right`, default: `left`)
- borders (boolean, default: true)
- boldHeaders (boolean, default: true)
- includeHeader (boolean, default: true)
- useTableEnvironment (boolean, default: true)
- centering (boolean, default: true)
- tableEnvironment (string, default: `"table"`)
- columnSpec (string, custom column specification)
- booktabs (boolean)
- caption (string)
- label (string)

Example:

```javascript
import { toLatex } from "tablyful";
const data = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];
const latex = toLatex(data);
```

Outputs:

```txt
\begin{tabular}{|l|r|}
\hline
name  & age \\
\hline
Alice & 30  \\
Bob   & 25  \\
\hline
\end{tabular}
```

## Common Options

All formatting functions accept these general options (TablyfulOptions):

- headers: string[] — Custom column headers
- hasHeaders: boolean — Whether the first row is headers (for array of arrays)
- rowNumberHeader: string — Header for row numbers column (default: #)
- hasRowNumbers: boolean — Add a row number column
- outputFormat: `"csv"` | `"json"` | `"markdown"` | `"html"` | `"latex"`
- formatOptions: Format-specific options (see above)

## Advanced Usage

- Use the Tablyful class for more control (parsing, formatting, streaming).
- Use createTablyful(options) to create an instance with default options.
- Use parse(data, options?) to convert input to normalized table data.
- Use format(tableData, format, options?) to format pre-parsed data.
