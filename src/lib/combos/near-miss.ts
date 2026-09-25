import { sql } from "drizzle-orm";
import { db } from "../../db";
import { spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { isInfiniteOrGameEnding } from "../spellbook/combo-features";

/**
 * SERVER-ONLY. The near-miss reads — a two-card combo with exactly one piece missing.
 *
 * `loadAssembledCombos` answers "what does this deck already do"; this answers "what is it one
 * card away from", which is the same index traversed the other way.
 *
 * `spellbook_variant_cards_oracle_idx` is what makes that affordable, and specifically the
 * `exists` prune inside each CTE: the primary key leads on `variant_id`, so finding the
 * variants that mention ANY of a set of cards is a card-first question the primary key cannot
 * answer. Without the prune every two-card variant in the index is grouped on every call and
 * then discarded, on a path that runs per page of the collection.
 *
 * ALL THREE §4.3b RULES APPLY UNCHANGED, and rule 2 is the one that matters most here. A piece
 * flagged `must_be_commander` only works from the command zone, so a card that would complete a
 * combo ONLY as a commander is not completed by adding it to the 99 — and a combo clause naming X
 * on that row would be a false positive on the one claim this design cannot survive.
 */

/** One partner, for one card. */
export type ComboPartner = {
  /**
   * How many OTHER partners this card has, for the marker's tooltip. Carried beside the chosen
   * one because the readers already have every row in hand — counting again downstream would
   * be a second traversal of the same join for a figure this one can hand over.
   */
  otherPartners?: number;
  /** The card the row is about — the one the reader is looking at. */
  oracleId: string;
  partnerOracleId: string;
  partnerName: string;
  /**
   * Deterministic ordering, never shown. `popularity` is nullable in the schema and was
   * verified null on a sampled bulk record, which is what the handoff's dependency 4 rests on
   * — but it is non-null on all 5,031 two-card variants in the shipped index. Nulls sort last
   * and `variantId` breaks the remaining ties, so the choice is stable across reloads whatever
   * upstream does later.
   */
  popularity: number | null;
  variantId: string;
};

/** The row shape every one of these queries returns before it is shaped. */
export type PairRow = {
  variant_id: string;
  produces: string[];
  popularity: number | null;
  present_id: string;
  missing_id: string;
  missing_name: string;
  missing_must_be_commander: boolean;
};

/**
 * The two-piece core of the DECK read. `loadCompletionPartners` is its only caller.
 *
 * `present` is the deck's cards plus its commanders; `missing` is the other piece, whatever it
 * turns out to be. `loadOwnBothPartners` deliberately does NOT go through here, and passing it
 * an empty `commanders` list would not produce the collection read: rule 2's `CASE` would then
 * reject every `must_be_commander` piece outright, where the collection read has to keep them.
 * The claim there is about owning two cards, not about assembling them, so a piece that works
 * only from the command zone is still a card the reader owns.
 *
 * The two queries therefore share their RULES and not their text. That is a real duplication
 * and it is the lesser one: the alternative is a parameter that silently changes which §4.3b
 * rules apply, which is how a reader ends up asserting a combo it never tested for.
 */
export function pairsWithOnePiece(args: {
  present: readonly string[];
  /** Cards that count as being in the COMMAND ZONE, for rule 2. Empty for a collection read. */
  commanders: readonly string[];
  /** When given, the missing piece must be one of these — the candidates on screen. */
  missingIn: readonly string[] | null;
}) {
  const present = sql.param([...args.present]);
  const commanders = sql.param([...args.commanders]);
  return sql`
    with pair as (
      select v.variant_id, v.produces, v.popularity
      from ${spellbookVariants} v
      join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
      -- RULE 1: a template-gated variant names a CATEGORY of card, not a card, so no decklist
      -- and no collection can be said to be one card away from it.
      where v.card_count = 2
        and cardinality(v.requires_template_ids) = 0
        -- PRUNE BEFORE THE GROUP, as the shipped reference does. A predicate on a non-grouping
        -- column cannot be pushed through the aggregate, so without this every two-card
        -- variant in the index — 5,031 of them — is grouped on every call and then thrown
        -- away. This runs per page of the collection.
        and exists (select 1 from ${spellbookVariantCards} vc2
                    where vc2.variant_id = v.variant_id
                      and vc2.oracle_id = any(${present}::uuid[]))
        ${
          // With the candidates named, a variant holding none of them yields no row below, so it is
          // pruned here too, before the group: a deck's ~100 cards touch thousands of variants and a
          // single candidate a handful (Find a deck asks about one card, ~160ms → the prune).
          args.missingIn
            ? sql`and exists (select 1 from ${spellbookVariantCards} vc3
                              where vc3.variant_id = v.variant_id
                                and vc3.oracle_id = any(${sql.param([...args.missingIn])}::uuid[]))`
            : sql``
        }
      group by v.variant_id
      -- TWO ROWS, not merely a card_count of 2 — that column keeps upstream's own uses
      -- length while this table is deduped by oracle id, so a variant naming one card twice
      -- would aggregate to a single piece and read as a combo a reader is one card from when
      -- they already hold all of it.
      having count(*) = 2
    )
    select p.variant_id, p.produces, p.popularity,
           held.oracle_id as present_id,
           want.oracle_id as missing_id,
           c.name as missing_name,
           want.must_be_commander as missing_must_be_commander
    from pair p
    join ${spellbookVariantCards} held
      on held.variant_id = p.variant_id
    join ${spellbookVariantCards} want
      on want.variant_id = p.variant_id and want.oracle_id <> held.oracle_id
    join cards c on c.oracle_id = want.oracle_id
    -- RULE 2 AND RULE 3, on the piece that IS present: a must_be_commander piece counts only
    -- when it is actually a commander, and the commanders count as held.
    where (case when held.must_be_commander
                then held.oracle_id = any(${commanders}::uuid[])
                else held.oracle_id = any(${present}::uuid[]) end)
      -- The other piece is NOT present. Checked against the same list rather than against the
      -- deck's rows alone, or a combo whose second piece is the commander reads as a near miss.
      and not (want.oracle_id = any(${present}::uuid[]))
      ${
        args.missingIn
          ? sql`and want.oracle_id = any(${sql.param([...args.missingIn])}::uuid[])`
          : sql``
      }
  `;
}

/**
 * Shapes rows into one partner per card, applying the two rules a query cannot.
 *
 * WHAT IT PRODUCES DECIDES, never the card count. A two-card variant producing "infinite
 * squirrels" is a two-card variant; `isInfiniteOrGameEnding` is what says whether this system
 * counts it, and 703 of 3,842 sampled two-card variants produce something it does not.
 *
 * ONE PARTNER PER CARD. The surfaces this feeds draw a single inline clause — the glyph and
 * one partner's name — and naming one partner is true whether or not there are others, which is why no
 * count may ever appear beside it. The one chosen is the most popular, with `variantId` as the
 * tail so the choice cannot move between two reads of an unchanged collection.
 */
export function bestPartnerPerCard(rows: PairRow[]): Map<string, ComboPartner> {
  const best = new Map<string, ComboPartner>();
  const partnersSeen = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!isInfiniteOrGameEnding(r.produces)) continue;
    const candidate: ComboPartner = {
      oracleId: r.present_id,
      partnerOracleId: r.missing_id,
      partnerName: r.missing_name,
      popularity: r.popularity,
      variantId: r.variant_id,
    };
    const held = best.get(r.present_id);
    if (!held || morePopular(candidate, held)) best.set(r.present_id, candidate);
    // Every DISTINCT partner seen for this card, so the marker can say how many the tooltip is
    // not naming. Counted on partner id rather than on rows: a pair recorded in two variants is
    // one partner, and counting rows would inflate it.
    const seen = partnersSeen.get(r.present_id) ?? new Set<string>();
    seen.add(r.missing_id);
    partnersSeen.set(r.present_id, seen);
  }
  for (const [id, chosen] of best) {
    chosen.otherPartners = Math.max(0, (partnersSeen.get(id)?.size ?? 1) - 1);
  }
  return best;
}

