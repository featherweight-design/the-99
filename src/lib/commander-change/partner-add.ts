// Where Add a partner finds its options: the partners a single commander could take beside it
// while it stays, each from outside the deck's 99 (a partner already in the 99 is the pair-up
// trade the sheet offers elsewhere, so the two lists never repeat a pair). Two sources, merged:
// pairs EDHREC has a row for (any deck count; a pair below the floor is listed last, never
// hidden), and the catalog's own pairing rules (`canPair`), so a legal partner EDHREC has not
// sampled is still found. Backgrounds are not here: `isCommanderCandidate` rejects them.
// Reads only.

import { sql } from "drizzle-orm";
import { db } from "../../db";
import { canPair, partnerAbility, type PartnerAbility } from "../decks/partner";
import { isCommanderCandidate } from "../recs/score";
import { MIN_CANDIDATE_DECKS } from "./fit";
import type { Candidate } from "./candidates";
import type { CutSuggestion } from "./partner-add-cuts";

type Pairer = {
  oracleId: string; name: string; typeLine: string; oracleText: string | null;
  manaCost: string | null; layout: string | null;
};

export type PartnerSource = {
  /** The stay first, then the partner: the order `changeCommander` takes. */
  ids: [string, string];
  /** 0 when EDHREC has no row for the pair. */
  deckCount: number;
  /** EDHREC holds a list for this exact pair: only then does copy say "the pair's decks". */
  hasPairRow: boolean;
};

export type PartnerOption = Candidate & {
  hasPairRow: boolean;
  /** Fewer decks than the floor, or none: listed after the others, never hidden. */
  belowFloor: boolean;
  /** Colors the pair adds beyond the deck's, sorted. Empty when the pair stays inside them. */
  opens: string[];
  /** Cards to cut, for a deck that must give one up. Empty when none is needed. */
  cuts: CutSuggestion[];
};

export type PartnerAdd = {
  /** The deck's 99 holds 99 cards: the add needs one cut. A deck at 98 or under needs none. */
  needsCut: boolean;
  /** What the commander's own card prints: the section's title and rule line read it. */
  ability: PartnerAbility;
  /** Cards in the 99 now: with the pair added and nothing cut, the deck holds this plus two. */
  bodyTotal: number;
  /** Lands in the 99, for the suggested land cut's reason. */
  lands: number;
  /** Every card of the 99 a cut may take, for "Cut another card": never a commander, never locked. */
  cutPool: { oracleId: string; name: string; imageUri: string | null }[];
  yours: PartnerOption[];
  toBuy: PartnerOption[];
};

/** Yours and To buy: floor-meeting pairs first, then the figure, then the partner's name. */
export function byPartnerFit(a: PartnerOption, b: PartnerOption): number {
  return Number(a.belowFloor) - Number(b.belowFloor)
    || b.fit.n - a.fit.n
    || a.halves[1].name.localeCompare(b.halves[1].name);
}

/**
 * The partners for `commander` from outside `inDeck`. Empty when the commander prints no
 * partner ability.
 */
export async function partnerSources(commander: Pairer, inDeck: ReadonlySet<string>): Promise<PartnerSource[]> {
  const ability = partnerAbility(commander.oracleText, commander.typeLine);
  if (!ability) return [];
  const c = commander.oracleId;
  const found = new Map<string, PartnerSource>();
  const put = (other: string, deckCount: number, hasPairRow: boolean) => {
    if (other === c || inDeck.has(other)) return;
    const have = found.get(other);
    if (have && have.hasPairRow) return;
    found.set(other, { ids: [c, other], deckCount, hasPairRow });
  };

  const [rows, pairers] = await Promise.all([
    // The other half's card rides along: a row's partner still has to be able to lead a deck.
    db.execute<{ a: string; b: string; deck_count: number; type_line: string; oracle_text: string | null; mana_cost: string | null; layout: string | null }>(sql`
      select ps.commander_oracle_id as a, ps.partner_oracle_id as b, ps.deck_count,
             co.type_line, co.oracle_text, co.mana_cost, co.layout
      from commander_pair_support ps
      join cards ca on ca.oracle_id = ps.commander_oracle_id
      join cards cb on cb.oracle_id = ps.partner_oracle_id
      join cards co on co.oracle_id = case when ps.commander_oracle_id = ${c} then ps.partner_oracle_id else ps.commander_oracle_id end
      where ps.synergy_state = 'ok'
        and (ps.commander_oracle_id = ${c} or ps.partner_oracle_id = ${c})
        and ca.commander_legal and cb.commander_legal
    `),
    db.execute<{ oracle_id: string; name: string; type_line: string; oracle_text: string | null; mana_cost: string | null; layout: string | null }>(sql`
      select oracle_id, name, type_line, oracle_text, mana_cost, layout
      from cards
      where commander_legal
        and (oracle_text ilike '%partner%' or oracle_text ilike '%friends forever%'
             or oracle_text ilike '%companion%' or type_line ilike '%doctor%')
    `),
  ]);
  for (const r of rows.rows) {
    if (!isCommanderCandidate({ typeLine: r.type_line, oracleText: r.oracle_text, manaCost: r.mana_cost, layout: r.layout })) continue;
    put(r.a === c ? r.b : r.a, r.deck_count, true);
  }
  const mine = { name: commander.name, ability };
  for (const p of pairers.rows) {
    if (!isCommanderCandidate({ typeLine: p.type_line, oracleText: p.oracle_text, manaCost: p.mana_cost, layout: p.layout })) continue;
    if (canPair(mine, { name: p.name, ability: partnerAbility(p.oracle_text, p.type_line) })) put(p.oracle_id, 0, false);
  }
  return [...found.values()];
}

export const isBelowFloor = (s: Pick<PartnerSource, "deckCount" | "hasPairRow">): boolean =>
  !s.hasPairRow || s.deckCount < MIN_CANDIDATE_DECKS;
