open Assertions

let failWithError = (~expected: string, error: TablyfulError.t): unit => {
  failTest(`Expected ${expected} but got ${error->TablyfulError.toString}`)
}

let expectOk = (
  result: Common.result<'a>,
  ~expected: string,
  ~assertOk: 'a => unit,
): unit => {
  switch result {
  | Ok(value) => assertOk(value)
  | Error(error) => failWithError(~expected, error)
  }
}

let expectParseErrorContains = (result: Common.result<'a>, ~contains: string): unit => {
  switch result {
  | Ok(_) => failTest("Expected parse error")
  | Error(error) => {
      expectTrue(error.category == TablyfulError.ParseError)
      expectTrue(error.message->String.toLowerCase->String.includes(contains->String.toLowerCase))
    }
  }
}

let expectErrorCategory = (result: Common.result<'a>, ~category: TablyfulError.category): unit => {
  switch result {
  | Ok(_) => failTest("Expected error")
  | Error(error) => expectTrue(error.category == category)
  }
}
