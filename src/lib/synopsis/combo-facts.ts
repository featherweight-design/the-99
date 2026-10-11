import { sql } from "drizzle-orm";
import { db } from "../../db";
import { spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { GAME_ENDING_FEATURES } from "../spellbook/produces-kinds.generated";
import { isInfiniteOrGameEnding } from "../spellbook/combo-features";
import type { DeckProfile } from "../profile/types";
import { fitsIdentity, MAX_COMBO_FACTS, MAX_NEAR_COMBO_FACTS, type ComboFact, type NearComboFact } from "./facts-extra";

/** Largest variant the facts consider. Spellbook stores 6 to 10 pieces for only 37 variants in all; seven or more are left out. */
export const MAX_COMBO_PIECES = 6;

/** One piece of a stored variant, with whether the deck holds it. */
export type ComboPieceRow = {
  variant_id: string;
  produces: string[];
  card_count: number;
  mana_value_needed: number | null;
  /** Read for the benchmarks' win-speed ledger, which draws each line's plates; the facts ignore them. */
  mana_needed?: string | null;
  steps?: string | null;
  notable_prerequisites?: string | null;
  oracle_id: string;
  name: string;
  must_be_commander: boolean;
  held: boolean;
  commander_legal: boolean;
  color_identity: string[];
};

export type ComboFacts = { combos: ComboFact[]; nearCombos: NearComboFact[] };

/**
 * Every infinite or game-ending, template-free variant of 2 to 6 pieces the deck assembles
 * (gap 0) or is exactly one piece short of (gap 1). The commander counts as a piece, and a piece
 * that must be a commander counts only when it is one. Card count is never the test: what the
 * variant PRODUCES is. `count(*) = card_count` guards the table's deduped rows against a variant
 * naming one card twice, as the Add panel's query does.
 */
export function anySizeComboQuery(present: readonly string[], commanders: readonly string[]) {
  const presentP = sql.param([...present]);
  const commandersP = sql.param([...commanders]);
  const gameEnding = sql.param([...GAME_ENDING_FEATURES]);
  return sql`
    with cand as (
      select v.variant_id
      from ${spellbookVariants} v
      where v.card_count between 2 and ${MAX_COMBO_PIECES}
        and cardinality(v.requires_template_ids) = 0
        and exists (select 1 from unnest(v.produces) f where f ~* '^infinite ' or f = any(${gameEnding}::text[]))
        and exists (select 1 from ${spellbookVariantCards} vc0
                    where vc0.variant_id = v.variant_id and vc0.oracle_id = any(${presentP}::uuid[]))
    ), pieces as (
      select vc.variant_id, vc.oracle_id, vc.must_be_commander,
             (case when vc.must_be_commander then vc.oracle_id = any(${commandersP}::uuid[])
                   else vc.oracle_id = any(${presentP}::uuid[]) end) as held
      from ${spellbookVariantCards} vc
      join cand on cand.variant_id = vc.variant_id
    ), keep as (
      select p.variant_id
      from pieces p
      join ${spellbookVariants} v2 on v2.variant_id = p.variant_id
      group by p.variant_id, v2.card_count
      having count(*) = v2.card_count and count(*) filter (where not p.held) <= 1
    )
    select v.variant_id, v.produces, v.card_count, v.mana_value_needed,
           v.mana_needed, v.steps, v.notable_prerequisites,
           p.oracle_id, c.name, p.must_be_commander, p.held, c.commander_legal, c.color_identity
    from keep k
    join ${spellbookVariants} v on v.variant_id = k.variant_id
    join pieces p on p.variant_id = k.variant_id
    join cards c on c.oracle_id = p.oracle_id
  `;
}

/**
 * Fewest pieces first, then free (mana 0), then the commander's own combos, then the cheaper,
 * then a stable tail. Free is a bucket and not just the low end of mana: a cheap line that skips
 * the commander must not outrank a dearer one that uses it.
 */
function byRank(a: Ranked, b: Ranked): number {
  const free = (r: Ranked) => (r.mana === 0 ? 0 : 1);
  return a.pieces - b.pieces || free(a) - free(b) || Number(b.commander) - Number(a.commander) || (a.mana ?? 99) - (b.mana ?? 99) || a.id.localeCompare(b.id);
}

type Ranked = { pieces: number; mana: number | null; commander: boolean; id: string; sig: string };

/**
 * The top `cap` of a ranked list, one per distinct outcome first. Variants differing by one
 * interchangeable piece (twenty ways to loop the same engine) would otherwise fill the cap and
 * push a different win line out of it: on Counter Intelligence the commander's own infinite
 * turns and the +1/+1 loop were both cut by variants of the draw loop.
 */
function pickTop<T>(items: readonly T[], rank: (t: T) => Ranked, cap: number): T[] {
  const sorted = [...items].sort((a, b) => byRank(rank(a), rank(b)));
  const firstOfSig = new Set<string>();
  const lead = sorted.filter((t) => {
    const sig = rank(t).sig;
    if (firstOfSig.has(sig)) return false;
    firstOfSig.add(sig);
    return true;
  });
  const rest = sorted.filter((t) => !lead.includes(t));
  return [...lead, ...rest].slice(0, cap);
}

/** Pure shaping of the query's rows into the prompt's two lists. */
export function shapeComboFacts(
  rows: readonly ComboPieceRow[],
  identity: readonly string[],
  commanderIds: readonly string[],
): ComboFacts {
  const byVariant = new Map<string, ComboPieceRow[]>();
  for (const r of rows) byVariant.set(r.variant_id, [...(byVariant.get(r.variant_id) ?? []), r]);
  const assembled: (ComboFact & { pieceCount: number; id: string })[] = [];
  const near: (NearComboFact & { pieceCount: number; mana: number | null; usesCommander: boolean; id: string })[] = [];
  for (const [id, pieces] of byVariant) {
    const first = pieces[0];
    if (pieces.length !== first.card_count || !isInfiniteOrGameEnding(first.produces)) continue;
    const names = [...pieces].sort((a, b) => a.name.localeCompare(b.name));
    const missing = names.filter((p) => !p.held);
    if (missing.length === 0) {
      assembled.push({
        id,
        pieceCount: pieces.length,
        pieces: names.map((p) => p.name),
        produces: first.produces,
        usesCommander: pieces.some((p) => commanderIds.includes(p.oracle_id)),
        manaNeeded: first.mana_value_needed,
      });
    } else if (missing.length === 1) {
      const m = missing[0];
      // The missing piece must be a card this deck could add: not command-zone-only, legal, in colour.
      if (m.must_be_commander || !m.commander_legal || !fitsIdentity(identity, m.color_identity)) continue;
      near.push({
        id,
        pieceCount: pieces.length,
        mana: first.mana_value_needed,
        usesCommander: pieces.some((p) => p.held && commanderIds.includes(p.oracle_id)),
        have: names.filter((p) => p.held).map((p) => p.name).join(" + "),
        missing: m.name,
        produces: first.produces,
      });
    }
  }
  const sig = (produces: readonly string[]) => [...produces].sort().join("|");
  return {
    combos: pickTop(assembled, (c) => ({ pieces: c.pieceCount, mana: c.manaNeeded, commander: c.usesCommander, id: c.id, sig: sig(c.produces) }), MAX_COMBO_FACTS)
      .map(({ pieceCount: _p, id: _i, ...c }) => c),
    nearCombos: pickTop(near, (n) => ({ pieces: n.pieceCount, mana: n.mana, commander: n.usesCommander, id: n.id, sig: sig(n.produces) }), MAX_NEAR_COMBO_FACTS)
      .map(({ pieceCount: _p, mana: _m, usesCommander: _u, id: _i, ...n }) => n),
  };
}

/**
 * The combos for the v2 Overview facts, of any size. Null when the read fails: the caller then
 * keeps the profile's two-card list and writes the Overview without the near-combo section.
 */
export async function loadComboFacts(
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "colours">,
): Promise<ComboFacts | null> {
  const present = [...new Set([...profile.cards.map((c) => c.oracleId), ...profile.commanderOracleIds])];
  if (present.length === 0) return { combos: [], nearCombos: [] };
  try {
    const rows = (await db.execute(anySizeComboQuery(present, profile.commanderOracleIds))).rows as ComboPieceRow[];
    return shapeComboFacts(rows, profile.colours.identity, profile.commanderOracleIds);
  } catch (error) {
    console.error("combo facts read failed", error);
    return null;
  }
}
