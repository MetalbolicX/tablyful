/**
 * DSV Parser (Delimiter-Separated Values)
 * Pure ReScript state machine parser for CSV, TSV, PSV.
 * Handles RFC 4180 quoting, embedded newlines, BOM stripping.
 */

@send external charAt: (string, int) => string = "charAt"
@send external codePointAt: (string, int) => option<int> = "codePointAt"

type parsed = {
  headers: array<string>,
  rows: array<array<string>>,
}

// States for the parser state machine
type state =
  | FieldStart
  | UnquotedField
  | QuotedField
  | QuoteInQuotedField

let stripBom = (input: string): string => {
  switch codePointAt(input, 0) {
  | Some(0xFEFF) => input->String.slice(~start=1, ~end=input->String.length)
  | _ => input
  }
}

let parse = (input: string, ~delimiter: string): parsed => {
  let cleaned = stripBom(input)
  let len = cleaned->String.length

  if len === 0 {
    {headers: [], rows: []}
  } else {
    let pos = ref(0)
    let currentState = ref(FieldStart)
    let fieldParts: ref<array<string>> = ref([])
    let currentRow: ref<array<string>> = ref([])
    let allRows: ref<array<array<string>>> = ref([])

    let appendToField = (value: string) => {
      ignore(fieldParts.contents->Array.push(value))
    }

    let flushField = () => {
      let value = fieldParts.contents->Array.join("")
      fieldParts := []
      value
    }

    let finishField = () => {
      ignore(currentRow.contents->Array.push(flushField()))
    }

    let finishRow = () => {
      finishField()
      ignore(allRows.contents->Array.push(currentRow.contents))
      currentRow := []
    }

    while pos.contents < len {
      let ch = charAt(cleaned, pos.contents)

      switch currentState.contents {
      | FieldStart =>
        if ch === "\"" {
          currentState := QuotedField
        } else if ch === delimiter {
          finishField()
          currentState := FieldStart
        } else if ch === "\r" {
          // Check for \r\n
          if pos.contents + 1 < len && charAt(cleaned, pos.contents + 1) === "\n" {
            pos := pos.contents + 1
          }
          finishRow()
          currentState := FieldStart
        } else if ch === "\n" {
          finishRow()
          currentState := FieldStart
        } else {
          appendToField(ch)
          currentState := UnquotedField
        }

      | UnquotedField =>
        if ch === delimiter {
          finishField()
          currentState := FieldStart
        } else if ch === "\r" {
          if pos.contents + 1 < len && charAt(cleaned, pos.contents + 1) === "\n" {
            pos := pos.contents + 1
          }
          finishRow()
          currentState := FieldStart
        } else if ch === "\n" {
          finishRow()
          currentState := FieldStart
        } else {
          appendToField(ch)
        }

      | QuotedField =>
        if ch === "\"" {
          currentState := QuoteInQuotedField
        } else {
          appendToField(ch)
        }

      | QuoteInQuotedField =>
        if ch === "\"" {
          // Escaped quote ("") inside quoted field
          appendToField("\"")
          currentState := QuotedField
        } else if ch === delimiter {
          finishField()
          currentState := FieldStart
        } else if ch === "\r" {
          if pos.contents + 1 < len && charAt(cleaned, pos.contents + 1) === "\n" {
            pos := pos.contents + 1
          }
          finishRow()
          currentState := FieldStart
        } else if ch === "\n" {
          finishRow()
          currentState := FieldStart
        } else {
          // Character after closing quote that isn't delimiter or newline
          // Treat as part of field (lenient parsing)
          appendToField(ch)
          currentState := UnquotedField
        }
      }

      pos := pos.contents + 1
    }

    // Finish any remaining field/row
    // Only add if there's actual content (not just trailing newline)
    if fieldParts.contents->Array.length > 0 || currentRow.contents->Array.length > 0 {
      finishRow()
    }

    let rows = allRows.contents

    switch rows->Array.get(0) {
    | None => {headers: [], rows: []}
    | Some(headerRow) => {
        headers: headerRow,
        rows: rows->Array.slice(~start=1, ~end=rows->Array.length),
      }
    }
  }
}
