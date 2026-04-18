let findByName: (~name: string, ~getName: 'entry => string, array<'entry>) => option<'entry>
let findFirst: (~predicate: 'entry => bool, array<'entry>) => option<'entry>
let getNames: (~getName: 'entry => string, array<'entry>) => array<string>
