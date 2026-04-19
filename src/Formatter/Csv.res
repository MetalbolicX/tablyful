/**
 * CSV Formatter
 * Converts table data to CSV format
 */
open Types

// Format implementation
let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getCsvOptions(options)
  DsvFormatter.format(
    data,
    ~delimiter=opts.delimiter,
    ~includeHeaders=opts.includeHeaders,
    ~lineBreak=opts.lineBreak,
    ~quote=opts.quote,
    ~escape=opts.escape,
  )
}

// Create formatter using functor
include FormatterMake.Make({
  let name = "csv"
  let extension = ".csv"
  let formatImpl = formatImpl
})
