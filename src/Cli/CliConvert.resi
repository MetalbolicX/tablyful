open Types

type flags = CliTypes.flags

let runStreamMode: (~inputPath: option<string>, flags, t) => unit
let runConversion: (string, flags, ~inputPath: string=?) => unit
