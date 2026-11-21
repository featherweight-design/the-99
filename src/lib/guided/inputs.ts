import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cards, deckCards, decks } from "../../db/schema";
import { readOwnedOracleIds } from "../decks/tuning-read";
import { cheapestNow, loadPrices } from "../decks/price-query";
import { loadSupportMeta } from "../edhrec/support-read";
import type { DeckLine, PoolRow } from "../precons/upgrade/inputs";
import { assembleDeck, assemblePool, mergeLines } from "../precons/upgrade/inputs";
import type { BracketTarget } from "../precons/upgrade/hold";
import { readGameChangers, readPool } from "../precons/upgrade/load";
import { detectStrategies, type Strategy } from "../precons/upgrade/detect";
import type { PoolMode } from "./constants";

/**
 * Guided build's reads (model-free). SERVER-ONLY. The deck is the player's own, read live: the free fill the build just placed, with
 * the commander(s) from the deck row. The deck's name never reaches a prompt (it is player-typed): the commanders' names stand in.
 */

export type GuidedDeck = {
  deckName: string;
  commanderIds: string[];
  lines: DeckLine[];
};

export async function loadGuidedDeck(userId: string, deckId: string): Promise<GuidedDeck | null> {
  const [deck] = await db.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId))).limit(1);
  if (!deck) return null;
  const commanderIds = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const cols = {
    oracleId: cards.oracleId, name: cards.name, manaCost: cards.manaCost, typeLine: cards.typeLine, oracleText: cards.oracleText,
    keywords: cards.keywords, cmc: cards.cmc, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity,
  };
  const body = await db.select({ ...cols, quantity: deckCards.quantity }).from(deckCards)
    .innerJoin(cards, eq(cards.oracleId, deckCards.oracleId)).where(eq(deckCards.deckId, deckId));
  const heads = await db.select(cols).from(cards).where(inArray(cards.oracleId, commanderIds));
  const lines = mergeLines([
    ...heads.map((c): DeckLine => ({ ...c, quantity: 1, isCommander: true })),
    ...body.filter((c) => !commanderIds.includes(c.oracleId)).map((c): DeckLine => ({ ...c, isCommander: false })),
  ]);
  if (heads.length !== commanderIds.length) return null;
  return { deckName: heads.map((h) => h.name).join(" + "), commanderIds, lines };
}

/** The strategies the commander's themes back with cards the deck holds. Empty means no run is offered (READINESS Y3). */
export async function guidedStrategies(deck: GuidedDeck): Promise<(Strategy & { backing: { oracleId: string; name: string }[] })[]> {
  const meta = await loadSupportMeta(deck.commanderIds);
  const tags = deck.commanderIds.flatMap((id) => meta.get(id)?.tags ?? []);
  const facts = assembleDeck(deck.lines, new Map()).facts;
  const names = new Map(deck.lines.map((l) => [l.oracleId, l.name] as const));
  return detectStrategies({ tags, deck: facts, overview: [] })
    .map((s) => ({ ...s, backing: s.backingIds.map((id) => ({ oracleId: id, name: names.get(id) ?? "" })) }));
}

/**
 * The pool the run adds from, and the prices of the deck. `owned`: index rows the player owns; `cap` and `budget`: the index's own rows
 * (the per-card cap is `poolForPrompt`'s; a budget is enforced on the answer's total, `validateUpgrade`).
 */
export async function loadGuidedPool(userId: string, deck: GuidedDeck, bracket: BracketTarget, mode: PoolMode) {
  const deckIds = new Set(deck.lines.map((l) => l.oracleId));
  const identity = [...new Set(deck.lines.filter((l) => l.isCommander).flatMap((l) => l.colorIdentity))];
  let rows: PoolRow[] = await readPool(deck.commanderIds, [...deckIds], bracket < 3);
  if (bracket >= 3) rows.push(...(await readGameChangers(deck.commanderIds, [...deckIds], identity, rows)));
  if (mode === "owned") {
    const owned = await readOwnedOracleIds(userId, rows.map((r) => r.oracleId));
    rows = rows.filter((r) => owned.has(r.oracleId));
  }
  const ids = [...deckIds, ...rows.map((r) => r.oracleId)];
  const read = await loadPrices(ids);
  const cents = new Map(ids.map((id) => [id, cheapestNow(read, id)] as const));
  return { deck: assembleDeck(deck.lines, cents), pool: assemblePool(rows, cents, deckIds) };
}
