// The fill's win-condition sets (engine plan C1): the ways a deck can win, best first, as the oracle
// ids `planFill`'s win-condition step places whole. A Spellbook combo that wins (`isWinCondition`),
// every piece in the pool; then the pool's finishers (the `finisher` label theme), one card each.
//
// GATED BY BRACKET (orchestrator ruling, 2026-11-20). Combos are offered only at bracket 3 and up,
// and the fill's bracket gate still judges each one at placement as the combo it is (`admitsAll`):
// at 3 it refuses one the deck could assemble early. With no bracket answer, or at 1 and 2,
// finishers alone: a plain create never sleeves a two-card win the player did not ask for.
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { readLabels } from "../labels/read";
import { isWinCondition } from "../spellbook/combo-features";
import type { Bracket } from "../intake/rank";
import type { FillCandidate } from "./fill";
import { WINCON_MAX } from "./fill";

/** A safety cap on the combos one fill reads. Every one is completable from the pool, so a real pool
    reads a few dozen (3,000 random cards: 56); the win filter runs after, in JS, beside its tests. */
const COMBO_READ_LIMIT = 5000;

export type WinconCombo = { variantId: string; produces: string[]; popularity: number | null; pieces: string[]; commanderOk: boolean };

/** The bracket at which combos join the quota. */
export const WINCON_COMBO_BRACKET = 3;

/**
 * The quota's sets from what was read: winning combos first (when the bracket allows them), then
 * finishers. Pure. A combo's pieces leave out the commanders, which are already in the command zone;
 * a combo needing more than `WINCON_MAX` cards, or a piece that must be the commander and is not, is
 * never offered. Each set appears once.
 *
 * AT BRACKET 3, TWO-CARD COMBOS ONLY. The bracket gate counts two-card combos (`loadComboEdges`), so
 * only those can it judge as combos at placement; a longer one would pass it as unrelated cards. At 4
 * and 5 there is no gate, and any length up to `WINCON_MAX` is offered.
 */
export function winconSets(args: {
  combos: readonly WinconCombo[];
  finishers: readonly string[];
  commanderIds: readonly string[];
  bracket: Bracket | null;
}): string[][] {
  const commanders = new Set(args.commanderIds);
  const sets: string[][] = [];
  const seen = new Set<string>();
  const push = (ids: string[]) => {
    const key = [...ids].sort().join("|");
    if (ids.length === 0 || seen.has(key)) return;
    seen.add(key);
    sets.push(ids);
  };
  if (args.bracket !== null && args.bracket >= WINCON_COMBO_BRACKET) {
    for (const c of args.combos) {
      if (!c.commanderOk || !isWinCondition(c.produces)) continue;
      if (args.bracket === WINCON_COMBO_BRACKET && c.pieces.length !== 2) continue;
      const pieces = c.pieces.filter((id) => !commanders.has(id));
      if (pieces.length > WINCON_MAX) continue;
      push(pieces);
    }
  }
  for (const id of args.finishers) push([id]);
  return sets;
}

/**
 * Reads the combos every piece of which is in the pool, in the deck already (`heldIds`) or a
 * commander, and the finishers among the pool and the held cards, and returns the quota's sets.
 * Held cards are read so a deck that already holds a win is credited for it (`planFill` counts a set
 * the deck holds). Finishers go best first: owned, then by EDHREC inclusion.
 */
export async function loadWinconSets(args: {
  pool: readonly FillCandidate[];
  heldIds: readonly string[];
  commanderIds: readonly string[];
  bracket: Bracket | null;
}): Promise<string[][]> {
  const pool = [...args.pool].sort((a, b) =>
    Number(b.owned) - Number(a.owned) || (b.inclusionPct ?? -1) - (a.inclusionPct ?? -1));
  const ids = [...new Set([...args.heldIds, ...pool.map((c) => c.oracleId)])];
  if (ids.length === 0) return [];
  const comboOn = args.bracket !== null && args.bracket >= WINCON_COMBO_BRACKET;
  const [combos, labels] = await Promise.all([
    comboOn ? readWinningCombos([...ids, ...args.commanderIds], args.commanderIds) : Promise.resolve([]),
    readLabels(ids),
  ]);
  const finishers = ids.filter((id) =>
    (labels.get(id) ?? []).some((j) => j.space === "theme" && j.kind === "finisher"));
  return winconSets({ combos, finishers, commanderIds: args.commanderIds, bracket: args.bracket });
}

/**
 * Combos whose every piece is in `allowed`, with no template prerequisite, most popular first.
 * Grouped from the card side so the oracle index drives it: a variant qualifies when the count of
 * its cards in `allowed` equals its `card_count`. `commanderOk` is false when a piece that must be
 * the commander is not one of `commanderIds`.
 */
export function winningCombosQuery(allowed: readonly string[], commanderIds: readonly string[]) {
  return sql`
    select v.variant_id as "variantId", v.produces, v.popularity,
      array_agg(vc.oracle_id) as pieces,
      bool_and(not vc.must_be_commander or vc.oracle_id = any(${sql.param([...commanderIds])}::uuid[])) as "commanderOk"
    from spellbook_variant_cards vc
    join spellbook_variants v on v.variant_id = vc.variant_id
    where vc.oracle_id = any(${sql.param([...allowed])}::uuid[])
      and v.card_count <= ${WINCON_MAX}
      and cardinality(v.requires_template_ids) = 0
    group by v.variant_id, v.produces, v.popularity, v.card_count
    having count(*) = v.card_count
    order by v.popularity desc nulls last, v.variant_id
    limit ${COMBO_READ_LIMIT}`;
}

async function readWinningCombos(allowed: readonly string[], commanderIds: readonly string[]): Promise<WinconCombo[]> {
  const res = await db.execute(winningCombosQuery(allowed, commanderIds));
  return (res.rows as WinconCombo[]).filter((c) => isWinCondition(c.produces));
}