/**
 * Most popular first; nulls last; `variantId` breaks the rest. A TOTAL order, so the choice is
 * stable across reloads — which is Design's only stated requirement of the tiebreak.
 *
 * Structurally typed on the two fields it reads rather than on `ComboPartner`, because the
 * modal's own partner shape carries a `state` the clause readers have no use for and shares
 * only the ordering question.
 */
function morePopular(
  a: { popularity: number | null; variantId: string },
  b: { popularity: number | null; variantId: string },
): boolean {
  const ap = a.popularity ?? -1;
  const bp = b.popularity ?? -1;
  if (ap !== bp) return ap > bp;
  return a.variantId < b.variantId;
}

/**
 * RULE 2, ON THE CANDIDATE, AND IT MUST RUN BEFORE THE FLIP.
 *
 * In the query the reader HAS `present` and LACKS `want`, so `want.must_be_commander` says
 * whether the candidate completes this combo only from the command zone — in which case adding
 * it to the 99 completes nothing, and a clause naming X on that row is the false positive this
 * design cannot survive.
 *
 * `loadCompletionPartners` then FLIPS which piece is called "missing", because the row on
 * screen is the candidate and the card being named is the one already in the deck. A filter
 * applied after that flip reads the other card's flag: the first version did exactly that and
 * the rule silently did nothing.
 *
 * Its own function, and exported, because the version that lived inline was covered by no test
 * — the suite exercised a `requireCastable` flag on `bestPartnerPerCard` that no production
 * caller ever passed, so replacing the real filter with `rows` left every case green.
 */
