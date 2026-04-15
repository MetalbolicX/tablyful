module Make: (
  Config: {
    let name: string
    let extension: string
    let formatImpl: (TableData.t, Types.t) => string
  },
) => FormatterTypes.S
