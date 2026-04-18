let writeStdout: string => unit
let writeStderr: string => unit
let printError: TablyfulError.t => unit
let exitWithError: (~code: int, TablyfulError.t) => unit
