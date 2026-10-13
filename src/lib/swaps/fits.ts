// FITS YOUR DECKS (swap tools PR 5a, rulings 8–10): from any card, which of the reader's decks it
// would fit. Every figure is a fact, never a score: why the deck (a combo the card completes, or a theme
// it joins; v2 D3) and the deck's own need in the card's role, where its targets were measured (F9).
//
// A deck FITS when the card is inside its colors and the deck neither holds it nor is led by it.
// A deck that holds it says how many copies, and a deck whose colors rule the card out is named
// with the colors that do it. The picker (PR 5b) draws them; `shapeFits` says in what order.
//
// Read on demand, when the picker opens, never shipped with a card: the card and every deck; then, in
// one batch, the fitting decks' lists (the role and theme counts), the Spellbook pieces that pair with
// the card, the catalog's creature types (memoized), their mixes (once per distinct commander pair),
// the card's availability and the universal staples; then the full-rule combo read, only for a deck
// holding one of those pieces.
import { sql } from "drizzle-orm";

import { db } from "../../db";
import { chainArt } from "../cards/chain-art";
import { loadAvailability } from "../decks/availability-query";
import { loadMixesForCommanders, mixKey } from "../decks/deck-mix";
import type { RecommendedMix } from "../decks/mix";
import { primaryRole } from "../decks/read";
import { loadCompletionPartners } from "../combos/near-miss";
import { cardThemes, creatureSubtypes, keyCreatureType, THEME_ORDER, type Theme } from "../recs/themes";
import { loadUniversalStaples } from "../staples/universal";
import { loadCreatureTypes } from "./gather";

export type FitRole = "ramp" | "draw" | "removal" | "wipes" | "land";

export type FitDeck = {
  id: string;
  name: string;
  /** The commander, or both names for a pair. */
  commanders: string[];
  /** This deck's count in the card's role against its target, or null when the card has no role or
   *  the target for it was not measured (F9). */
  need: { role: FitRole; have: number; target: number } | null;
  /**
   * Why this deck (ranking-rebuild addendum §1c, Hugh's Q7 and Q8): the combo the card completes, with
   * every other piece already in the deck; else the theme it joins, the one with the most cards in the
   * deck; else null, and the row shows its need alone (R2).
   */
  reason: FitReason | null;
};

export type FitReason =
  | { kind: "combo"; with: { oracleId: string; name: string; imageUri: string | null } }
  /** `theme` is an approved theme, or the deck's key creature type for a card of that type (`Elf`). */
  | { kind: "theme"; theme: Theme | { type: string }; n: number };

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
  /** `commanders` as `FitDeck`'s, for a read's row about a deck that has since taken the card. */
  holds: { id: string; name: string; quantity: number; commanders: string[] }[];
  /** Decks whose colors rule the card out, each with the card's colors outside the deck's. */
  excluded: { id: string; name: string; commanders: string[]; outside: string[] }[];
};

