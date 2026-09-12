// The two `DraftState` literals every versioning component test starts from.
//
// Shared rather than declared per suite because the type has eighteen fields and
// most of them are empty in both states: a suite that grew its own copy would
// stop tracking the shape the moment a field was added, and the two would then
// disagree about what "a deck with no changes" even looks like.

import type { DraftState } from "../../../lib/decks/draft-shape";

/** A draft whose deck has never been committed — every figure empty, because a
 *  brew has no version for anything to be pending against. */
export const BREW: DraftState = {
  version: null,
  adds: [],
  addChanges: [],
  removes: [],
  basicsChanged: false,
  names: new Map(),
  costs: new Map(),
  prices: new Map(),
  pullFrom: new Map(),
  claimsKnown: true,
  buyCount: 0,
  unfreeCount: 0,
  pullableCount: 0,
  total: null,
  pricedCopies: 0,
  newestAsOf: null,
};

/** The same deck with a v1 behind it. Still no changes: the lists a surface
 *  draws are the surface's own fixture, and what this carries is the version
 *  every heading counts from. */
export const COMMITTED: DraftState = {
  ...BREW,
  version: {
    id: "v",
    number: 1,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: null,
    commanderOracleId: "korvold",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
  },
};
