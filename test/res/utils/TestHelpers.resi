let failWithError: (~expected: string, TablyfulError.t) => unit

let expectOk: (Common.result<'a>, ~expected: string, ~assertOk: 'a => unit) => unit

let expectParseErrorContains: (Common.result<'a>, ~contains: string) => unit

let expectErrorCategory: (Common.result<'a>, ~category: TablyfulError.category) => unit