export type DeckRow = {
  id: string;
  name: string;
  commander_oracle_id: string;
  partner_oracle_id: string | null;
  commander_names: string[];
  commander_types: string[];
  identity: string[];
  holds: number;
  leads: boolean;
  /** The deck's commander (or pair) synergy for the card: the order of the picker, never drawn (Q2). */
  synergy: number | string | null;
};

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
const tier = (d: FitDeck) => (d.reason?.kind === "combo" ? 0 : d.reason?.kind === "theme" ? 1 : 2);
const themeN = (d: FitDeck) => (d.reason?.kind === "theme" ? d.reason.n : 0);

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
  reasons: ReadonlyMap<string, FitReason> = new Map(),
): FitsRead {
  const fits: FitDeck[] = [];
  const synergyOf = new Map<string, number>();
  const holds: FitsRead["holds"] = [];
  const excluded: FitsRead["excluded"] = [];
  for (const r of rows) {
    const outside = card.colorIdentity.filter((c) => !r.identity.includes(c));
    if (r.holds > 0 || r.leads) {
      holds.push({ id: r.id, name: r.name, quantity: Math.max(r.holds, r.leads ? 1 : 0), commanders: r.commander_names });
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
      need: role !== "other" && mix && measured
        ? { role, have: roleCounts.get(r.id) ?? 0, target: mix.cells[role].target }
        : null,
      reason: reasons.get(r.id) ?? null,
    });
  }
  return {
    card,
    staple,
    owned: availability.owned,
    free: availability.free,
    // Hugh's Q7: a deck the card completes a combo in, then one whose theme it joins (the most cards
    // first), then each deck's commander synergy for the card, then the name. A staple's figure is about
    // every commander, so a staple's list stays by name (staples addendum; ranking addendum 1c).
    fits: fits.sort((a, b) => staple ? byName(a, b)
      : tier(a) - tier(b) || themeN(b) - themeN(a)
        || (synergyOf.get(b.id) ?? -Infinity) - (synergyOf.get(a.id) ?? -Infinity) || byName(a, b)),
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
        array_remove(array[cc.type_line, pc.type_line], null) as commander_types,
        array(select distinct x from unnest(coalesce(cc.color_identity, '{}') || coalesce(pc.color_identity, '{}')) x) as identity,
        coalesce((select sum(dc.quantity) from deck_cards dc where dc.deck_id = d.id and dc.oracle_id = ${oracleId}::uuid), 0)::int as holds,
        (d.commander_oracle_id = ${oracleId}::uuid or d.partner_oracle_id is not distinct from ${oracleId}::uuid) as leads,
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

  const [deckCards, pieces, creatureTypes, mixes, availability, staples] = await Promise.all([
    // Read once for the role count and the theme count, and only for the decks that can take the card.
    open.length === 0 ? [] as DeckCard[] : readDeckCards(open.map((r) => r.id)),
    // Which cards share a Spellbook variant with this one: a superset of every partner, so the full-rule
    // read below runs only for a deck holding one. In this batch, not after it: it needs only the card.
    open.length === 0 ? new Set<string>() : db.execute<{ oracle_id: string }>(sql`
      select distinct other.oracle_id from spellbook_variant_cards me
      join spellbook_variant_cards other on other.variant_id = me.variant_id and other.oracle_id <> me.oracle_id
      where me.oracle_id = ${oracleId}::uuid`).then((r) => new Set(r.rows.map((x) => x.oracle_id))),
    open.length === 0 ? new Set<string>() : loadCreatureTypes(),
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
  const roleCounts = card.role === "other" ? new Map<string, number>() : countRole(deckCards, card.role);

  // Why each open deck (addendum §1c): a combo the card completes, else the theme it joins most. The
  // combo read is the deck page's own (`loadCompletionPartners`, §4.3b's three rules), asked about this
  // one card: a completion means every other piece is in the deck already, commander included (Q8).
  const isType = (w: string) => creatureTypes.has(w);
  const themed = {
    oracleId,
    themes: cardThemes({ typeLine: c.type_line, oracleText: c.oracle_text }, isType),
    subtypes: creatureSubtypes(c.type_line),
  };
  const reasons = new Map<string, FitReason>();
  // A staple's row draws `staple · any commander` and never a reason, so it pays for none of this.
  await Promise.all((staples.has(oracleId) ? [] : open).map(async (r) => {
    const cards = deckCards.filter((d) => d.deck_id === r.id);
    const commanders = r.partner_oracle_id ? [r.commander_oracle_id, r.partner_oracle_id] : [r.commander_oracle_id];
    const holdsPiece = [...cards.map((d) => d.oracle_id), ...commanders].some((id) => pieces.has(id));
    const partners = !holdsPiece ? new Map() : await loadCompletionPartners({
      deckOracleIds: cards.map((d) => d.oracle_id),
      commanderOracleIds: commanders,
      candidateOracleIds: [oracleId],
      knownNames: new Map([...cards.map((d) => [d.oracle_id, d.name] as const), ...commanders.map((id, i) => [id, r.commander_names[i]] as const)]),
    });
    const combo = partners.get(oracleId);
    if (combo) return void reasons.set(r.id, { kind: "combo", with: { oracleId: combo.partnerOracleId, name: combo.partnerName, imageUri: null } });
    const theme = themeReason(themed, cards, r.commander_types, isType);
    if (theme) reasons.set(r.id, { kind: "theme", ...theme });
  }));
  await withPartnerArt(userId, reasons);

  const a = availability.get(oracleId);
  return shapeFits(card, rows, roleCounts, mixes, { owned: a?.owned ?? 0, free: a ? a.free : null }, staples.has(oracleId), reasons);
}

/**
 * The art each combo's other piece previews: the printing card details open for it, which outside a deck's own
 * page (and this picker opens from any page) is the copy the reader owns, else the catalog's. NOT a per-deck
 * pick: a row naming another deck's pick would preview a printing the modal does not open. One batched read for
 * every piece (`chainArt`), plus one `cards` read for the catalog fallback. Fail-soft: a failed read leaves the
 * piece without a preview.
 */
async function withPartnerArt(userId: string, reasons: Map<string, FitReason>): Promise<void> {
  const combos = [...reasons.values()].flatMap((r) => (r.kind === "combo" ? [r] : []));
  if (combos.length === 0) return;
  const ids = [...new Set(combos.map((r) => r.with.oracleId))];
  const [owned, catalog] = await Promise.all([
    chainArt(userId, null, ids),
    db.execute<{ oracle_id: string; image_uri: string | null }>(sql`select oracle_id, image_uri from cards where oracle_id = any(${ids}::uuid[])`)
      .then((res) => new Map(res.rows.map((x) => [x.oracle_id, x.image_uri] as const)))
      .catch(() => new Map<string, string | null>()),
  ]);
  for (const r of combos) r.with.imageUri = owned.get(r.with.oracleId) ?? catalog.get(r.with.oracleId) ?? null;
}

/**
 * Each deck's copies in `role`, counted the way the deck page's strip counts them: its decklist
 * rows by their primary role, commanders not included.
 */
/** One decklist row, for the role count and the theme count. */
export type DeckCard = {
  deck_id: string;
  oracle_id: string;
  quantity: number;
  name: string;
  type_line: string;
  oracle_text: string | null;
  keywords: string[] | null;
};

/** The open decks' decklist rows, read once for both counts below. */
async function readDeckCards(deckIds: string[]): Promise<DeckCard[]> {
  const { rows } = await db.execute<DeckCard>(sql`
    select dc.deck_id, dc.oracle_id, dc.quantity, c.name, c.type_line, c.oracle_text, c.keywords
    from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = any(${sql.param(deckIds)}::uuid[])`);
  return rows;
}

/**
 * Each deck's copies in `role`, counted the way the deck page's strip counts them: its decklist
 * rows by their primary role, commanders not included.
 */
export function countRole(cards: readonly DeckCard[], role: FitRole): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of cards) {
    if (primaryRole({ typeLine: r.type_line, oracleText: r.oracle_text, keywords: r.keywords ?? [] }) !== role) continue;
    out.set(r.deck_id, (out.get(r.deck_id) ?? 0) + Number(r.quantity));
  }
  return out;
}

