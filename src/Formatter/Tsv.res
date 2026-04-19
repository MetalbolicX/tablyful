/**
 * TSV Formatter
 * Converts table data to tab-separated values
 */
open Types

let formatImpl = (data: TableData.t, options: t): string => {
  let opts = Defaults.getTsvOptions(options)
  DsvFormatter.format(
    data,
    ~delimiter="\t",
    ~includeHeaders=opts.includeHeaders,
  )
}

include FormatterMake.Make({
  let name = "tsv"
  let extension = ".tsv"
  let formatImpl = formatImpl
})
