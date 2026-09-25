// FITS YOUR DECKS (swap tools PR 5a, rulings 8–10): from any card, which of the reader's decks it
// would fit. Every figure is a fact, never a score: the commander's inclusion for the card, and the
// deck's own need in the card's role, where the targets for that role were measured (audit F9).
//
// A deck FITS when the card is inside its colors and the deck neither holds it nor is led by it.
// A deck that holds it says how many copies, and a deck whose colors rule the card out is named
// with the colors that do it. The picker (PR 5b) draws these groups by name, A to Z.
//
// Read on demand, when the picker opens, never shipped with a card: it is one deck query, the
// card, the role counts of the decks that fit, their mixes (once per distinct commander pair), and
// the card's availability.
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { loadAvailability } from "../decks/availability-query";
import { loadMixesForCommanders, mixKey } from "../decks/deck-mix";
import type { RecommendedMix } from "../decks/mix";
import { primaryRole } from "../decks/read";
import { loadUniversalStaples } from "../staples/universal";

export type FitRole = "ramp" | "draw" | "removal" | "wipes" | "land";

export type FitDeck = {
  id: string;
  name: string;
  /** The commander, or both names for a pair, as the inclusion chip names them. */
  commanders: string[];
  /** The card's share of the commander's (or pair's) indexed decks, 0–100, or null: not listed. */
  inclusion: number | null;
  /** This deck's count in the card's role against its target, or null when the card has no role or
   *  the target for it was not measured (F9). */
  need: { role: FitRole; have: number; target: number } | null;
};

export type FitsRead = {
  card: { oracleId: string; name: string; colorIdentity: string[]; commanderLegal: boolean; role: FitRole | "other" };
  /** A universal staple (`src/lib/staples/universal.ts`): nearly every deck plays it whatever it is
   *  doing, so the picker names it `staple · any commander` rather than quoting one commander's
   *  inclusion as though that figure were about this deck (addendum, F1). */
  staple: boolean;
  /** Copies the reader owns, and how many no committed deck has claimed (null: none owned). */
  owned: number;
  free: number | null;
  fits: FitDeck[];
  holds: { id: string; name: string; quantity: number }[];
  /** Decks whose colors rule the card out, each with the card's colors outside the deck's. */
  excluded: { id: string; name: string; commanders: string[]; outside: string[] }[];
};

export type DeckRow = {
  id: string;
  name: string;
  commander_oracle_id: string;
  partner_oracle_id: string | null;
  commander_names: string[];
  identity: string[];
  holds: number;
  leads: boolean;
  inclusion: number | string | null;
  /** The deck's commander (or pair) synergy for the card: the order of the picker, never drawn (Q2). */
  synergy: number | string | null;
};

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/**
 * The groups from what the reads returned. Pure, so every rule here is tested without a database:
 * the three groups, their order, the colors outside, and when a need is shown.
 */
export function shapeFits(
  card: FitsRead["card"],
  rows: readonly DeckRow[],
  roleCounts: ReadonlyMap<string, number>,
  mixes: ReadonlyMap<string, RecommendedMix>,
  availability: { owned: number; free: number | null },
  staple = false,
): FitsRead {
  const fits: FitDeck[] = [];
  const synergyOf = new Map<string, number>();
  const holds: FitsRead["holds"] = [];
  const excluded: FitsRead["excluded"] = [];
  for (const r of rows) {
    const outside = card.colorIdentity.filter((c) => !r.identity.includes(c));
    if (r.holds > 0 || r.leads) {
      holds.push({ id: r.id, name: r.name, quantity: Math.max(r.holds, r.leads ? 1 : 0) });
      continue;
    }
    if (outside.length > 0) {
      excluded.push({ id: r.id, name: r.name, commanders: r.commander_names, outside });
      continue;
    }
    const mix = mixes.get(mixKey({ commanderOracleId: r.commander_oracle_id, partnerOracleId: r.partner_oracle_id }));
    const role = card.role;
    const measured = role === "land" ? mix?.landMeasured === true : mix?.rolesUsable === true;
    if (r.synergy !== null) synergyOf.set(r.id, Number(r.synergy));
    fits.push({
      id: r.id,
      name: r.name,
      commanders: r.commander_names,
      inclusion: r.inclusion === null ? null : Number(r.inclusion),
      need: role !== "other" && mix && measured
        ? { role, have: roleCounts.get(r.id) ?? 0, target: mix.cells[role].target }
        : null,
    });
  }
  return {
    card,
    staple,
    owned: availability.owned,
    free: availability.free,
    // v2 item 9: by each deck's commander synergy for the card, then by name. A staple's figure is about
    // every commander, so a staple's list stays by name (staples addendum; ranking addendum 1c).
    fits: fits.sort((a, b) => staple ? byName(a, b)
      : (synergyOf.get(b.id) ?? -Infinity) - (synergyOf.get(a.id) ?? -Infinity) || byName(a, b)),
    holds: holds.sort(byName),
    excluded: excluded.sort(byName),
  };
}

