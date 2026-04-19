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
      ->Array.map(line => line->String.trim)
      ->Array.filter(line => line !== "")

    if lines->Array.length === 0 {
      TablyfulError.parseError("NDJSON input has no rows.")->TablyfulError.toResult
    } else {
      let rows = []
      let headerSet = ref(Belt.Set.String.empty)
      let hasError = ref(None)

      lines->Array.forEachWithIndex((line, index) => {
        switch hasError.contents {
        | Some(_) => ()
        | None =>
          switch parseLine(~line, ~lineNumber=index + 1) {
          | Error(error) => hasError.contents = Some(error)
          | Ok(parsed) =>
            let row: TableData.row = Dict.make()
            parsed->Dict.keysToArray->Array.forEach(key => {
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
          let normalizedRows = rows->Array.map(row => {
            let dict: TableData.row = Dict.make()
            headers->Array.forEach(header => {
              dict->Dict.set(header, row->Dict.get(header)->Option.getOr(JSON.Encode.null))
            })
            dict
          })

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
