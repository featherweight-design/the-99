import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, decks, spellbookVariantCards, spellbookVariants } from "../../db/schema";
import type { Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { deckIdentity } from "../decks/format";
import { cardTypeGroup, type DeckDetailCard } from "../decks/grouping";
import { classifyRoles } from "../recs/roles";
import { priceQualifier, priceState } from "../decks/price";
import type { PriceRead } from "../decks/price-query";
import { cheapestNow, loadPrices } from "../decks/price-query";
import { isMandatoryLoop } from "../spellbook/combo-features";
import {
  addableMissingPiece,
  anySizeComboQuery,
  byVariantId,
  countedOutcomeSql,
  MAX_COMBO_PIECES,
  pickTop,
  type ComboPieceRow,
} from "../synopsis/combo-facts";
import { nearCombosEnabled } from "./flag";
import { holdingDecks, type HoldingDeck } from "./holding-decks";

/**
 * SERVER-ONLY. The combos a deck is exactly one piece away from, and where that piece is (plan
 * `2026-10-22-near-combos-backend.md`, read A). Behind `NEAR_COMBOS_ENABLED`; no surface draws it
 * until Design prompt 17.
 *
 * "One piece away" is `addableMissingPiece`, the rule the Overview's facts use, over the same
 * `anySizeComboQuery`: a template-free, counted combo of 2 to 6 pieces whose one missing piece the
 * deck could add (not command-zone-only, legal, inside the commanders' identity).
 */

/** Where the missing piece is, for this reader. Exactly one per piece. */
export type MissingPieceWhere =
  /** The reader owns a copy no deck claims. */
  | { kind: "spare" }
  /** Every owned copy is claimed: these are the decks holding it, committed ones first. */
  | { kind: "elsewhere"; decks: HoldingDeck[] }
  /**
   * Not owned. `cents` is the buy tag's figure, null when no printing is stocked now. `soldOut` tells
   * the two nulls apart as the buy tag does (`priceState`): stocked before and not now, against a
   * card the feed has never stocked, which the tag leaves silent. `qualifier` is the buy tag's
   * `priceQualifier` ("foil", "etched") when the only stocked printing is that finish, else null.
   */
  | { kind: "buy"; cents: number | null; soldOut: boolean; qualifier: string | null };

// `holdingDecks` is pure, in its own module so a client component (card details' combo, UI-3) can call it.
export { holdingDecks, type HoldingDeck };

export type NearComboPiece = { oracleId: string; name: string; held: boolean };

/**
 * The missing card as the catalog has it, for the combo detail (combos close UI-2): its plate's art,
 * and the row Add predicts into the decklist before the server answers (`useAddOptimisticCard`).
 * Null when the catalog holds no row for it.
 */
export type NearComboCard = Pick<DeckDetailCard, "typeLine" | "cardTypeGroup" | "role" | "cmc" | "manaCost" | "imageUri">;

export type NearCombo = {
  variantId: string;
  /** Every piece, the missing one included, by name. */
  pieces: NearComboPiece[];
  missing: { oracleId: string; name: string; where: MissingPieceWhere; card: NearComboCard | null };
  produces: string[];
  /** Spellbook's steps, newline-separated. */
  steps: string | null;
  manaNeeded: string | null;
  manaValueNeeded: number | null;
  notablePrerequisites: string | null;
  /** A held piece is one of the deck's commanders. */
  usesCommander: boolean;
};

/** The ranked top of the list, and how many there were before the cap. */
export type NearCombos = { combos: NearCombo[]; total: number };

/** The read's default cap. Staging's decks run to 54 two-piece and 182 three-piece near combos. */
export const NEAR_COMBOS_CAP = 20;

const EMPTY: NearCombos = { combos: [], total: 0 };

/** A near combo before its missing piece has been placed. */
export type NearComboCandidate = Omit<NearCombo, "missing"> & { missing: { oracleId: string; name: string } };

/** Pure: every near combo in the query's rows, full detail, unranked and unplaced. */
export function shapeNearCombos(
  rows: readonly ComboPieceRow[],
  identity: readonly string[],
  commanderIds: readonly string[],
): NearComboCandidate[] {
  const out: NearComboCandidate[] = [];
  for (const [variantId, pieces] of byVariantId(rows)) {
    const m = addableMissingPiece(pieces, identity);
    if (!m) continue;
    const first = pieces[0];
    out.push({
      variantId,
      pieces: [...pieces]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ oracleId: p.oracle_id, name: p.name, held: p.held })),
      missing: { oracleId: m.oracle_id, name: m.name },
      produces: first.produces,
      steps: first.steps ?? null,
      manaNeeded: first.mana_needed ?? null,
      manaValueNeeded: first.mana_value_needed,
      notablePrerequisites: first.notable_prerequisites ?? null,
      usesCommander: pieces.some((p) => p.held && commanderIds.includes(p.oracle_id)),
    });
  }
  return out;
}

