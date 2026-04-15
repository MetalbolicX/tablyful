/**
 * Markdown Formatter
 * Converts table data to Markdown table format
 */
open Types

// Escape pipe characters in Markdown
let escapePipe = (str: string): string => {
  str->String.replaceAll("|", "\\|")
}

// Convert JSON value to string
let jsonToString = (json: JSON.t): string => {
  if json === JSON.Encode.null {
    ""
  } else {
    switch JSON.Decode.string(json) {
    | Some(str) => str->escapePipe
    | None =>
      switch JSON.Decode.float(json) {
      | Some(n) => n->Float.toString
      | None =>
        switch JSON.Decode.bool(json) {
        | Some(b) => b->Bool.toString
        | None => JSON.stringify(json)->escapePipe
        }
      }
    }
  }
}

// Calculate column widths for alignment
let calculateColumnWidths = (data: TableData.t): array<int> => {
  data.headers->Array.mapWithIndex((header, _idx) => {
    let headerLen = header->String.length
    let maxDataLen = data.rows->Array.reduce(0, (max, row) => {
      let value =
        row
        ->Dict.get(header)
        ->Option.getOr(JSON.Encode.null)
        ->jsonToString
        ->String.length
      max > value ? max : value
    })
    headerLen > maxDataLen ? headerLen : maxDataLen
  })
}

// Pad string to width
let padToWidth = (str: string, width: int, ~align: string="left", ()): string => {
  let len = str->String.length
  if len >= width {
    str
  } else {
    let padding = " "->String.repeat(width - len)
    switch align {
    | "right" => padding ++ str
    | "center" =>
      let leftPad = padding->String.length / 2
      let rightPad = padding->String.length - leftPad
      " "->String.repeat(leftPad) ++ str ++ " "->String.repeat(rightPad)
    | _ => str ++ padding
    }
  }
}

// Format implementation
let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getMarkdownOptions(options)
  let widths = calculateColumnWidths(data)

  let lines = []

  // Header row
  let headerRow =
    data.headers
    ->Array.mapWithIndex((header, idx) => {
      let width = widths->Array.get(idx)->Option.getOr(header->String.length)
      " " ++ padToWidth(header, width, ~align=opts.align, ()) ++ " "
    })
    ->Array.join("|")
  lines->Array.push("|" ++ headerRow ++ "|")

  // Separator row
  let separator =
    widths
    ->Array.map(w => {
      let dashCount = w + 2 // +2 for padding spaces
      switch opts.align {
      | "center" => ":" ++ "-"->String.repeat(dashCount - 2) ++ ":"
      | "right" => "-"->String.repeat(dashCount - 1) ++ ":"
      | _ => "-"->String.repeat(dashCount)
      }
    })
    ->Array.join("|")
  lines->Array.push("|" ++ separator ++ "|")

  // Data rows
  data.rows->Array.forEach(row => {
    let rowStr =
      data.headers
      ->Array.mapWithIndex((header, idx) => {
        let value =
          row
          ->Dict.get(header)
          ->Option.getOr(JSON.Encode.null)
          ->jsonToString
        let width = widths->Array.get(idx)->Option.getOr(value->String.length)
        " " ++ padToWidth(value, width, ~align=opts.align, ()) ++ " "
      })
      ->Array.join("|")
    lines->Array.push("|" ++ rowStr ++ "|")
  })

  lines->Array.join("\\n")
}

// Create formatter using functor
include FormatterMake.Make({
  let name = "markdown"
  let extension = ".md"
  let formatImpl = formatImpl
})
