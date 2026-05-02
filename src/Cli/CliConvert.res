/**
 * CLI conversion logic - orchestrates parsing, transformation, and formatting.
 * Handles JSON parsing, table processing, and output writing.
 */

open Types

type flags = CliTypes.flags

/**
 * Parses JSON input string to JSON.t.
 * Validates input is not empty before parsing.
 * @param inputText - Raw input string
 * @returns Ok(JSON) or Error with validation
 */
let parseJsonInput = (inputText: string): Common.result<JSON.t> => {
  if inputText->String.trim === "" {
    TablyfulError.validationError(
      "No input provided. Pass a file path or pipe JSON via stdin.",
    )->TablyfulError.toResult
  } else {
    Common.parseJson(inputText)
  }
}

/**
 * Applies column selection to table data.
 * @param tableData - Source table
 * @param columnsArg - Optional columns to select
 * @returns Ok(TableData) or Error
 */
let applyColumnSelection = (
  tableData: TableData.t,
  columnsArg: option<array<string>>,
): Common.result<TableData.t> => {
  switch columnsArg {
  | Some(columns) => TableTransform.selectColumns(tableData, columns)
  | None => Ok(tableData)
  }
}

/**
 * Formats table data to output string using formatter registry.
 * @param tableData - Table to format
 * @param options - Formatting options
 * @returns Ok((TableData, outputString)) or Error
 */
let formatTableData = (tableData: TableData.t, options: t): Common.result<(TableData.t, string)> => {
  let formatName = options.outputFormat->Types.formatToString
  FormatterRegistry.format(formatName, tableData, options)->Result.map(output => {
    (tableData, output)
  })
}

/**
 * Processes table data: applies filters, selects columns, formats.
 * @param tableData - Table to process
 * @param flags - CLI flags for filtering/selection
 * @param options - Processing options
 * @returns Ok((TableData, output)) or Error
 */
let processTableData = (
  tableData: TableData.t,
  flags: flags,
  options: t,
): Common.result<(TableData.t, string)> => {
  TableTransform.applyFilters(tableData, flags.filterExprs)
  ->Result.flatMap(filteredData => applyColumnSelection(filteredData, flags.columnsArg))
  ->Result.flatMap(finalData => formatTableData(finalData, options))
}

/**
 * Writes output to file or stdout.
 * @param outputPath - Optional output file path
 * @param output - Formatted output string
 * @returns Ok(unit) or Error
 */
let writeOutput = (outputPath: option<string>, output: string): Common.result<unit> => {
  switch outputPath {
  | Some(path) =>
    try {
      Bindings.Fs.writeFileSyncUtf8(path, output)
      Ok(())
    } catch {
    | JsExn(e) =>
      TablyfulError.ioError(
        `Failed to write output file: ${e->JsExn.message->Option.getOr("unknown error")}`,
      )->TablyfulError.toResult
    }
  | None =>
    CliIo.writeStdout(output)
    Ok(())
  }
}

/**
 * Prints conversion statistics to stderr.
 * @param tableData - Processed table data
 * @param options - Output options
 */
let printStats = (tableData: TableData.t, options: t): unit => {
  let formatName = options.outputFormat->Types.formatToString
  CliIo.writeStderr(
    `[tablyful] rows: ${tableData.metadata.rowCount->Int.toString}, columns: ${
      tableData.metadata.columnCount->Int.toString
    }, detected: ${tableData.metadata.sourceFormat}, format: ${formatName}\n`,
  )
}

/**
 * Finalizes conversion: optionally prints stats, writes output.
 * @param tableData - Processed table
 * @param output - Formatted output
 * @param flags - CLI flags
 * @param options - Processing options
 * @returns Ok(unit) or Error
 */
let finalizeConversion = (
  tableData: TableData.t,
  output: string,
  flags: flags,
  options: t,
): Common.result<unit> => {
  if flags.stats {
    printStats(tableData, options)
  }
  writeOutput(flags.outputPath, output)
}

