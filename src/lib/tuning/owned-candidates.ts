import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db";
import { cardLabels, cards, collectionItems, commanderSupportCards } from "../../db/schema";
import { cardFacet, castFaceText } from "../cards/facet";
import { freshJobsOf } from "../labels/read";
import type { Job } from "../labels/types";
import { classifyRoles } from "../recs/roles";
import { landColors, type Color } from "../swaps/land";
import { loadAvailability } from "../decks/availability-query";
import { priceOf, priceState } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import { printedIn } from "../sets/printed-in-sql";
import { OWNED_OFF_INDEX_MAX, OWNED_SHORTLIST_MAX, ownedCopyOffered, spareBeforeHeld, tieClosed } from "./limits";

/**
 * The cards the player owns that this deck could take, for a run whose "owned only" limit is set.
 *
 * WHY THE MODEL IS SHOWN THEM. `limitsRules` told the model "every suggested add must be a card
 * the player already owns" and showed it nothing about what the player owns (ownership is kept out
 * of the pack so it cannot sway a ranking), so it guessed, and the validator dropped every guess
 * (`notOwned`): Soldiers on staging asked for five adds and kept none. Owned-only is the player's
 * OWN rule, not a per-card fact leaking in to bias a choice, so the model is handed the list the
 * rule selects from. With the limit off nothing here runs and ownership still reaches the model
 * nowhere (`suggestionRules.ownershipNotRanking`).
 *
 * WHAT QUALIFIES, in the order the validator would check it: on a commander index row for these
 * commanders, owned, commander-legal, inside the colour identity, not already in the deck, not a
 * basic land, a copy FREE of every other deck (the same "sleeveable" rule `resolveAnswer` applies,
 * or a card listed here would be dropped as `notOwned` after the model chose it), printed in a
 * selected set, and under the price cap (a card with no usable price passes, as in the validator).
 *
 * RANKED by the commander index's inclusion for the commander, which is a fact about the CARD in
 * decks like this one and says nothing about who owns it. A partner pair reads both commanders'
 * lists, the larger inclusion of the two for a card on both.
 */
export type OwnedCandidate = { oracleId: string; name: string; typeLine: string };

/** Most names sent (`limits.ts`, where the pure engine reads it too). */
export { OWNED_OFF_INDEX_MAX, OWNED_SHORTLIST_MAX } from "./limits";

/** Rows per page, and the most pages read: 2,000 ranked owned cards is deeper than any commander's index list that a collection overlaps. */
const PAGE = 200;
const MAX_PAGES = 10;

type OwnedCandidateArgs = {
  userId: string;
  deckId: string;
  commanderOracleIds: readonly string[];
  colorIdentity: readonly string[];
  inDeck: ReadonlySet<string>;
  limits: { capCents: number | null; sets: readonly string[]; otherDecks?: boolean };
  max?: number;
  /** The reader's resolved switches (`requestSwitchEnv`), for the claim model's `locked` key and
   *  pending clause; a probe, with no signed-in reader, passes `process.env`. */
  env: NodeJS.ProcessEnv;
};

/** The shortlist alone, for a run that never asks whether it is the whole pool (v10). */
export async function loadOwnedCandidates(args: OwnedCandidateArgs): Promise<OwnedCandidate[]> {
  return (await readOwnedCandidates(args)).cards;
}

/**
 * The shortlist and whether it is COMPLETE: every owned card that qualifies is on it. It is not when it reached `max`
 * (the top of a longer list) or when the read stopped at `MAX_PAGES` with ranked rows still unread (the cards after them
 * were never tested). Only a complete list lets a v2 run call its owned pool spent (`v2/engine.ts` `poolExhausted`).
 */
