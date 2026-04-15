let name: string
let canParse: JSON.t => bool
let parse: (dict<dict<JSON.t>>, Types.t) => TablyfulError.result<TableData.t>