/**
 * The theme a card joins in one deck (addendum §1c): of the card's own themes, the one the most of the
 * deck's OTHER cards carry, a tie going to the earlier theme in the approved list (d9). A creature of the
 * deck's key type joins that type too (Hugh's Q5: tribal is also membership), counted as its creatures.
 * Null when no other card shares any of them. Cards are counted, not copies: `Joins 9 other mill cards`.
 */
export function themeReason(
  card: { oracleId: string; themes: readonly Theme[]; subtypes: readonly string[] },
  deck: readonly DeckCard[],
  commanderTypes: readonly string[],
  isCreatureType: (word: string) => boolean,
): { theme: Theme | { type: string }; n: number } | null {
  const others = deck.filter((c) => c.oracle_id !== card.oracleId);
  // Each deck card is read once, whatever the number of themes asked about.
  const theirs = card.themes.length ? others.map((c) => cardThemes({ typeLine: c.type_line, oracleText: c.oracle_text }, isCreatureType)) : [];
  let best: { theme: Theme | { type: string }; n: number; rank: number } | null = null;
  for (const theme of card.themes) {
    const n = theirs.filter((t) => t.includes(theme)).length;
    const rank = THEME_ORDER.indexOf(theme);
    if (n > 0 && (!best || n > best.n || (n === best.n && rank < best.rank))) best = { theme, n, rank };
  }
  // Copies decide the key type (a deck of 30 Relentless Rats is a Rat deck); `n` below still counts cards.
  const key = keyCreatureType(others.map((c) => ({ typeLine: c.type_line, quantity: Number(c.quantity) })), commanderTypes);
  if (key && card.subtypes.includes(key)) {
    const n = others.filter((c) => creatureSubtypes(c.type_line).includes(key)).length;
    // Membership is the tribal theme's other half, so it ranks where tribal does.
    const rank = THEME_ORDER.indexOf("tribal");
    if (n > 0 && (!best || n > best.n || (n === best.n && rank < best.rank))) best = { theme: { type: key }, n, rank };
  }
  return best ? { theme: best.theme, n: best.n } : null;
}