export async function readOwnedCandidates(args: OwnedCandidateArgs): Promise<{ cards: OwnedCandidate[]; complete: boolean }> {
  const { userId, deckId, commanderOracleIds, colorIdentity, inDeck, limits } = args;
  const max = args.max ?? OWNED_SHORTLIST_MAX;
  if (commanderOracleIds.length === 0) return { cards: [], complete: true };

  const capCents = limits.capCents;
  // Every row that passes, in rank order, with whether its copy is held in another deck. Read until the max-th card's
  // tie group is closed (`tieClosed`), so `spareBeforeHeld` sees the whole group a spare copy could still move up in.
  const pool: { r: { oracleId: string; name: string; typeLine: string; inclusion: number | null }; held: boolean }[] = [];
  const sameRank = (a: (typeof pool)[number], b: (typeof pool)[number]) => Number(a.r.inclusion ?? 0) === Number(b.r.inclusion ?? 0);
  // Ranked rows are read a page at a time until the shortlist is full or the index is exhausted. The
  // free-copy and price tests need the other tables' reads, so they cannot sit in this query; a single
  // fixed read-ahead would let a collection whose top-ranked cards are claimed elsewhere (or over the
  // cap) come back empty, and an empty list sends the run to cards to buy while the player owns fits.
  // Whether the ranked rows ran out: a short page, or an empty one, is the end of the index.
  let rowsRanOut = false;
  for (let page = 0; page < MAX_PAGES && !tieClosed(pool, max, sameRank); page++) {
    const rows = await db
      .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, inclusion: sql<number | null>`max(${commanderSupportCards.inclusion})::float8` })
      .from(commanderSupportCards)
      .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
      .where(and(
        inArray(commanderSupportCards.commanderOracleId, [...commanderOracleIds]),
        eq(cards.commanderLegal, true),
        // `isBasicLand`'s own word test (grouping.ts): "Basic Snow Land" is a basic too.
        sql`${cards.typeLine} !~ '\\yBasic\\y'`,
        // The identity, the deck and the set limit are filtered in the query, before the page cut.
        sql`${cards.colorIdentity} <@ ${sql.param([...colorIdentity])}::text[]`,
        ...(inDeck.size > 0 ? [sql`${cards.oracleId} <> all(${sql.param([...inDeck])}::uuid[])`] : []),
        sql`${printedIn(cards.oracleId, limits.sets)}`,
        // Catalog names are not unique (`resolve-names.ts`), and the model answers by NAME: a name two
        // oracle cards share resolves to neither and drops as `cardExists`, so it is not offered.
        sql`not exists (select 1 from ${cards} twin where twin.name = ${cards.name} and twin.oracle_id <> ${cards.oracleId})`,
        sql`exists (select 1 from ${collectionItems} ci where ci.user_id = ${userId} and ci.oracle_id = ${cards.oracleId})`,
      ))
      .groupBy(cards.oracleId)
      // The name breaks ties, so a page boundary never repeats or skips a card.
      .orderBy(sql`max(${commanderSupportCards.inclusion}) desc nulls last`, cards.name)
      .limit(PAGE)
      .offset(page * PAGE);
    if (rows.length === 0) { rowsRanOut = true; break; }

    const ids = rows.map((r) => r.oracleId);
    const [availability, priced] = await Promise.all([
      loadAvailability(userId, { oracleIds: ids, excludeDeckId: deckId, env: args.env }),
      capCents === null ? null : loadPrices(ids),
    ]);
    const passing = rows.filter((r) => {
      if (!ownedCopyOffered(availability.get(r.oracleId)?.free, limits)) return false;
      if (priced !== null && capCents !== null) {
        const fact = priced.prices.get(r.oracleId) ?? null;
        const cents = fact ? priceOf(fact, priceState(fact, priced.newestAsOf)) : null;
        if (cents !== null && cents > capCents) return false;
      }
      return true;
    });
    for (const r of passing) pool.push({ r, held: (availability.get(r.oracleId)?.free ?? 1) <= 0 });
    if (rows.length < PAGE) { rowsRanOut = true; break; }
  }
  const out = spareBeforeHeld(pool, sameRank, (p) => p.held).slice(0, max).map(({ r }) => ({ oracleId: r.oracleId, name: r.name, typeLine: r.typeLine }));
  return { cards: out, complete: rowsRanOut && out.length < max };
}

type Reader = Pick<typeof db, "select">;

/**
 * THE SECOND TIER: owned cards that fit the deck's colors but sit on no row of this commander's index (Suggested changes
 * v2, prompt v12). The index tier above reads only the commander's own EDHREC list, so a collection rich in cards that
 * list lacks offered the model a handful, and an owned-only run came back short while the player owned fits.
 *
 * WHAT QUALIFIES is the index tier's rule less the index: owned, a copy FREE of every other deck (`loadAvailability`),
 * commander-legal, inside the colour identity, not in the deck, not one of the deck's commanders (named apart: a commander
 * need not sit in `deck_cards`), not a basic land, a name no other card shares, printed in a selected set, under the
 * cap, and on NO row of these commanders' index.
 *
 * RANKED BY NEIGHBOUR COMMANDERS, facts about the card and never about who owns it. The neighbours are the
 * `NEIGHBOUR_COMMANDERS` commanders inside the deck's identity (its own excluded) whose index lists share the most cards
 * with the deck as it stands (`neighbourQuery`). A candidate scores its summed inclusion on those lists; ties go to its
 * summed inclusion on every list inside the identity, then to the name (`rankOffIndex`). A card scoring nothing on both
 * is no evidence-backed fit and is not offered.
 *
 * AND ONLY A CARD THAT DOES A JOB (`offIndexWorthOffering`). A paid eval on an Elves deck offered Omnipresence, Lure,
 * Aggressive Urge, Mithril Coat, Moment's Peace and four colorless or mono-green utility lands: cards some neighbour
 * commander runs, but filler beside the index tier. The rule is read off the card's labels, see the predicate.
 */
