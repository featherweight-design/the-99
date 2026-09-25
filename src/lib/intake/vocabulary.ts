import type { EdhrecTag } from "../edhrec/parse";
import { themeFloorFor } from "../edhrec/gap-slot";
import { FORMAT_LABELS } from "../edhrec/tag-kinds";
import { THIN_DECK_COUNT } from "../profile/fit";

/**
 * Help me choose's theme rules (brief §6), the floors behind them, and the picker's vocabulary.
 * Pure: the rows come from `commander_support`.
 *
 * THE FLOORS ARE THE REPOSITORY'S OWN, NOT NEW ONES. Measured on staging, 2026-09-25, over 3,380
 * commanders (none with a null `deck_count`, 108 with no tags, `deck_count` p10 27, p25 135,
 * median 744):
 *  - A commander backs a theme only with `THIN_DECK_COUNT` decks or more (27, still staging's p10).
 *    Below it the share is a small sample, which is the same thing that constant means everywhere
 *    else; restating it here as a second number would be the asserted-constant failure.
 *  - A tag counts on a commander only when it clears `themeFloorFor`, the 0.5% floor that already
 *    deletes accidental tags from the commander row (`gap-slot.ts`).
 *  - The picker offers a tag only when at least `TOO_NARROW_BELOW` commanders back it. Fewer, and
 *    choosing it can only ever produce the too-narrow state (F7), so the floor is derived from that
 *    line rather than chosen: 22 slugs back one commander, 16 two and 49 three or four, and 286 of
 *    the 401 clear it.
 *  - Format labels (`cEDH`, `Premodern`, …) are never themes; cEDH is a bracket.
 */
export const TOO_NARROW_BELOW = 4;

export type ThemeRow = { deckCount: number | null; tags: readonly EdhrecTag[] };
export type VocabularyTheme = { slug: string; label: string; commanders: number };

/**
 * The share of this commander's decks that carry `slug`, or null when the commander cannot back
 * the theme: no tag, a null or thin `deck_count`, or a tag under the 0.5% floor.
 */
export function themeShare(row: ThemeRow, slug: string): number | null {
  if (row.deckCount === null || row.deckCount < THIN_DECK_COUNT) return null;
  const tag = row.tags.find((t) => t.slug === slug);
  if (!tag || tag.count < themeFloorFor(row.deckCount) || tag.count <= 0) return null;
  return Math.min(1, tag.count / row.deckCount);
}

/** The tags the picker offers, most commanders first, then by label. */
export function themeVocabulary(rows: readonly ThemeRow[]): VocabularyTheme[] {
  const bySlug = new Map<string, VocabularyTheme>();
  for (const row of rows) {
    for (const tag of row.tags) {
      if (FORMAT_LABELS.includes(tag.label) || themeShare(row, tag.slug) === null) continue;
      const seen = bySlug.get(tag.slug);
      if (seen) seen.commanders += 1;
      else bySlug.set(tag.slug, { slug: tag.slug, label: tag.label, commanders: 1 });
    }
  }
  return [...bySlug.values()]
    .filter((t) => t.commanders >= TOO_NARROW_BELOW)
    .sort((a, b) => b.commanders - a.commanders || a.label.localeCompare(b.label));
}
