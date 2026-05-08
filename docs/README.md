
# tablyful

Hey there! 👋

If you've ever wrestled with messy JSON files and spent too many hours writing brittle scripts to turn them into CSVs, Markdown tables, SQL inserts, or HTML reports — you're in the right place. tablyful is the smart alternative that makes those repetitive, flaky transformations simple, reliable, and pipeline-friendly.

## What Problem Does tablyful Solve?

Current state: people repeatedly craft brittle ad-hoc scripts, copy-paste transformations, or force heavy frameworks to do simple table conversions. It slows you down and leaks edge cases into production.

Common (but flawed) alternatives:

1. Write custom scripts for each dataset — quick at first, unmaintainable and error-prone as soon as data shapes change.
2. Use general JSON tools (jq) — powerful but verbose and awkward for producing polished tabular textual formats.
3. Pull in heavyweight toolchains (Python libraries, ETL frameworks) — works but is overkill for small conversions and adds maintenance burden.

The solution: tablyful is a lightweight, CLI-first tool that normalizes multiple JSON input shapes into a consistent tabular model and formats them into a wide range of textual table outputs. Core concept: JSON-first normalization + configurable formatters for common reporting formats.

## The Magic: Input → tablyful → Output

```mermaid
flowchart LR
  subgraph input [Input]
    direction TB
    A[file or stdin: JSON]:::in
    A --> A2[shapes: array of objects | array of arrays | object of arrays | object of objects]:::in
  end

  subgraph process [tablyful]
    direction TB
    P1[Parser — auto-detect & normalize]:::proc
    P2[TableData — normalized rows & columns]:::proc
    P3[Formatter — csv | markdown | html | sql | yaml | latex | json]:::proc
  end

  subgraph output [Output]
    direction TB
    O[stdout or file — clean, streamable textual tables]:::out
  end

  A2 --> P1 --> P2 --> P3 --> O

  classDef in fill:#f9f,stroke:#333,stroke-width:1px,color:#222;
  classDef proc fill:#fffbcc,stroke:#aa8800,stroke-width:1px,color:#222;
  classDef out fill:#e6ffed,stroke:#0a7f3b,stroke-width:1px,color:#052;
```

Why this workflow is beautiful: it separates responsibilities (detect → normalize → format) so small pieces are predictable, testable, and streamable. Examples:

- Turn a nested JSON array of objects into a Markdown report for README consumption.
- Stream a very large JSON array to CSV without loading everything into memory.

## Why We Built It This Way

### JSON-First Normalization for Every Use Case

tablyful handles a variety of real-world scenarios:

- Converting API dump JSON into CSV for quick analysis.
- Generating Markdown tables for documentation or CHANGELOGs.
- Emitting SQL INSERT statements for small data migrations.
- Producing HTML tables for lightweight reporting dashboards.
- Streaming ETL-style conversion of very large JSON arrays into columnar formats.

Built-in features that make this possible:

- Auto-detecting several JSON input shapes and normalizing them to a single TableData model.
- Multiple formatter backends (csv, markdown, html, latex, sql, yaml, json).
- Streaming mode for memory-efficient large-file processing.
- Config-driven behavior via `.tablyfulrc.json` and `--set` overrides for reproducibility.

### Why ReScript?

Why this language/stack matters to you:

- Type safety reduces runtime surprises when parsing many input shapes.
- Small, predictable JS output that runs everywhere Node runs (CLI portability).
- Excellent interop with the npm ecosystem for packaging and distribution.
- Fast developer iteration with simple, explicit codegen to JS.

## How Does It Compare?

Competitive landscape:

- jq — great for querying JSON, but not focused on polished table outputs or easy column projection for reports.
- csvkit — mature CSV-first toolkit; tablyful accepts multiple JSON shapes and produces a broader set of textual formats out of the box.
- Miller (mlr) — excels at streaming columnar ops; tablyful complements it by focusing on JSON-first normalization and rich output formats (Markdown, HTML, LaTeX, SQL).

The differentiator: Unlike jq, tablyful is opinionated about turning JSON into tables with minimal friction. Compared to csvkit or mlr, tablyful is JSON-native and supplies many textual formatter backends without pulling in a heavy stack.

## Ready to Dive In?

- 📖 **Getting Started**(getting-started.md) — Installation and your first run.
- 💡 **Examples**(examples.md) — Real-world patterns and sample commands.
- ⚙️ **CLI Reference**(cli.md) — All flags, config options, and examples.
- 🛠️ **Configuration**(.tablyfulrc.md) — How to make conversions reproducible across projects.

Let's start building! 🚀
