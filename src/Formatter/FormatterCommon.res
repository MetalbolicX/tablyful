let identity = (value: string): string => value

let jsonToString = (
  json: JSON.t,
  ~escapeString: string => string=identity,
  ~escapeJsonFallback: string => string=identity,
): string => {
  if json === JSON.Encode.null {
    ""
  } else {
    switch JSON.Decode.string(json) {
    | Some(str) => str->escapeString
    | None =>
      switch JSON.Decode.float(json) {
      | Some(n) => n->Float.toString
      | None =>
        switch JSON.Decode.bool(json) {
        | Some(b) => b->Bool.toString
        | None => JSON.stringify(json)->escapeJsonFallback
        }
      }
    }
  }
}
