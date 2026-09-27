// The facts a push line needs about a CANDIDATE — for a whole pool, in one read.
//
// SERVER-ONLY: it reaches the database. Nothing a `"use client"` component can value-import
// may reach this file.
//
// WHY BATCHED, MEASURED RATHER THAN ASSUMED. The top-off pool is 262 candidates for the
// average commander, 423 at the widest and 480 for a pair. `pnpm measure:facts-cost` on
// staging: the whole pool's combo completions in ONE statement is 177-192ms, where the same
// work candidate by candidate is ~195ms each — 91 to 95 seconds for the pool. One statement
// is 480 to 540 times cheaper, so this is a batched read or the push line is not shippable.
//
// THAT FIGURE PREDATES THE FOUR MODAL COLUMNS and is not re-measured here. It was taken when
// this statement selected `bracket_tag` and `produces` alone; the columns added since are
// joined on after the aggregate rather than carried through the materialised CTE, precisely so
// the shape the figure describes is the shape that still runs. Re-measure before quoting it as
// current — the 480-to-540x ratio is the load-bearing claim and a join per matched variant
// does not threaten it, but the absolute number is a 2026-09-21 reading of a narrower select.
//
// THREE OF THE FOUR FACTS ARE CHEAP. Game changer is a column on `cards`; mass land denial and
// extra turns are the flags table the profile already loads for the deck's own cards. Only the
// fourth needs thought.
//
// `completesCombos` IS A SET QUESTION, not a per-card one: every two-card variant with exactly
// one piece already in the deck and the other among the candidates. Asking it per candidate
// means running the deck's whole combo match again for each one, which is the 91 seconds.

import { inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cards, spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { loadBracketFlags } from "../bracket/flags-read";
import { isTutor } from "../bracket/tutor-targets";
import { isInfiniteOrGameEnding } from "../spellbook/combo-features";
import type { CandidateFacts } from "../bracket/delta";
import type { ComboRef } from "./types";

/**
 * Every candidate's facts, keyed by oracle id.
 *
 * `deckOracleIds` is the deck as it stands — the draft, since that is what the analysis reads.
 * A candidate already in the deck is not excluded here: whether an add is a re-count is the
 * caller's question, and answering it here would hide a real completion from a surface that
 * offers a second copy.
 */
export async function loadCandidateFacts(
  candidateIds: readonly string[],
  deckOracleIds: readonly string[],
): Promise<Map<string, CandidateFacts>> {
  const ids = [...new Set(candidateIds)];
  if (ids.length === 0) return new Map();

  const [rows, flags, completions] = await Promise.all([
    db
      .select({
        oracleId: cards.oracleId,
        name: cards.name,
        gameChanger: cards.gameChanger,
        oracleText: cards.oracleText,
      })
      .from(cards)
      .where(inArray(cards.oracleId, ids)),
    loadBracketFlags(ids),
    completionsFor(ids, deckOracleIds),
  ]);

  const out = new Map<string, CandidateFacts>();
  for (const row of rows) {
    const flag = flags.get(row.oracleId);
    out.set(row.oracleId, {
      card: { oracleId: row.oracleId, name: row.name },
      gameChanger: row.gameChanger ?? false,
      massLandDenial: flag?.massLandDenial ?? false,
      extraTurn: flag?.extraTurn ?? false,
      // `isTutor`, the predicate the profile's tutor count reads too, so a candidate's reading
      // and the deck's are one rule rather than two that agree today.
      tutor: isTutor(row.oracleText),
      completesCombos: completions.get(row.oracleId) ?? [],
    });
  }
  return out;
}

/**
 * ONE STATEMENT for the whole pool.
 *
 * `held` counts how many pieces of each two-card variant the deck already has; a variant with
 * exactly one is a variant the deck is one card away from. Joining the candidates back onto
 * those names which candidate closes which.
 *
 * Template-gated variants are excluded here for the reason `assembledCombosQuery` excludes
 * them: a variant naming a CATEGORY of card is not one a decklist can be said to assemble.
 */
/**
 * The completions statement, extracted so its emitted SQL can be pinned the way
 * `assembledCombosQuery` is.
 *
 * Both reads draw into the same modal, and the failure they share is silent: drop a column from
 * a projection and the mapping's `?? null` reads it as null on every row, with no error. Only
 * one of the two was guarded while it was inlined here.
 *
 * IT STARTS FROM THE DECK. `held` walks `spellbook_variant_cards` by `oracle_id` (its own index)
 * for the deck's cards alone, and everything after joins from those variants. The version before
 * it materialised every two-card membership row in the index as a CTE and then filtered, which
 * was 276-298ms of execution for a 96-card deck against its 245-card support pool on a
 * `pull:staging` copy; this is 22-23ms warm, with the same rows (a differential over all 20 of
 * the account's decks, 160 queries and 1,678 rows, found 0 different).
 *
 * `having count(*) = 1` is the rule as stated ("exactly one piece held"), and it is also implied:
 * a variant with both pieces in the deck cannot be completed by a candidate outside it, which
 * `t.oracle_id <> all(deck)` already requires. It stays because it keeps `held` small.
 *
 * THE FOUR WIDE COLUMNS ARE JOINED BACK AFTER THE AGGREGATE, never carried through a CTE or the
 * GROUP BY: `steps` averages 395 characters against a max of 754, and only the handful of
 * matched completions need them. The join at the end costs one index lookup per matched variant.
 */
export function completionsQuery(
  candidateIds: readonly string[],
  deckOracleIds: readonly string[],
) {
  return sql`
    with held as (
      select vc.variant_id
      from ${spellbookVariantCards} vc
      join ${spellbookVariants} v on v.variant_id = vc.variant_id
      where vc.oracle_id = any(${sql.param([...deckOracleIds])}::uuid[])
        and v.card_count = 2 and cardinality(v.requires_template_ids) = 0
      group by vc.variant_id
      having count(*) = 1
    ),
    matched as (
      select t.oracle_id as candidate,
             t.variant_id,
             array_agg(p.oracle_id order by p.oracle_id) as pieces
      from held h
      join ${spellbookVariantCards} t on t.variant_id = h.variant_id
      join ${spellbookVariantCards} p on p.variant_id = h.variant_id
      where t.oracle_id = any(${sql.param([...candidateIds])}::uuid[])
        and t.oracle_id <> all(${sql.param([...deckOracleIds])}::uuid[])
      group by t.oracle_id, t.variant_id
    )
    select m.candidate, m.variant_id, m.pieces,
           v.bracket_tag, v.produces,
           v.mana_needed, v.mana_value_needed, v.steps, v.notable_prerequisites
    from matched m
    join ${spellbookVariants} v on v.variant_id = m.variant_id
  `;
}

async function completionsFor(
  candidateIds: readonly string[],
  deckOracleIds: readonly string[],
): Promise<Map<string, ComboRef[]>> {
  const out = new Map<string, ComboRef[]>();
  if (deckOracleIds.length === 0) return out;

  const result = await db.execute(completionsQuery(candidateIds, deckOracleIds));

  for (const raw of result.rows as {
    candidate: string;
    variant_id: string;
    bracket_tag: string | null;
    produces: string[] | null;
    pieces: string[];
    mana_needed: string | null;
    mana_value_needed: number | null;
    steps: string | null;
    notable_prerequisites: string | null;
  }[]) {
    // What a variant PRODUCES decides whether this system counts it, never its card count: the
    // assembled read applies the same rule, and a completion it would not count must not move
    // the candidate's bracket either.
    if (!isInfiniteOrGameEnding(raw.produces ?? [])) continue;
    const combo: ComboRef = {
      variantId: raw.variant_id,
      // Names are resolved at the DRAW, not here: this read is per pool, and a join onto
      // `cards` for every piece of every completion is a cost the row does not need until
      // something draws the pair.
      cards: raw.pieces.map((oracleId) => ({ oracleId, name: "" })),
      produces: raw.produces ?? [],
      bracketTag: raw.bracket_tag ?? "",
      // A completion is a card the player is ADDING, so no piece of it is in the command
      // zone by virtue of this add.
      usesCommander: false,
      // Carried here as well as on the assembled read: a near-miss is drawn in the same modal
      // as an assembled combo, and a row that reached the surface without them would have the
      // mana line silently absent on exactly the combos a player is deciding whether to add.
      manaValueNeeded: raw.mana_value_needed ?? null,
      manaNeeded: raw.mana_needed ?? null,
      steps: raw.steps ?? null,
      notablePrerequisites: raw.notable_prerequisites ?? null,
    };
    out.set(raw.candidate, [...(out.get(raw.candidate) ?? []), combo]);
  }
  return out;
}