export type OffIndexArgs = {
  userId: string;
  deckId: string;
  commanderOracleIds: readonly string[];
  colorIdentity: readonly string[];
  inDeck: ReadonlySet<string>;
  limits: { capCents: number | null; sets: readonly string[]; otherDecks?: boolean };
  /** Cards already offered by an earlier tier (the index cards and the focus candidates), never offered twice. */
  exclude?: ReadonlySet<string>;
  /** The room this tier fills: at most `OWNED_OFF_INDEX_MAX`, and what is left under `OWNED_SHORTLIST_MAX`. */
  max?: number;
  env: NodeJS.ProcessEnv;
};

/** How many neighbour commanders rank the second tier. */
export const NEIGHBOUR_COMMANDERS = 20;

/** The neighbour commanders: inside the identity, not the deck's own, most index rows on the deck's cards first. */
export function neighbourQuery(q: Reader, args: Pick<OffIndexArgs, "commanderOracleIds" | "colorIdentity" | "inDeck">) {
  return q
    .select({ commanderOracleId: commanderSupportCards.commanderOracleId, overlap: sql<number>`count(*)::int` })
    .from(commanderSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.commanderOracleId))
    .where(and(
      sql`${cards.colorIdentity} <@ ${sql.param([...args.colorIdentity])}::text[]`,
      sql`${commanderSupportCards.commanderOracleId} <> all(${sql.param([...args.commanderOracleIds])}::uuid[])`,
      sql`${commanderSupportCards.oracleId} = any(${sql.param([...args.inDeck])}::uuid[])`,
    ))
    .groupBy(commanderSupportCards.commanderOracleId)
    // The id breaks ties, so the same deck always reads the same neighbours.
    .orderBy(sql`count(*) desc`, commanderSupportCards.commanderOracleId)
    .limit(NEIGHBOUR_COMMANDERS);
}

/**
 * Every owned card off the index that passes the catalog filters, with its two ranking sums and its label row. Every
 * correlated subquery aliases its own table and qualifies the outer one (`${cards}.oracle_id`), as AGENTS.md asks of a
 * single-table select: the label join makes this one a join, but the rule is kept so a later edit dropping the join
 * cannot turn `csc.oracle_id = "oracle_id"` into csc compared with itself.
 */
export function offIndexQuery(q: Reader, args: Pick<OffIndexArgs, "userId" | "commanderOracleIds" | "colorIdentity" | "inDeck" | "limits"> & { neighbours: readonly string[] }) {
  const identity = sql.param([...args.colorIdentity]);
  const commanders = sql.param([...args.commanderOracleIds]);
  return q
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      layout: cards.layout,
      manaCost: cards.manaCost,
      keywords: cards.keywords,
      // The label row whole, with the inputs its freshness is judged on (`freshJobsOf`), for `offIndexWorthOffering`.
      labels: cardLabels.labels,
      labelModel: cardLabels.model,
      promptVersion: cardLabels.promptVersion,
      inputHash: cardLabels.inputHash,
      neighbourInclusion: sql<number | null>`(select sum(csc.inclusion)::float8 from ${commanderSupportCards} csc where csc.oracle_id = ${cards}.oracle_id and csc.commander_oracle_id = any(${sql.param([...args.neighbours])}::uuid[]))`,
      identityInclusion: sql<number | null>`(select sum(csc.inclusion)::float8 from ${commanderSupportCards} csc join ${cards} cc on cc.oracle_id = csc.commander_oracle_id where csc.oracle_id = ${cards}.oracle_id and cc.color_identity <@ ${identity}::text[])`,
    })
    .from(cards)
    .leftJoin(cardLabels, eq(cardLabels.oracleId, cards.oracleId))
    .where(and(
      sql`${cards}.commander_legal = true`,
      // `isBasicLand`'s own word test (grouping.ts): "Basic Snow Land" is a basic too.
      sql`${cards}.type_line !~ '\\yBasic\\y'`,
      sql`${cards}.color_identity <@ ${identity}::text[]`,
      ...(args.inDeck.size > 0 ? [sql`${cards}.oracle_id <> all(${sql.param([...args.inDeck])}::uuid[])`] : []),
      sql`${cards}.oracle_id <> all(${commanders}::uuid[])`,
      sql`${printedIn(sql`${cards}.oracle_id`, args.limits.sets)}`,
      sql`not exists (select 1 from ${cards} twin where twin.name = ${cards}.name and twin.oracle_id <> ${cards}.oracle_id)`,
      sql`exists (select 1 from ${collectionItems} ci where ci.user_id = ${args.userId} and ci.oracle_id = ${cards}.oracle_id)`,
      // Off this commander's index: those cards are the first tier's.
      sql`not exists (select 1 from ${commanderSupportCards} csc where csc.oracle_id = ${cards}.oracle_id and csc.commander_oracle_id = any(${commanders}::uuid[]))`,
      // On some list inside the identity, or it would score nothing on both sums (the neighbours sit inside the identity).
      sql`exists (select 1 from ${commanderSupportCards} csc join ${cards} cc on cc.oracle_id = csc.commander_oracle_id where csc.oracle_id = ${cards}.oracle_id and cc.color_identity <@ ${identity}::text[])`,
    ));
}