/**
 * Pure: where one card is for this reader, from its availability (read from the deck's own
 * vantage, so the deck's draft never claims it) and its buy tag's figure. A copy no deck claims is
 * a spare however many other copies are claimed; owning every copy claimed is `elsewhere`, naming
 * the decks that hold one.
 */
export function whereIs(
  availability: Availability | undefined,
  cents: number | null,
  soldOut = false,
  qualifier: string | null = null,
): MissingPieceWhere {
  if (!availability || availability.owned <= 0) {
    return { kind: "buy", cents, soldOut: cents === null && soldOut, qualifier: cents === null ? null : qualifier };
  }
  if (availability.free > 0) return { kind: "spare" };
  return { kind: "elsewhere", decks: holdingDecks(availability) };
}

/**
 * `loadAvailability` for combo pieces. That read leaves basic lands out ENTIRELY (every sleeved deck
 * holds dozens and no collection row matches them), so a basic the reader owns would read as not
 * owned. A piece it does not report but the collection holds is filled in as one unclaimed copy:
 * nothing claims a basic.
 */
export async function loadPieceAvailability(
  userId: string,
  oracleIds: string[],
  opts: { excludeDeckId?: string; env: NodeJS.ProcessEnv },
): Promise<Map<string, Availability>> {
  const availability = await loadAvailability(userId, { oracleIds, excludeDeckId: opts.excludeDeckId, env: opts.env });
  const untracked = oracleIds.filter((id) => !availability.has(id));
  if (untracked.length === 0) return availability;
  const held = (await db.execute(sql`
    select distinct ci.oracle_id from collection_items ci
    where ci.user_id = ${sql.param(userId)} and ci.oracle_id = any(${sql.param(untracked)}::uuid[])
  `)).rows as { oracle_id: string }[];
  for (const { oracle_id } of held) availability.set(oracle_id, { owned: 1, hard: 0, soft: 0, free: 1, claims: [] });
  return availability;
}

/** The buy tag's finish qualifier for a card ("foil", "etched"), from the same read its figure came from. */
function qualifierOf(prices: PriceRead, oracleId: string): string | null {
  const fact = prices.prices.get(oracleId);
  return fact ? priceQualifier(fact, priceState(fact, prices.newestAsOf)) : null;
}

/** The bucket a missing piece ranks in: spare, elsewhere, a priced buy, an unpriced buy. */
function bucketOf(w: MissingPieceWhere): number {
  if (w.kind === "spare") return 0;
  if (w.kind === "elsewhere") return 1;
  return w.cents === null ? 3 : 2;
}

const centsOf = (c: NearCombo) => (c.missing.where.kind === "buy" ? (c.missing.where.cents ?? 0) : 0);

/**
 * Pure: the top `cap`, bucket by bucket (spare, elsewhere, priced buy, unpriced buy), so a piece
 * the reader holds always outranks one to buy. Inside a bucket, one combo per distinct outcome
 * leads, as the Overview's list does, then the rest; each part cheapest first, then the Overview's
 * combo order (fewest pieces, free mana, uses the commander, lower mana).
 */
