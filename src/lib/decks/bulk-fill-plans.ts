// The bulk pair's plans, read from the database: the deck's inputs, the list's allow-list and one fill plan per pool.
// Moved out of `src/app/decks/actions.ts` unchanged so the two actions that ask for a plan (`chooseBulkFill`,
// `bulkFillOptions`) and the landing demo's export (`scripts/demo-export.mts`, which has no session) read the same plans.
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards } from "../../db/schema";
import { requireDeck } from "./read";
import { deckBodySize } from "./deck-size";
import { listLastSlotsCandidates } from "./last-slots";
import { readDeckSynergy } from "./deck-synergy";
import { isResidual, type FillRow } from "./fill";
import { buildFillPlan } from "./fill-plan";
import type { BulkPlan } from "./bulk-concession";

/**
 * THE GATHER, once, for both pools.
 *
 * `chooseBulkFill` and `bulkFillOptions` ask the same five questions of the database — the
 * deck, its commanders, its `deck_cards` rows and what those cards ARE — and differ only in
 * which pool they then plan from. Written twice they would drift, and the pair's whole promise
 * is that the note beside a control describes the press that control makes.
 *
 * Returns `null` for a deck whose commander the catalog cannot resolve, which both callers
 * report as the same refusal.
 */
export async function gatherFillInputs(deckId: string, userId: string) {
    const deck = await requireDeck(deckId, userId);
    const [commander] = await db.select().from(cards)
      .where(eq(cards.oracleId, deck.commanderOracleId));
    if (!commander) return null;
    // The partner legalises the pool alongside the primary, exactly as the create path reads it.
    const [partner] = deck.partnerOracleId
      ? await db.select().from(cards).where(eq(cards.oracleId, deck.partnerOracleId))
      : [];
    // THE DECK AS IT STANDS, not just its ids. `planFill` counts role coverage from zero
    // unless it is told otherwise, and every caller before this one filled an empty deck —
    // so asking for four slots returned the first four placements of a from-scratch 99. A
    // deck holding twenty ramp sources and no draw was offered four more ramp, which is the
    // exact failure this control exists to end.
    const heldRows = await db.select({
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
    }).from(deckCards).where(eq(deckCards.deckId, deckId));

    // A SECOND READ rather than a join, because the two questions are different: the rows say
    // what the deck holds, the catalog says what those cards ARE. A held card need not be in
    // the collection at all — sold, traded, or never owned and proxied — so this cannot come
    // off the owned pool that the candidates are drawn from.
    const heldIds = heldRows.map((r) => r.oracleId);
    const heldCards = heldIds.length === 0 ? [] : await db.select({
      oracleId: cards.oracleId,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      layout: cards.layout,
      manaCost: cards.manaCost,
    }).from(cards).where(inArray(cards.oracleId, heldIds));
    const heldById = new Map(heldCards.map((c) => [c.oracleId, c]));
    const heldCount = heldRows.reduce((n, r) => n + r.quantity, 0);
    const held = heldRows.flatMap((r) => {
      const card = heldById.get(r.oracleId);
      // A row whose card the catalog no longer resolves is dropped rather than counted as a
      // typeless, textless card: classifying that would credit no role and tally no type,
      // which is a silent undercount dressed as data.
      return card ? [{ ...card, quantity: r.quantity }] : [];
    });

  return { deck, commander, partner, heldIds, heldCount, held };
}

export type FillInputs = NonNullable<Awaited<ReturnType<typeof gatherFillInputs>>>;

/**
 * One plan, from one pool. `sleeveable` is what the collection control offers; `all` is what
 * the deck needs whoever owns it.
 */
/**
 * THE ROWS THE TOP-OFF LIST DRAWS, as ids: the plan behind a bulk control may pick only these.
 *
 * The list is the commander's EDHREC support list less the deck's own cards and the negative
 * tail (`listLastSlotsCandidates`), while the plan's pool is the whole owned collection. So a
 * control could plan cards the list has no row for, name a count, and tick nothing. Read through
 * the page's own cached read (`readDeckSynergy`) and the page's own filter, so the two are served
 * the same entry and cannot disagree.
 */
export async function topOffAllowList(userId: string, inputs: FillInputs): Promise<ReadonlySet<string>> {
  const { commander, partner, heldIds } = inputs;
  // THE PAGE'S OWN CACHED READ, not a fresh one: the list on screen is served from that entry, and
  // a fresh read would disagree with it until the entry lapsed (`readDeckSynergy`).
  const ranked = await readDeckSynergy(userId, commander.oracleId, partner?.oracleId ?? null);
  return new Set(
    listLastSlotsCandidates({ ranked, inDeckOracleIds: new Set(heldIds) }).map((c) => c.oracleId),
  );
}

