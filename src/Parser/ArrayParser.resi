let name: string
let canParse: JSON.t => bool
let parse: (array<array<JSON.t>>, Types.t) => TablyfulError.result<TableData.t>
