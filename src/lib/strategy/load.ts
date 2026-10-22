/**
 * The reads behind a deck's top strategies (`score.ts`): the catalog baseline, memoised per catalog generation, and one
 * deck's nonland cards with their label themes. No model call. Behind `STRATEGY_FOCUS_ENABLED`.
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { cardLabels, cards, deckCards, decks } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { labelGeneration } from "../labels/generation";
import { isLandFace } from "../cards/facet";
import { isGameCard } from "../cards/game-card";
import { freshJobsOf } from "../labels/read";
import type { LabelTheme } from "../labels/types";
import { strategyFocusEnabled } from "./flag";
import { catalogBaseline, deckStrategy, type DeckStrategy, type StrategyBaseline, type StrategyCard } from "./score";

type Reader = Pick<typeof db, "select">;

/**
 * Everything a card's strategy axes and FRESH label themes need. The label row comes whole, with the card inputs its
 * freshness is judged against, so a stale or malformed label counts as no label (`freshJobsOf`, the rule every label
 * reader applies) while the card keeps its type-line axes.
 */
const cardColumns = {
  oracleId: cards.oracleId,
  name: cards.name,
  manaCost: cards.manaCost,
  oracleText: cards.oracleText,
  layout: cards.layout,
  typeLine: cards.typeLine,
  manaValue: cards.cmc,
  keywords: cards.keywords,
  labels: cardLabels.labels,
  labelModel: cardLabels.model,
  promptVersion: cardLabels.promptVersion,
  inputHash: cardLabels.inputHash,
};

/** One card with its label row, or no label row. */
export type CardRow = {
  oracleId: string; name: string; manaCost: string | null; oracleText: string | null; layout: string; typeLine: string;
  manaValue: number; keywords: string[]; quantity: number;
  labels: unknown; labelModel: string | null; promptVersion: string | null; inputHash: string | null;
};

/** The theme kinds of a card's FRESH labels; none for a card with no label row or a stale one. */
export function freshThemes(r: CardRow): LabelTheme[] {
  if (r.labelModel === null || r.promptVersion === null || r.inputHash === null) return [];
  const jobs = freshJobsOf({
    oracle_id: r.oracleId, labels: r.labels, model: r.labelModel, prompt_version: r.promptVersion, input_hash: r.inputHash,
    name: r.name, mana_cost: r.manaCost, type_line: r.typeLine, oracle_text: r.oracleText, layout: r.layout,
  });
  return (jobs ?? []).filter((j) => j.space === "theme").map((j) => j.kind as LabelTheme);
}

/** A commander-legal game card that is not a land, as the strategy reads count it. */
export function toStrategyCard(r: CardRow): StrategyCard | null {
  if (!isGameCard({ layout: r.layout, typeLine: r.typeLine }) || isLandFace(r.typeLine)) return null;
  return { typeLine: r.typeLine, manaValue: r.manaValue, keywords: r.keywords, themes: freshThemes(r), quantity: r.quantity };
}

/** Every commander-legal card with its themes; apart so a test can render its SQL. */
export function catalogQuery(q: Reader) {
  return q
    .select({ ...cardColumns, quantity: sql<number>`1` })
    .from(cards)
    .leftJoin(cardLabels, eq(cardLabels.oracleId, cards.oracleId))
    .where(eq(cards.commanderLegal, true));
}

/** One deck's cards with their themes, scoped to its owner; apart so a test can render its SQL. Commanders are columns on `decks`, never rows here. */
export function deckCardsQuery(q: Reader, userId: string, deckId: string) {
  return q
    .select({ ...cardColumns, quantity: deckCards.quantity })
    .from(deckCards)
    .innerJoin(decks, eq(decks.id, deckCards.deckId))
    .innerJoin(cards, eq(cards.oracleId, deckCards.oracleId))
    .leftJoin(cardLabels, eq(cardLabels.oracleId, cards.oracleId))
    .where(and(eq(deckCards.deckId, deckId), eq(decks.userId, userId)));
}

/** The baseline from the catalog's rows, one copy each. */
export function baselineFromRows(rows: readonly CardRow[]): StrategyBaseline {
  return catalogBaseline(rows.map(toStrategyCard).filter((c): c is StrategyCard => c !== null));
}

// Memoised per catalog generation AND label generation, the way `precons/link-read.ts` memoises the precon catalog. The
// labels publish on their own schedule without moving the catalog generation (`labels/generation.ts`), so a key on the
// catalog alone would score fresh deck themes against stale baseline ones. Only the counts are kept, not the rows.
const MEMO_MS = 10 * 60 * 1000;
let memo: { generation: string; at: number; ticket: number; value: Promise<StrategyBaseline> } | null = null;
let tickets = 0;

export async function loadStrategyBaseline(
  now: number = Date.now(),
  read: () => PromiseLike<readonly CardRow[]> = () => catalogQuery(db),
): Promise<StrategyBaseline> {
  const ticket = ++tickets;
  const [catalog, labels] = await Promise.all([catalogGeneration(), labelGeneration()]);
  // An unreadable label generation has no key: read uncached, which is the answer with no key.
  if (labels === undefined) return Promise.resolve().then(read).then(baselineFromRows);
  const generation = `${catalog}|${labels}`;
  if (memo && memo.generation === generation && now - memo.at < MEMO_MS) return memo.value;
  // Settled once: a Drizzle builder is a lazy thenable that would run its query on every `then`.
  const entry = { generation, at: now, ticket, value: Promise.resolve().then(read).then(baselineFromRows) };
  // An older read finishing last never rolls the memo back.
  if (memo && memo.ticket > ticket) return entry.value;
  memo = entry;
  entry.value.catch(() => {
    if (memo === entry) memo = null;
  });
  return entry.value;
}

/** A deck's top strategies, or null with the switch off or for a deck that is not the reader's. */
export async function loadDeckStrategy(userId: string, deckId: string, env: NodeJS.ProcessEnv): Promise<DeckStrategy | null> {
  if (!strategyFocusEnabled(env)) return null;
  const [rows, baseline] = await Promise.all([deckCardsQuery(db, userId, deckId), loadStrategyBaseline()]);
  if (rows.length === 0) {
    // An empty list and a deck the reader does not own both come back empty; tell them apart.
    const [own] = await db.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
    if (!own) return null;
  }
  return deckStrategy(rows.map(toStrategyCard).filter((c): c is StrategyCard => c !== null), baseline);
}
