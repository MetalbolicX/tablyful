/**
 * Input data types with GADT for type-safe handling
 */

// Type witnesses for runtime type checking
type inputShape =
  | ArrayOfArraysShape
  | ArrayOfObjectsShape
  | ObjectOfArraysShape
  | ObjectOfObjectsShape
  | UnknownShape

// GADT for type-safe input
type rec t<'a>

// Internal constructors
external unsafeFromArrayOfArrays: array<array<JSON.t>> => t<array<array<JSON.t>>> = "%identity"
external unsafeFromArrayOfObjects: array<dict<JSON.t>> => t<array<dict<JSON.t>>> = "%identity"
external unsafeFromObjectOfArrays: dict<array<JSON.t>> => t<dict<array<JSON.t>>> = "%identity"
external unsafeFromObjectOfObjects: dict<dict<JSON.t>> => t<dict<dict<JSON.t>>> = "%identity"

let classify = (json: JSON.t): inputShape => {
  switch JSON.Decode.array(json) {
  | Some(arr) =>
    if arr->Array.length > 0 {
      switch arr->Array.get(0) {
      | Some(first) =>
        if first->JSON.Decode.array->Option.isSome {
          ArrayOfArraysShape
        } else if first->JSON.Decode.object->Option.isSome {
          ArrayOfObjectsShape
        } else {
          UnknownShape
        }
      | None => UnknownShape
      }
    } else {
      UnknownShape
    }
  | None =>
    switch JSON.Decode.object(json) {
    | Some(obj) => {
        let keys = obj->Dict.keysToArray
        if keys->Array.length > 0 {
          let firstKey = keys->Array.getUnsafe(0)
          switch obj->Dict.get(firstKey) {
          | Some(firstValue) =>
            if firstValue->JSON.Decode.array->Option.isSome {
              ObjectOfArraysShape
            } else if firstValue->JSON.Decode.object->Option.isSome {
              ObjectOfObjectsShape
            } else {
              UnknownShape
            }
          | None => UnknownShape
          }
        } else {
          UnknownShape
        }
      }
    | None => UnknownShape
    }
  }
}

let validateArrayOfArrays = (data: array<array<JSON.t>>): Common.result<unit> => {
  if data->Array.length === 0 {
    TablyfulError.validationError("Array of arrays cannot be empty")
    ->TablyfulError.withSuggestion("Provide at least one row of data.")
    ->TablyfulError.toResult
  } else if data->Array.some(row => !Array.isArray(row)) {
    TablyfulError.validationError("All elements must be arrays")
    ->TablyfulError.atPath("input")
    ->TablyfulError.toResult
  } else {
    Ok()
  }
}

let validateArrayOfObjects = (data: array<dict<JSON.t>>): Common.result<unit> => {
  if data->Array.length === 0 {
    TablyfulError.validationError("Array of objects cannot be empty")->TablyfulError.toResult
  } else {
    Ok()
  }
}

let validateObjectOfArrays = (data: dict<array<JSON.t>>): Common.result<unit> => {
  let keys = data->Dict.keysToArray
  if keys->Array.length === 0 {
    TablyfulError.validationError("Object of arrays cannot be empty")->TablyfulError.toResult
  } else {
    let lengths = keys->Array.map(key =>
      data
      ->Dict.get(key)
      ->Option.map(arr => arr->Array.length)
      ->Option.getOr(0)
    )
    let firstLen = lengths->Array.getUnsafe(0)
    let allSame = lengths->Array.every(len => len === firstLen)

    if !allSame {
      TablyfulError.validationError("All arrays must have the same length")
      ->TablyfulError.withSuggestion("Ensure each column array has the same number of elements.")
      ->TablyfulError.toResult
    } else {
      Ok()
    }
  }
}

let validateObjectOfObjects = (data: dict<dict<JSON.t>>): Common.result<unit> => {
  if data->Dict.keysToArray->Array.length === 0 {
    TablyfulError.validationError("Object of objects cannot be empty")->TablyfulError.toResult
  } else {
    Ok()
  }
}

let fromArrayOfArrays = (data: array<array<JSON.t>>): Common.result<t<array<array<JSON.t>>>> => {
  validateArrayOfArrays(data)->Result.map(() => unsafeFromArrayOfArrays(data))
}

