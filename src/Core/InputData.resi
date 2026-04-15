type inputShape =
  | ArrayOfArraysShape
  | ArrayOfObjectsShape
  | ObjectOfArraysShape
  | ObjectOfObjectsShape
  | UnknownShape

let classify: JSON.t => inputShape
let shapeToString: inputShape => string