export type OffIndexRow = { oracleId: string; name: string; neighbourInclusion: number | null; identityInclusion: number | null };

/** The card facts `offIndexWorthOffering` reads: its type line and text, and its FRESH label jobs (null: none usable). */
export type OffIndexFitCard = {
  name: string; typeLine: string; oracleText: string | null; layout: string; keywords: readonly string[]; jobs: readonly Job[] | null;
};

/** The role jobs that make a noncreature, nonland off-index card worth offering whatever the deck. `draw` is not one of
 *  them alone: a one-shot draw is a cantrip as often as a draw spell (Aggressive Urge), so only a repeatable one counts. */
const WORKING_ROLES: ReadonlySet<string> = new Set(["ramp", "removal", "wipes", "tutor", "counterspell"]);

/** The classifier's roles that stand in when a card has no fresh label (its row is stale, malformed or empty). Not
 *  `draw`: the text classifier cannot tell a repeatable draw from a cantrip's one-shot one (Aggressive Urge). */
const TEXT_ROLES: ReadonlySet<string> = new Set(["ramp", "removal", "wipes"]);

/**
 * Whether an owned off-index card is worth a place on the second tier: pure, and nothing about owning.
 *
 * - A CREATURE is (the front face, `cardFacet`): the tier is ranked by the commanders that run it, and a creature is
 *   the body a typal deck counts whatever its labels say. Taunting Elf and Mirkwood Pathmaker carry no label at all.
 * - A LAND is only when it makes two or more of the deck's colors (`landColors`): fixing a basic cannot give. A land
 *   making one color, or none, is a worse basic here, whatever else it does (Urza's Cave, Hidden Nursery, Slippery
 *   Karst, Temple of the False God); a deck's own utility lands come from its index tier.
 * - ANY OTHER CARD is only when it does a deck job: a role label of ramp, removal, a wipe, a tutor or a counterspell, a
 *   REPEATABLE draw, or a typal (`tribal`) theme. Theme-only cards (Omnipresence's free casts, Lure's goad, Mithril
 *   Coat's protection, Moment's Peace's fog) and a cantrip's one-shot draw (Aggressive Urge) are left out. A card with
 *   no fresh label falls back to the text classifier's ramp, removal or wipes, so a stale row is not a refusal.
 */
export function offIndexWorthOffering(card: OffIndexFitCard, colorIdentity: readonly string[]): boolean {
  const facet = cardFacet(card.typeLine);
  if (facet === "creature") return true;
  if (facet === "land") {
    const colors = landColors({ name: card.name, typeLine: card.typeLine, oracleText: card.oracleText });
    return colorIdentity.filter((c) => colors.has(c as Color)).length >= 2;
  }
  if (card.jobs === null) {
    // The cast face's text only (`castFaceText`): a modal card's land back would read as ramp for a front that is not.
    return classifyRoles({ typeLine: card.typeLine, oracleText: castFaceText(card.oracleText, card.layout), keywords: [...card.keywords] }).some((r) => TEXT_ROLES.has(r));
  }
  return card.jobs.some((j) => (j.space === "role" && (WORKING_ROLES.has(j.kind) || (j.kind === "draw" && j.recurrence === "repeatable")))
    || (j.space === "theme" && j.kind === "tribal"));
}

