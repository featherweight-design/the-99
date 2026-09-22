/**
 * Where the bracket rules this app applies were published.
 *
 * A BLOG POST, NOT A SPECIFICATION, and the distinction is the reason this is a dated constant.
 * Wizards publishes the brackets and the Game Changer list as announcements, revised in place
 * and superseded by later ones — the February 2026 update is the current text, and nothing
 * guarantees it stays that way. So the provenance panel names the post AND the date someone last
 * read it against the code: a reader arguing a figure at a table is owed the difference between
 * "the rules say" and "the rules said, when we checked".
 *
 * `lastChecked` moves only when someone re-reads the post against `rules.ts` and finds them
 * agreeing. Bumping it without that read is the one way to make this constant lie.
 */
export const BRACKET_RULES_SOURCE = {
  name: "Wizards of the Coast",
  title: "Commander Brackets beta update, February 9, 2026",
  url: "https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026",
  published: "2026-02-09",
  lastChecked: "2026-09-22",
} as const;

/** The combo index. Linked from each combo's own receipt and from the provenance row. */
export const SPELLBOOK_SOURCE = {
  name: "Commander Spellbook",
  url: "https://commanderspellbook.com",
  /** A variant's own page. The id is Spellbook's, carried on every `ComboRef`. */
  variantUrl: (variantId: string) =>
    `https://commanderspellbook.com/combo/${encodeURIComponent(variantId)}/`,
} as const;
