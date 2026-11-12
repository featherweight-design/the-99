/**
 * Upgrade precon on the deck page (addendum A2c, G16 and G18): what the band needs, or null when it draws nothing. Read on
 * every visit while the gate is open (clarification 3), chained on the page's v0 read so only a deck with a precon origin
 * pays for it. SERVER-ONLY: it imports the database.
 *
 * - The gate (`deck-gate.ts`) over the deck as it is now: its live 99 and helm, and every version it has committed.
 * - The panel the precon page draws (`readUpgrade`, keyed by reader and precon file), so History is one list on both pages.
 * - What you own of the box (`readPreconArrival`), the band's second line.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { deckCards, decks, deckVersions } from "../../../db/schema";
import { readPreconArrival, type PreconArrival } from "../arrival-read";
import type { OriginRead } from "../origin";
import { preconUpgradeEnabled } from "./flag";
import { upgradeOffered } from "./flow";
import { upgradeGateOpen } from "./deck-gate";
import { LIVE_DEPS, readUpgrade, type UpgradePanel } from "./run";

export type DeckUpgrade = {
  /** The precon's plain edition: the file the runs belong to. */
  fileName: string;
  precon: string;
  /** Started from the precon (its v0 is the deck's own first version), or linked to it after the fact (R3 K14: a brew). */
  kind: "started" | "linked";
  /** The version the swaps' commit makes: v1 above a v0 start, v2 above a legacy start that holds the box as v1, v1 for a brew. */
  nextVersion: number;
  panel: UpgradePanel;
  arrival: PreconArrival;
  /** The box's art by card, as the precon page draws the flow's commanders and strategies. Entries, so it crosses the wire. */
  art: [string, string | null][];
};

export async function readDeckUpgrade(userId: string, deckId: string, origin: OriginRead | null, env: NodeJS.ProcessEnv): Promise<DeckUpgrade | null> {
  if (!origin || !preconUpgradeEnabled(env)) return null;
  // The versions first: most decks with an origin are past v0, and they answer the gate without reading their list. One
  // connection at a time, beside the page's own wave (its pool is ten).
  const versions = await db.select({ id: deckVersions.id, number: deckVersions.number }).from(deckVersions)
    .innerJoin(decks, eq(decks.id, deckVersions.deckId))
    .where(and(eq(deckVersions.deckId, deckId), eq(decks.userId, userId))).orderBy(asc(deckVersions.number));
  const s = origin.summary;
  if (versions.length > 1 || (versions.length === 1 && versions[0].id !== s.startVersionId)) return null;
  const [deck] = await db.select({ commanderOracleId: decks.commanderOracleId, partnerOracleId: decks.partnerOracleId })
    .from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) return null;
  const live = await db.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity }).from(deckCards).where(eq(deckCards.deckId, deckId));
  const box = { commanderOracleId: s.commanderOracleId, partnerOracleId: s.partnerOracleId, cards: origin.cards };
  if (!upgradeGateOpen(box, s.startVersionId, versions.map((v) => v.id), { ...deck, cards: live })) return null;
  const [panel, arrival] = await Promise.all([readUpgrade(userId, s.fileName, LIVE_DEPS, env), readPreconArrival(userId, deckId)]);
  if (!upgradeOffered(panel) || !arrival) return null;
  return {
    fileName: s.fileName,
    precon: s.name,
    kind: s.startVersionId === null ? "linked" : "started",
    // The deck's one version (the gate allows no other) is its start version: the commit makes the next number.
    nextVersion: (versions.at(-1)?.number ?? 0) + 1,
    panel,
    arrival,
    art: origin.cards.map((c) => [c.oracleId, c.imageUri]),
  };
}