type CardRowDb = {
  oracle_id: string;
  name: string;
  color_identity: string[] | null;
  commander_legal: boolean;
  type_line: string;
  oracle_text: string | null;
  keywords: string[] | null;
};

/** The whole read for one card, for the signed-in reader. Null when the card does not exist. */
export async function loadFits(userId: string, oracleId: string): Promise<FitsRead | null> {
  const [cardRes, deckRes] = await Promise.all([
    db.execute<CardRowDb>(sql`
      select oracle_id, name, color_identity, commander_legal, type_line, oracle_text, keywords
      from cards where oracle_id = ${oracleId}::uuid`),
    db.execute<DeckRow>(sql`
      select d.id, d.name, d.commander_oracle_id, d.partner_oracle_id,
        array_remove(array[cc.name, pc.name], null) as commander_names,
        array(select distinct x from unnest(coalesce(cc.color_identity, '{}') || coalesce(pc.color_identity, '{}')) x) as identity,
        coalesce((select sum(dc.quantity) from deck_cards dc where dc.deck_id = d.id and dc.oracle_id = ${oracleId}::uuid), 0)::int as holds,
        (d.commander_oracle_id = ${oracleId}::uuid or d.partner_oracle_id is not distinct from ${oracleId}::uuid) as leads,
        case when d.partner_oracle_id is null then
          (select s.inclusion from commander_support_cards s
            where s.commander_oracle_id = d.commander_oracle_id and s.oracle_id = ${oracleId}::uuid)
        else
          (select s.inclusion from commander_pair_support_cards s
            where s.commander_oracle_id = least(d.commander_oracle_id, d.partner_oracle_id)
              and s.partner_oracle_id = greatest(d.commander_oracle_id, d.partner_oracle_id)
              and s.oracle_id = ${oracleId}::uuid)
        end as inclusion,
        case when d.partner_oracle_id is null then
          (select s.synergy from commander_support_cards s
            where s.commander_oracle_id = d.commander_oracle_id and s.oracle_id = ${oracleId}::uuid)
        else
          (select s.synergy from commander_pair_support_cards s
            where s.commander_oracle_id = least(d.commander_oracle_id, d.partner_oracle_id)
              and s.partner_oracle_id = greatest(d.commander_oracle_id, d.partner_oracle_id)
              and s.oracle_id = ${oracleId}::uuid)
        end as synergy
      from decks d
      join cards cc on cc.oracle_id = d.commander_oracle_id
      left join cards pc on pc.oracle_id = d.partner_oracle_id
      where d.user_id = ${userId}`),
  ]);
  const c = cardRes.rows[0];
  if (!c) return null;
  const card: FitsRead["card"] = {
    oracleId: c.oracle_id,
    name: c.name,
    colorIdentity: c.color_identity ?? [],
    commanderLegal: c.commander_legal,
    role: primaryRole({ typeLine: c.type_line, oracleText: c.oracle_text, keywords: c.keywords ?? [] }),
  };
  const rows = deckRes.rows;
  // Only the decks that can take the card are counted and measured: a held or ruled-out deck
  // draws no need, so its cards and its mix would be read for nothing.
  const open = rows.filter((r) => r.holds === 0 && !r.leads && card.colorIdentity.every((x) => r.identity.includes(x)));

  const [roleCounts, mixes, availability, staples] = await Promise.all([
    card.role === "other" || open.length === 0 ? new Map<string, number>() : countRole(open.map((r) => r.id), card.role),
    // A card with no role draws no need, so no deck's mix is read for it.
    card.role === "other" || open.length === 0
      ? new Map<string, RecommendedMix>()
      : loadMixesForCommanders(open.map((r) => ({ commanderOracleId: r.commander_oracle_id, partnerOracleId: r.partner_oracle_id }))),
    loadAvailability(userId, { oracleIds: [oracleId] }),
    // The one staple definition, never a second lookup of our own (F18). NOT fail-soft: a staple
    // the read could not classify would draw a percentage as this commander's, which is false, so a
    // failure fails the read and the picker shows its failed state.
    loadUniversalStaples(),
  ]);
  const a = availability.get(oracleId);
  return shapeFits(card, rows, roleCounts, mixes, { owned: a?.owned ?? 0, free: a ? a.free : null }, staples.has(oracleId));
}

/**
 * Each deck's copies in `role`, counted the way the deck page's strip counts them: its decklist
 * rows by their primary role, commanders not included.
 */
async function countRole(deckIds: string[], role: FitRole): Promise<Map<string, number>> {
  const { rows } = await db.execute<{ deck_id: string; quantity: number; type_line: string; oracle_text: string | null; keywords: string[] | null }>(sql`
    select dc.deck_id, dc.quantity, c.type_line, c.oracle_text, c.keywords
    from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = any(${sql.param(deckIds)}::uuid[])`);
  const out = new Map<string, number>();
  for (const r of rows) {
    if (primaryRole({ typeLine: r.type_line, oracleText: r.oracle_text, keywords: r.keywords ?? [] }) !== role) continue;
    out.set(r.deck_id, (out.get(r.deck_id) ?? 0) + Number(r.quantity));
  }
  return out;
}
