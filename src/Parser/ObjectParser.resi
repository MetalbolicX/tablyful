let name: string
let canParse: JSON.t => bool
let parse: (array<dict<JSON.t>>, Types.t) => TablyfulError.result<TableData.t>
