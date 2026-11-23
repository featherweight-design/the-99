// The calls `check:store-reads` lets through for now: each still prices (or picks art) in Mana Pool whatever store the
// reader chose. Store choice slices 3c-2 and 3c-3 thread the store into them. Each slice deletes only its own entries,
// in its own section, when its PR gives the call a store; the check fails on an entry whose call already passes one,
// so this list only shrinks. Nothing new is ever added here: a new read passes the store from its first commit.
//
// An entry names the file, the function the call sits in (`enclosingName` in store-reads.mjs) and how many of its calls
// leave the store out, not a line, so an unrelated edit above it does not break the check, while a new call in a pending
// function does: the count no longer matches.

/** Slice 3c-2: intake, decks, commander change. */
const SLICE_3C2 = [
  { path: "src/lib/intake/fill-facts.ts", fn: "loadFillGate", n: 1 },
  { path: "src/lib/intake/fill-facts.ts", fn: "loadBudgetLeftCents", n: 1 },
  { path: "src/lib/intake/trial.ts", fn: "trialFill", n: 1 },
  { path: "src/lib/intake/search.ts", fn: "loadSearchFacts", n: 1 },
  { path: "src/lib/intake/rows.ts", fn: "decorate", n: 2 },
  { path: "src/lib/intake/rows.ts", fn: "loadCardChip", n: 1 },
  { path: "src/lib/decks/draft-state.ts", fn: "readDraft", n: 1 },
  { path: "src/lib/decks/fill-plan.ts", fn: "buildFillPlan", n: 1 },
  { path: "src/lib/decks/tuning-read.ts", fn: "readItems", n: 1 },
  { path: "src/lib/decks/versions.ts", fn: "loadVersionDiff", n: 1 },
  { path: "src/lib/commander-change/candidates.ts", fn: "loadChangeCandidates", n: 1 },
  { path: "src/lib/commander-change/draft-rows.ts", fn: "loadCommanderRows", n: 1 },
];

/** Slice 3c-3b: art chains and opponents' commander art (after 3c-2, as `chainArt` has callers in its files). */
const SLICE_3C3 = [
  { path: "src/lib/cards/chain-art.ts", fn: "chainArt", n: 1 },
  { path: "src/lib/decks/deck-opponents-read.ts", fn: "withArt", n: 1 },
  { path: "src/lib/decks/opponent-commanders.ts", fn: "searchOpponentCommanders", n: 1 },
  { path: "src/lib/decks/opponent-commanders.ts", fn: "searchOpponentBackgrounds", n: 1 },
];

export const PENDING = [...SLICE_3C2, ...SLICE_3C3];
