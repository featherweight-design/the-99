import { classifyEngine, type CommanderEngine } from "../recs/engine";
import { synergyStateFrom, type SynergyState } from "../recs/synergy-state";
import { frontFaceName } from "../recs/faces";
import type { EdhrecFetchResult } from "./client";
import type { CompositionCounts, EdhrecData, EdhrecTag } from "./parse";

export type IndexCommander = { oracleId: string; name: string; oracleText: string | null };

export type SupportHeader = {
  commanderOracleId: string;
  synergyState: SynergyState;
  edhrecTotal: number | null;
  tags: EdhrecTag[];
  bracketCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  similarOracleIds: string[];
  deckCount: number | null;
  rank: number | null;
  saltScore: number | null;
  engine: CommanderEngine | null;
  /** §4A.4's composition, flattened to the columns. Null on anything but a clean `ok` read. */
  avgLand: number | null;
  avgBasic: number | null;
  avgNonbasic: number | null;
  avgCreature: number | null;
  avgInstant: number | null;
  avgSorcery: number | null;
  avgArtifact: number | null;
  avgEnchantment: number | null;
  avgPlaneswalker: number | null;
  avgBattle: number | null;
  avgCurve: Record<string, number> | null;
};

/**
 * The composition columns for a header.
 *
 * Null on `degraded` and `absent` as well as on a payload that predates the widening — and
 * the write layer goes further than this function can: `seed-index.ts` SKIPS the row entirely
 * on `degraded`, preserving whatever was there. So these nulls describe what a header CARRIES,
 * never what a degraded fetch writes, which is nothing at all.
 */
function compositionColumns(c: CompositionCounts | null, curve: Record<string, number> | null) {
  return {
    avgLand: c?.land ?? null,
    avgBasic: c?.basic ?? null,
    avgNonbasic: c?.nonbasic ?? null,
    avgCreature: c?.creature ?? null,
    avgInstant: c?.instant ?? null,
    avgSorcery: c?.sorcery ?? null,
    avgArtifact: c?.artifact ?? null,
    avgEnchantment: c?.enchantment ?? null,
    avgPlaneswalker: c?.planeswalker ?? null,
    avgBattle: c?.battle ?? null,
    avgCurve: curve,
  };
}

export type SupportCard = {
  commanderOracleId: string;
  oracleId: string;
  inclusion: number | null;
  synergy: number | null;
};

/**
 * name -> oracle_id, resolved ONCE at index build rather than on every read.
 *
 * Indexes the full lowercased name AND the front face, because EDHREC lists
 * double-faced cards by front face while Scryfall names them "Front // Back".
 * score.ts:96-102 does the same thing for the live path; this is that rule
 * applied to the offline one.
 *
 * The full name always wins over a derived front-face key: "Bala Ged Recovery"
 * is a real single-faced card in some printings and the front face of a DFC in
 * others, and the real card is the right answer.
 */
export function buildNameIndex(cards: { oracleId: string; name: string }[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const c of cards) {
    const front = frontFaceName(c.name).toLowerCase();
    if (!index.has(front)) index.set(front, c.oracleId);
  }
  for (const c of cards) index.set(c.name.toLowerCase(), c.oracleId);
  return index;
}

/**
 * One commander's fetch result -> the rows the index stores.
 *
 * Derives synergyState via synergyStateFrom rather than testing an HTTP status,
 * which is what keeps the index's notion of absent/degraded identical to the
 * live path's.
 */
export function toSupportRows(args: {
  commander: IndexCommander;
  result: EdhrecFetchResult;
  nameIndex: Map<string, string>;
}): { header: SupportHeader; cards: SupportCard[]; unresolved: number } {
  const { commander, result, nameIndex } = args;
  const state = synergyStateFrom(result);
  const d = result.data;

  const header: SupportHeader = {
    commanderOracleId: commander.oracleId,
    synergyState: state,
    // Null unless "ok" — the check constraint enforces this pairing, and a 0
    // here would claim "EDHREC lists nothing for this commander" when the truth
    // is "we did not reach EDHREC".
    edhrecTotal: state === "ok" ? d!.topCards.length : null,
    tags: d?.tags ?? [],
    bracketCounts: d?.bracketCounts ?? {},
    budgetCounts: d?.budgetCounts ?? {},
    similarOracleIds: (d?.similarNames ?? [])
      .map((n) => nameIndex.get(n.toLowerCase()))
      .filter((id): id is string => id !== undefined),
    deckCount: d?.deckCount ?? null,
    rank: d?.rank ?? null,
    saltScore: d?.saltScore ?? null,
    engine: classifyEngine(commander),
    // Only a clean read carries a composition: `d` is null on absent and on degraded.
    ...compositionColumns(state === "ok" ? (d?.composition ?? null) : null,
                          state === "ok" ? (d?.manaCurve ?? null) : null),
  };

  if (state !== "ok") return { header, cards: [], unresolved: 0 };

  const { cards, unresolved } = supportCardsFrom(commander.oracleId, d!, nameIndex);
  return { header, cards, unresolved };
}