export function rankNearCombos(list: readonly NearCombo[], cap: number): NearCombos {
  const sig = (produces: readonly string[]) => [...produces].sort().join("|");
  const rank = (c: NearCombo) => ({ pieces: c.pieces.length, mana: c.manaValueNeeded, commander: c.usesCommander, id: c.variantId, sig: sig(c.produces), mandatory: isMandatoryLoop(c.produces) });
  const ranked = [0, 1, 2, 3].flatMap((bucket) =>
    pickTop(list.filter((c) => bucketOf(c.missing.where) === bucket), rank, Infinity, (a, b) => centsOf(a) - centsOf(b)),
  );
  return { combos: ranked.slice(0, cap), total: list.length };
}

/**
 * Read A. The reader's own deck only: a deck id that is not theirs reads as empty. Empty too while
 * the switch is off, without a query.
 */
export async function loadNearCombos(args: {
  userId: string;
  deckId: string;
  env: NodeJS.ProcessEnv;
  cap?: number;
  /** The largest combo to list, in pieces. The deck page's list asks for 2 (combos-close G2). */
  maxPieces?: number;
}): Promise<NearCombos> {
  if (!nearCombosEnabled(args.env)) return EMPTY;
  const [deck] = await db
    .select({ commander: decks.commanderOracleId, partner: decks.partnerOracleId })
    .from(decks)
    .where(and(eq(decks.id, args.deckId), eq(decks.userId, args.userId)));
  if (!deck?.commander) return EMPTY;
  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  const [list, identities] = await Promise.all([
    db.select({ oracleId: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, args.deckId)),
    db.select({ oracleId: cards.oracleId, identity: cards.colorIdentity }).from(cards).where(inArray(cards.oracleId, commanders)),
  ]);
  const identityOf = (id: string | null) => identities.find((c) => c.oracleId === id)?.identity ?? [];
  const identity = deckIdentity(identityOf(deck.commander), deck.partner ? identityOf(deck.partner) : null);
  const present = [...new Set([...list.map((c) => c.oracleId), ...commanders])];

  const rows = (await db.execute(anySizeComboQuery(present, commanders))).rows as ComboPieceRow[];
  const candidates = shapeNearCombos(rows, identity, commanders).filter((c) => c.pieces.length <= (args.maxPieces ?? MAX_COMBO_PIECES));
  if (candidates.length === 0) return EMPTY;

  const missingIds = [...new Set(candidates.map((c) => c.missing.oracleId))];
  const [availability, prices, catalog] = await Promise.all([
    loadPieceAvailability(args.userId, missingIds, { excludeDeckId: args.deckId, env: args.env }),
    loadPrices(missingIds),
    db
      .select({
        oracleId: cards.oracleId,
        typeLine: cards.typeLine,
        oracleText: cards.oracleText,
        keywords: cards.keywords,
        cmc: cards.cmc,
        manaCost: cards.manaCost,
        imageUri: cards.imageUri,
      })
      .from(cards)
      .where(inArray(cards.oracleId, missingIds)),
  ]);
  const cardOf = (oracleId: string): NearComboCard | null => {
    const c = catalog.find((r) => r.oracleId === oracleId);
    if (!c) return null;
    return {
      typeLine: c.typeLine,
      cardTypeGroup: cardTypeGroup(c.typeLine),
      role: classifyRoles({ typeLine: c.typeLine, oracleText: c.oracleText, keywords: c.keywords })[0] ?? "other",
      cmc: c.cmc,
      manaCost: c.manaCost,
      imageUri: c.imageUri,
    };
  };
  const placed: NearCombo[] = candidates.map((c) => ({
    ...c,
    missing: {
      ...c.missing,
      where: whereIs(
        availability.get(c.missing.oracleId),
        cheapestNow(prices, c.missing.oracleId),
        priceState(prices.prices.get(c.missing.oracleId), prices.newestAsOf) === "soldOut",
        qualifierOf(prices, c.missing.oracleId),
      ),
      card: cardOf(c.missing.oracleId),
    },
  }));
  return rankNearCombos(placed, args.cap ?? NEAR_COMBOS_CAP);
}

/**
 * Read B (plan, PR 2): the combos a card is in, and which of the other pieces the reader holds.
 * Every template-free, counted combo of 2 to `MAX_COMBO_PIECES` pieces naming the card, the same
 * definition read A and the Overview use.
 */

