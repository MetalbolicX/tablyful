module type S = {
  let name: string
  let extensions: array<string>
  let read: (string, Types.t) => TablyfulError.result<TableData.t>
}
