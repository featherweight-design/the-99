import { and, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { chainArt } from "../cards/chain-art";
import type { ReadPicks } from "./the-read";

/**
 * A pick of a past run the search no longer lists (History): what it is, and whether the player has
 * built it since. SERVER-ONLY. A decoration: the page draws the group from what this returns, and a
 * failed read draws the run without the group rather than not at all.
 */
export type GonePick = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  artCropUri: string | null;
  /** The newest deck the player has led by this commander, when there is one: why the pick went. */
  deck: { id: string; name: string } | null;
};

export async function loadGonePicks(
  userId: string,
  ids: readonly string[],
  since: Date,
  /** The reader's resolved switches (`requestSwitchEnv`), for the printing the row previews (`chainArt`). */
  env: NodeJS.ProcessEnv,
): Promise<GonePick[]> {
  if (ids.length === 0) return [];
  const [found, built, art] = await Promise.all([
    db.select({ id: cards.oracleId, name: cards.name, image: cards.imageUri, crop: cards.artCropUri }).from(cards)
      .where(inArray(cards.oracleId, [...ids])),
    // Either slot: a partner helms its deck as the primary does (`notBuiltBy` reads both).
    db.select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId, id: decks.id, name: decks.name, createdAt: decks.createdAt }).from(decks)
      .where(and(eq(decks.userId, userId), or(inArray(decks.commanderOracleId, [...ids]), inArray(decks.partnerOracleId, [...ids]))))
      .orderBy(desc(decks.createdAt)),
    // The printing card details open on (the reader's own copy, else the catalog's), which the row previews.
    chainArt(userId, null, ids, env),
  ]);
  const card = new Map(found.map((c) => [c.id, c]));
  // The query is newest first, so the first deck seen for a commander is its newest. Only a deck made
  // after the run counts: an older one did not make the pick go, so "you built it since" would be false.
  const deck = new Map<string, { id: string; name: string }>();
  for (const d of built.filter((b) => b.createdAt >= since)) {
    for (const c of [d.commander, d.partner]) if (c && !deck.has(c)) deck.set(c, { id: d.id, name: d.name });
  }
  return ids.flatMap((id) => {
    const c = card.get(id);
    // A card the catalog dropped is not drawn: there is nothing to name.
    return c ? [{ oracleId: id, name: c.name, imageUri: art.get(id) ?? c.image, artCropUri: c.crop, deck: deck.get(id) ?? null }] : [];
  });
}

/**
 * The commanders' names for decks a past run's reasons name that the read's own list (capped, sorted by name) no
 * longer holds: a reason's deck is a deck the player has, so a missing name is the cap or the sort moving, not
 * a deletion. Reader-scoped and uncapped; a throw is the caller's to treat as "unknown", never as "deleted".
 */
export async function loadDeckCommanderNames(userId: string, ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: decks.commanderOracleId, name: cards.name }).from(decks)
    .innerJoin(cards, eq(cards.oracleId, decks.commanderOracleId))
    .where(and(eq(decks.userId, userId), inArray(decks.commanderOracleId, [...ids])));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * Adds to `deckNames` the names a past run's reasons need that the read's own list (capped, sorted) lacks.
 * False when the lookup failed: the caller then claims nothing about those decks.
 */
export async function completePastDeckNames(
  userId: string,
  picks: ReadPicks,
  deckNames: Record<string, string>,
  label: (name: string) => string,
): Promise<boolean> {
  const missing = [...new Set(picks.picks.flatMap((k) => k.reason.flatMap((part) => ("deck" in part && deckNames[part.deck] === undefined ? [part.deck] : []))))];
  try {
    for (const [id, name] of await loadDeckCommanderNames(userId, missing)) deckNames[id] = label(name);
    return true;
  } catch {
    return false;
  }
}
