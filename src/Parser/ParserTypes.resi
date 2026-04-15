module type S = {
  type input
  let name: string
  let canParse: JSON.t => bool
  let parse: (input, Types.t) => TablyfulError.result<TableData.t>
}
