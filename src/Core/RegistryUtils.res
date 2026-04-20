let findByName = (~name: string, ~getName: 'entry => string, entries: array<'entry>): option<'entry> => {
  let normalizedName = name->String.toLowerCase
  entries->Bindings.Iter.fromArray->Bindings.Iter.find(entry => getName(entry) === normalizedName)
}

let findFirst = (~predicate: 'entry => bool, entries: array<'entry>): option<'entry> => {
  entries->Bindings.Iter.fromArray->Bindings.Iter.find(predicate)
}

let getNames = (~getName: 'entry => string, entries: array<'entry>): array<string> => {
  entries->Bindings.Iter.fromArray->Bindings.Iter.map(getName)->Bindings.Iter.toArray
}
