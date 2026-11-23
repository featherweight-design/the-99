// Precon upgrade · store label (account 1, 2026-11-23). DRAFT for /copy-review. No new strings: the line is built from
// shipped ones, joined with " · " in this order, exactly as the deck Shopping strip builds its provenance line.
//
//   any priced  ? storeCopy.provenance(store)         // "single-copy prices on Card Kingdom" | "TCGplayer market prices"
//               : storeCopy.provenanceUnpriced(store) // "no prices from Card Kingdom for these"
//   any priced && store.figure === "market" ? storeCopy.marketNote   // "averages of recent sales, so a listing can differ"
//   any priced && priced < toBuy ? priceCopy.strip.pricedClause(priced, toBuy)   // "5 of 6 priced"
//   priceCopy.strip.lastChecked(when)                 // "last checked Monday"
//   behind ? priceCopy.strip.behind                   // "these are behind"
//
// precon-upgrade.ts is unchanged. The To buy fact drops its figure when none of the adds to buy is priced.
