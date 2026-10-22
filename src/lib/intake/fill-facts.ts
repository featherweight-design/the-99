import { sql } from "drizzle-orm";

import { db } from "../../db";
import { spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { loadBracketFlags } from "../bracket/flags-read";
import { classifySearches, tutorReaches } from "../bracket/tutor-targets";
import { loadAvailability } from "../decks/availability-query";
import { isBasicLand } from "../decks/grouping";
import type { FillCandidate, FillGate } from "../decks/fill";
import { loadPrices } from "../discovery/price";
import { isCountedCombo } from "../profile/load";
import { producesInfiniteTurns } from "../spellbook/combo-features";
import { buysCopy } from "./buys-card";
import { allGates, bracketGate, budgetGate, type ComboEdge, type GateFacts } from "./fill-gate";
import type { Bracket } from "./rank";

/** What a Help me choose deck was asked for, as stored on `decks` (F1). */
export type DeckAnswers = {
  budgetCents: number | null;
  bracket: Bracket | null;
  cardOracleId: string | null;
  /** *Hit bracket N* (bracket reach PR 3b, `decks.answer_bracket_buys`): the fill places the cards
   *  the reach would buy to hit the bracket. Absent or false, it places owned cards alone. */
  bracketBuys?: boolean;
  /** The stored budget was raised to pay for that set (`decks.answer_budget_raised`, G1): a retry
   *  caps the fill at the set alone, as the create did. */
  budgetRaised?: boolean;
};

/**
 * The facts `fill-gate.ts` rules on, read once for the whole pool, and the gate built from them.
 * Undefined when nothing was asked, so a fill with no answers is byte-for-byte today's fill.
 *
 * A BUY is the Shopping list's rule, not "unowned": an owned card with no free copy (every copy
 * claimed by a committed deck, `Availability.free <= 0`) has to be bought too, and is priced.
 */
export async function loadFillGate(args: {
  userId: string;
  commanderIds: readonly string[];
  answers: DeckAnswers;
  candidates: readonly FillCandidate[];
  /**
   * Every card placed before the fill: the build-around card and any selection the player carried
   * across. They are in the deck whatever the fill does, so the budget charges each one it has to
   * buy and the bracket counts each one, exactly as it counts a card the fill places.
   */
  placedIds?: readonly string[];
  excludeDeckId?: string;
  /** The reader's resolved switches (`requestSwitchEnv`), for the claim model's `locked` key and
   *  pending clause. */
  env: NodeJS.ProcessEnv;
  /** The bracket facts, when the caller already read them (`buildFillPlan`, which reads them once
   *  for the gate and the reach, so the two cannot see different cards). They must cover every id
   *  this gate is handed: the fixed cards and every candidate. */
  bracketFacts?: GateFacts;
  /**
   * The budget's cap EXACTLY, in place of the budget less the placed cards: set when *Hit bracket N*
   * took the whole budget (G1), to the cost of the set the player chose to buy. The set is charged
   * first (`planFill`'s raisers step tells the gate each one), so the rest of the 99 buys nothing,
   * whatever whole-dollar remainder the stored, raised budget carries.
   */
  capCents?: number;
}): Promise<FillGate | undefined> {
  const { answers } = args;
  if (answers.budgetCents === null && (answers.bracket === null || answers.bracket >= 4)) return undefined;

  const placed = placedIdsOf(args.commanderIds, answers.cardOracleId, args.placedIds);
  const fixedIds = [...args.commanderIds, ...placed];
  const ids = [...new Set([...fixedIds, ...args.candidates.map((c) => c.oracleId)])];

  const gates: (FillGate | null)[] = [];

  if (answers.budgetCents !== null) {
    const [prices, availability] = await Promise.all([
      loadPrices(ids),
      loadAvailability(args.userId, { oracleIds: ids, excludeDeckId: args.excludeDeckId, env: args.env }),
    ]);
    const owned = new Set(args.candidates.filter((c) => c.owned).map((c) => c.oracleId));
    const basics = new Set(args.candidates.filter((c) => isBasicLand(c.typeLine)).map((c) => c.oracleId));
    /** The Shopping list's rule (`loadDeckBuyRows`): a basic is never bought; an unowned card is;
     *  an owned card is when every copy is claimed. No availability row means nothing claims it. */
    const buys = (id: string) => {
      if (basics.has(id)) return false;
      return buysCopy(owned.has(id), availability.get(id));
    };
    const priceOf = (id: string) => prices.get(id)?.liveCents ?? null;
    const placedCost = await chargePlaced(placed, priceOf, availability);
    gates.push(budgetGate({
      remainingCents: args.capCents ?? answers.budgetCents - placedCost,
      // THE CARD'S OWN TYPE LINE, not only the candidate list's: the catalog's basics (`planFill`'s
      // `basics`) are offered to the fill without being candidates, so an id-set test read one as
      // unowned and unpriced, and the budget refused it. A basic is never a buy, whoever offers it.
      buys: (c) => !isBasicLand(c.typeLine) && buys(c.oracleId),
      priceOf,
    }));
  }

  if (answers.bracket !== null && answers.bracket < 4) {
    gates.push(bracketGate({
      bracket: answers.bracket,
      commanderIds: args.commanderIds,
      fixedIds,
      facts: args.bracketFacts ?? await loadBracketGateFacts(ids),
    }));
  }

  return allGates(gates);
}

/** The cards placed before the fill (the build-around card and any selection), the commanders out. */
function placedIdsOf(commanderIds: readonly string[], card: string | null, placedIds?: readonly string[]): string[] {
  return [...new Set([...(card ? [card] : []), ...(placedIds ?? [])])].filter((id) => !commanderIds.includes(id));
}

/**
 * What the placed cards cost the budget. They go in before the fill, so they are charged first. They
 * are not in the pool (they were placed), so ownership is read off availability: an absent row there
 * is a card the player does not own. A basic is never a buy. One never stocked cannot be charged and
 * is placed anyway (§3.0): the cap then covers the rest, as usual.
 */
async function chargePlaced(
  placed: readonly string[],
  priceOf: (id: string) => number | null,
  availability: Awaited<ReturnType<typeof loadAvailability>>,
): Promise<number> {
  if (placed.length === 0) return 0;
  const placedBasics = new Set(
    ((await db.execute(sql`select c.oracle_id, c.type_line from cards c where c.oracle_id = any(${sql.param([...placed])}::uuid[])`))
      .rows as { oracle_id: string; type_line: string }[]).filter((r) => isBasicLand(r.type_line)).map((r) => r.oracle_id),
  );
  return placed
    .filter((id) => !placedBasics.has(id) && buysCopy(availability.has(id), availability.get(id)))
    .reduce((sum, id) => sum + (priceOf(id) ?? 0), 0);
}

/**
 * The budget LEFT once the placed cards are charged, `loadFillGate`'s own figure, read for the
 * bracket reach (audit item 10): a set to buy is over budget against what the build-around card
 * leaves, not against the whole budget. Null when no budget was asked.
 */
export async function loadBudgetLeftCents(args: {
  userId: string;
  commanderIds: readonly string[];
  answers: DeckAnswers;
  placedIds?: readonly string[];
  excludeDeckId?: string;
  env: NodeJS.ProcessEnv;
}): Promise<number | null> {
  const { budgetCents } = args.answers;
  if (budgetCents === null) return null;
  const placed = placedIdsOf(args.commanderIds, args.answers.cardOracleId, args.placedIds);
  if (placed.length === 0) return budgetCents;
  const [prices, availability] = await Promise.all([
    loadPrices(placed),
    loadAvailability(args.userId, { oracleIds: placed, excludeDeckId: args.excludeDeckId, env: args.env }),
  ]);
  return budgetCents - await chargePlaced(placed, (id) => prices.get(id)?.liveCents ?? null, availability);
}

/**
 * The facts the bracket rules over, for these cards: the stored flags, `cards.game_changer`, the
 * counted combos among them, and which searches can find which. One read for the gate and the reach
 * (`bracket-reach.ts`), so both rule over the same cards. The same reads the analysis makes
 * (`profile/load.ts`), so a fill and the reading of it agree.
 */
export async function loadBracketGateFacts(ids: readonly string[]): Promise<GateFacts> {
  const [flags, rows, combos] = await Promise.all([
    loadBracketFlags(ids),
    db.execute(sql`
      select c.oracle_id, c.game_changer, c.oracle_text, c.type_line, c.color_identity, c.cmc
      from cards c where c.oracle_id = any(${sql.param(ids)}::uuid[])
    `).then((r) => r.rows as {
      oracle_id: string; game_changer: boolean; oracle_text: string | null;
      type_line: string; color_identity: string[]; cmc: number;
    }[]),
    loadComboEdges(ids),
  ]);
  const cards = new Map(rows.map((r) => [r.oracle_id, r]));
  const { tutorIds, landSearchIds, targets } = classifySearches(
    rows.map((r) => ({ oracleId: r.oracle_id, oracleText: r.oracle_text })),
  );
  return {
    flagsOf: (id) => ({
      gameChanger: cards.get(id)?.game_changer ?? false,
      massLandDenial: flags.get(id)?.massLandDenial ?? false,
      extraTurn: flags.get(id)?.extraTurn ?? false,
    }),
    combosOf: (id) => combos.get(id) ?? [],
    // Every search pairs for reach, a land search included, as the profile builder pairs them.
    searches: (id) => tutorIds.has(id) || landSearchIds.has(id),
    reaches: (s, p) => {
      const target = targets.get(s);
      const piece = cards.get(p);
      return !!target && !!piece
        && tutorReaches(target, { typeLine: piece.type_line, colorIdentity: piece.color_identity, cmc: piece.cmc });
    },
  };
}

/**
 * Every counted two-card combo among these cards, as edges from each piece to the other. Counted
 * the way the bracket system counts them: by what the combo produces, never by its card count, and
 * never a variant needing a template. A piece that must be the commander is recorded on the edge
 * that points at it, and a card that must itself be the commander has no edge out, since the fill
 * places it in the 99.
 */
async function loadComboEdges(ids: readonly string[]): Promise<Map<string, ComboEdge[]>> {
  const rows = (await db.execute(sql`
    select v.variant_id, v.produces, self.oracle_id as self_id, other.oracle_id as other_id,
           other.must_be_commander as other_must_command
    from ${spellbookVariants} v
    join ${spellbookVariantCards} self on self.variant_id = v.variant_id and not self.must_be_commander
    join ${spellbookVariantCards} other on other.variant_id = v.variant_id and other.oracle_id <> self.oracle_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      and self.oracle_id = any(${sql.param(ids)}::uuid[])
      and other.oracle_id = any(${sql.param(ids)}::uuid[])
  `)).rows as { variant_id: string; produces: string[]; self_id: string; other_id: string; other_must_command: boolean }[];
  const out = new Map<string, ComboEdge[]>();
  for (const r of rows) {
    // The analysis's own test (`isCountedCombo`); the SQL above already holds its first two clauses.
    if (!isCountedCombo({ cardCount: 2, requiresTemplateIds: [], pieces: [r.self_id, r.other_id], produces: r.produces })) continue;
    const list = out.get(r.self_id) ?? [];
    list.push({ variantId: r.variant_id, partner: r.other_id, loop: producesInfiniteTurns(r.produces), partnerMustBeCommander: r.other_must_command });
    out.set(r.self_id, list);
  }
  return out;
}
