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

let shapeToString = (shape: inputShape): string => {
  switch shape {
  | ArrayOfArraysShape => "array_of_arrays"
  | ArrayOfObjectsShape => "array_of_objects"
  | ObjectOfArraysShape => "object_of_arrays"
  | ObjectOfObjectsShape => "object_of_objects"
  | UnknownShape => "unknown"
  }
}
