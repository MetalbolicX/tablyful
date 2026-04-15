# Tablyful - ReScript Edition

> Convert data between table formats with a functional, type-safe approach

[![ReScript](https://img.shields.io/badge/ReScript-v12.2.0-red)](https://rescript-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js->=22.0.0-blue)](https://nodejs.org/)

## Features

- **Multiple Input Formats**: Array of arrays, array of objects, object of arrays, object of objects
- **Multiple Output Formats**: CSV, JSON, Markdown, HTML, LaTeX
- **Type-Safe**: Built with ReScript for compile-time safety
- **CLI Support**: Unix-friendly with stdin/stdout pipeline support
- **Configuration Files**: Cascading config via `.tablyfulrc.json`
- **Detailed Errors**: Context-rich error messages with suggestions
- **Functional Design**: Pure functions, immutability, and composability

## Installation

```bash
npm install tablyful
```

## Quick Start

### JavaScript/TypeScript API

```javascript
import { toCsv, toJson, toMarkdown } from 'tablyful';

// Convert array of arrays to CSV
const data = [
  ['name', 'age', 'city'],
  ['Alice', 30, 'NYC'],
  ['Bob', 25, 'LA']
];

const csv = toCsv({ input: JSON.stringify(data) });
console.log(csv);
// Output:
// name,age,city
// Alice,30,NYC
// Bob,25,LA

// Convert to JSON
const json = toJson({ input: JSON.stringify(data) });
console.log(json);
```

### CLI Usage

```bash
# Convert JSON to CSV
cat data.json | tablyful --format csv

# Convert CSV to pretty JSON
tablyful data.csv --format json --pretty

# Convert with custom headers
tablyful data.json --headers "Name,Age,City" --format markdown

# Use config file
tablyful data.json --config ./.tablyfulrc.json

# Pipeline example
curl -s api.json | tablyful --format markdown | less
```

## Configuration

Create a `.tablyfulrc.json` file in your project root or home directory:

```json
{
  "input": {
    "hasHeaders": true,
    "encoding": "utf8"
  },
  "output": {
    "defaultFormat": "csv",
    "includeRowNumbers": false
  },
  "csv": {
    "delimiter": ",",
    "quote": "\"",
    "includeHeaders": true
  },
  "json": {
    "pretty": true,
    "indentSize": 2
  },
  "markdown": {
    "align": "left",
    "githubFlavor": true
  }
}
```

Configuration cascade (highest priority first):
1. CLI arguments
2. `./.tablyfulrc.json` (current directory)
3. `~/.tablyfulrc.json` (home directory)
4. Default options

## CLI Options

```
USAGE:
  tablyful [OPTIONS] [INPUT_FILE]

OPTIONS:
  -i, --input <path>       Input file (default: stdin)
  -o, --output <path>      Output file (default: stdout)
  -f, --format <format>    Output format: csv, json, markdown, html, latex
  -h, --headers <list>     Custom headers (comma-separated)
      --has-headers        Input has header row
      --no-headers         Input does not have header row
  -d, --delimiter <char>   CSV delimiter (default: ,)
  -p, --pretty             Pretty print JSON output
      --compact            Compact JSON output
  -n, --row-numbers        Include row numbers
  -c, --config <path>      Config file path
      --help               Show help message
```

## API Reference

### Core Functions

```rescript
// Convert to specific format
Tablyful.toCsv(~input: Js.Json.t, ~options: Options.t): result<string>
Tablyful.toJson(~input: Js.Json.t, ~options: Options.t): result<string>
Tablyful.toMarkdown(~input: Js.Json.t, ~options: Options.t): result<string>
Tablyful.toHtml(~input: Js.Json.t, ~options: Options.t): result<string>
Tablyful.toLatex(~input: Js.Json.t, ~options: Options.t): result<string>

// Generic convert function
Tablyful.convert(
  ~input: Js.Json.t,
  ~format: string,
  ~options: Options.t
): result<string>

// Parse and format separately
Tablyful.parse(~input: Js.Json.t, ~options: Options.t): result<TableData.t>
Tablyful.format(
  ~data: TableData.t,
  ~format: string,
  ~options: Options.t
): result<string>

// Utility functions
Tablyful.detectFormat(Js.Json.t): string
Tablyful.availableParsers(): array<string>
Tablyful.availableFormatters(): array<string>
```

### Error Handling

All functions return `result<'a, Error.t>`, providing detailed error information:

```rescript
switch Tablyful.toCsv(~input=data, ~options) {
| Ok(csv) => Js.log(csv)
| Error(err) =>
  Js.log(err->Error.toString)
  // Output: [PARSE_ERROR] Invalid JSON format (row 5, column 3)
  // 💡 Suggestion: Ensure the input is valid JSON
}
```

## Architecture

This library uses functional programming patterns:

- **GADTs** (Generalized Algebraic Data Types) for type-safe input handling
- **Functors** for creating parsers and formatters with common functionality
- **Module Types** for defining contracts
- **Pipe-first** operator for composable data flow
- **Result/Option** types for explicit error handling

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run res:build

# Watch mode
pnpm run res:dev

# Run tests
pnpm test

# Test watch mode
pnpm test:watch

# Clean build artifacts
pnpm run res:clean
```

## License

MIT © José Martínez Santana