export function castableCandidates(rows: readonly PairRow[]): PairRow[] {
  return rows.filter((r) => !r.missing_must_be_commander);
}

/**
 * States 2 and 3 — the candidate completes a combo whose other half is already in this deck.
 *
 * Keyed by the CANDIDATE's oracle id, which is the row the clause is drawn on. The two states
 * differ only by whether the reader owns that candidate, which every host already draws with
 * the shipped `OwnershipDot` and `BuyTag`; nothing here needs to know.
 *
 * `candidateOracleIds: null` asks for EVERY card that would complete something for this deck,
 * rather than the few on screen. The expensive half of the query is driven by `present` alone
 * — the `exists` prune and the `group by` walk the index from the deck's side — and the
 * candidate list is a post-filter on rows that have already been produced. So a caller that
 * cannot name its candidates up front, because they arrive a keystroke at a time, pays the
 * same read ONCE and answers each keystroke from the map instead of asking again.
 *
 * Measured on staging, the whole-deck map is 4 to 114 entries across 20 decks, median 26 —
 * counted before `isInfiniteOrGameEnding` and rule 2 cut it further, so that is an upper
 * bound. It is a map to hold in memory, not a list to page.
 */
export async function loadCompletionPartners(args: {
  deckOracleIds: readonly string[];
  commanderOracleIds: readonly string[];
  /** The candidates on screen, or `null` for every completion this deck has. */
  candidateOracleIds: readonly string[] | null;
  /**
   * Names the caller already holds for the deck's cards and commanders (Find a deck reads them with the
   * list), so naming the partner costs no round trip. Any id missing from it is still read.
   */
  knownNames?: ReadonlyMap<string, string>;
}): Promise<Map<string, ComboPartner>> {
  const present = [...new Set([...args.deckOracleIds, ...args.commanderOracleIds])];
  // A null candidate list is "every card", which is the opposite of an empty one. Spelled out
  // rather than folded into a truthiness check, because `[]` must still return nothing: a
  // caller that asked about no cards is owed no answers, and reading `[]` as "all" would have
  // the page-level path quietly widen to the whole deck the first time a list came back empty.
  if (present.length === 0) return new Map();
  if (args.candidateOracleIds !== null && args.candidateOracleIds.length === 0) return new Map();

  const rows = (await db.execute(
    pairsWithOnePiece({
      present,
      commanders: args.commanderOracleIds,
      missingIn: args.candidateOracleIds,  // null widens to every completion — see above.
    }),
  )).rows as PairRow[];

  // RULE 2, ON THE CANDIDATE, AND BEFORE THE FLIP BELOW. See `castableCandidates`.
  const castable = castableCandidates(rows);

  // NOW FLIP. The row on screen is the CANDIDATE and the card being NAMED is the one already
  // in the deck, which is the opposite of how the query reads: there, what the reader has is
  // `present` and what they lack is `want`.
  const known = args.knownNames ?? new Map<string, string>();
  const read = await nameMap(castable.map((r) => r.present_id).filter((id) => !known.has(id)));
  const names = new Map([...known, ...read]);
  const relabelled: PairRow[] = castable.map((r) => ({
    ...r,
    present_id: r.missing_id,
    missing_id: r.present_id,
    missing_name: names.get(r.present_id) ?? r.present_id,
    // Already answered above, for the card the flag belongs to. False here rather than carried
    // across, because after the flip this field describes the piece in the DECK and rule 2 was
    // applied to that piece by the query.
    missing_must_be_commander: false,
  }));
  return bestPartnerPerCard(relabelled);
}

async function nameMap(oracleIds: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(oracleIds)];
  if (unique.length === 0) return new Map();
  const rows = (await db.execute(
    sql`select oracle_id, name from cards where oracle_id = any(${sql.param(unique)}::uuid[])`,
  )).rows as { oracle_id: string; name: string }[];
  return new Map(rows.map((r) => [r.oracle_id, r.name]));
}

