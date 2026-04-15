@genType
type result<'a> = result<'a, TablyfulError.t>

@genType
type tableData = TableData.t

@genType
type options = Types.t

@genType
let defaultOptions: options

@genType
let convert: (~input: JSON.t, ~format: string, ~options: options=?) => result<string>

@genType
let parse: (~input: JSON.t, ~options: options=?) => result<TableData.t>

@genType
let format: (~data: tableData, ~format: string, ~options: options=?) => result<string>

@genType
let toCsv: (~input: JSON.t, ~options: options=?) => result<string>

@genType
let toJson: (~input: JSON.t, ~options: options=?) => result<string>

@genType
let toMarkdown: (~input: JSON.t, ~options: options=?) => result<string>

@genType
let toHtml: (~input: JSON.t, ~options: options=?) => result<string>

@genType
let toLatex: (~input: JSON.t, ~options: options=?) => result<string>

@genType
let availableParsers: unit => array<string>

@genType
let availableFormatters: unit => array<string>

@genType
let detectFormat: JSON.t => string
