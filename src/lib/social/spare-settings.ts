/**
 * Settings' Spares (menu and Home plan PR 3, handoff G3): the threshold (`user_prefs.spare_min`) and the cards kept back
 * (`spare_keep`). The reader's OWN reads and writes are here; a FRIEND's settings are read only by `spareSettingsIn`,
 * which `spares.ts` calls inside the friend's snapshot, after that snapshot's grant check, so the one filter
 * (`isOffered`) sees the grantor's settings and nothing else of theirs.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, spareKeep, userPrefs } from "../../db/schema";
import { nameSearch } from "../cards/name-search";
import { isGameCardWhere } from "../cards/game-card-where";
import { loadAvailability } from "../decks/availability-query";
import type { Reader } from "./access";
import { isUuid } from "./rules";
import { cleanSpareMin, spareCount, spareMinOf } from "./spare-rules";

type Writer = Pick<typeof db, "insert" | "delete" | "select">;

/** One account's threshold and the cards it keeps back among `asked`. */
export type SpareSettings = { min: number; kept: ReadonlySet<string> };

/** The threshold row: absent reads as the default. Apart so a test can render its SQL. */
export function spareMinQuery(userId: string, q: Reader = db) {
  return q.select({ spareMin: userPrefs.spareMin }).from(userPrefs).where(eq(userPrefs.userId, userId));
}

/** The cards `userId` keeps back among `asked`. Apart so a test can render its SQL. */
export function keptAmongQuery(userId: string, asked: readonly string[], q: Reader = db) {
  return q
    .select({ oracleId: spareKeep.oracleId })
    .from(spareKeep)
    .where(and(eq(spareKeep.userId, userId), inArray(spareKeep.oracleId, [...asked])));
}

/**
 * An account's spare settings, read through the reader it is given: `spares.ts` hands it the friend's snapshot
 * transaction, after that snapshot's own grant check found the friend, so nothing here is read for a friend whose
 * grant is gone. Only the asked cards' keeps are read.
 */
export async function spareSettingsIn(q: Reader, userId: string, asked: readonly string[]): Promise<SpareSettings> {
  const [row] = await spareMinQuery(userId, q);
  const kept = asked.length === 0 ? [] : await keptAmongQuery(userId, asked, q);
  return { min: spareMinOf(row?.spareMin), kept: new Set(kept.map((k) => k.oracleId)) };
}

/** The reader's own threshold. */
export async function readSpareMin(userId: string): Promise<number> {
  const [row] = await spareMinQuery(userId);
  return spareMinOf(row?.spareMin);
}

/**
 * Sets the reader's threshold. Written only when it changes (`setWhere`), because `user_prefs` carries the stamp
 * trigger: an unchanged value moves no stamp. False for a value off the stepper's range.
 */
export async function setSpareMin(userId: string, value: unknown, q: Writer = db): Promise<boolean> {
  const min = cleanSpareMin(value);
  if (min === null) return false;
  await q
    .insert(userPrefs)
    .values({ userId, spareMin: min })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { spareMin: min },
      setWhere: sql`${userPrefs.spareMin} is distinct from ${min}`,
    });
  return true;
}

/**
 * Keeps a card back. The card must be in the catalog: the insert selects it from `cards`, so an unknown id writes
 * nothing and answers false. Already kept answers true and writes nothing.
 */
export async function keepCardBack(userId: string, oracleId: unknown): Promise<boolean> {
  if (!isUuid(oracleId)) return false;
  const id = oracleId.toLowerCase();
  const [card] = await db.select({ oracleId: cards.oracleId }).from(cards).where(eq(cards.oracleId, id));
  if (!card) return false;
  await db.insert(spareKeep).values({ userId, oracleId: card.oracleId }).onConflictDoNothing();
  return true;
}

/** Lets a kept card go back to the spares. Not kept answers true: there is nothing left to undo. */
export async function releaseCard(userId: string, oracleId: unknown): Promise<boolean> {
  if (!isUuid(oracleId)) return false;
  await db.delete(spareKeep).where(and(eq(spareKeep.userId, userId), eq(spareKeep.oracleId, oracleId.toLowerCase())));
  return true;
}

/** What a kept row draws when the collection no longer holds the card. */
export type KeptCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  rarity: string;
  colorIdentity: string[];
  imageUri: string | null;
  layout: string;
};

/** The reader's own kept cards, newest first, with the catalog fields a row needs. Apart so a test can render it. */
export function keptBackQuery(userId: string, q: Reader = db) {
  return q
    .select({
      oracleId: spareKeep.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      manaCost: cards.manaCost,
      rarity: cards.rarity,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      layout: cards.layout,
    })
    .from(spareKeep)
    .innerJoin(cards, eq(cards.oracleId, spareKeep.oracleId))
    .where(eq(spareKeep.userId, userId))
    .orderBy(desc(spareKeep.createdAt), asc(cards.name));
}

export async function loadKeptBack(userId: string): Promise<KeptCard[]> {
  return keptBackQuery(userId);
}

/** At most this many cards a Keep a card back search answers. */
export const SPARE_SEARCH_LIMIT = 12;

export type SpareSearchHit = { oracleId: string; name: string; spare: number };

/**
 * The reader's owned cards whose name matches and that are not kept back yet, best match first. Apart so a test can
 * render its SQL; `searchSpareCards` then keeps the ones holding a spare copy.
 */
export function ownedMatchesQuery(userId: string, match: NonNullable<ReturnType<typeof nameSearch>>, q: Reader = db) {
  const { flavorHits } = match;
  return q
    .select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .leftJoin(flavorHits, eq(flavorHits.oracleId, cards.oracleId))
    .where(and(
      match.where,
      isGameCardWhere(),
      sql`exists (select 1 from ${collectionItems} ci where ci.oracle_id = ${cards.oracleId} and ci.user_id = ${userId})`,
      sql`not exists (select 1 from ${spareKeep} sk where sk.oracle_id = ${cards.oracleId} and sk.user_id = ${userId})`,
    ))
    .orderBy(match.rank, asc(cards.name))
    .limit(SPARE_SEARCH_LIMIT * 4);
}

/**
 * Keep a card back's search: the reader's own cards by name that hold at least one spare copy (`owned − hard − soft`,
 * the friend read's own figure), not kept back already. A card is searchable at ANY count, under the threshold
 * included: keeping it back holds when the count later rises.
 */
export async function searchSpareCards(userId: string, query: unknown, env: NodeJS.ProcessEnv): Promise<SpareSearchHit[]> {
  if (typeof query !== "string") return [];
  const match = nameSearch(query);
  if (!match) return [];
  const rows = await ownedMatchesQuery(userId, match);
  if (rows.length === 0) return [];
  const model = await loadAvailability(userId, { oracleIds: rows.map((r) => r.oracleId), env });
  const out: SpareSearchHit[] = [];
  for (const r of rows) {
    const a = model.get(r.oracleId);
    const spare = a ? spareCount(a) : 0;
    if (spare > 0) out.push({ oracleId: r.oracleId, name: r.name, spare });
    if (out.length === SPARE_SEARCH_LIMIT) break;
  }
  return out;
}
