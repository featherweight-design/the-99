import { sql } from "drizzle-orm";

import { db } from "../../db";
import { isLandFace } from "../cards/facet";
import { loadMixesForCommanders, mixKey } from "../decks/deck-mix";
import { primaryRole } from "../decks/read";
import { basicCutFair } from "../mana/basic-cut";
import { NO_TAPPED_LANDS } from "../mana/lands-tapped";
import type { ManaSupplyCardRow } from "../mana/supply";
import { BALANCE_COLORS, readManaBalance } from "../tuning/mana-balance";
import { loadManaInputs, type ManaDeck } from "../tuning/mana-balance-load";
import { requirement, total } from "../tuning/mana-help";

/**
 * WHICH BASIC LANDS A FIND A DECK READ MAY CUT (Hugh, 2026-10-12). A basic is the cut only when the
 * deck runs more lands than its land target AND the basic's color is not left short: Improve my mana's
 * rule, `basicCutFair`, called here rather than restated. Every other basic is refused (`cutBasicLand`).
 *
 * The figures are Mana Balance's: the land count and each color's sources, read again with one copy of
 * the basic gone, against the panel's Needed. The land target is Mix's land cell. The card coming in is
 * not counted as a source: a land or rock that gives the color back could only make more basics fair,
 * so leaving it out never lets an unfair cut through. A land coming in keeps the land count where it
 * was, so only the color half applies (`replacedByLand`).
 *
 * THE LAST COPY OF A BASIC NEVER GOES. A basic-land search (Cultivate, a fetch for "a basic land")
 * makes the colors of the basics the deck plays, read at load (`loadSourceMana`), so cutting a
 * deck's only Forest would also take green from every such searcher, and the re-read here would not
 * see it. Refusing that copy keeps every simulated figure true; a deck with one copy has no basic of
 * that type to spare anyway.
 */

const isBasic = (typeLine: string) => isLandFace(typeLine) && /\bBasic\b/.test(typeLine);

/** The basics, by oracle id, that may go from these rows for a card coming in. Pure. */
export function fairBasicCuts(args: {
  rows: readonly ManaSupplyCardRow[];
  nameOf: (id: string) => string;
  identity: readonly string[];
  landTarget: number;
  subjectIsLand: boolean;
}): string[] {
  const { rows, nameOf, identity, landTarget, subjectIsLand } = args;
  const read = (r: readonly ManaSupplyCardRow[]) => readManaBalance({ rows: r, nameOf, tapped: NO_TAPPED_LANDS, identity });
  const before = read(rows);
  return rows.filter((r) => r.quantity > 1 && isBasic(r.typeLine)).flatMap((r) => {
    const after = read(rows.map((x) => (x.id === r.id ? { ...x, quantity: x.quantity - 1 } : x)));
    const colors = BALANCE_COLORS.filter((c) => identity.includes(c) && (r.produces ?? []).includes(c))
      .map((c) => ({ sourcesAfter: total(after, c), needed: requirement(before, c) }));
    return basicCutFair({ lands: before.lands.count, landTarget, replacedByLand: subjectIsLand, colors }) ? [r.id] : [];
  });
}

type ListRow = { deck_id: string; oracle_id: string; quantity: number; name: string; type_line: string; mana_cost: string | null; cmc: number; oracle_text: string | null; keywords: string[] | null };
type CommanderRow = { oracle_id: string; name: string; type_line: string; mana_cost: string | null; color_identity: string[] | null };

/**
 * Per deck, the basics a read of `subjectTypeLine` may cut. A deck that holds no basic, or whose mana
 * reads failed, gets none: every basic is then refused, as before the rule. Reads only.
 */
export async function loadBasicCuts(
  decks: readonly { id: string; commander_oracle_id: string; partner_oracle_id: string | null }[],
  subjectTypeLine: string,
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (decks.length === 0) return out;
  const deckIds = decks.map((d) => d.id);
  const leaderIds = [...new Set(decks.flatMap((d) => (d.partner_oracle_id ? [d.commander_oracle_id, d.partner_oracle_id] : [d.commander_oracle_id])))];
  const [list, leaders, mixes] = await Promise.all([
    db.execute<ListRow>(sql`
      select dc.deck_id, dc.oracle_id, dc.quantity, c.name, c.type_line, c.mana_cost, c.cmc, c.oracle_text, c.keywords
      from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
      where dc.deck_id = any(${sql.param(deckIds)}::uuid[])`).then((r) => r.rows),
    db.execute<CommanderRow>(sql`
      select oracle_id, name, type_line, mana_cost, color_identity from cards
      where oracle_id = any(${sql.param(leaderIds)}::uuid[])`).then((r) => r.rows),
    loadMixesForCommanders(decks.map((d) => ({ commanderOracleId: d.commander_oracle_id, partnerOracleId: d.partner_oracle_id }))),
  ]);
  const leaderOf = new Map(leaders.map((c) => [c.oracle_id, { name: c.name, typeLine: c.type_line, manaCost: c.mana_cost, colorIdentity: c.color_identity ?? [] }]));
  const subjectIsLand = isLandFace(subjectTypeLine);
  await Promise.all(decks.map(async (d) => {
    const rows = list.filter((r) => r.deck_id === d.id);
    if (!rows.some((r) => isBasic(r.type_line))) return;
    const commander = leaderOf.get(d.commander_oracle_id);
    const partner = d.partner_oracle_id ? leaderOf.get(d.partner_oracle_id) ?? null : null;
    const mix = mixes.get(mixKey({ commanderOracleId: d.commander_oracle_id, partnerOracleId: d.partner_oracle_id }));
    if (!commander || (d.partner_oracle_id && !partner) || !mix) return;
    // No land to spare and no land coming in: no basic can be fair, so the deck's mana is not read at
    // all. The count is Mana Balance's (`manaSupply`: copies of every land face), commanders included.
    const lands = rows.reduce((n, r) => n + (isLandFace(r.type_line) ? r.quantity : 0), 0)
      + [commander, partner].filter((c) => c && isLandFace(c.typeLine)).length;
    if (!subjectIsLand && lands <= mix.cells.land.target) return;
    const deck: ManaDeck = {
      commander,
      partner,
      cards: rows.map((r) => ({
        oracleId: r.oracle_id, name: r.name, typeLine: r.type_line, manaCost: r.mana_cost, cmc: Number(r.cmc), quantity: r.quantity,
        role: primaryRole({ typeLine: r.type_line, oracleText: r.oracle_text, keywords: r.keywords ?? [] }),
      })),
    };
    const inputs = await loadManaInputs(deck).catch(() => null);
    if (!inputs) return;
    const fair = fairBasicCuts({ rows: inputs.rows, nameOf: inputs.nameOf, identity: inputs.identity, landTarget: mix.cells.land.target, subjectIsLand });
    if (fair.length > 0) out.set(d.id, fair.sort());
  }));
  return out;
}
