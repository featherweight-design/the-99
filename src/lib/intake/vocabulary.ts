import type { EdhrecTag } from "../edhrec/parse";
import { themeFloorFor } from "../edhrec/gap-slot";
import { FORMAT_LABELS, singularForms } from "../edhrec/tag-kinds";
import { CREATURE_TYPE_LABELS } from "../edhrec/tag-kinds.generated";
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
 *    line rather than chosen. Of the 401 slugs, 370 back at least one commander and 307 clear it
 *    (formats excluded).
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

/**
 * The share of this commander's decks tagged `slug`, with no floor: 0 when untagged or deckless.
 * What a type-line match shows beside its theme, since the measured `themeShare` is null for it.
 */
export function rawShare(row: ThemeRow, slug: string): number {
  const tag = row.tags.find((t) => t.slug === slug);
  if (!tag || !row.deckCount || row.deckCount <= 0 || tag.count <= 0) return 0;
  return Math.min(1, tag.count / row.deckCount);
}

/**
 * Whether a type line carries one of `forms` as a creature subtype, on any face. `forms` are the
 * lower-cased singulars of a tribal theme's label (`singularForms`), and a multi-word type (`time
 * lord`) matches as a phrase. Only a face whose types can bear creature types counts, which is
 * `creatureSubtypesFromTypeLines`'s rule.
 */
export function carriesSubtype(typeLine: string, forms: readonly string[]): boolean {
  for (const face of typeLine.split("//")) {
    const [types, subs] = face.split("\u2014");
    if (!subs || !/creature|kindred|tribal/i.test(types)) continue;
    const words = ` ${subs.trim().toLowerCase().split(/\s+/).join(" ")} `;
    if (forms.some((f) => words.includes(` ${f} `))) return true;
  }
  return false;
}

/**
 * The tribal themes among `slugs`, each with the lower-cased singulars its creature type is printed
 * as (`Dwarves` to `dwarf`). Tribal is decided by the generated `CREATURE_TYPE_LABELS`, which is
 * EDHREC's labels checked against the catalog's creature types, and the singulars by the same
 * `singularForms` that check used. So nothing here is a hand-written list of tribes.
 */
export function tribesFor(slugs: readonly string[], vocabulary: readonly VocabularyTheme[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const slug of slugs) {
    const label = vocabulary.find((t) => t.slug === slug)?.label;
    if (label && CREATURE_TYPE_LABELS.includes(label)) out.set(slug, singularForms(label));
  }
  return out;
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
