open Types

type flags = CliTypes.flags

let parseSetPairs: option<array<string>> => Common.result<array<(string, string)>>
let parseColumnsArg: option<string> => Common.result<option<array<string>>>
let parseFilterExprs: option<array<string>> => Common.result<array<string>>
let resolveOptions: flags => Common.result<t>
