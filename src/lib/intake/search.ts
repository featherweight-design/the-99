import { sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { loadBracketFlags } from "../bracket/flags-read";
import { hardDecks } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { notBuiltBy } from "../decks/built";
import { isBasicLand } from "../decks/grouping";
import { loadPrices } from "../discovery/price";
import type { EdhrecTag } from "../edhrec/parse";
import { printedIn } from "../sets/printed-in";
import { loadCommanderPrintings } from "../sets/printed-in-read";
import { isInfiniteOrGameEnding, producesInfiniteTurns } from "../spellbook/combo-features";
import { buysCard, buysCopy } from "./buys-card";
import { buildPhraseIndex, type PhraseIndex } from "./match";
import { rankCandidates, type Answers, type Candidate, type CardFacts, type SearchResult, type Tribes } from "./rank";
import { themeVocabulary, tribesFor, type VocabularyTheme } from "./vocabulary";

/**
 * Help me choose's reads: every fact `rankCandidates` rules on, gathered here and nowhere else.
 * The rules themselves are pure and live in `rank.ts`; this module's SQL is what
 * `probe:help-me-choose-search` proves against a real database.
 *
 * THE CANDIDATES are single commanders (ruling 10: `commander_support` holds no pairs) that are
 * commander-legal, indexed (`synergy_state = 'ok'`), and not yet built by this player
 * (`notBuiltBy`). Owned and unowned commanders are listed together (ruling 5), which is why this is
 * not `discoverCandidates`: that one excludes what the player owns.
 */

/** Every theme with enough commanders behind it to offer (see `vocabulary.ts`). */
export async function loadThemeVocabulary(): Promise<VocabularyTheme[]> {
  const rows = (await db.execute(sql`
    select cs.deck_count, cs.tags from commander_support cs where cs.synergy_state = 'ok'
  `)).rows as { deck_count: number | null; tags: EdhrecTag[] }[];
  return themeVocabulary(rows.map((r) => ({ deckCount: r.deck_count, tags: r.tags })));
}

/**
 * The vocabulary and the phrase index, read once per server instance and kept while the catalog
 * generation holds, for at most `CATALOG_MEMO_MS`. The index reads every commander-legal card
 * name (about 30,000), which no submit should pay for, and it is too large for Next's data cache
 * (2 MB an entry). A catalog refresh moves the generation; the commander index, which the
 * vocabulary also reads, moves monthly and is caught by the window.
 */
const CATALOG_MEMO_MS = 10 * 60 * 1000;
type CatalogMemo = {
  generation: string;
  at: number;
  themes: Promise<VocabularyTheme[]>;
  /** Built on first ask, from the same themes: a page that needs only the labels never pays for it. */
  index: Promise<PhraseIndex> | null;
};
let memo: (CatalogMemo & { ticket: number }) | null = null;
/** Counts reads in the order they START, which a clock cannot: two in one millisecond tie. */
let tickets = 0;

async function catalogMemo(now: number): Promise<CatalogMemo> {
  const ticket = ++tickets;
  const generation = await catalogGeneration();
  if (memo && memo.generation === generation && now - memo.at < CATALOG_MEMO_MS) return memo;
  const entry = { generation, at: now, ticket, themes: loadThemeVocabulary(), index: null };
  // A read that started earlier never replaces one that started later: around a catalog refresh
  // an old-generation read can finish last, and must not roll the memo back to it. Ordered by
  // the ticket taken before the await, never by `now`, which two reads can share.
  if (memo && memo.ticket > ticket) return entry;
  memo = entry;
  // A failed read is not kept: the next request tries again.
  entry.themes.catch(() => { if (memo === entry) memo = null; });
  return entry;
}

/** The theme vocabulary alone, from the same memo: what a page drawing labels needs. */
export async function loadIntakeThemes(now: number = Date.now()): Promise<VocabularyTheme[]> {
  return (await catalogMemo(now)).themes;
}

export async function loadIntakeCatalog(now: number = Date.now()): Promise<{ themes: VocabularyTheme[]; index: PhraseIndex }> {
  const entry = await catalogMemo(now);
  const themes = await entry.themes;
  if (!entry.index) {
    const index = loadPhraseIndex(themes);
    entry.index = index;
    index.catch(() => { if (entry.index === index) entry.index = null; });
  }
  return { themes, index: await entry.index };
}

/**
 * The free match's index: the theme vocabulary and every COMMANDER-LEGAL card's name. A card the
 * format bans could never be placed in the deck (`validateCardForDeck` refuses it), so it is not a
 * build-around card either. Basic lands are left out through the repository's own rule,
 * `isBasicLand`, which takes a snow basic too: no player means a build-around Forest.
 *
 * And every set that printed a commander (the lanes' `Printed in` index), for the Sets answer: a
 * set with none could only ever find nothing.
 */
export async function loadPhraseIndex(themes: readonly VocabularyTheme[]): Promise<PhraseIndex> {
  const [cards, printings] = await Promise.all([
    db.execute(sql`
      select c.oracle_id, c.name, c.type_line from cards c where c.commander_legal
    `).then((r) => r.rows as { oracle_id: string; name: string; type_line: string }[]),
    // The sets are one answer among many: a failed read matches no set rather than every submit.
    loadCommanderPrintings().catch(() => ({ sets: [] })),
  ]);
  return buildPhraseIndex(themes, cards
    .filter((c) => !isBasicLand(c.type_line))
    .map((c) => ({ oracleId: c.oracle_id, name: c.name })), printings.sets);
}

/** The search, with the build-around card's own facts for its chip (owned, price, flags). */
export type SearchOutcome = SearchResult & { card: CardFacts | null };

export async function searchCommanders(userId: string, asked: Answers): Promise<SearchOutcome> {
  const facts = await loadSearchFacts(userId, asked);
  return { ...rankCandidates(facts.candidates, facts.answers, facts.card, facts.tribes), card: facts.card };
}

/** What the search ranks, gathered: the answers it actually runs, the candidates, the card, the tribes. */
export type SearchFacts = { answers: Answers; candidates: Candidate[]; card: CardFacts | null; tribes: Tribes };

/** Exported so `measure-intake-tribes` ranks exactly what the search does, twice, from one read. */
export async function loadSearchFacts(userId: string, asked: Answers): Promise<SearchFacts> {
  // The card is resolved FIRST. A card id that parses but names no card any more (a stale link), or
  // one the intake could never have offered (a basic, a banned card), is dropped, as every invalid
  // answer is, and the search then runs as if no card were asked: every read below, the owned
  // order's support counts included, is decided on the answers it actually runs.
  const cardRow = asked.card === null ? null : await loadCardRow(userId, asked.card);
  const card = cardRow === null ? null : asked.card;
  const answers: Answers = { ...asked, card };
  // Owned support is the no-theme order's only input, and it is the dearest figure here: a count
  // over every commander's support list. It is read only when that order is the one in use.
  const needOwnedSupport = answers.themes.length === 0 && card === null;

  const rows = (await db.execute(sql`
    select cs.commander_oracle_id as id, c.name, c.color_identity, c.type_line, cs.deck_count, c.game_changer,
      coalesce((select jsonb_agg(t) from jsonb_array_elements(cs.tags) t
                where t->>'slug' = any(${sql.param(answers.themes)}::text[])), '[]'::jsonb) as tags,
      exists (select 1 from collection_items ci
              where ci.user_id = ${userId} and ci.oracle_id = cs.commander_oracle_id) as owned,
      ${printedIn(sql`cs.commander_oracle_id`, answers.sets ?? [])} as in_sets,
      ${card === null ? sql`null::real` : sql`(
        select csc.inclusion from commander_support_cards csc
        where csc.commander_oracle_id = cs.commander_oracle_id and csc.oracle_id = ${card}::uuid)`} as card_inclusion,
      ${needOwnedSupport ? sql`(
        select count(*) from commander_support_cards csc
        join cards sc on sc.oracle_id = csc.oracle_id
        where csc.commander_oracle_id = cs.commander_oracle_id
          -- commanderPool's two rules: inside the commander's identity, and not the commander.
          and sc.color_identity <@ c.color_identity and csc.oracle_id <> cs.commander_oracle_id
          and exists (select 1 from collection_items ci
                      where ci.user_id = ${userId} and ci.oracle_id = csc.oracle_id))::int` : sql`0`} as owned_support,
      ${needOwnedSupport ? sql`(
        select count(*) from commander_support_cards csc
        join cards sc on sc.oracle_id = csc.oracle_id
        where csc.commander_oracle_id = cs.commander_oracle_id
          and sc.color_identity <@ c.color_identity and csc.oracle_id <> cs.commander_oracle_id)::int` : sql`0`} as support_total
    from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    where ${isCandidate(userId)}
  `)).rows as {
    id: string; name: string; color_identity: string[]; type_line: string | null; deck_count: number | null; game_changer: boolean;
    tags: EdhrecTag[]; owned: boolean; in_sets: boolean; card_inclusion: number | null; owned_support: number; support_total: number;
  }[];

  const ids = rows.map((r) => r.id);
  const lookup = card === null ? ids : [...ids, card];
  const [flags, prices, combos] = await Promise.all([
    loadBracketFlags(lookup),
    loadPrices(lookup),
    card === null ? Promise.resolve(new Map<string, { combos: number; loops: number }>()) : loadCombosWith(card),
  ]);

  const candidates: Candidate[] = rows.map((r) => ({
    oracleId: r.id,
    name: r.name,
    colorIdentity: r.color_identity,
    typeLine: r.type_line,
    // The Sets answer, by the lanes' own rule (`printedIn`): any printing in any set asked.
    inSets: r.in_sets,
    deckCount: r.deck_count,
    tags: r.tags,
    owned: r.owned,
    priceCents: prices.get(r.id)?.liveCents ?? null,
    // `inclusion` is stored as EDHREC publishes it, a PERCENTAGE (`role-targets.ts` divides it the
    // same way). A theme's figure is a share, and the order takes the weaker of the two, so both
    // must be on one scale before they meet.
    cardInclusion: r.card_inclusion === null ? null : r.card_inclusion / 100,
    combosWithCard: combos.get(r.id) ?? { combos: 0, loops: 0 },
    ownedSupport: r.owned_support,
    supportTotal: r.support_total,
    gameChanger: r.game_changer,
    massLandDenial: flags.get(r.id)?.massLandDenial ?? false,
    extraTurn: flags.get(r.id)?.extraTurn ?? false,
  }));

  const cardFacts: CardFacts | null = card === null || cardRow === null ? null : {
    oracleId: card,
    free: !buysCard(cardRow),
    priceCents: prices.get(card)?.liveCents ?? null,
    gameChanger: cardRow.gameChanger,
    massLandDenial: flags.get(card)?.massLandDenial ?? false,
    extraTurn: flags.get(card)?.extraTurn ?? false,
  };
  // Only the vocabulary's labels are read, from the memo every page already warms.
  const tribes: Tribes = answers.themes.length === 0 ? new Map() : tribesFor(answers.themes, await loadIntakeThemes());
  return { answers, candidates, card: cardFacts, tribes };
}

/**
 * Which commanders the search lists: indexed, legal, and not one the player has already built. A
 * condition on `commander_support cs` joined to `cards c`, shared so that anything taking a
 * commander id from the client (the trial fill) admits exactly the ids the search could return.
 */
export const isCandidate = (userId: string) =>
  sql`c.commander_legal and cs.synergy_state = 'ok' and ${notBuiltBy(userId, sql`cs.commander_oracle_id`)}`;

/**
 * The build-around card, when it is one the intake could have offered: the free match's own
 * eligibility (`loadPhraseIndex`), commander-legal and never a basic land. A card a hand-edited
 * URL names outside that is no answer, and reads as null like a card that does not exist.
 */
export type CardRow = {
  name: string;
  owned: boolean;
  /** Owned with every copy held by a committed deck; `deck` names the first holder. The fill buys
   *  such a card exactly as it buys one the player does not own (`loadFillGate`, `trialFill`). */
  held: { deck: string | null } | null;
  gameChanger: boolean;
  /** The catalog's art for the card (`cards.image_uri`), the fallback under the printing the player owns. */
  imageUri: string | null;
};

/**
 * `cache`d per request: the results page reads the card twice in one render, for the chip
 * (`loadCardChip`) and for the search (`loadSearchFacts`), and the claim read below is the
 * expensive half. `claims: false` skips it for a caller that only needs to know the card counts.
 */
export const loadCardRow = cache(async (userId: string, oracleId: string, claims = true): Promise<CardRow | null> => {
  const [row] = (await db.execute(sql`
    select c.name, c.game_changer, c.type_line, c.image_uri,
      exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id) as owned
    from cards c where c.oracle_id = ${oracleId}::uuid and c.commander_legal
  `)).rows as { name: string; game_changer: boolean; type_line: string; image_uri: string | null; owned: boolean }[];
  if (!row || isBasicLand(row.type_line)) return null;
  // The same claim read the commander's held mark and the fill's charge use, and the same rule:
  // a copy is free when the row says one is.
  const a = claims && row.owned ? (await loadAvailability(userId, { oracleIds: [oracleId] })).get(oracleId) : undefined;
  const held = row.owned && a !== undefined && buysCopy(true, a) ? { deck: hardDecks(a)[0]?.name ?? null } : null;
  return { name: row.name, owned: row.owned, held, gameChanger: row.game_changer, imageUri: row.image_uri };
});

/**
 * The two-card combos the build-around card completes, per partner, counted the way the bracket
 * system counts them: what a combo PRODUCES decides (`isInfiniteOrGameEnding`), never its card
 * count, and a variant needing a template is not a two-card combo. The pair is a commander and a
 * card in its 99, so a variant whose build-around half must itself be the commander (§4.3b) is not
 * one this deck can assemble, and is left out.
 */
export async function loadCombosWith(oracleId: string): Promise<Map<string, { combos: number; loops: number }>> {
  const rows = (await db.execute(sql`
    select other.oracle_id as partner, v.produces
    from ${spellbookVariants} v
    join ${spellbookVariantCards} self
      on self.variant_id = v.variant_id and self.oracle_id = ${oracleId}::uuid and not self.must_be_commander
    join ${spellbookVariantCards} other
      on other.variant_id = v.variant_id and other.oracle_id <> self.oracle_id
    where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
  `)).rows as { partner: string; produces: string[] }[];
  const out = new Map<string, { combos: number; loops: number }>();
  for (const r of rows) {
    if (!isInfiniteOrGameEnding(r.produces)) continue;
    const seen = out.get(r.partner) ?? { combos: 0, loops: 0 };
    seen.combos += 1;
    if (producesInfiniteTurns(r.produces)) seen.loops += 1;
    out.set(r.partner, seen);
  }
  return out;
}