/** A query row's fresh jobs, by the rule every label reader applies (`freshJobsOf`); null with no row or a stale one. */
function jobsOf(r: {
  oracleId: string; name: string; typeLine: string; oracleText: string | null; layout: string; manaCost: string | null;
  labels: unknown; labelModel: string | null; promptVersion: string | null; inputHash: string | null;
}): Job[] | null {
  if (r.labelModel === null || r.promptVersion === null || r.inputHash === null) return null;
  return freshJobsOf({
    oracle_id: r.oracleId, labels: r.labels, model: r.labelModel, prompt_version: r.promptVersion, input_hash: r.inputHash,
    name: r.name, mana_cost: r.manaCost, type_line: r.typeLine, oracle_text: r.oracleText, layout: r.layout,
  });
}

const score = (n: number | null) => (n === null ? 0 : Number(n) || 0);

/** The second tier's order: neighbour inclusion, then identity-wide inclusion, then the name; a card scoring zero on both
 *  is dropped. Pure, and nothing about owning. */
export function rankOffIndex<T extends OffIndexRow>(rows: readonly T[]): T[] {
  return rows
    .filter((r) => score(r.neighbourInclusion) > 0 || score(r.identityInclusion) > 0)
    .sort((a, b) => score(b.neighbourInclusion) - score(a.neighbourInclusion)
      || score(b.identityInclusion) - score(a.identityInclusion)
      || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** The off-index tier alone, for a caller that never asks whether it is the whole tier. */
export async function loadOwnedOffIndex(args: OffIndexArgs, read: Reader = db): Promise<OwnedCandidate[]> {
  return (await readOwnedOffIndex(args, read)).cards;
}

/**
 * The off-index tier and whether it is COMPLETE: every ranked card was tested and the tier stayed under its room, so it
 * holds every owned off-index card that scores and does a job (`offIndexWorthOffering`). A tier that filled its room
 * is the top of a longer list, and one given no room was never read: neither is complete. Only a complete tier lets a v2 run call its owned pool spent.
 */
export async function readOwnedOffIndex(args: OffIndexArgs, read: Reader = db): Promise<{ cards: OwnedCandidate[]; complete: boolean }> {
  const max = Math.min(args.max ?? OWNED_OFF_INDEX_MAX, OWNED_OFF_INDEX_MAX);
  if (max <= 0) return { cards: [], complete: false };
  if (args.commanderOracleIds.length === 0) return { cards: [], complete: true };
  const neighbours = args.inDeck.size > 0 ? (await neighbourQuery(read, args)).map((r) => r.commanderOracleId) : [];
  const exclude = args.exclude ?? new Set<string>();
  const rows = (await offIndexQuery(read, { ...args, neighbours }))
    .filter((r) => !exclude.has(r.oracleId))
    .filter((r) => offIndexWorthOffering({ ...r, jobs: jobsOf(r) }, args.colorIdentity));
  const ranked = rankOffIndex(rows);

  const capCents = args.limits.capCents;
  // As the index tier does: every passing card with whether it is held, read until the max-th card's tie group closes.
  const pool: { r: (typeof ranked)[number]; held: boolean }[] = [];
  const sameRank = (a: (typeof pool)[number], b: (typeof pool)[number]) =>
    score(a.r.neighbourInclusion) === score(b.r.neighbourInclusion) && score(a.r.identityInclusion) === score(b.r.identityInclusion);
  // As the focus candidates do: the free-copy and price tests need other tables' reads, so they run over the ranked list
  // a slice at a time until the tier is full, and a top slice claimed elsewhere never leaves it short.
  const SLICE = max * 3;
  for (let at = 0; at < ranked.length && !tieClosed(pool, max, sameRank); at += SLICE) {
    const slice = ranked.slice(at, at + SLICE);
    const ids = slice.map((r) => r.oracleId);
    const [availability, priced] = await Promise.all([
      loadAvailability(args.userId, { oracleIds: ids, excludeDeckId: args.deckId, env: args.env }),
      capCents === null ? null : loadPrices(ids),
    ]);
    const passing = slice.filter((r) => {
      if (!ownedCopyOffered(availability.get(r.oracleId)?.free, args.limits)) return false;
      if (priced !== null && capCents !== null) {
        const fact = priced.prices.get(r.oracleId) ?? null;
        const cents = fact ? priceOf(fact, priceState(fact, priced.newestAsOf)) : null;
        if (cents !== null && cents > capCents) return false;
      }
      return true;
    });
    for (const r of passing) pool.push({ r, held: (availability.get(r.oracleId)?.free ?? 1) <= 0 });
  }
  const out = spareBeforeHeld(pool, sameRank, (p) => p.held).slice(0, max).map(({ r }) => ({ oracleId: r.oracleId, name: r.name, typeLine: r.typeLine }));
  return { cards: out, complete: out.length < max };
}
