module Make: (
  Config: {
    type input
    let name: string
    let canParse: JSON.t => bool
    let extractHeaders: (input, Types.t) => Common.result<(array<string>, array<array<JSON.t>>)> 
    let convertRows: (array<array<JSON.t>>, array<string>, Types.t) => Common.result<array<TableData.row>>
  },
) => (ParserTypes.S with type input = Config.input)
