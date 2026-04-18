# tablyful

Welcome to the tablyful documentation. This project is CLI-first and focuses on converting semi-structured JSON tabular data into common table formats used in data pipelines and reporting.

## What problem does tablyful solve?

tablyful makes it easy to transform JSON data (arrays of objects, arrays of arrays, and other common shapes) into formats like CSV, TSV, PSV, JSON, Markdown, HTML, LaTeX, SQL, and YAML. It is designed for use in shell scripts and CI/CD pipelines where predictable, composable command-line tools are required.

## General workflow

```mermaid
flowchart LR
  A[Input: file | stdin] --> B[Parser (auto-detect input shape)]
  B --> C[Normalized TableData]
  C --> D[Formatter (csv|json|markdown|html|latex|sql|yaml|...)]
  D --> E[Output: stdout | file]
```

## Design rationale

Why CLI-first? The CLI model makes tablyful easy to use in automation and pipelines. It follows Unix philosophy: small, composable tools that read stdin, write stdout, and can be chained.

Why ReScript? ReScript provides strong type safety and predictable JavaScript output. The implementation benefits from exhaustive pattern matching (useful for parser and formatter dispatch), a compact runtime, and a small generated JS surface that integrates well with Node.js.

## How it compares (short)

tablyful focuses specifically on converting JSON tabular data between many common textual formats with streaming support and discoverable, repeatable configuration. Compared to general-purpose JSON tools or monolithic libraries, it is lightweight, pipeline-friendly, and configuration-centric.
