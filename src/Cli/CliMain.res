let main = (): unit => {
  try {
    Cli.main()
  } catch {
  | JsExn(error) =>
    CliIo.printError(
      TablyfulError.ioError(
        `Failed to start CLI: ${error->JsExn.message->Option.getOr("unknown error")}`,
      ),
    )
    Bindings.Process.exit(CliConstants.exitCodeRuntimeError)
  }
}
