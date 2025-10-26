# Tablyful

## Overview

Tablyful is a TypeScript library for formatting semi-structured data in various output formats, inspired by Python's **tabulate** package.

## Features

- Supports various input data formats, including:
  1. Arrays of arrays.
  2. Arrays of objects.
  3. Objects of arrays.
  4. Objects of objects.
- It creates a new file that exports the input data in the next formats:
  1. Markdown.
  2. LaTeX.
  3. HTML (with semantic tags).
  4. CSV.
  5. JSON.
- It should consider that a dataset can be very lartge, so it must consider the use of Node.js streams for the input and output of data. In addition, it must be optimized for performance and memory usage.
- It should consider the rename of the headers can be specified freely using an array of strings.
- It can add a columns numbering the rows.

## Tech stack

- TypeScript.
- Node.js native modules.

## Arquitecture

Folder structure:

```txt
src/
├── core/                           # Core functionality
│   ├── parser/                     # Input data parsers
│   │   ├── base-parser.ts         # Base parser interface
│   │   ├── array-parser.ts        # Array of arrays parser
│   │   ├── object-parser.ts       # Array of objects parser
│   │   ├── nested-object-parser.ts # Objects of arrays/objects parser
│   │   └── index.ts
│   ├── table/                      # Table representation
│   │   ├── table.ts               # Core table class
│   │   ├── column.ts              # Column metadata
│   │   ├── row.ts                 # Row representation
│   │   └── index.ts
│   ├── stream/                     # Stream processing
│   │   ├── transform-stream.ts    # Base transform stream
│   │   ├── parser-stream.ts       # Parser transform stream
│   │   ├── formatter-stream.ts    # Formatter transform stream
│   │   └── index.ts
│   └── index.ts
├── formatters/                     # Output formatters
│   ├── base/                       # Base formatter
│   │   ├── base-formatter.ts      # Base formatter interface
│   │   ├── stream-formatter.ts    # Stream-based formatter base
│   │   └── index.ts
│   ├── markdown/                   # Markdown formatter
│   │   ├── markdown-formatter.ts
│   │   ├── markdown-stream.ts
│   │   └── index.ts
│   ├── latex/                      # LaTeX formatter
│   │   ├── latex-formatter.ts
│   │   ├── latex-stream.ts
│   │   └── index.ts
│   ├── html/                       # HTML formatter
│   │   ├── html-formatter.ts
│   │   ├── html-stream.ts
│   │   └── index.ts
│   ├── csv/                        # CSV formatter
│   │   ├── csv-formatter.ts
│   │   ├── csv-stream.ts
│   │   └── index.ts
│   ├── json/                       # JSON formatter
│   │   ├── json-formatter.ts
│   │   ├── json-stream.ts
│   │   └── index.ts
│   └── index.ts
├── utils/                          # Utility functions
│   ├── type-guards.ts             # Type checking utilities
│   ├── stream-utils.ts            # Stream helper functions
│   ├── validation.ts              # Input validation
│   └── index.ts
├── types/                          # TypeScript type definitions
│   ├── input.ts                   # Input data types
│   ├── output.ts                  # Output format types
│   ├── options.ts                 # Configuration options
│   ├── formatter.ts               # Formatter interfaces
│   └── index.ts
├── api/                           # Public API
│   ├── tablyful.ts               # Main API class
│   ├── factory.ts                # Factory functions
│   └── index.ts
└── index.ts                      # Main entry point

tests/                            # Test files
├── unit/                         # Unit tests
│   ├── core/
│   ├── formatters/
│   ├── utils/
│   └── api/
├── integration/                  # Integration tests
├── performance/                  # Performance tests
└── fixtures/                     # Test data fixtures

examples/                         # Usage examples
├── basic/                        # Basic usage examples
├── streaming/                    # Stream processing examples
├── custom-formatters/           # Custom formatter examples
└── performance/                 # Performance optimization examples

docs/                            # Documentation
├── api/                         # API documentation
├── guides/                      # User guides
└── contributing/               # Contributing guidelines
```

## Key Design Decisions

1. Stream-First Architecture
All formatters must support streaming to handle large datasets
Use Node.js Transform streams for consistent interface
Implement proper backpressure handling
2. Type Safety
Comprehensive TypeScript types for all data formats
Runtime type validation for JavaScript users
Generic types for extensibility
3. Memory Efficiency
Process data in chunks rather than loading everything into memory
Use generators and iterators where appropriate
Implement object pooling for frequently created objects
4. Extensibility
Plugin architecture for custom formatters
Configurable parsing strategies
Middleware support for data transformation
5. Error Handling
Graceful degradation for malformed data
Detailed error messages with context
Recovery mechanisms where possible
6. Performance
Lazy evaluation where possible
Efficient string building for formatters
Minimal object creation in hot paths
