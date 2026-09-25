import { sql } from "drizzle-orm";

import { db } from "../../db";
import { spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { loadBracketFlags } from "../bracket/flags-read";
import { classifySearches, tutorReaches } from "../bracket/tutor-targets";
import { loadAvailability } from "../decks/availability-query";
import { isBasicLand } from "../decks/grouping";
import type { FillCandidate, FillGate } from "../decks/fill";
import { loadPrices } from "../discovery/price";
import { isInfiniteOrGameEnding, producesInfiniteTurns } from "../spellbook/combo-features";
import { allGates, bracketGate, budgetGate, type ComboEdge } from "./fill-gate";
import type { Bracket } from "./rank";

/** What a Help me choose deck was asked for, as stored on `decks` (F1). */
export type DeckAnswers = {
  budgetCents: number | null;
  bracket: Bracket | null;
  cardOracleId: string | null;
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
  excludeDeckId?: string;
}): Promise<FillGate | undefined> {
  const { answers } = args;
  if (answers.budgetCents === null && (answers.bracket === null || answers.bracket >= 4)) return undefined;

  const card = answers.cardOracleId;
  const fixedIds = [...args.commanderIds, ...(card ? [card] : [])];
  const ids = [...new Set([...fixedIds, ...args.candidates.map((c) => c.oracleId)])];

  const gates: (FillGate | null)[] = [];

  if (answers.budgetCents !== null) {
    const [prices, availability] = await Promise.all([
      loadPrices(ids),
      loadAvailability(args.userId, { oracleIds: ids, excludeDeckId: args.excludeDeckId }),
    ]);
    const owned = new Set(args.candidates.filter((c) => c.owned).map((c) => c.oracleId));
    const basics = new Set(args.candidates.filter((c) => isBasicLand(c.typeLine)).map((c) => c.oracleId));
    /** The Shopping list's rule (`loadDeckBuyRows`): a basic is never bought; an unowned card is;
     *  an owned card is when every copy is claimed. No availability row means nothing claims it. */
    const buys = (id: string) => {
      if (basics.has(id)) return false;
      if (!owned.has(id)) return true;
      const a = availability.get(id);
      return a !== undefined && a.free <= 0;
    };
    const priceOf = (id: string) => prices.get(id)?.liveCents ?? null;
    // The build-around card is placed before the fill, so it is charged first. It is not in the
    // pool (it was placed), so its ownership is read off availability: an absent row there is a
    // card the player does not own. One never stocked cannot be charged and is placed anyway
    // (§3.0): the cap then covers the rest, as usual.
    const cardBuys = card !== null && !((availability.get(card)?.free ?? 0) > 0);
    const cardCost = cardBuys ? priceOf(card!) ?? 0 : 0;
    gates.push(budgetGate({
      remainingCents: answers.budgetCents - cardCost,
      buys: (c) => buys(c.oracleId),
      priceOf,
    }));
  }

  if (answers.bracket !== null && answers.bracket < 4) {
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
    gates.push(bracketGate({
      bracket: answers.bracket,
      commanderIds: args.commanderIds,
      fixedIds,
      facts: {
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
      },
    }));
  }

  return allGates(gates);
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
    if (!isInfiniteOrGameEnding(r.produces)) continue;
    const list = out.get(r.self_id) ?? [];
    list.push({ variantId: r.variant_id, partner: r.other_id, loop: producesInfiniteTurns(r.produces), partnerMustBeCommander: r.other_must_command });
    out.set(r.self_id, list);
  }
  return out;
}
