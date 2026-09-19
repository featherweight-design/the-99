// The receipt's second clause: "12 already in use" (#43).
//
// This is SERVER work, and Gate 1 is why. The plan first drew the count where
// the clause renders, but `RecCard` receives only `{ commander, rank }`, and a
// `CommanderListItem` carries `colorPoolSize` — a number — rather than the
// fitting cards it counted. The list itself lives and dies inside
// `scoreCommander`, and there is no availability map on the client at all. Every
// type checked and the state was still unreachable.
//
// It is also cheap where it belongs: one `loadAvailability` for the whole page,
// then one pass over the collection per commander. No second scoring run, and no
// EDHREC fanout — `rankFree` is not on this path, which is what lets the clause
// render in BOTH ranking modes rather than only under `What's free`.

import { type Availability, availabilityState } from "../decks/availability";
import { commanderPool, type PoolCard } from "../recs/score";

/**
 * The two clause counts, one per severity (table rows 8.4 and 8.5).
 *
 * They are disjoint by construction — `availabilityState` returns one state per
 * card — so a card is counted here at most once, and the caller can pick a
 * clause by severity without double-counting anything.
 */
export type ReceiptCounts = {
  /** Fitting owned cards a FINISHED deck has sleeved (`hard` or `over`). */
  inUse: number;
  /** Fitting owned cards only a draft lists (`soft`). */
  wantedByBrew: number;
};

/**
 * How many of each commander's fitting owned cards are spoken for, by severity.
 *
 * The pool comes from `commanderPool`, the same function `scoreCommander` uses,
 * so these counts and `colorPoolSize` describe one set of cards. Deriving them
 * independently would let the receipt's two clauses drift into contradicting
 * each other, and nothing on screen would say which half was wrong.
 *
 * `hard` and `over` are one count; `soft` is the other. That is the same
 * asymmetry the free pool draws and it is the point of the two severities: a
 * card sleeved into a committed deck is gone, a card a draft merely
 * lists is still in the box. A card with no availability row is free — basics
 * have no row by design.
 *
 * No `selfExcluded` option here. That flag answers "does THIS deck's own claim
 * count against it", and a commander recommendation is not a deck; every claim
 * on this surface belongs to some other list.
 */
export function receiptCountsByCommander(
  commanders: Pick<PoolCard, "oracleId" | "colorIdentity">[],
  collection: PoolCard[],
  availability: Map<string, Availability>,
): Map<string, ReceiptCounts> {
  return new Map(
    commanders.map((commander) => {
      const counts: ReceiptCounts = { inUse: 0, wantedByBrew: 0 };
      for (const c of commanderPool(commander, collection)) {
        const a = availability.get(c.oracleId);
        if (!a) continue;
        const state = availabilityState(a);
        if (state === "hard" || state === "over") counts.inUse++;
        else if (state === "soft") counts.wantedByBrew++;
      }
      return [commander.oracleId, counts];
    }),
  );
}
