# Introduction

Tablyful solves a simple but common problem: converting semi-structured JSON tabular data into the wide range of textual table formats used in reporting, shell scripts, and data pipelines. Instead of writing ad-hoc scripts to transform JSON into CSV, SQL, Markdown, HTML, LaTeX or YAML, tablyful provides a single CLI that understands several JSON shapes and produces consistent, configurable output.

Why CLI-first?

- Shell-friendly: designed to be used in pipelines (`stdin` → `tablyful` → `stdout`) and in scripts.
- Discoverable: small command surface with `--list-set-keys` to explore configurable options.
- Reproducible: project-level `.tablyfulrc.json` files make conversions repeatable across environments.

Why ReScript?

ReScript offers stronger compile-time guarantees and a terse syntax that compiles to predictable JavaScript. The CLI benefits from:

- Type-safety for the parser/formatter logic (fewer runtime surprises when handling many input shapes),
- Small and readable JS output suitable for a Node.js CLI, and
- Interop with NPM ecosystem while keeping a robust core implementation.

Short comparison with alternatives (2–3 sentences each):

- jq: excellent for JSON queries and transformations, but not focused on producing tabular textual formats (csv/markdown/sql) and has a steeper query language for table-style projections.
- csvkit: a mature Python toolkit focused on CSV manipulation; tablyful differs by accepting multiple JSON input shapes and providing many output formats out of the box with streaming.
- Miller (mlr): great for columnar transformations and streaming; tablyful complements it by providing broader output formats (markdown, html, latex, sql) and a JSON-first parsing model.
