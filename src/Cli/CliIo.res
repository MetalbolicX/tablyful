/**
 * Low-level I/O operations for CLI output.
 * Provides abstracted stdio access for consistent output handling.
 */

let stdoutFd = 1
let stderrFd = 2

/**
 * Writes text to stdout file descriptor.
 * @param text - String to write
 */
let writeStdout = (text: string): unit => {
  ignore(Bindings.Fs.writeSyncFd(stdoutFd, text))
}

/**
 * Writes text to stderr file descriptor.
 * @param text - String to write
 */
let writeStderr = (text: string): unit => {
  ignore(Bindings.Fs.writeSyncFd(stderrFd, text))
}

/**
 * Prints a TablyfulError to stderr.
 * @param error - Error to print
 */
let printError = (error: TablyfulError.t): unit => {
  writeStderr(TablyfulError.toString(error) ++ "\n")
}

/**
 * Prints error to stderr and exits process with code.
 * @param code - Exit code to use
 * @param error - Error to print before exiting
 */
let exitWithError = (~code: int, error: TablyfulError.t): unit => {
  printError(error)
  Bindings.Process.exit(code)
}