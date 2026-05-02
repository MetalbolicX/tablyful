let findByName = (~name: string, ~getName: 'entry => string, entries: array<'entry>): option<'entry> => {
  let normalizedName = name->String.toLowerCase
  entries->Array.find(entry => getName(entry) === normalizedName)
}

let findFirst = (~predicate: 'entry => bool, entries: array<'entry>): option<'entry> => {
  entries->Array.find(predicate)
}

let getNames = (~getName: 'entry => string, entries: array<'entry>): array<string> => {
  entries->Array.map(getName)
}
