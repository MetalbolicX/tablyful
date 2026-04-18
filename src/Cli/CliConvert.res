open Types

type flags = CliTypes.flags

let parseJsonInput = (inputText: string): Common.result<JSON.t> => {
  if inputText->String.trim === "" {
    TablyfulError.validationError(
      "No input provided. Pass a file path or pipe JSON via stdin.",
    )->TablyfulError.toResult
  } else {
    Common.parseJson(inputText)
  }
}

let applyColumnSelection = (
  tableData: TableData.t,
  columnsArg: option<array<string>>,
): Common.result<TableData.t> => {
  switch columnsArg {
  | Some(columns) => TableTransform.selectColumns(tableData, columns)
  | None => Ok(tableData)
  }
}

let formatTableData = (tableData: TableData.t, options: t): Common.result<(TableData.t, string)> => {
  let formatName = options.outputFormat->Types.formatToString
  FormatterRegistry.format(formatName, tableData, options)->Result.map(output => {
    (tableData, output)
  })
}

let processTableData = (
  tableData: TableData.t,
  flags: flags,
  options: t,
): Common.result<(TableData.t, string)> => {
  TableTransform.applyFilters(tableData, flags.filterExprs)
  ->Result.flatMap(filteredData => applyColumnSelection(filteredData, flags.columnsArg))
  ->Result.flatMap(finalData => formatTableData(finalData, options))
}

let writeOutput = (outputPath: option<string>, output: string): Common.result<unit> => {
  switch outputPath {
  | Some(path) =>
    try {
      Bindings.Fs.writeFileSyncUtf8(path, output ++ "\n")
      Ok(())
    } catch {
    | JsExn(e) =>
      TablyfulError.ioError(
        `Failed to write output file: ${e->JsExn.message->Option.getOr("unknown error")}`,
      )->TablyfulError.toResult
    }
  | None =>
    CliIo.writeStdout(output ++ "\n")
    Ok(())
  }
}

let printStats = (tableData: TableData.t, options: t): unit => {
  let formatName = options.outputFormat->Types.formatToString
  CliIo.writeStderr(
    `[tablyful] rows: ${tableData.metadata.rowCount->Int.toString}, columns: ${
      tableData.metadata.columnCount->Int.toString
    }, detected: ${tableData.metadata.sourceFormat}, format: ${formatName}\n`,
  )
}

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

let makeBaseStreamConfig = (
  ~inputPath: option<string>,
  flags: flags,
  options: t,
): Bindings.StreamMode.config => {
  {
    inputPath: inputPath->Option.getOr(""),
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

let runStreamMode = (~inputPath: option<string>, flags: flags, options: t): unit => {
  let baseConfig = makeBaseStreamConfig(~inputPath, flags, options)

  let streamConfig = switch options.outputFormat {
  | Csv => {
      let csv = Defaults.getCsvOptions(options)
      Some({
        ...baseConfig,
        outputFormat: "csv",
        delimiter: csv.delimiter,
        quote: csv.quote,
        escape: csv.escape,
        lineBreak: csv.lineBreak,
        includeHeaders: csv.includeHeaders,
      })
    }
  | Tsv => {
      let tsv = Defaults.getTsvOptions(options)
      Some({...baseConfig, outputFormat: "tsv", delimiter: "\t", includeHeaders: tsv.includeHeaders})
    }
  | Psv => {
      let psv = Defaults.getPsvOptions(options)
      Some({...baseConfig, outputFormat: "psv", delimiter: "|", includeHeaders: psv.includeHeaders})
    }
  | Sql => {
      let sql = Defaults.getSqlOptions(options)
      Some({
        ...baseConfig,
        outputFormat: "sql",
        includeHeaders: false,
        sqlTableName: sql.tableName,
        sqlIdentifierQuote: sql.identifierQuote,
        sqlIncludeCreateTable: sql.includeCreateTable,
        sqlInsertBatchSize: sql.insertBatchSize,
      })
    }
  | Html => {
      let html = Defaults.getHtmlOptions(options)
      Some({
        ...baseConfig,
        outputFormat: "html",
        includeHeaders: true,
        htmlTableClass: html.tableClass,
        htmlTheadClass: html.theadClass,
        htmlTbodyClass: html.tbodyClass,
        htmlId: html.id,
        htmlCaption: html.caption,
      })
    }
  | Yaml => {
      let yaml = Defaults.getYamlOptions(options)
      Some({
        ...baseConfig,
        outputFormat: "yaml",
        includeHeaders: true,
        lineBreak: yaml.lineBreak,
        yamlIndent: yaml.indent,
        yamlQuoteStrings: yaml.quoteStrings,
      })
    }
  | _ =>
    CliIo.exitWithError(
      ~code=2,
      TablyfulError.validationError(
        `Automatic streaming currently supports output formats: ${CliConstants.streamableOutputFormats}.`,
      ),
    )
    None
  }

  switch streamConfig {
  | Some(config) => Bindings.StreamMode.run(config)
  | None => ()
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
    | Error(error) => CliIo.exitWithError(~code=1, error)
    | Ok(tableData) =>
      switch processTableData(tableData, flags, options) {
      | Error(error) => CliIo.exitWithError(~code=1, error)
      | Ok((finalData, output)) =>
        switch finalizeConversion(finalData, output, flags, options) {
        | Error(error) => CliIo.exitWithError(~code=1, error)
        | Ok(()) => Bindings.Process.exit(0)
        }
      }
    }
  }

  switch CliOptions.resolveOptions(flags) {
  | Error(error) => CliIo.exitWithError(~code=2, error)
  | Ok(options) =>
    if isReaderFormat {
      switch detectedFormat {
      | Some(format) => handleTableResult(ReaderRegistry.read(~format, inputText, options), options)
      | None =>
        CliIo.exitWithError(
          ~code=1,
          TablyfulError.parseError("Failed to detect a reader format for non-JSON input."),
        )
      }
    } else {
      switch parseJsonInput(inputText) {
      | Error(error) => CliIo.exitWithError(~code=1, error)
      | Ok(jsonInput) =>
        handleTableResult(ParserRegistry.parse(~format=?flags.inputArg, jsonInput, options), options)
      }
    }
  }
}
