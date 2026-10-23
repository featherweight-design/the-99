/**
 * The strategy focus inside a Suggested changes run (handoff `design_handoff_the99_strategy_focus`, Calls 2 and 3). The
 * run reads the deck's focus and top strategies off the SAME list the prompt was built from (the run's head), tells the
 * model through the evidence pack's `focus`, and after validation writes two chips the model never could: how far an
 * addition moves the focus, and a cut that sits on none of the top strategies. No model call of its own: Suggested
 * changes stays one credit.
 */
import { eq, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cardLabels, cards } from "../../db/schema";
import { deckTuningCopy } from "../copy/deck-tuning";
import { strategyName } from "../copy/strategy-focus";
import type { ProfileHead } from "../profile/load";
import type { FocusPack } from "../tuning/evidence";
import type { TuningCitation } from "../../db/schema";
import { cardColumns, loadStrategyBaseline, toStrategyCard, type CardRow } from "./load";
import { deckStrategy, onStrategy, strategyAxis, type KeyedStrategyCard, type StrategyKey } from "./score";

type Reader = Pick<typeof db, "select">;

/** Catalog rows with their label rows, for the ids given; apart so a test can render its SQL. */
export function cardRowsQuery(q: Reader, oracleIds: readonly string[]) {
  return q
    .select({ ...cardColumns, quantity: cards.cmc })
    .from(cards)
    .leftJoin(cardLabels, eq(cardLabels.oracleId, cards.oracleId))
    .where(inArray(cards.oracleId, [...oracleIds]));
}

/** What a run knows of its focus: the strategy, its count on the deck, the top strategies and each nonland card. */
export type RunStrategy = { key: StrategyKey; name: string; copies: number; top: StrategyKey[]; cards: KeyedStrategyCard[]; names: Map<string, string> };

/** The rows for these ids, each carrying the quantity given (the catalog read has none). */
async function rowsFor(quantities: ReadonlyMap<string, number>, read: Reader): Promise<CardRow[]> {
  if (quantities.size === 0) return [];
  const rows = await cardRowsQuery(read, [...quantities.keys()]);
  return rows.map((r) => ({ ...r, quantity: quantities.get(r.oracleId) ?? 1 }));
}

/**
 * The run's strategy over the head it read: `deck_cards` only (the commanders are columns, never rows, as on the
 * ring), so "before" here is the count the ring's legend shows.
 */
export async function loadRunStrategy(head: ProfileHead, key: StrategyKey, read: Reader = db): Promise<RunStrategy> {
  const quantities = new Map(head.cards.map((c) => [c.oracleId, c.quantity]));
  const [rows, baseline] = await Promise.all([rowsFor(quantities, read), loadStrategyBaseline()]);
  const keyed = rows.map(toStrategyCard).filter((c): c is KeyedStrategyCard => c !== null);
  const strategy = deckStrategy(keyed, baseline);
  return {
    key,
    name: strategyName(key),
    copies: strategyAxis(keyed, baseline, key).copies,
    top: strategy.state === "ok" ? strategy.axes.map((a) => a.key) : [],
    cards: keyed,
    names: new Map(rows.map((r) => [r.oracleId, r.name])),
  };
}

/** The focus as the prompt states it, from the run's strategy. */
export function focusPack(run: RunStrategy): FocusPack {
  const name = (id: string) => run.names.get(id) ?? id;
  const on = run.cards.filter((c) => onStrategy(c, run.key)).map((c) => name(c.oracleId));
  const offTop = run.top.length === 0 ? [] : run.cards
    .filter((c) => ![...run.top, run.key].some((k) => onStrategy(c, k)))
    .map((c) => name(c.oracleId));
  return {
    name: run.name,
    copies: run.copies,
    nonland: run.cards.reduce((n, c) => n + c.quantity, 0),
    on: [...new Set(on)].sort(),
    top: run.top.map(strategyName),
    offTop: [...new Set(offTop)].sort(),
  };
}

/** A model citation restating that a card is on none of the top strategies, which the app's own chip says. */
const RESTATES_OFF_TOP = /\bon none of (the|its|them|the deck's) (top )?strateg/i;

type Line = { addOracleId: string | null; cutOracleId: string | null; evidence: TuningCitation[] };

/**
 * The two chips the app writes after validation (the model is never offered the `focus` kind, and the validator's
 * denominator rule would drop either from it). An ADDITION on the focus leads with `focus · Tokens 11 → 12`: the
 * figure before and after that ONE addition, never chained across additions, since a player applies them in any order.
 * A nonland CUT on none of the top strategies nor the focus leads with `list · on none of the top 5`. `adds` are the
 * kept additions' catalog cards; a land or an unknown card gets no chip.
 */
export function strategyChips<T extends Line>(lines: readonly T[], run: RunStrategy, adds: ReadonlyMap<string, KeyedStrategyCard>): T[] {
  const deck = new Map(run.cards.map((c) => [c.oracleId, c]));
  return lines.map((line) => {
    if (line.addOracleId) {
      const card = adds.get(line.addOracleId);
      if (!card || !onStrategy(card, run.key)) return line;
      const chip: TuningCitation = { kind: "focus", value: deckTuningCopy.card.focusChip(run.name, run.copies, run.copies + 1) };
      return { ...line, evidence: [chip, ...line.evidence] };
    }
    if (line.cutOracleId && run.top.length > 0) {
      const card = deck.get(line.cutOracleId);
      if (!card || [...run.top, run.key].some((k) => onStrategy(card, k))) return line;
      const chip: TuningCitation = { kind: "decklist", value: deckTuningCopy.card.offTop(run.top.length) };
      // The model quotes the pack's own line back ("Ponder: on none of the top strategies") despite being told not to
      // (eval v4: 10 of 36 chipped cuts). The app's chip says it once.
      return { ...line, evidence: [chip, ...line.evidence.filter((c) => !RESTATES_OFF_TOP.test(c.value))] };
    }
    return line;
  });
}

/** The kept additions' catalog cards, keyed by id, for `strategyChips`. A land reads as no card. */
export async function loadAddCards(addIds: readonly string[], read: Reader = db): Promise<Map<string, KeyedStrategyCard>> {
  const rows = await rowsFor(new Map(addIds.map((id) => [id, 1])), read);
  return new Map(rows.map(toStrategyCard).filter((c): c is KeyedStrategyCard => c !== null).map((c) => [c.oracleId, c]));
}