/** One of the other pieces, for this reader. */
export type CardComboPieceState =
  /** In the deck the card was opened from (a command-zone-only piece counts only as its commander). */
  | "inDeck"
  /** Owned, with a copy no deck claims. */
  | "spare"
  /** Owned, every copy claimed by a deck. */
  | "elsewhere"
  | "notOwned";

/**
 * Where another piece is, as the card details block's where-line draws it (combos close UI-3): the
 * missing piece's own shape (`MissingPieceWhere`, a `buy` priced as the deck page's list prices it)
 * plus `inDeck`, a piece the deck in scope lists.
 */
export type CardComboWhere = MissingPieceWhere | { kind: "inDeck" };

export type CardComboOther = {
  oracleId: string;
  name: string;
  state: CardComboPieceState;
  mustBeCommander: boolean;
  /** For `elsewhere`, the decks holding it, committed first. Empty otherwise. */
  decks: HoldingDeck[];
  /** The where-line, `state` with its decks and, for `notOwned`, its buy tag's figure. */
  where: CardComboWhere;
  /** The catalog's art, for the piece's plate in the combo detail (`cards.image_uri`). */
  imageUri: string | null;
  /** One of the scoped deck's commanders: the line's faint `commander` tag. */
  isCommander: boolean;
};

export type CardCombo = {
  variantId: string;
  /** The other pieces, by name. The card itself is never listed. */
  others: CardComboOther[];
  produces: string[];
  steps: string | null;
  manaNeeded: string | null;
  manaValueNeeded: number | null;
  notablePrerequisites: string | null;
  /** A piece, the card itself included, is one of the scoped deck's commanders. */
  usesCommander: boolean;
};

export type CardCombos = {
  combos: CardCombo[];
  total: number;
  /**
   * A deck is in scope AND lists the card itself (its 99 or a commander). Only then can a combo be
   * "whole in this deck" or "one piece away": the card details block splits into its two groups on
   * this alone (UI-3, OPEN-6). False without a deck.
   */
  inScope: boolean;
};

/** The read's default cap. A card's combos run to a median 9 and Ashnod's Altar's to 6,089 on staging. */
export const CARD_COMBOS_CAP = 12;

/**
 * How many variants the query hands to the ranking, best first by what the reader owns. A card in
 * thousands of combos must not ship thousands of rows to a card-details press; the cap is far
 * smaller than this, which leaves the one-per-outcome lead room to choose.
 */
export const CARD_COMBOS_SHORTLIST = 200;

/** One row of `cardComboQuery`: a piece of a variant naming the card. */
export type CardComboRow = {
  variant_id: string;
  produces: string[];
  card_count: number;
  mana_value_needed: number | null;
  mana_needed: string | null;
  steps: string | null;
  notable_prerequisites: string | null;
  oracle_id: string;
  name: string;
  must_be_commander: boolean;
  /** The variant's count before the shortlist, the same on every row. */
  total: number;
  /** The piece's catalog art, for its plate (UI-3). */
  image_uri?: string | null;
  /** For the deck-scoped addability rule (`addableMissingPiece`). */
  commander_legal?: boolean;
  color_identity?: string[];
};

/**
 * The variants naming `oracleId`, shortlisted in SQL: fewest pieces the reader owns none of and the
 * deck in scope does not list first (the count the ranking uses), then fewest pieces, then
 * Spellbook's popularity. Pruned card-first through
 * `spellbook_variant_cards_oracle_idx`, as `near-miss.ts`'s reads are.
 */
