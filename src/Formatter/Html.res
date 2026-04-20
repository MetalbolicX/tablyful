/**
 * HTML Formatter
 * Converts table data to HTML table format
 */
open Types

// Escape HTML special characters
let escapeHtml = (str: string): string => {
  str
  ->String.replaceAll("&", "&amp;")
  ->String.replaceAll("<", "&lt;")
  ->String.replaceAll(">", "&gt;")
  ->String.replaceAll("\"", "&quot;")
}

// Format implementation
let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getHtmlOptions(options)

  let lines = []

  // Table tag with classes
  let tableAttrs = switch opts.tableClass {
  | "" => "<table>"
  | cls => `<table class="${cls->escapeHtml}">`
  }
  if opts.id !== "" {
    lines->Array.push(`<table id="${opts.id->escapeHtml}" class="${opts.tableClass->escapeHtml}">`)
  } else {
    lines->Array.push(tableAttrs)
  }

  // Caption if provided
  if opts.caption !== "" {
    lines->Array.push(`  <caption>${opts.caption->escapeHtml}</caption>`)
  }

  // Table header
  let theadAttrs = switch opts.theadClass {
  | "" => "  <thead>"
  | cls => `  <thead class="${cls->escapeHtml}">`
  }
  lines->Array.push(theadAttrs)
  lines->Array.push("    <tr>")

  data.headers->Bindings.Iter.fromArray->Bindings.Iter.forEach(header => {
    lines->Array.push(`      <th>${header->escapeHtml}</th>`)
  })

  lines->Array.push("    </tr>")
  lines->Array.push("  </thead>")

  // Table body
  let tbodyAttrs = switch opts.tbodyClass {
  | "" => "  <tbody>"
  | cls => `  <tbody class="${cls->escapeHtml}">`
  }
  lines->Array.push(tbodyAttrs)

  data.rows->Bindings.Iter.fromArray->Bindings.Iter.forEach(row => {
    lines->Array.push("    <tr>")
    data.headers->Bindings.Iter.fromArray->Bindings.Iter.forEach(header => {
      let value =
        row
        ->Dict.get(header)
        ->Option.getOr(JSON.Encode.null)
        ->FormatterCommon.jsonToString(~escapeString=escapeHtml, ~escapeJsonFallback=escapeHtml)
      lines->Array.push(`      <td>${value}</td>`)
    })
    lines->Array.push("    </tr>")
  })

  lines->Array.push("  </tbody>")
  lines->Array.push("</table>")

  lines->Array.join("\n")
}

// Create formatter using functor
include FormatterMake.Make({
  let name = "html"
  let extension = ".html"
  let formatImpl = formatImpl
})
