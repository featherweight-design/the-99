"use client";

// The ledger's mark — which pass's cards are currently highlighted in the
// decklist below it. §14 of the top-off design table.

import { createContext, useContext } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import type { FillPassSummary } from "../../lib/decks/fill-passes";

/** The pass's name in the ledger and in a marked row's accessible name. Lives
 *  here rather than in `fill-passes.ts` because that module reaches for the
 *  database, and every consumer of this label is a client component. */
export function fillPassLabel(pass: { kind: string; ordinal: number }): string {
  return pass.kind === "seed"
    ? topOffCopy.ledger.seedLabel
    : topOffCopy.ledger.passLabel(String(pass.ordinal));
}

export interface PassMark {
  /** The marked pass's live cards. A row draws the accent edge when its oracle
   *  id is in here, which is why the mark is a set rather than the pass. */
  oracleIds: Set<string>;
  label: string;
}

/**
 * A context rather than a prop, because `DecklistRow` is mounted from five call
 * sites behind three intermediate components and the mark is one boolean per
 * row. Same shape as `optimistic-deck.tsx`: null outside a provider, so a row
 * mounted anywhere else — a test, the add panel — renders unmarked rather than
 * throwing.
 */
const PassMarkContext = createContext<PassMark | null>(null);

export function PassMarkProvider({
  value,
  children,
}: {
  value: PassMark | null;
  children: React.ReactNode;
}) {
  return <PassMarkContext.Provider value={value}>{children}</PassMarkContext.Provider>;
}

export function usePassMark(): PassMark | null {
  return useContext(PassMarkContext);
}

/** Builds the context value for a marked pass, or null when nothing is marked. */
export function passMarkFor(pass: FillPassSummary | null): PassMark | null {
  if (!pass) return null;
  return {
    oracleIds: new Set(pass.liveCards.map((c) => c.oracleId)),
    label: fillPassLabel(pass),
  };
}
