/**
 * NDJSON Reader
 * Reads newline-delimited JSON objects and converts to TableData
 */

let name = "ndjson"
let extensions = [".ndjson", ".jsonl"]

let parseLine = (~line: string, ~lineNumber: int): Common.result<dict<JSON.t>> => {
  switch line->Common.parseJson {
  | Ok(json) =>
    switch JSON.Decode.object(json) {
    | Some(obj) => Ok(obj)
    | None =>
      TablyfulError.parseError(
        `NDJSON line ${lineNumber->Int.toString} must be a JSON object.`,
      )->TablyfulError.toResult
    }
  | Error(_) =>
    TablyfulError.parseError(
      `Invalid JSON on NDJSON line ${lineNumber->Int.toString}.`,
    )->TablyfulError.toResult
  }
}

let read = (input: string, options: Types.t): TablyfulError.result<TableData.t> => {
  try {
    let lines =
      input
      ->String.split("\n")
      ->Bindings.Iter.fromArray
      ->Bindings.Iter.map(line => line->String.trim)
      ->Bindings.Iter.filter(line => line !== "")
      ->Bindings.Iter.toArray

    if lines->Array.length === 0 {
      TablyfulError.parseError("NDJSON input has no rows.")->TablyfulError.toResult
    } else {
      let rows = []
      let headerSet = ref(Belt.Set.String.empty)
      let hasError = ref(None)

      Bindings.Iter.entries(lines)->Bindings.Iter.forEach(((index, line)) => {
        switch hasError.contents {
        | Some(_) => ()
        | None =>
          switch parseLine(~line, ~lineNumber=index + 1) {
          | Error(error) => hasError.contents = Some(error)
          | Ok(parsed) =>
            let row: TableData.row = Dict.make()
            parsed->Dict.keysToArray->Bindings.Iter.fromArray->Bindings.Iter.forEach(key => {
              headerSet.contents = headerSet.contents->Belt.Set.String.add(key)
              row->Dict.set(key, parsed->Dict.get(key)->Option.getOr(JSON.Encode.null))
            })
            rows->Array.push(row)
          }
        }
      })

      switch hasError.contents {
      | Some(error) => Error(error)
      | None =>
        let headers = headerSet.contents->Belt.Set.String.toArray
        if headers->Array.length === 0 {
          TablyfulError.parseError("NDJSON input has no object keys.")->TablyfulError.toResult
        } else {
           let normalizedRows = rows->Bindings.Iter.fromArray->Bindings.Iter.map(row => {
             let dict: TableData.row = Dict.make()
             headers->Bindings.Iter.fromArray->Bindings.Iter.forEach(header => {
               dict->Dict.set(header, row->Dict.get(header)->Option.getOr(JSON.Encode.null))
             })
             dict
           })->Bindings.Iter.toArray

          ReaderCommon.makeTableData(~headers, ~rows=normalizedRows, ~options, ~sourceFormat=name)
        }
      }
    }
  } catch {
  | JsExn(e) =>
    TablyfulError.parseError(
      e->JsExn.message->Option.getOr("Failed to parse NDJSON input"),
    )->TablyfulError.toResult
  }
}
