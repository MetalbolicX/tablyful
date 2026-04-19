/**
 * LaTeX Formatter
 * Converts table data to LaTeX tabular format
 */
open Types

// Escape LaTeX special characters
let escapeLatex = (str: string): string => {
  str
  ->String.replaceAll("\\", "\\textbackslash{}")
  ->String.replaceAll("&", "\\&")
  ->String.replaceAll("%", "\\%")
  ->String.replaceAll("$", "\\$")
  ->String.replaceAll("#", "\\#")
  ->String.replaceAll("_", "\\_")
  ->String.replaceAll("{", "\\{")
  ->String.replaceAll("}", "\\}")
  ->String.replaceAll("~", "\\textasciitilde{}")
  ->String.replaceAll("^", "\\textasciicircum{}")
}

// Format implementation
let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getLatexOptions(options)

  let lines = []

  // Begin table environment if requested
  if opts.useTableEnvironment {
    lines->Array.push("\\begin{table}[htbp]")
    if opts.centering {
      lines->Array.push("  \\centering")
    }
    if opts.caption !== "" {
      lines->Array.push(`  \\caption{${opts.caption->escapeLatex}}`)
    }
    if opts.label !== "" {
      lines->Array.push(`  \\label{${opts.label}}`)
    }
  }

  // Column specification
  let colSpec = if opts.columnSpec !== "" {
    opts.columnSpec
  } else {
    // Generate default column spec based on column count
    data.headers->Array.map(_ => "l")->Array.join("")
  }

  lines->Array.push(`\\begin{${opts.tableEnvironment}}{${colSpec}}`)

  // Top rule
  if opts.booktabs {
    lines->Array.push("  \\toprule")
  } else {
    lines->Array.push("  \\hline")
  }

  // Header row
  let headerRow =
    data.headers
    ->Array.map(h => h->escapeLatex)
    ->Array.join(" & ")
  lines->Array.push(`  ${headerRow} \\\\`)

  // Mid rule
  if opts.booktabs {
    lines->Array.push("  \\midrule")
  } else {
    lines->Array.push("  \\hline")
  }

  // Data rows
  data.rows->Array.forEach(row => {
    let rowStr =
      data.headers
      ->Array.map(header => {
        row
        ->Dict.get(header)
        ->Option.getOr(JSON.Encode.null)
        ->FormatterCommon.jsonToString(~escapeString=escapeLatex, ~escapeJsonFallback=escapeLatex)
      })
      ->Array.join(" & ")
    lines->Array.push(`  ${rowStr} \\\\`)
  })

  // Bottom rule
  if opts.booktabs {
    lines->Array.push("  \\bottomrule")
  } else {
    lines->Array.push("  \\hline")
  }

  lines->Array.push(`\\end{${opts.tableEnvironment}}`)

  // End table environment if requested
  if opts.useTableEnvironment {
    lines->Array.push("\\end{table}")
  }

  lines->Array.join("\n")
}

// Create formatter using functor
include FormatterMake.Make({
  let name = "latex"
  let extension = ".tex"
  let formatImpl = formatImpl
})