/**
 * STATE 1 — both halves owned, and no deck has put them together.
 *
 * Collection-scoped, so it needs none of the deck plumbing states 2 and 3 do: it can ship
 * alone, and does. The clause it feeds reads `with {partner} — you own both`.
 *
 * "UNASSEMBLED" IS ENFORCED HERE, and it is the half the design's own population figure did
 * not measure. The state is named *both halves owned, unassembled* while the 77 behind it was
 * counted on ownership alone; on the reference collection 10 of those 77 are combos a deck has
 * already built. Telling a reader they own both halves of a combo they finished last month is
 * the one way this clause can be uninteresting, so those are dropped and the figure is 67.
 *
 * Rule 2 is deliberately NOT applied to the missing piece here, because nothing is missing:
 * the claim is about owning two cards, not about assembling them. A piece that only works from
 * the command zone is still a card the reader owns, and the pair is still real for the deck
 * they would build around it.
 */
/**
 * STATE 1's query, extracted so its emitted SQL can be rendered without a database.
 *
 * Its sibling `pairsWithOnePiece` is pinned that way already, and the invariants here fail
 * the same silent way: a dropped `::uuid[]` is a runtime type error on one deployment, and a
 * prune that stops pruning still returns exactly the right rows, slowly.
 *
 * `oracleIds` null means the whole collection, which is what `/collection` asks for.
 */
export function ownBothQuery(userIdValue: string, oracleIds: readonly string[] | null) {
  const scoped = oracleIds != null;
  const ids = sql.param([...(oracleIds ?? [])]);
  const userId = sql.param(userIdValue);
  return sql`
    with owned as (
      select distinct oracle_id from collection_items where user_id = ${userId}
    ),
    pair as (
      select v.variant_id, v.produces, v.popularity
      from ${spellbookVariants} v
      join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
      where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
        -- Pruned before the group for the same reason as the deck read: a predicate on a
        -- non-grouping column cannot reach through the aggregate. Against the COLLECTION
        -- rather than the id window, so the prune is the same set-based test whether or not
        -- a window was given.
        and exists (select 1 from ${spellbookVariantCards} vc2
                    where vc2.variant_id = v.variant_id
                      and vc2.oracle_id in (select oracle_id from owned))
      group by v.variant_id
      having count(*) = 2
    )
    select p.variant_id, p.produces, p.popularity,
           a.oracle_id as present_id,
           b.oracle_id as missing_id,
           c.name as missing_name,
           false as missing_must_be_commander
    from pair p
    join ${spellbookVariantCards} a on a.variant_id = p.variant_id
    join ${spellbookVariantCards} b
      on b.variant_id = p.variant_id and b.oracle_id <> a.oracle_id
    join cards c on c.oracle_id = b.oracle_id
    where a.oracle_id in (select oracle_id from owned)
      ${scoped ? sql`and a.oracle_id = any(${ids}::uuid[])` : sql``}
      and b.oracle_id in (select oracle_id from owned)
      -- UNASSEMBLED — no SINGLE deck of this player's holds both pieces.
      --
      -- Both halves, in the same deck, or the clause means nothing: a reader owning two cards
      -- that sit in two different decks has not built that combo, and that is exactly the
      -- state worth telling them about. The commanders count as held, because a combo led by
      -- one of its own halves is as assembled as any other — which is also why this cannot be
      -- a join on deck_cards alone.
      and not exists (
        select 1 from decks d
        where d.user_id = ${userId}
          and (exists (select 1 from deck_cards dc
                       where dc.deck_id = d.id and dc.oracle_id = a.oracle_id)
               or d.commander_oracle_id = a.oracle_id
               or d.partner_oracle_id = a.oracle_id)
          and (exists (select 1 from deck_cards dc
                       where dc.deck_id = d.id and dc.oracle_id = b.oracle_id)
               or d.commander_oracle_id = b.oracle_id
               or d.partner_oracle_id = b.oracle_id)
      )
  `;
}

export async function loadOwnBothPartners(args: {
  userId: string;
  /**
   * The cards to answer about. OMIT IT for the whole collection, which is what `/collection`
   * does: that surface ships every card in one payload and windows client-side, so there is no
   * server page to scope to and any card can scroll into view.
   *
   * Omitting is also FASTER than passing every id, which is the opposite of what it looks
   * like: the ids then arrive as a 2,805-element array parameter that every row is matched
   * against, where the unscoped form joins `owned` to itself as a set. Measured on staging
   * over a 2,805-card collection, same 65 answers both ways: **492ms unscoped, 913ms** with
   * every id passed.
   */
  oracleIds?: readonly string[];
}): Promise<Map<string, ComboPartner>> {
  if (args.oracleIds?.length === 0) return new Map();

  const rows = (await db.execute(
    ownBothQuery(args.userId, args.oracleIds ?? null),
  )).rows as PairRow[];

  return bestPartnerPerCard(rows);
}

