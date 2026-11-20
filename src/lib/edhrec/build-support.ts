// A CHOSEN build's EDHREC support (engine plan A4): the commander's stored theme pages
// (`commander_theme_support`, A2/A3) for the themes a player picked, blended into the commander
// page's shape so every reader of `EdhrecData` can take it in its place.
//
// ONLY FOR A BUILD THE PLAYER CHOSE. Measured (A1, docs/agents/commander-index.md): Atraxa's
// `planeswalkers` page lifts the superfriends primer from 26 to 36 cards in the first 62, while its
// most-played tag, `infect`, ranks WORSE than the commander page (22). So no reader falls to a theme
// page by default; a reader with no choice, or no stored page for it, keeps the commander page.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderThemeSupport, commanderThemeSupportCards } from "../../db/schema";
import type { EdhrecData, EdhrecTag } from "./parse";

export type BuildJoin = "all" | "any";

/** What a theme page contributes: its deck count and its cards' figures, by lowercased name. */
export type ThemePage = {
  slug: string;
  deckCount: number;
  cards: { name: string; inclusion: number | null; synergy: number | null }[];
};

export type BuildSupport = Pick<EdhrecData, "topCards" | "inclusionByName" | "synergyByName">;

/**
 * The commander's own tags a choice names, as slugs: a Help me choose theme is a tag LABEL
 * ("Planeswalkers"), a mapped strategy focus is a SLUG; either matches, case-blind. A choice the
 * commander has no tag for names nothing, and is dropped.
 */
export function themeSlugsFor(choices: readonly string[], tags: readonly EdhrecTag[]): string[] {
  const wanted = new Set(choices.map((c) => c.trim().toLowerCase()));
  return [...new Set(tags
    .filter((t) => wanted.has(t.slug.toLowerCase()) || wanted.has(t.label.toLowerCase()))
    .map((t) => t.slug))];
}

/**
 * Several theme pages as one support list. `all` (a build of every chosen theme) weighs each page by
 * its deck count, a card a page does not list counting as 0 there; `any` takes each card's best page.
 * Synergy follows the same rule over the pages that report one. One page is itself under both.
 * `topCards` is in first-seen order: the caller ranks.
 */
export function blendThemePages(pages: readonly ThemePage[], join: BuildJoin): BuildSupport | null {
  if (pages.length === 0) return null;
  const total = pages.reduce((n, p) => n + p.deckCount, 0);
  const inc = new Map<string, number>();
  const syn = new Map<string, { sum: number; weight: number; best: number }>();
  // First-seen order. The caller ranks (`topPickNames`, `byInclusion`): one ranking rule, not two.
  const names = new Map<string, string>();
  for (const page of pages) {
    for (const c of page.cards) {
      const key = c.name.toLowerCase();
      if (!names.has(key)) names.set(key, c.name);
      if (c.inclusion !== null && Number.isFinite(c.inclusion)) {
        const prior = inc.get(key) ?? 0;
        inc.set(key, join === "all" ? prior + c.inclusion * page.deckCount : Math.max(prior, c.inclusion));
      }
      if (c.synergy !== null && Number.isFinite(c.synergy)) {
        const s = syn.get(key) ?? { sum: 0, weight: 0, best: -Infinity };
        syn.set(key, { sum: s.sum + c.synergy * page.deckCount, weight: s.weight + page.deckCount, best: Math.max(s.best, c.synergy) });
      }
    }
  }
  const inclusionByName: Record<string, number> = {};
  for (const [k, v] of inc) inclusionByName[k] = Math.round((join === "all" ? v / total : v) * 10) / 10;
  const synergyByName: Record<string, number> = {};
  for (const [k, s] of syn) synergyByName[k] = join === "all" ? s.sum / s.weight : s.best;
  return { topCards: [...names.values()], inclusionByName, synergyByName };
}

/**
 * A commander's chosen build, or null when the choice names no stored page: no choice, no tag the
 * commander has, or a theme the index has not fetched yet. Null means "read the commander page".
 */
export async function loadBuildSupport(
  commanderOracleId: string,
  tags: readonly EdhrecTag[],
  choices: readonly string[],
  join: BuildJoin,
): Promise<BuildSupport | null> {
  const slugs = themeSlugsFor(choices, tags);
  if (slugs.length === 0) return null;
  const [headers, rows] = await Promise.all([
    db.select({ slug: commanderThemeSupport.slug, deckCount: commanderThemeSupport.deckCount })
      .from(commanderThemeSupport)
      .where(and(eq(commanderThemeSupport.commanderOracleId, commanderOracleId), inArray(commanderThemeSupport.slug, slugs))),
    db.select({
      slug: commanderThemeSupportCards.slug, name: cards.name,
      inclusion: commanderThemeSupportCards.inclusion, synergy: commanderThemeSupportCards.synergy,
    })
      .from(commanderThemeSupportCards)
      .innerJoin(cards, eq(cards.oracleId, commanderThemeSupportCards.oracleId))
      .where(and(eq(commanderThemeSupportCards.commanderOracleId, commanderOracleId), inArray(commanderThemeSupportCards.slug, slugs))),
  ]);
  const bySlug = new Map<string, ThemePage["cards"]>();
  for (const r of rows) {
    const list = bySlug.get(r.slug) ?? [];
    list.push({ name: r.name, inclusion: r.inclusion, synergy: r.synergy });
    bySlug.set(r.slug, list);
  }
  const pages: ThemePage[] = headers.map((h) => ({ slug: h.slug, deckCount: h.deckCount, cards: bySlug.get(h.slug) ?? [] }));
  return blendThemePages(pages.filter((p) => p.cards.length > 0), join);
}

/**
 * A chosen build for one commander, or none, and whether a failed read is why (`fellBack`): the one
 * rule every reader of a chosen build follows. None for a pair (pairs are not themed), no choice or
 * no tags; a failed read is none too, said so, so a cached reader never stores it as the build.
 */
export async function readBuild(
  args: { pair: boolean; commanderOracleId: string; tags: readonly EdhrecTag[] | null; choices: readonly string[]; join: BuildJoin },
  load: typeof loadBuildSupport = loadBuildSupport,
): Promise<{ build: BuildSupport | null; fellBack: boolean }> {
  if (args.pair || !args.tags || args.choices.length === 0) return { build: null, fellBack: false };
  try {
    return { build: await load(args.commanderOracleId, args.tags, args.choices, args.join), fellBack: false };
  } catch (err) {
    console.warn("no chosen build: reading the commander page", err);
    return { build: null, fellBack: true };
  }
}

/** A chosen build laid over the commander page: the build's figures win for the cards it lists, every
    other card keeps the commander page's, and the candidates are both lists, the build's first. */
export function overlayBuild<T extends BuildSupport>(page: T, build: BuildSupport): T {
  const seen = new Set(build.topCards.map((n) => n.toLowerCase()));
  return {
    ...page,
    topCards: [...build.topCards, ...page.topCards.filter((n) => !seen.has(n.toLowerCase()))],
    inclusionByName: { ...page.inclusionByName, ...build.inclusionByName },
    synergyByName: { ...page.synergyByName, ...build.synergyByName },
  };
}
