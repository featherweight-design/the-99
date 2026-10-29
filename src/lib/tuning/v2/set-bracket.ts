import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../../../db";
import { deckSuggestionItems, deckSuggestionRuns } from "../../../db/schema";
import { slotDeck } from "../../bracket/slot";
import { swapped } from "../../decks/tuning-read";
import { loadDeckProfileFromHead, loadProfileHead } from "../../profile/load";
import type { Bracket } from "../../profile/types";

/**
 * The brackets the deck would permit with a whole picked set applied (plan PR 7, follow-up b). The results bar claims an
 * outcome from each line's own flag only while the set holds one line a side (`bracketOutcome`): past that, lines add up in
 * ways no single flag shows. This read builds the REAL profile of the list with every picked line swapped, by the same
 * loader and verdict as the per-line flag (`withBracketAfter`, `slotDeck`), so the bar and the Analysis tab agree.
 *
 * Null when the run is not the reader's v2 run, or a named line is not one of its lines on that side. Writes nothing.
 */
export async function readSetPermits(args: {
  runId: string; addIds: readonly string[]; cutIds: readonly string[]; userId: string; env: NodeJS.ProcessEnv;
}): Promise<Bracket[] | null> {
  const { runId, addIds, cutIds, userId, env } = args;
  const [run] = await db.select({ deckId: deckSuggestionRuns.deckId }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.id, runId), eq(deckSuggestionRuns.userId, userId), isNotNull(deckSuggestionRuns.requestedCount)));
  if (!run?.deckId) return null;
  const named = [...addIds, ...cutIds];
  const rows = named.length === 0 ? [] : await db.select({
    id: deckSuggestionItems.id, addOracleId: deckSuggestionItems.addOracleId, cutOracleId: deckSuggestionItems.cutOracleId,
  }).from(deckSuggestionItems).where(and(eq(deckSuggestionItems.runId, runId), inArray(deckSuggestionItems.id, named)));
  const lines = setLines(rows, addIds, cutIds);
  if (!lines) return null;
  // One repeatable-read snapshot: the commander columns and the card list read apart could mix two states.
  const head = await loadProfileHead(run.deckId, userId);
  if (!head) return null;
  const cards = lines.reduce((list, l) => swapped(list, l), head.cards);
  const after = await loadDeckProfileFromHead({ ...head, cards }, env);
  return slotDeck(after, (head.declaredBracket as Bracket | null) ?? null).permits;
}

type ItemRow = { id: string; addOracleId: string | null; cutOracleId: string | null };

/** The named lines in the order named, each on the side it was named for; null when any is missing or on the other side. Pure. */
export function setLines(rows: readonly ItemRow[], addIds: readonly string[], cutIds: readonly string[]): ItemRow[] | null {
  const byId = new Map(rows.map((r) => [r.id.toLowerCase(), r]));
  const out: ItemRow[] = [];
  for (const [ids, side] of [[addIds, "add"], [cutIds, "cut"]] as const) {
    for (const id of ids) {
      const r = byId.get(id.toLowerCase());
      const onSide = side === "add" ? r?.addOracleId != null && r.cutOracleId === null : r?.cutOracleId != null && r.addOracleId === null;
      if (!r || !onSide) return null;
      out.push(r);
    }
  }
  return new Set(out.map((r) => r.id)).size === out.length ? out : null;
}