export function cardComboQuery(
  userId: string,
  oracleId: string,
  limit = CARD_COMBOS_SHORTLIST,
  maxPieces = MAX_COMBO_PIECES,
  /**
   * The deck in scope: a piece there is held, by `pieceState`'s rule (a command-zone-only piece only as a commander).
   * With `identity` (the card is in the deck, UI-3 OPEN-5) the shortlist keeps only a variant whole in the deck or one
   * piece away by `addableMissingPiece`'s piece rule, BEFORE the limit, so rejected variants never crowd out kept ones.
   */
  scope: { deck: readonly string[]; commanders: readonly string[]; identity?: readonly string[] } = { deck: [], commanders: [] },
) {
  const card = sql.param(oracleId);
  const deckP = sql.param([...scope.deck]);
  const commandersP = sql.param([...scope.commanders]);
  const held = sql`(case when vc.must_be_commander then vc.oracle_id = any(${commandersP}::uuid[])
                         else vc.oracle_id = any(${deckP}::uuid[]) end)`;
  const eligible = scope.identity
    ? sql`and (count(*) filter (where not ${held}) = 0
               or (count(*) filter (where not ${held}) = 1
                   and bool_and(${held} or (not vc.must_be_commander and pc.commander_legal
                                            and pc.color_identity <@ ${sql.param([...scope.identity])}::text[]))))`
    : sql``;
  return sql`
    with cand as (
      select v.variant_id, v.card_count, v.popularity
      from ${spellbookVariants} v
      where v.card_count between 2 and ${Math.min(maxPieces, MAX_COMBO_PIECES)}
        and cardinality(v.requires_template_ids) = 0
        and ${countedOutcomeSql()}
        and exists (select 1 from ${spellbookVariantCards} vc0
                    where vc0.variant_id = v.variant_id and vc0.oracle_id = ${card}::uuid)
    ), scored as (
      select cand.variant_id, cand.card_count, cand.popularity,
             count(*) filter (where not (
               case when vc.must_be_commander then vc.oracle_id = any(${commandersP}::uuid[])
                    else vc.oracle_id = any(${deckP}::uuid[]) end)
               and not exists (
               select 1 from collection_items ci
               where ci.user_id = ${sql.param(userId)} and ci.oracle_id = vc.oracle_id)) as unowned,
             count(*) over () as total
      from cand
      join ${spellbookVariantCards} vc on vc.variant_id = cand.variant_id and vc.oracle_id <> ${card}::uuid
      join cards pc on pc.oracle_id = vc.oracle_id
      group by cand.variant_id, cand.card_count, cand.popularity
      -- Every other piece stored: a variant naming one card twice keeps fewer rows than its count
      -- (the ingest dedupes), and must not be counted in the total or take a shortlist slot.
      having count(*) = cand.card_count - 1
      ${eligible}
      order by unowned, cand.card_count, cand.popularity desc nulls last, cand.variant_id
      limit ${limit}
    )
    select s.variant_id, v.produces, v.card_count, v.mana_value_needed, v.mana_needed, v.steps,
           v.notable_prerequisites, vc.oracle_id, c.name, vc.must_be_commander, s.total::int as total,
           c.image_uri, c.commander_legal, c.color_identity
    from scored s
    join ${spellbookVariants} v on v.variant_id = s.variant_id
    join ${spellbookVariantCards} vc on vc.variant_id = s.variant_id
    join cards c on c.oracle_id = vc.oracle_id
  `;
}

/**
 * Pure: a piece's state. In the deck first (a command-zone-only piece only as one of the deck's
 * commanders), else from its availability: an unclaimed copy, every copy claimed, or none owned.
 */
export function pieceState(
  piece: { oracleId: string; mustBeCommander: boolean },
  scope: { deck: ReadonlySet<string>; commanders: ReadonlySet<string> },
  availability: Availability | undefined,
): CardComboPieceState {
  if (piece.mustBeCommander ? scope.commanders.has(piece.oracleId) : scope.deck.has(piece.oracleId)) return "inDeck";
  if (!availability || availability.owned <= 0) return "notOwned";
  return availability.free > 0 ? "spare" : "elsewhere";
}

/**
 * Pure: the rows grouped into combos, the card left out of each, ranked fewest pieces NOT owned
 * first (a piece in the deck, spare or in another deck is held); inside each count, one per distinct
 * outcome leading, then the Overview's combo order. A variant missing any of its rows is dropped.
 */