/** One partner in the card modal's block, with the state the reader is shown. */
export type ModalComboPartner = {
  oracleId: string;
  name: string;
  state: "inDeck" | "owned" | "notOwned";
  popularity: number | null;
};

/**
 * EVERY two-card combo partner of ONE card, for the modal's block.
 *
 * The three clause readers above answer "is this card one away", which is a question about a
 * LIST. This answers "what does this card pair with", which is a question about a CARD — so it
 * keeps every partner rather than choosing the most popular one, and it is the only reader in
 * this module that enumerates.
 *
 * RULE 2 IS NOT APPLIED. The block is a receipt about pairs that exist, not a claim that
 * adding a card assembles one: a piece that works only from the command zone is still half of
 * a real combo, and the reader may be looking at it precisely because they are choosing a
 * commander. `completes` is the word that presupposes assembly, and the block never says it.
 *
 * `deckOracleIds` is OPTIONAL and is what makes `in this deck` sayable. Opened from
 * `/collection` there is no deck in scope, that state has no referent, and the block says so
 * by drawing the other two states only — which is why the scope line exists.
 */
export async function loadCardComboPartners(args: {
  userId: string;
  oracleId: string;
  /** The deck the modal was opened from, if any. Its commanders count as held (§4.3b rule 3). */
  deckOracleIds?: readonly string[];
}): Promise<ModalComboPartner[]> {
  const rows = (await db.execute(sql`
    with pair as (
      select v.variant_id, v.produces, v.popularity
      from ${spellbookVariants} v
      join ${spellbookVariantCards} vc on vc.variant_id = v.variant_id
      where v.card_count = 2
        and cardinality(v.requires_template_ids) = 0
        -- Pruned before the group, as every read in this module is: a predicate on a
        -- non-grouping column cannot reach through the aggregate.
        and exists (select 1 from ${spellbookVariantCards} vc2
                    where vc2.variant_id = v.variant_id
                      and vc2.oracle_id = ${sql.param(args.oracleId)}::uuid)
      group by v.variant_id
      having count(*) = 2
    )
    select p.variant_id, p.produces, p.popularity,
           other.oracle_id as partner_id,
           c.name as partner_name,
           -- EXISTS, not count(*). Only the boolean is read, and this scalar is evaluated
           -- once per qualifying VARIANT — before the map below collapses the several
           -- variants a pair can have — so a count scans every holding of that card again
           -- for each one, where an existence test stops at the first row.
           exists (select 1 from collection_items ci
                   where ci.user_id = ${sql.param(args.userId)}
                     and ci.oracle_id = other.oracle_id) as owned
    from pair p
    join ${spellbookVariantCards} self
      on self.variant_id = p.variant_id and self.oracle_id = ${sql.param(args.oracleId)}::uuid
    join ${spellbookVariantCards} other
      on other.variant_id = p.variant_id and other.oracle_id <> self.oracle_id
    join cards c on c.oracle_id = other.oracle_id
  `)).rows as {
    variant_id: string; produces: string[]; popularity: number | null;
    partner_id: string; partner_name: string; owned: boolean;
  }[];

  const inDeck = new Set(args.deckOracleIds ?? []);
  const best = new Map<string, ModalComboPartner & { variantId: string }>();
  for (const r of rows) {
    if (!isInfiniteOrGameEnding(r.produces)) continue;
    const candidate = {
      oracleId: r.partner_id,
      name: r.partner_name,
      state: inDeck.has(r.partner_id)
        ? ("inDeck" as const)
        : r.owned
          ? ("owned" as const)
          : ("notOwned" as const),
      popularity: r.popularity,
      variantId: r.variant_id,
    };
    // ONE LINE PER PARTNER, not per variant: two cards can pair in more than one recorded way,
    // and the block names a CARD rather than a combo. The most popular variant decides the
    // line's order, which is why the losing one is dropped rather than summed.
    const held = best.get(r.partner_id);
    if (!held || morePopular(candidate, held)) best.set(r.partner_id, candidate);
  }
  return [...best.values()].map(({ variantId: _v, ...p }) => p);
}
