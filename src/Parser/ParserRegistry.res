/**
 * Parser Registry
 * Manages all available parsers and provides auto-detection
 */
type parserEntry = {
  name: string,
  canParse: JSON.t => bool,
  parse: (JSON.t, Types.t) => TablyfulError.result<TableData.t>,
}

// All available parsers
let all: array<parserEntry> = [
  {
    name: ArrayParser.name,
    canParse: ArrayParser.canParse,
    parse: (json, opts) => {
      switch JSON.Decode.array(json) {
      | Some(arr) => {
          let arrays = arr->Array.map(row => row->JSON.Decode.array->Option.getOr([]))
          ArrayParser.parse(arrays, opts)
        }
      | None => TablyfulError.parseError("Failed to decode array")->TablyfulError.toResult
      }
    },
  },
  {
    name: ObjectParser.name,
    canParse: ObjectParser.canParse,
    parse: (json, opts) => {
      switch JSON.Decode.array(json) {
      | Some(arr) => {
          let objects = arr->Array.map(obj => obj->JSON.Decode.object->Option.getOr(Dict.make()))
          ObjectParser.parse(objects, opts)
        }
      | None =>
        TablyfulError.parseError("Failed to decode array of objects")->TablyfulError.toResult
      }
    },
  },
  {
    name: ObjectOfArraysParser.name,
    canParse: ObjectOfArraysParser.canParse,
    parse: (json, opts) => {
      switch JSON.Decode.object(json) {
      | Some(obj) => {
          let dict = Dict.make()
          obj
          ->Dict.keysToArray
          ->Array.forEach(key => {
            let value = obj->Dict.get(key)->Option.getOr(JSON.Encode.null)
            dict->Dict.set(key, value->JSON.Decode.array->Option.getOr([]))
          })
          ObjectOfArraysParser.parse(dict, opts)
        }
      | None =>
        TablyfulError.parseError("Failed to decode object of arrays")->TablyfulError.toResult
      }
    },
  },
  {
    name: NestedObjectParser.name,
    canParse: NestedObjectParser.canParse,
    parse: (json, opts) => {
      switch JSON.Decode.object(json) {
      | Some(obj) => {
          let dict = Dict.make()
          obj
          ->Dict.keysToArray
          ->Array.forEach(key => {
            let value = obj->Dict.get(key)->Option.getOr(JSON.Encode.null)
            dict->Dict.set(key, value->JSON.Decode.object->Option.getOr(Dict.make()))
          })
          NestedObjectParser.parse(dict, opts)
        }
      | None =>
        TablyfulError.parseError("Failed to decode object of objects")->TablyfulError.toResult
      }
    },
  },
]

// Detect which parser can handle the data
let detect = (json: JSON.t): option<parserEntry> => {
  all->Array.find(parser => parser.canParse(json))
}

// Get parser by name
let getByName = (name: string): option<parserEntry> => {
  all->Array.find(parser => parser.name === name->String.toLowerCase)
}

// Parse with optional format override (auto-detects when no format given)
let parse = (~format=?, json: JSON.t, options: Types.t): TablyfulError.result<TableData.t> => {
  let parser = switch format {
  | Some(name) => getByName(name)
  | None => detect(json)
  }
  switch parser {
  | Some(p) => p.parse(json, options)
  | None =>
    TablyfulError.parseError(
      "No suitable parser found for the provided data format. Supported formats: arrays of arrays, arrays of objects, objects of arrays, and objects of objects.",
    )->TablyfulError.toResult
  }
}

// Get all parser names
let getNames = (): array<string> => {
  all->Array.map(parser => parser.name)
}