let resolveInputFormat = (inputArg: option<string>, inputPath: option<string>): string => {
  switch inputArg->Option.map(String.toLowerCase) {
  | Some(fmt) => fmt
  | None =>
    switch inputPath {
    | Some(path) =>
      switch FormatDetector.fromExtension(path) {
      | Some(fmt) => fmt
      | None => "json"
      }
    | None => "json"
    }
  }
}

let makeBaseStreamConfig = (
  ~inputPath: option<string>,
  flags: flags,
  options: t,
): Bindings.StreamMode.config => {
  let inferredInputFormat = resolveInputFormat(flags.inputArg, inputPath)

  {
    inputPath: inputPath->Option.getOr(""),
    inputFormat: inferredInputFormat,
    outputPath: flags.outputPath->Option.getOr(""),
    outputFormat: "csv",
    delimiter: Defaults.defaultCsvOptions.delimiter,
    quote: Defaults.defaultCsvOptions.quote,
    escape: Defaults.defaultCsvOptions.escape,
    lineBreak: Defaults.defaultCsvOptions.lineBreak,
    includeHeaders: true,
    hasHeaders: options.hasHeaders,
    hasRowNumbers: options.hasRowNumbers,
    rowNumberHeader: options.rowNumberHeader,
    sqlTableName: Defaults.defaultSqlOptions.tableName,
    sqlIdentifierQuote: Defaults.defaultSqlOptions.identifierQuote,
    sqlIncludeCreateTable: false,
    sqlInsertBatchSize: Defaults.defaultSqlOptions.insertBatchSize,
    htmlTableClass: Defaults.defaultHtmlOptions.tableClass,
    htmlTheadClass: Defaults.defaultHtmlOptions.theadClass,
    htmlTbodyClass: Defaults.defaultHtmlOptions.tbodyClass,
    htmlId: Defaults.defaultHtmlOptions.id,
    htmlCaption: Defaults.defaultHtmlOptions.caption,
    yamlIndent: Defaults.defaultYamlOptions.indent,
    yamlQuoteStrings: Defaults.defaultYamlOptions.quoteStrings,
    columns: flags.columnsArg->Option.getOr([]),
    filters: flags.filterExprs,
    stats: flags.stats,
  }
}

let parseStreamableInputFormat = (inputArg: option<string>, inputPath: option<string>): option<string> => {
  let format = resolveInputFormat(inputArg, inputPath)

  switch format {
  | "json" | "ndjson" => Some(format)
  | _ => None
  }
}

let buildStreamConfig = (
  baseConfig: Bindings.StreamMode.config,
  options: t,
): Common.result<Bindings.StreamMode.config> => {
  switch options.outputFormat {
  | Csv =>
    let csv = Defaults.getCsvOptions(options)
    Ok({
      ...baseConfig,
      outputFormat: "csv",
      delimiter: csv.delimiter,
      quote: csv.quote,
      escape: csv.escape,
      lineBreak: csv.lineBreak,
      includeHeaders: csv.includeHeaders,
    })
  | Tsv =>
    let tsv = Defaults.getTsvOptions(options)
    Ok({...baseConfig, outputFormat: "tsv", delimiter: "\t", includeHeaders: tsv.includeHeaders})
  | Psv =>
    let psv = Defaults.getPsvOptions(options)
    Ok({...baseConfig, outputFormat: "psv", delimiter: "|", includeHeaders: psv.includeHeaders})
  | Sql =>
    let sql = Defaults.getSqlOptions(options)
    Ok({
      ...baseConfig,
      outputFormat: "sql",
      includeHeaders: false,
      sqlTableName: sql.tableName,
      sqlIdentifierQuote: sql.identifierQuote,
      sqlIncludeCreateTable: sql.includeCreateTable,
      sqlInsertBatchSize: sql.insertBatchSize,
    })
  | Html =>
    let html = Defaults.getHtmlOptions(options)
    Ok({
      ...baseConfig,
      outputFormat: "html",
      includeHeaders: true,
      htmlTableClass: html.tableClass,
      htmlTheadClass: html.theadClass,
      htmlTbodyClass: html.tbodyClass,
      htmlId: html.id,
      htmlCaption: html.caption,
    })
  | Yaml =>
    let yaml = Defaults.getYamlOptions(options)
    Ok({
      ...baseConfig,
      outputFormat: "yaml",
      includeHeaders: true,
      lineBreak: yaml.lineBreak,
      yamlIndent: yaml.indent,
      yamlQuoteStrings: yaml.quoteStrings,
    })
  | Ndjson =>
    let ndjson = Defaults.getNdjsonOptions(options)
    Ok({...baseConfig, outputFormat: "ndjson", includeHeaders: false, lineBreak: ndjson.lineBreak})
  | _ =>
    TablyfulError.validationError(
      `Automatic streaming currently supports output formats: ${CliConstants.streamableOutputFormats}.`,
    )->TablyfulError.toResult
  }
}

