let escapeValue = (
  value: string,
  ~delimiter: string,
  ~quote: string="\"",
  ~escape: string="\\",
): string => {
  if value->String.includes(delimiter) || value->String.includes("\n") || value->String.includes(quote) {
    let escaped = value->String.replaceAll(quote, escape ++ quote)
    quote ++ escaped ++ quote
  } else {
    value
  }
}

let format = (
  data: TableData.t,
  ~delimiter: string,
  ~includeHeaders: bool,
  ~lineBreak: string="\n",
  ~quote: string="\"",
  ~escape: string="\\",
): string => {
  let lines = []

  if includeHeaders {
    let headerLine =
      data.headers
      ->Array.map(header => escapeValue(header, ~delimiter, ~quote, ~escape))
      ->Array.join(delimiter)
    lines->Array.push(headerLine)
  }

  data.rows->Array.forEach(row => {
    let values = data.headers->Array.map(header => {
      let value = row->Dict.get(header)->Option.getOr(JSON.Encode.null)->FormatterCommon.jsonToString
      escapeValue(value, ~delimiter, ~quote, ~escape)
    })
    lines->Array.push(values->Array.join(delimiter))
  })

  lines->Array.join(lineBreak)
}
