// The calls `check:store-reads` lets through for now: each still prices (or picks art) in Mana Pool whatever store the
// reader chose. Store choice slices 3c-2 and 3c-3 thread the store into them. Each slice deletes only its own entries,
// in its own section, when its PR gives the call a store; the check fails on an entry whose call already passes one,
// so this list only shrinks. Nothing new is ever added here: a new read passes the store from its first commit.
//
// An entry names the file and the function the call sits in (`enclosingName` in store-reads.mjs), not a line, so an
// unrelated edit above it does not break the check.

/** Slice 3c-2: intake, decks, commander change. */
const SLICE_3C2 = [
  { path: "src/lib/intake/fill-facts.ts", fn: "loadFillGate" },
  { path: "src/lib/intake/fill-facts.ts", fn: "loadBudgetLeftCents" },
  { path: "src/lib/intake/trial.ts", fn: "trialFill" },
  { path: "src/lib/intake/search.ts", fn: "loadSearchFacts" },
  { path: "src/lib/intake/rows.ts", fn: "decorate" },
  { path: "src/lib/intake/rows.ts", fn: "loadCardChip" },
  { path: "src/lib/decks/draft-state.ts", fn: "readDraft" },
  { path: "src/lib/decks/fill-plan.ts", fn: "buildFillPlan" },
  { path: "src/lib/decks/tuning-read.ts", fn: "readItems" },
  { path: "src/lib/decks/versions.ts", fn: "loadVersionDiff" },
  { path: "src/lib/commander-change/candidates.ts", fn: "loadChangeCandidates" },
  { path: "src/lib/commander-change/draft-rows.ts", fn: "loadCommanderRows" },
];

/** Slice 3c-3: precon upgrade, trade ask, friend spares, the commander page, art chains and opponents. */
const SLICE_3C3 = [
  { path: "src/lib/precons/upgrade/load.ts", fn: "loadUpgradeFor" },
  { path: "src/lib/social/trade-ask.ts", fn: "loadTradeAsk" },
  { path: "src/app/friends/[publicId]/(tabs)/spares/page.tsx", fn: "FriendSparesPage" },
  { path: "src/app/commanders/[slug]/page.tsx", fn: "CommanderDetailPage" },
  { path: "src/lib/cards/chain-art.ts", fn: "chainArt" },
  { path: "src/lib/decks/deck-opponents-read.ts", fn: "withArt" },
  { path: "src/lib/decks/opponent-commanders.ts", fn: "searchOpponentCommanders" },
  { path: "src/lib/decks/opponent-commanders.ts", fn: "searchOpponentBackgrounds" },
];

export const PENDING = [...SLICE_3C2, ...SLICE_3C3];