export async function planFromPool(
  userId: string,
  deckId: string,
  inputs: FillInputs,
  openSlots: number,
  pool: "all" | "sleeveable",
  allowed: ReadonlySet<string>,
  env: NodeJS.ProcessEnv,
) {
  const { deck, commander, partner, heldIds, heldCount, held } = inputs;
    return await buildFillPlan(
      userId,
      partner ? [commander, partner] : [commander],
      // The deck's own cards are not candidates for filling it.
      new Set(heldIds),
      // THE POOL IS THE CALLER'S. The collection control promises cards the player can put in
      // the deck tonight; the other one asks what the deck needs and lets the note say what
      // that costs.
      {
        pool,
        // Only the cards the list on screen draws: a planned card with no row there is a tick
        // with nowhere to land. It binds the catalog's basics as well as the candidates.
        onlyOracleIds: allowed,
        // Nothing is placed beside this plan: the excluded ids are the deck's own rows, and they
        // reach the plan through `held`, so listing them here would count them twice.
        selected: [],
        // So this deck's own claims are not counted as competition for itself when the pool
        // is narrowed to cards with a free copy.
        excludeDeckId: deckId,
        env,
        // BOUNDED BY THE DECK, not only by the caller. `Number.isInteger` accepts 1e308, and
        // the shape guard above says nothing about size.
        //
        // NOT ASSERTED, and the reason is worth keeping: the ANSWER is already bounded by the
        // residual filter below, which drops every row past the floors and the mana base — so
        // no value of `slots` can make this return an unbounded id list, and a test on the
        // returned ids passes with or without this line. What it bounds is the WORK: without
        // it `planFill` places and scans across the whole owned pool before those rows are
        // thrown away. That is not observable through the action's return value, so it is
        // stated here rather than pinned by a case that would measure nothing.
        slots: Math.min(
          openSlots,
          Math.max(0, deckBodySize(Boolean(deck.partnerOracleId)) - heldCount),
        ),
        // Only what role and type classification read. `HeldCard` asks for no more, because
        // a card already sleeved is past the question of whether to choose it.
        // THE COMMANDERS ARE NOT IN HERE, and the codebase had already ruled it: the measured
        // role targets come from EDHREC's support lists, which never contain the commander,
        // so a floor of ten ramp describes the 99 rather than the 100. `profile/types.ts`
        // carries a whole second field for exactly this — the classification "over the 99
        // ALONE" — with the instruction to use it ONLY against a measured target, because
        // `counts` folds commanders in to match the stats loader.
        //
        // An earlier round of this PR asked for them to be added, citing the path where they
        // ARE folded in. That path answers a different question. Counting a ramp commander
        // here closed a unit of a floor the support lists never asked it to close, and
        // returned one fewer real card for the deck.
        held: held.map((h) => ({
          oracleId: h.oracleId,
          typeLine: h.typeLine, oracleText: h.oracleText,
          keywords: h.keywords ?? [], layout: h.layout, manaCost: h.manaCost,
          quantity: h.quantity,
        })),
      },
    );
}

/** One tick is one card, so a stacked row cannot be expressed. See the note in
 *  `chooseBulkFill` — this is that rule, shared by both callers. */
export function sleeveableIds(plan: { rows: readonly FillRow[] }) {
  // A staple is kept whatever its role (H25): a roleless one (Swiftfoot Boots) is filed `other`
  // and is not the residual this drops.
  return plan.rows
    .filter((r) => !isResidual(r) && r.quantity === 1)
    .map((r) => r.oracleId);
}

/**
 * BOTH FILLS for `bulkFillOptions` and the demo export: sequential, not `Promise.all` (both read EDHREC for one
 * commander, and the second is served from the cache the first fills). Null for a deck whose commander the catalog cannot
 * resolve. The caller has already checked `openSlots` is a positive integer.
 */
export async function readBulkPlans(
  userId: string,
  deckId: string,
  openSlots: number,
  env: NodeJS.ProcessEnv,
): Promise<{ collection: BulkPlan; best: BulkPlan } | null> {
  const inputs = await gatherFillInputs(deckId, userId);
  if (!inputs) return null;
  const allowed = await topOffAllowList(userId, inputs);
  const collection = await planFromPool(userId, deckId, inputs, openSlots, "sleeveable", allowed, env);
  const best = await planFromPool(userId, deckId, inputs, openSlots, "all", allowed, env);
  return {
    collection: { oracleIds: sleeveableIds(collection), shortfalls: collection.shortfalls, measuredTypes: collection.measuredTypes },
    best: { oracleIds: sleeveableIds(best), shortfalls: best.shortfalls, measuredTypes: best.measuredTypes },
  };
}
