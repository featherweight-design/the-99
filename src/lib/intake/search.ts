import { sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { spellbookVariantCards, spellbookVariants } from "../../db/schema";
import { loadBracketFlags } from "../bracket/flags-read";
import { notBuiltBy } from "../decks/built";
import { isBasicLand } from "../decks/grouping";
import { loadPrices } from "../discovery/price";
import type { EdhrecTag } from "../edhrec/parse";
import { isInfiniteOrGameEnding, producesInfiniteTurns } from "../spellbook/combo-features";
import { buildPhraseIndex, type PhraseIndex } from "./match";
import { rankCandidates, type Answers, type Candidate, type CardFacts, type SearchResult } from "./rank";
import { themeVocabulary, type VocabularyTheme } from "./vocabulary";

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
let memo: { generation: string; at: number; value: Promise<{ themes: VocabularyTheme[]; index: PhraseIndex }> } | null = null;

export async function loadIntakeCatalog(now: number = Date.now()): Promise<{ themes: VocabularyTheme[]; index: PhraseIndex }> {
  const generation = await catalogGeneration();
  if (memo && memo.generation === generation && now - memo.at < CATALOG_MEMO_MS) return memo.value;
  const value = loadThemeVocabulary().then(async (themes) => ({ themes, index: await loadPhraseIndex(themes) }));
  memo = { generation, at: now, value };
  // A failed read is not kept: the next request tries again.
  value.catch(() => { if (memo?.value === value) memo = null; });
  return value;
}

/**
 * The free match's index: the theme vocabulary and every COMMANDER-LEGAL card's name. A card the
 * format bans could never be placed in the deck (`validateCardForDeck` refuses it), so it is not a
 * build-around card either. Basic lands are left out through the repository's own rule,
 * `isBasicLand`, which takes a snow basic too: no player means a build-around Forest.
 */
export async function loadPhraseIndex(themes: readonly VocabularyTheme[]): Promise<PhraseIndex> {
  const cards = (await db.execute(sql`
    select c.oracle_id, c.name, c.type_line from cards c where c.commander_legal
  `)).rows as { oracle_id: string; name: string; type_line: string }[];
  return buildPhraseIndex(themes, cards
    .filter((c) => !isBasicLand(c.type_line))
    .map((c) => ({ oracleId: c.oracle_id, name: c.name })));
}

/** The search, with the build-around card's own facts for its chip (owned, price, flags). */
export type SearchOutcome = SearchResult & { card: CardFacts | null };

export async function searchCommanders(userId: string, answers: Answers): Promise<SearchOutcome> {
  const card = answers.card;
  // Owned support is the no-theme order's only input, and it is the dearest figure here: a count
  // over every commander's support list. It is read only when that order is the one in use.
  const needOwnedSupport = answers.themes.length === 0 && card === null;

  const rows = (await db.execute(sql`
    select cs.commander_oracle_id as id, c.name, c.color_identity, cs.deck_count, c.game_changer,
      coalesce((select jsonb_agg(t) from jsonb_array_elements(cs.tags) t
                where t->>'slug' = any(${sql.param(answers.themes)}::text[])), '[]'::jsonb) as tags,
      exists (select 1 from collection_items ci
              where ci.user_id = ${userId} and ci.oracle_id = cs.commander_oracle_id) as owned,
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
    where c.commander_legal and cs.synergy_state = 'ok'
      and ${notBuiltBy(userId, sql`cs.commander_oracle_id`)}
  `)).rows as {
    id: string; name: string; color_identity: string[]; deck_count: number | null; game_changer: boolean;
    tags: EdhrecTag[]; owned: boolean; card_inclusion: number | null; owned_support: number; support_total: number;
  }[];

  const ids = rows.map((r) => r.id);
  const lookup = card === null ? ids : [...ids, card];
  const [flags, prices, combos, cardRow] = await Promise.all([
    loadBracketFlags(lookup),
    loadPrices(lookup),
    card === null ? Promise.resolve(new Map<string, { combos: number; loops: number }>()) : loadCombosWith(card),
    card === null ? Promise.resolve(null) : loadCardRow(userId, card),
  ]);

  const candidates: Candidate[] = rows.map((r) => ({
    oracleId: r.id,
    name: r.name,
    colorIdentity: r.color_identity,
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
    owned: cardRow.owned,
    priceCents: prices.get(card)?.liveCents ?? null,
    gameChanger: cardRow.gameChanger,
    massLandDenial: flags.get(card)?.massLandDenial ?? false,
    extraTurn: flags.get(card)?.extraTurn ?? false,
  };
  // A card id that parses but names no card any more (a stale link) is dropped, as every invalid
  // answer is: the search then runs, and reports its order, as if no card were asked.
  const effective = card !== null && cardRow === null ? { ...answers, card: null } : answers;
  return { ...rankCandidates(candidates, effective, cardFacts), card: cardFacts };
}

async function loadCardRow(userId: string, oracleId: string): Promise<{ owned: boolean; gameChanger: boolean } | null> {
  const [row] = (await db.execute(sql`
    select c.game_changer,
      exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = c.oracle_id) as owned
    from cards c where c.oracle_id = ${oracleId}::uuid
  `)).rows as { game_changer: boolean; owned: boolean }[];
  return row ? { owned: row.owned, gameChanger: row.game_changer } : null;
}

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
