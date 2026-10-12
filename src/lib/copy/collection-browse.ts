// Collection browse copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Collection.
// The mock shows one instance ("counterspell" in Red); these are the templates
// that reproduce it.

import { guildLabel } from "./color-labels";

/** The heading names the active color filter in the *guild* register
 *  ("in Red", "in Boros") — commanders uses the hyphenated word register.
 *  Both come from src/lib/copy/color-labels.ts, which #58 shipped. */
export function colorLabelFor(colors: string[]): string | null {
  return colors.length > 0 ? guildLabel(colors) : null;
}

export const collectionBrowseCopy = {
  noResults: {
    // Collection carries four filter dimensions (search, colors, types,
    // setCodes) but the mock's heading names only two. A user filtered to zero
    // by type or set alone lands on the generic form — that degrades correctly,
    // and inventing copy Design did not write is out of scope for this pass.
    heading: (query: string, colorLabel: string | null) => {
      const q = query.trim();
      if (q && colorLabel) return `Nothing matches "${q}" in ${colorLabel}.`;
      if (q) return `Nothing matches "${q}".`;
      if (colorLabel) return `Nothing matches in ${colorLabel}.`;
      return "Nothing matches those filters.";
    },
    // The heading names whichever of the two mocked dimensions is active; the
    // caption cannot, because the same surface is reached by a type or set
    // filter alone. Naming a search and a colour filter here would state as
    // fact something that is often not true of the filters actually set.
    caption: "Nothing in your collection clears every filter. Drop one of them.",
    cta: "Clear filters",
  },
} as const;

/** Card modal. "any printing" because the link is keyed by the oracle card,
 *  not the printing on screen — Mana Pool's grid shows them all. */
export const cardLinkOutCopy = {
  card: "Buy any printing at Mana Pool",
  /** A token's details: the link names the one Mana Pool product its price is for, not every printing. */
  token: "Buy this token at Mana Pool",
} as const;
