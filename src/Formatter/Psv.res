/**
 * PSV Formatter
 * Converts table data to pipe-separated values
 */
open Types

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getPsvOptions(options)
  DsvFormatter.format(
    data,
    ~delimiter="|",
    ~includeHeaders=opts.includeHeaders,
  )
}

include FormatterMake.Make({
  let name = "psv"
  let extension = ".psv"
  let formatImpl = formatImpl
})
