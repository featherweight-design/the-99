import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import {
  commanderPairSupport,
  commanderPairSupportCards,
  commanderSupport,
  commanderSupportCards,
} from "../../db/schema";
import { canonicalPair } from "../edhrec/pair";
import { readProfileHead } from "../profile/load";
import { proposeCuts, type CutSupport, type ProposedCuts } from "../tuning/cuts";
import { proposedCutsEnabled } from "../tuning/flag";
import { liveLockedIds } from "./locks";
import { neverCutEnabled } from "./never-cut-flag";
import { profileOfHead } from "./tuning-read";

/**
 * Proposed cuts for a deck (tuning roadmap, sub-project 4): the engine's inputs, read, and its
 * answer. Null when the switch is off or the deck is not the reader's. No model call, no write.
 *
 * The head and the locks come from ONE snapshot, as `tuningInputs` takes them: read apart, a lock
 * landing between the two would be checked against a list it was not placed on.
 */
export async function readProposedCuts(deckId: string, userId: string): Promise<ProposedCuts | null> {
  if (!proposedCutsEnabled()) return null;
  const snapshot = await db.transaction(async (tx) => {
    const head = await readProfileHead(tx, deckId, userId);
    if (!head) return null;
    const locked = neverCutEnabled() ? await liveLockedIds(tx, deckId) : new Set<string>();
    return { head, locked };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  if (!snapshot) return null;
  const [profile, support] = await Promise.all([
    profileOfHead(snapshot.head),
    readCutSupport(snapshot.head.commanderOracleId, snapshot.head.partnerOracleId),
  ]);
  return proposeCuts({ profile, locked: snapshot.locked, support });
}

/**
 * The commander's (or the pair's own) EDHREC support list, as inclusion percents. Null when there
 * is no usable list: no row, a row whose page was absent or degraded, or a list with no cards.
 * The engine then runs without the inclusion signal and names it missing (ruling 6).
 *
 * A pair reads the PAIR's page only. Neither commander's own page describes the decks that run the
 * two together, and falling back to one would score the other's cards against the wrong decks.
 */
export async function readCutSupport(commander: string, partner: string | null): Promise<CutSupport | null> {
  let header: { state: string; deckCount: number | null } | undefined;
  let rows: { oracleId: string; inclusion: number | null }[];
  if (partner) {
    const pair = canonicalPair(commander, partner);
    const key = (t: typeof commanderPairSupport | typeof commanderPairSupportCards) => and(
      eq(t.commanderOracleId, pair.commanderOracleId),
      eq(t.partnerOracleId, pair.partnerOracleId),
    );
    [[header], rows] = await Promise.all([
      db.select({ state: commanderPairSupport.synergyState, deckCount: commanderPairSupport.deckCount })
        .from(commanderPairSupport).where(key(commanderPairSupport)),
      db.select({ oracleId: commanderPairSupportCards.oracleId, inclusion: commanderPairSupportCards.inclusion })
        .from(commanderPairSupportCards).where(key(commanderPairSupportCards)),
    ]);
  } else {
    [[header], rows] = await Promise.all([
      db.select({ state: commanderSupport.synergyState, deckCount: commanderSupport.deckCount })
        .from(commanderSupport).where(eq(commanderSupport.commanderOracleId, commander)),
      db.select({ oracleId: commanderSupportCards.oracleId, inclusion: commanderSupportCards.inclusion })
        .from(commanderSupportCards).where(eq(commanderSupportCards.commanderOracleId, commander)),
    ]);
  }
  if (header?.state !== "ok" || rows.length === 0) return null;
  return {
    deckCount: header.deckCount,
    listed: rows.length,
    inclusion: new Map(rows.map((r) => [r.oracleId, r.inclusion])),
  };
}