export function shapeCardCombos(
  rows: readonly CardComboRow[],
  oracleId: string,
  stateOf: (piece: { oracleId: string; mustBeCommander: boolean }) => CardComboPieceState,
  cap: number,
  decksOf: (oracleId: string) => HoldingDeck[] = () => [],
  /** The scoped deck's commanders, for `byRank`'s commander preference. */
  commanderIds: ReadonlySet<string> = new Set(),
  /** The where-line's price for a piece not owned; unpriced (no tag) when absent. */
  buyOf: (oracleId: string) => Extract<MissingPieceWhere, { kind: "buy" }> = () => UNPRICED,
): Omit<CardCombos, "inScope"> {
  const byVariant = new Map<string, CardComboRow[]>();
  for (const r of rows) byVariant.set(r.variant_id, [...(byVariant.get(r.variant_id) ?? []), r]);
  const list: CardCombo[] = [];
  for (const [variantId, pieces] of byVariant) {
    const first = pieces[0];
    if (pieces.length !== first.card_count) continue;
    list.push({
      variantId,
      others: pieces
        .filter((p) => p.oracle_id !== oracleId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => {
          const state = stateOf({ oracleId: p.oracle_id, mustBeCommander: p.must_be_commander });
          const decks = state === "elsewhere" ? decksOf(p.oracle_id) : [];
          return {
            oracleId: p.oracle_id,
            name: p.name,
            mustBeCommander: p.must_be_commander,
            state,
            decks,
            where: whereOfState(state, decks, () => buyOf(p.oracle_id)),
            imageUri: p.image_uri ?? null,
            isCommander: commanderIds.has(p.oracle_id),
          };
        }),
      produces: first.produces,
      steps: first.steps,
      manaNeeded: first.mana_needed,
      manaValueNeeded: first.mana_value_needed,
      notablePrerequisites: first.notable_prerequisites,
      usesCommander: pieces.some((p) => commanderIds.has(p.oracle_id)),
    });
  }
  const unowned = (c: CardCombo) => c.others.filter((p) => p.state === "notOwned").length;
  const sig = (produces: readonly string[]) => [...produces].sort().join("|");
  const rank = (c: CardCombo) => ({ pieces: c.others.length + 1, mana: c.manaValueNeeded, commander: c.usesCommander, id: c.variantId, sig: sig(c.produces), mandatory: isMandatoryLoop(c.produces) });
  // The one-per-outcome lead runs inside each count of unowned pieces, never across them: across the
  // whole list it lifted a combo needing a purchase above one the reader already holds (the probe).
  const counts = [...new Set(list.map(unowned))].sort((a, b) => a - b);
  const top = counts.flatMap((n) => pickTop(list.filter((c) => unowned(c) === n), rank, Infinity)).slice(0, cap);
  return { combos: top, total: rows[0]?.total ?? 0 };
}

const UNPRICED: Extract<MissingPieceWhere, { kind: "buy" }> = { kind: "buy", cents: null, soldOut: false, qualifier: null };

/** Pure: a piece's where-line from its state (the deck first, then the reader's copies, then its buy tag). */
export function whereOfState(
  state: CardComboPieceState,
  decks: HoldingDeck[],
  buy: () => Extract<MissingPieceWhere, { kind: "buy" }>,
): CardComboWhere {
  if (state === "inDeck") return { kind: "inDeck" };
  if (state === "spare") return { kind: "spare" };
  if (state === "elsewhere") return { kind: "elsewhere", decks };
  return buy();
}

/**
 * Pure: whether a variant naming the card stays in a DECK-SCOPED list (UI-3, OPEN-5 and OPEN-6), its
 * rows the card's own included. The card must count as in the deck (a command-zone-only card only as
 * a commander); every other piece in the deck is a whole combo and stays; otherwise the combo must be
 * one piece away by `addableMissingPiece`, the rule the deck page's near combos use (one missing
 * piece, legal, inside the commanders' identity, not command-zone-only, a counted outcome that is not
 * a mandatory loop), so card details and the deck page name one set.
 */