/**
 * A support page's names -> its card rows, for a commander page and a theme page alike.
 *
 * Unresolvable names are dropped from the child table but stay counted in edhrecTotal, so a missing
 * name reduces measured overlap rather than silently shrinking the denominator and inflating every
 * user's completeness. The commander itself is never its own support card.
 */
function supportCardsFrom(
  commanderOracleId: string,
  d: Pick<EdhrecData, "topCards" | "inclusionByName" | "synergyByName">,
  nameIndex: Map<string, string>,
): { cards: SupportCard[]; unresolved: number } {
  const cards: SupportCard[] = [];
  const emitted = new Set<string>();
  let unresolved = 0;
  for (const name of d.topCards) {
    const key = name.toLowerCase();
    const oracleId = nameIndex.get(key);
    if (oracleId === undefined) { unresolved++; continue; }
    if (oracleId === commanderOracleId) continue;
    // buildNameIndex maps both "Front // Back" and "Front" to one oracle id, so
    // a list carrying both forms would otherwise emit two rows sharing the
    // composite primary key and fail the whole insert for that commander.
    if (emitted.has(oracleId)) continue;
    emitted.add(oracleId);
    cards.push({
      commanderOracleId,
      oracleId,
      inclusion: d.inclusionByName[key] ?? null,
      synergy: d.synergyByName[key] ?? null,
    });
  }
  return { cards, unresolved };
}

/** How many theme pages the index fetches per commander, and the fewest decks a theme needs.
    No percentage floor: Atraxa's `planeswalkers`, the build theme pages exist for, is 3.9% of its
    decks. At these two figures a build fetches 4,544 theme pages (staging, 2026-11-20). */
export const THEME_PAGES_PER_COMMANDER = 3;
export const THEME_MIN_DECKS = 50;

/** A slug the index will put in a URL path and a primary key: EDHREC's own shape, nothing else. */
const THEME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The themes the index fetches a page for: a commander's top tags by deck count, at least
    `THEME_MIN_DECKS` each, at most `THEME_PAGES_PER_COMMANDER`. Ties keep the tags' own order.
    A slug outside EDHREC's shape is never fetched (it goes into the page URL), a count that is not
    a whole number is not a deck count, and a repeated slug is fetched once, at its larger count. */
export function themeSlugsToFetch(tags: readonly EdhrecTag[]): EdhrecTag[] {
  const seen = new Set<string>();
  return tags
    .filter(fetchableTheme)
    // `sort` is stable, so tied counts keep the tags' own order.
    .sort((a, b) => b.count - a.count)
    .filter((t) => !seen.has(t.slug) && (seen.add(t.slug), true))
    .slice(0, THEME_PAGES_PER_COMMANDER);
}

function fetchableTheme(t: EdhrecTag): boolean {
  return THEME_SLUG.test(t.slug) && Number.isInteger(t.count) && t.count >= THEME_MIN_DECKS;
}

export type ThemeSupportHeader = { commanderOracleId: string; slug: string; deckCount: number };

/** One theme page's fetch result -> the rows the index stores, or null when the page is not a clean
    read: a theme page that 403s or degrades stores nothing, and the commander page stands alone.
    `deckCount` is the tag's count on the commander page, the figure the theme was chosen by; it is
    a relative weight between one commander's themes, never a denominator. */
export function toThemeSupportRows(args: {
  commander: IndexCommander;
  theme: EdhrecTag;
  result: EdhrecFetchResult;
  nameIndex: Map<string, string>;
}): { header: ThemeSupportHeader; cards: (SupportCard & { slug: string })[]; unresolved: number } | null {
  const { commander, theme, result, nameIndex } = args;
  // A theme the fetch rule would not choose never reaches a key or the deck-count check.
  if (!fetchableTheme(theme)) return null;
  // "ok" needs cards, not merely a payload: an unexpected shape parses to an empty list, and a
  // theme stored with no cards would be read in place of the commander page.
  if (synergyStateFrom(result) !== "ok" || !result.data) return null;
  const { cards, unresolved } = supportCardsFrom(commander.oracleId, result.data, nameIndex);
  // The same rule after resolution: a page whose every name is unresolvable (or the commander) is
  // no theme page either.
  if (cards.length === 0) return null;
  return {
    header: { commanderOracleId: commander.oracleId, slug: theme.slug, deckCount: theme.count },
    cards: cards.map((c) => ({ ...c, slug: theme.slug })),
    unresolved,
  };
}
