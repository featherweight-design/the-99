// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '03', placed directly after
// "Starting a deck" (id 'new-deck', route /decks/new). Placeholders until /copy-review.
// ABOUT_VERSION: 17 if the cart (15) and tokens (16) land first; the next number with the last PR otherwise.

export const preconsEntry = {
  id: "precons",
  chapter: "03",
  since: 17,
  switch: "PRECONS_ENABLED", // new AboutSwitch member (gap G7)
  title: "Starting from a precon",
  route: "/decks/precons",
  opens: "opens the precon list",
  caption:
    "Any Commander precon, from the first in 2011 to this month’s, is listed on Decks under Commander precons. Each shows how many of its cards you own.\n\nOpen one to read its list, group by group. Start a deck from it, and you get a draft with all 100 cards that you can change before you commit.",
  keyLines: [
    // R4 (tiles), placeholder: added because the list's default changed. No new entry, no bump.
    "Precons show as tiles, each with its commander’s card. Switch to rows to read more at once, or open one and see its cards.",
    "Any printing counts, as everywhere else. Basic lands are left out of the count.",
    "If a deck of yours has the same commander and most of the same cards, the precon says so.",
    "A Collector’s Edition with the same cards is listed once, under the plain edition.",
    "Your deck picks printings from the copies you hold, not the precon’s.",
    // R3 addendum (built-from link), placeholder:
    "Link a deck to the precon it came from, and its Versions start from the box as v0. Nothing in the deck changes.",
  ],
  specimen: {
    component: "PreconRow",
    fixture: { name: "Eldrazi Unbound", commanders: ["Ulalek, Fused Atrocity"], colors: [], set: "CMM", released: "2023-08", owned: 74, of: 85 },
  },
  // R4: specimen swap to PreconTile is open (G-R4-3).
  phone: "Tiles sit two across. Rows stack the name and figure, then the commander, then the set. On an open precon, Start a deck from this docks above the tab bar.",
} as const;

// Data credits (the About page's credits block), lock 8. The licence notice is kept verbatim.
export const mtgjsonCredit = {
  id: "mtgjson",
  line: "Commander precon decklists from MTGJSON, under the MIT licence.",
  notice: "Copyright (c) 2018 - Present, Zach Halpern",
  href: "https://mtgjson.com/license/",
} as const;
