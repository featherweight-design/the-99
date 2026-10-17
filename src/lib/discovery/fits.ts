/**
 * Which of the reader's decks each tool's Try it can open (discovery plan R2·3, E10, R2 gaps 1 to 3).
 *
 * A tool that needs a deck fits the decks it can do something for: Top off a deck under its body size, Proposed cuts
 * one over it, Suggested changes and Mana Balance a full deck, Cheaper stand-ins a deck with a buy row over its price
 * limit, Friends' spares a deck missing a card a friend has a spare of, and Matchups a deck with a game that recorded
 * an opponent. The body is 99, or 98 with a partner (`deckBodySize`), never a flat 99. A tool whose card opens no deck
 * (Help me choose, Precons and the rest) has no `fits`.
 *
 * `fitsOf` is pure. `loadToolFits` reads the facts once, on the server when `/about` loads, and only the reads the
 * asked tools need: the caller passes the tools whose switches are on, so a switched-off tool costs nothing.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { deckGameOpponents, deckGames, decks as decksTable } from "../../db/schema";
import { loadDeckBuyRows, type DeckBuyRow } from "../decks/availability-query";
import { deckBodySize } from "../decks/deck-size";
import { priceFor } from "../decks/price-query";
import { listDecksWithStats } from "../decks/read";
import { readBuyRowPrices } from "../decks/shopping-rollup";
import { byTouched } from "../decks/touched";
import { loadFriendSpares } from "../social/spares";
import { effectiveLimit, isOverLimit } from "../swaps/limit";

/** The tools whose Try it opens a deck, by their registry ids. */
export const DECK_TOOLS = [
  "top-off", "proposed-cuts", "suggested-changes", "mana-balance", "stand-ins", "friend-spares", "matchups",
] as const;
export type DeckToolId = (typeof DECK_TOOLS)[number];

/** What a deck's fit is judged on. Built by `loadToolFits`; built by hand in tests. */
export type DeckFacts = {
  id: string;
  name: string;
  /** The body's cards, commanders excluded. */
  built: number;
  /** 99, or 98 with a partner. */
  size: number;
  /** A Shopping row (never a commander's) priced over the deck's own limit. */
  overLimit: boolean;
  /** A card the deck still needs that a friend shares a spare of. */
  friendSpare: boolean;
  /** A logged game that recorded at least one opponent. */
  gameWithOpponents: boolean;
};

export const FITS: Record<DeckToolId, (d: DeckFacts) => boolean> = {
  "top-off": (d) => d.built < d.size,
  "proposed-cuts": (d) => d.built > d.size,
  "suggested-changes": (d) => d.built === d.size,
  "mana-balance": (d) => d.built === d.size,
  "stand-ins": (d) => d.overLimit,
  "friend-spares": (d) => d.friendSpare,
  matchups: (d) => d.gameWithOpponents,
};

/** The decks a tool fits, in the order given, which the loader makes most recently touched first (R2 gap 1). */
export type ToolFit = { decks: { id: string; name: string }[] };

export function fitsOf(decks: readonly DeckFacts[], tools: readonly DeckToolId[]): Partial<Record<DeckToolId, ToolFit>> {
  const out: Partial<Record<DeckToolId, ToolFit>> = {};
  for (const tool of tools) {
    out[tool] = { decks: decks.filter(FITS[tool]).map((d) => ({ id: d.id, name: d.name })) };
  }
  return out;
}

export async function loadToolFits(
  userId: string,
  /** The reader's resolved switches (`requestSwitchEnv`), for the deck list and the claim model. */
  env: NodeJS.ProcessEnv,
  tools: readonly DeckToolId[],
): Promise<Partial<Record<DeckToolId, ToolFit>>> {
  if (tools.length === 0) return {};
  const asked = new Set(tools);
  const [list, rows, played] = await Promise.all([
    listDecksWithStats(userId, "name", { env }),
    asked.has("stand-ins") || asked.has("friend-spares") ? loadDeckBuyRows(userId, undefined, undefined, env) : [],
    asked.has("matchups") ? decksWithOpponents(userId) : new Set<string>(),
  ]);
  const [overLimit, spared] = await Promise.all([
    asked.has("stand-ins") ? decksOverLimit(userId, rows, env) : new Set<string>(),
    asked.has("friend-spares") ? decksWithSpares(userId, rows) : new Set<string>(),
  ]);
  const facts = [...list].sort(byTouched).map((d): DeckFacts => ({
    id: d.id,
    name: d.name,
    built: d.built,
    size: deckBodySize(d.partnerName !== null),
    overLimit: overLimit.has(d.id),
    friendSpare: spared.has(d.id),
    gameWithOpponents: played.has(d.id),
  }));
  return fitsOf(facts, tools);
}

/** Decks with a non-commander buy row priced over their own limit, as the Shopping list marks them. */
async function decksOverLimit(userId: string, rows: DeckBuyRow[], env: NodeJS.ProcessEnv): Promise<Set<string>> {
  if (rows.length === 0) return new Set();
  const [read, limits] = await Promise.all([
    readBuyRowPrices(userId, rows, env),
    db.select({
      id: decksTable.id,
      limit: decksTable.shoppingLimitCents,
      commander: decksTable.commanderOracleId,
      partner: decksTable.partnerOracleId,
    }).from(decksTable).where(eq(decksTable.userId, userId)),
  ]);
  const byDeck = new Map(limits.map((d) => [d.id, d]));
  const out = new Set<string>();
  for (const row of rows) {
    const deck = byDeck.get(row.deckId);
    if (!deck || row.oracleId === deck.commander || row.oracleId === deck.partner) continue;
    if (isOverLimit(priceFor(read, row.deckId, row.oracleId), read.newestAsOf, effectiveLimit(deck.limit))) out.add(row.deckId);
  }
  return out;
}

/**
 * Decks missing a card a friend shares a spare of, read once over the union of every deck's missing cards with no cap
 * (R2 gap 3): `MAX_SPARES_BATCH` limits one HTTP request, not this server read, and a cap would drop a deck whose only
 * spare is past it.
 */
async function decksWithSpares(userId: string, rows: DeckBuyRow[]): Promise<Set<string>> {
  if (rows.length === 0) return new Set();
  const spares = await loadFriendSpares(userId, [...new Set(rows.map((r) => r.oracleId))]);
  const spared = new Set(spares.filter((s) => s.spare > 0).map((s) => s.oracleId));
  return new Set(rows.filter((r) => spared.has(r.oracleId)).map((r) => r.deckId));
}

/** Decks with at least one logged game that recorded an opponent. */
async function decksWithOpponents(userId: string): Promise<Set<string>> {
  const rows = await decksWithOpponentsQuery(userId);
  return new Set(rows.map((r) => r.deckId));
}

export function decksWithOpponentsQuery(userId: string) {
  return db
    .selectDistinct({ deckId: deckGames.deckId })
    .from(deckGames)
    .innerJoin(deckGameOpponents, eq(deckGameOpponents.gameId, deckGames.id))
    .where(eq(deckGames.userId, userId));
}
