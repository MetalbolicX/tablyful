type result<'a> = result<'a, TablyfulError.t>

@genType
type dataType = String | Number | Boolean | Date | Unknown | Null

let inferType: JSON.t => dataType
let parseJson: string => result<JSON.t>