export function keptInDeckScope(
  pieces: readonly CardComboRow[],
  oracleId: string,
  scope: { deck: ReadonlySet<string>; commanders: ReadonlySet<string> },
  identity: readonly string[],
): boolean {
  const held = (p: CardComboRow) => (p.must_be_commander ? scope.commanders.has(p.oracle_id) : scope.deck.has(p.oracle_id));
  const own = pieces.find((p) => p.oracle_id === oracleId);
  if (!own || !held(own)) return false;
  if (pieces.every(held)) return true;
  const rows: ComboPieceRow[] = pieces.map((p) => ({
    variant_id: p.variant_id,
    produces: p.produces,
    card_count: p.card_count,
    mana_value_needed: p.mana_value_needed,
    oracle_id: p.oracle_id,
    name: p.name,
    must_be_commander: p.must_be_commander,
    held: held(p),
    commander_legal: p.commander_legal ?? false,
    color_identity: p.color_identity ?? [],
  }));
  return addableMissingPiece(rows, identity) !== null;
}

const NO_CARD_COMBOS: CardCombos = { combos: [], total: 0, inScope: false };

/** Read B. Empty while the switch is off, without a query. */
export async function loadCardCombos(args: {
  userId: string;
  oracleId: string;
  /** The deck the card was opened from, if any: its list, and its commanders apart. */
  deck?: { oracleIds: readonly string[]; commanderOracleIds: readonly string[] };
  env: NodeJS.ProcessEnv;
  cap?: number;
  /** The largest combo to list, in pieces. The card details block asks for 2 (combos-close G2). */
  maxPieces?: number;
}): Promise<CardCombos> {
  if (!nearCombosEnabled(args.env)) return NO_CARD_COMBOS;
  const scope = {
    deck: new Set([...(args.deck?.oracleIds ?? []), ...(args.deck?.commanderOracleIds ?? [])]),
    commanders: new Set(args.deck?.commanderOracleIds ?? []),
  };
  const inScope = args.deck !== undefined && scope.deck.has(args.oracleId);
  // The deck's identity, for the addability rule: only when the card is in the deck, the one case the
  // block splits (`keptInDeckScope`). Read first, so the shortlist is cut from kept variants alone.
  const identity =
    inScope && scope.commanders.size > 0
      ? await db.select({ identity: cards.colorIdentity }).from(cards).where(inArray(cards.oracleId, [...scope.commanders]))
      : null;
  const deckColors = identity ? deckIdentity(identity[0]?.identity ?? [], identity[1]?.identity ?? null) : null;
  const query = cardComboQuery(args.userId, args.oracleId, CARD_COMBOS_SHORTLIST, args.maxPieces, {
    deck: [...scope.deck],
    commanders: [...scope.commanders],
    ...(deckColors ? { identity: deckColors } : {}),
  });
  let rows = (await db.execute(query)).rows as CardComboRow[];
  if (deckColors) {
    const kept = new Set([...byCardVariant(rows)].filter(([, pieces]) => keptInDeckScope(pieces, args.oracleId, scope, deckColors)).map(([id]) => id));
    rows = rows.filter((r) => kept.has(r.variant_id));
  }
  if (rows.length === 0) return { ...NO_CARD_COMBOS, inScope };
  const ids = [...new Set(rows.map((r) => r.oracle_id).filter((id) => id !== args.oracleId))];
  // Prices beside availability, as read A prices its missing pieces: a piece not owned draws its buy tag.
  const [availability, prices] = await Promise.all([loadPieceAvailability(args.userId, ids, { env: args.env }), loadPrices(ids)]);
  const shaped = shapeCardCombos(
    rows,
    args.oracleId,
    (p) => pieceState(p, scope, availability.get(p.oracleId)),
    args.cap ?? CARD_COMBOS_CAP,
    (id) => holdingDecks(availability.get(id) ?? { claims: [] }),
    scope.commanders,
    (id) => {
      const w = whereIs(undefined, cheapestNow(prices, id), priceState(prices.prices.get(id), prices.newestAsOf) === "soldOut", qualifierOf(prices, id));
      return w.kind === "buy" ? w : UNPRICED;
    },
  );
  return { ...shaped, inScope };
}

/** The query's rows grouped by variant, in the order they arrived. */
function byCardVariant(rows: readonly CardComboRow[]): Map<string, CardComboRow[]> {
  const out = new Map<string, CardComboRow[]>();
  for (const r of rows) out.set(r.variant_id, [...(out.get(r.variant_id) ?? []), r]);
  return out;
}