let fromArrayOfObjects = (data: array<dict<JSON.t>>): Common.result<t<array<dict<JSON.t>>>> => {
  validateArrayOfObjects(data)->Result.map(() => unsafeFromArrayOfObjects(data))
}

let fromObjectOfArrays = (data: dict<array<JSON.t>>): Common.result<t<dict<array<JSON.t>>>> => {
  validateObjectOfArrays(data)->Result.map(() => unsafeFromObjectOfArrays(data))
}

let fromObjectOfObjects = (data: dict<dict<JSON.t>>): Common.result<t<dict<dict<JSON.t>>>> => {
  validateObjectOfObjects(data)->Result.map(() => unsafeFromObjectOfObjects(data))
}

let fromJson = (json: JSON.t): Common.result<t<'a>> => {
  let toArrayDict = (obj: dict<JSON.t>): dict<array<JSON.t>> => {
    let dict = Dict.make()
    obj
    ->Dict.keysToArray
    ->Array.forEach(key => {
      let value = obj->Dict.get(key)->Option.getOr(JSON.Encode.null)
      dict->Dict.set(key, value->JSON.Decode.array->Option.getOr([]))
    })
    dict
  }

  let toObjectDict = (obj: dict<JSON.t>): dict<dict<JSON.t>> => {
    let dict = Dict.make()
    obj
    ->Dict.keysToArray
    ->Array.forEach(key => {
      let value = obj->Dict.get(key)->Option.getOr(JSON.Encode.null)
      dict->Dict.set(key, value->JSON.Decode.object->Option.getOr(Dict.make()))
    })
    dict
  }

  switch classify(json) {
  | ArrayOfArraysShape =>
    switch JSON.Decode.array(json) {
    | Some(arr) =>
      let arrays = arr->Array.map(row => row->JSON.Decode.array->Option.getOr([]))
      fromArrayOfArrays(arrays)->Result.map(obj => obj->Obj.magic)
    | None => TablyfulError.parseError("Failed to decode array of arrays")->TablyfulError.toResult
    }
  | ArrayOfObjectsShape =>
    switch JSON.Decode.array(json) {
    | Some(arr) =>
      let objects = arr->Array.map(obj => obj->JSON.Decode.object->Option.getOr(Dict.make()))
      fromArrayOfObjects(objects)->Result.map(obj => obj->Obj.magic)
    | None => TablyfulError.parseError("Failed to decode array of objects")->TablyfulError.toResult
    }
  | ObjectOfArraysShape =>
    switch JSON.Decode.object(json) {
    | Some(obj) =>
      let dict = toArrayDict(obj)
      fromObjectOfArrays(dict)->Result.map(obj => obj->Obj.magic)
    | None => TablyfulError.parseError("Failed to decode object of arrays")->TablyfulError.toResult
    }
  | ObjectOfObjectsShape =>
    switch JSON.Decode.object(json) {
    | Some(obj) =>
      let dict = toObjectDict(obj)
      fromObjectOfObjects(dict)->Result.map(obj => obj->Obj.magic)
    | None => TablyfulError.parseError("Failed to decode object of objects")->TablyfulError.toResult
    }
  | UnknownShape =>
    TablyfulError.parseError("Unknown input format")
    ->TablyfulError.withSuggestion(
      "Input must be one of: array of arrays, array of objects, object of arrays, or object of objects.",
    )
    ->TablyfulError.toResult
  }
}

let toArrayOfArrays = (t: t<array<array<JSON.t>>>): array<array<JSON.t>> => t->Obj.magic
let toArrayOfObjects = (t: t<array<dict<JSON.t>>>): array<dict<JSON.t>> => t->Obj.magic
let toObjectOfArrays = (t: t<dict<array<JSON.t>>>): dict<array<JSON.t>> => t->Obj.magic
let toObjectOfObjects = (t: t<dict<dict<JSON.t>>>): dict<dict<JSON.t>> => t->Obj.magic

let shapeToString = (shape: inputShape): string => {
  switch shape {
  | ArrayOfArraysShape => "array_of_arrays"
  | ArrayOfObjectsShape => "array_of_objects"
  | ObjectOfArraysShape => "object_of_arrays"
  | ObjectOfObjectsShape => "object_of_objects"
  | UnknownShape => "unknown"
  }
}
