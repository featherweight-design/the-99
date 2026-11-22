import { CREATURE_TYPE_LABELS, MECHANIC_LABELS } from "../edhrec/tag-kinds.generated";

/**
 * `Themes` (#159): a commander matches a theme when EDHREC lists the tag for it at or above
 * `THEME_FILTER_MIN_DECKS`. The vocabulary is the mechanic and creature-type labels (formats and
 * variants stay out, as in `tag-kinds.ts`); it is NOT the vocabulary the row's play-style sentence
 * prints, which is mechanics only behind a 0.5% floor (`gap-slot.ts`).
 *
 * Pure, so client components can import it. The database read is `commander-themes-read.ts`.
 */

/**
 * The fewest decks a tag needs on a commander to count as one of its themes here. Measured on
 * staging, 2026-11-21 (docs/superpowers/plans/2026-11-21-theme-filter.md): at 10, 99% of commanders
 * with 200 or more decks keep at least one theme and one-off tags drop out. The index's own
 * `THEME_MIN_DECKS` (50) is the floor for fetching theme PAGES and would leave small commanders
 * with no theme at all, so it is not reused.
 */
export const THEME_FILTER_MIN_DECKS = 10;

const MECHANICS = new Set(MECHANIC_LABELS);
const CREATURE_TYPES = new Set(CREATURE_TYPE_LABELS);

/** EDHREC's slug shape, lower-cased, de-duplicated and sorted, so a link reads the same however the
    themes were picked. Unknown slugs are kept: a theme EDHREC retires matches nothing. */
export function normalizeThemeSlugs(raw: readonly string[]): string[] {
  const slugs = raw.map((r) => r.trim().toLowerCase()).filter((r) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r));
  return [...new Set(slugs)].sort();
}

export type ThemeKind = "mechanic" | "typal";

/** A label's kind, or null when it is a format, a variant or not a theme at all. */
export function themeKind(label: string): ThemeKind | null {
  if (MECHANICS.has(label)) return "mechanic";
  if (CREATURE_TYPES.has(label)) return "typal";
  return null;
}

export type ThemeInfo = { slug: string; label: string; typal: boolean };

/**
 * Every theme any commander has, most commanders first (ties by slug), and for each commander the
 * themes it has as indices into `themes`. Global rather than per reader: a lane crosses it with
 * its own rows through `laneThemes`.
 */
export type CommanderThemes = {
  themes: ThemeInfo[];
  byOracle: Record<string, number[]>;
};

export type ThemeTagRow = { oracle_id: string; slug: string; label: string; count: number };

/** The shaping half of the read, pure so its floor, kinds and order are testable. */
export function buildCommanderThemes(rows: readonly ThemeTagRow[]): CommanderThemes {
  const info = new Map<string, ThemeInfo>();
  const owners = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!(r.count >= THEME_FILTER_MIN_DECKS)) continue;
    const kind = themeKind(r.label);
    if (kind === null) continue;
    if (!info.has(r.slug)) info.set(r.slug, { slug: r.slug, label: r.label, typal: kind === "typal" });
    let set = owners.get(r.slug);
    if (!set) owners.set(r.slug, (set = new Set()));
    set.add(r.oracle_id);
  }
  const slugs = [...info.keys()].sort((a, b) => {
    const d = owners.get(b)!.size - owners.get(a)!.size;
    return d !== 0 ? d : a < b ? -1 : a > b ? 1 : 0;
  });
  const at = new Map(slugs.map((s, i) => [s, i]));
  const byOracle: Record<string, number[]> = {};
  for (const [slug, ids] of owners) {
    for (const id of ids) (byOracle[id] ??= []).push(at.get(slug)!);
  }
  for (const list of Object.values(byOracle)) list.sort((a, b) => a - b);
  return { themes: slugs.map((s) => info.get(s)!), byOracle };
}

/**
 * What a lane ships: the themes its rows have, and for each row (in the order the rows ship) the
 * indices of its themes. Aligned by construction and keyed by position, as `LanePrintedIn` is.
 * Themes no row has are left out, so the panel lists only themes a reader could get a row from.
 */
export type LaneThemes = { themes: ThemeInfo[]; rows: number[][] };

export function laneThemes(oracleIds: readonly string[], index: CommanderThemes): LaneThemes {
  const perRow = oracleIds.map((id) => index.byOracle[id] ?? []);
  const used = [...new Set(perRow.flat())].sort((a, b) => a - b);
  const local = new Map(used.map((g, i) => [g, i]));
  return {
    themes: used.map((g) => index.themes[g]),
    rows: perRow.map((r) => r.map((g) => local.get(g)!)),
  };
}

/** The client's view of a shipped `LaneThemes`: each row key's theme slugs. Filed rather than
    replaced, as `filePrintedIn` is: a commander's themes do not depend on the ranking. */
export function fileThemes(
  into: Map<string, string[]>,
  keys: readonly string[],
  shipped: LaneThemes,
): Map<string, string[]> {
  keys.forEach((key, i) => {
    const r = shipped.rows[i];
    if (r) into.set(key, r.map((t) => shipped.themes[t].slug));
  });
  return into;
}

export type ThemeMatch = "any" | "all";

/** An empty selection keeps every row. `any` keeps a row with at least one pick, `all` a row with
    every pick; a row with no known themes matches no pick. */
export function hasThemes(
  slugsByKey: ReadonlyMap<string, readonly string[]>,
  key: string,
  selected: readonly string[],
  match: ThemeMatch,
): boolean {
  if (selected.length === 0) return true;
  const mine = slugsByKey.get(key);
  if (mine === undefined) return false;
  return match === "all" ? selected.every((s) => mine.includes(s)) : mine.some((s) => selected.includes(s));
}
