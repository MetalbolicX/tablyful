let stdoutFd = 1
let stderrFd = 2

let writeStdout = (text: string): unit => {
  ignore(Bindings.Fs.writeSyncFd(stdoutFd, text))
}

let writeStderr = (text: string): unit => {
  ignore(Bindings.Fs.writeSyncFd(stderrFd, text))
}

let printError = (error: TablyfulError.t): unit => {
  writeStderr(TablyfulError.toString(error) ++ "\n")
}

let exitWithError = (~code: int, error: TablyfulError.t): unit => {
  printError(error)
  Bindings.Process.exit(code)
}