let runStreamMode = (~inputPath: option<string>, flags: flags, options: t): unit => {
  let inputFormat = switch parseStreamableInputFormat(flags.inputArg, inputPath) {
  | Some(fmt) => fmt
  | None =>
    CliIo.exitWithError(
      ~code=CliConstants.exitCodeValidationError,
      TablyfulError.validationError(
        "Automatic streaming currently supports input formats: json, ndjson.",
      ),
    )
    "json"
  }

  let baseConfig = makeBaseStreamConfig(~inputPath, flags, options)
  let baseConfig = {...baseConfig, inputFormat}

  switch buildStreamConfig(baseConfig, options) {
  | Error(error) => CliIo.exitWithError(~code=CliConstants.exitCodeValidationError, error)
  | Ok(streamConfig) => Bindings.StreamMode.run(streamConfig)
  }
}

let runConversion = (inputText: string, flags: flags, ~inputPath: option<string>=?): unit => {
  let detectedFormat = switch flags.inputArg {
  | Some(fmt) => Some(fmt->String.toLowerCase)
  | None => FormatDetector.detect(~path=?inputPath, ~content=inputText, ())
  }

  let isReaderFormat = switch detectedFormat {
  | Some(fmt) => ReaderRegistry.hasReader(fmt)
  | _ => false
  }

  let handleTableResult = (tableResult: Common.result<TableData.t>, options: t): unit => {
    switch tableResult {
    | Error(error) => CliIo.exitWithError(~code=CliConstants.exitCodeRuntimeError, error)
    | Ok(tableData) =>
      switch processTableData(tableData, flags, options) {
      | Error(error) => CliIo.exitWithError(~code=CliConstants.exitCodeRuntimeError, error)
      | Ok((finalData, output)) =>
        switch finalizeConversion(finalData, output, flags, options) {
        | Error(error) => CliIo.exitWithError(~code=CliConstants.exitCodeRuntimeError, error)
        | Ok(()) => Bindings.Process.exit(CliConstants.exitCodeSuccess)
        }
      }
    }
  }

  switch CliOptions.resolveOptions(flags) {
  | Error(error) => CliIo.exitWithError(~code=CliConstants.exitCodeValidationError, error)
  | Ok(options) =>
    if isReaderFormat {
      switch detectedFormat {
      | Some(format) => handleTableResult(ReaderRegistry.read(~format, inputText, options), options)
      | None =>
        CliIo.exitWithError(
          ~code=CliConstants.exitCodeRuntimeError,
          TablyfulError.parseError("Failed to detect a reader format for non-JSON input."),
        )
      }
    } else {
      switch parseJsonInput(inputText) {
      | Error(error) => CliIo.exitWithError(~code=CliConstants.exitCodeRuntimeError, error)
      | Ok(jsonInput) =>
        handleTableResult(ParserRegistry.parse(~format=?flags.inputArg, jsonInput, options), options)
      }
    }
  }
}
