# Gap report — friend decks PR 4 (owner controls)

Checked against the handoff's Hide-Switch and Privacy boards (README calls 4, 4b and 5) and the contact sheet
(`docs/superpowers/inventories/friend-decks.json`, rows `own-decks`, `own-deck-header`, `own-deck-menu`,
`own-deck-menu-locked`, `settings`, `friends`; 390 and 1300, all reached, on scratch branch `br-spring-cake-a6er4gov`).

Matches the boards: the ⋯ row above Delete in the one menu (`DeckCardOverflow`) on the tile and the header, its box at the
row's right end, ticked in `--accent`, and the locked state (`--fg-locked`, "Set in Settings ›", the press opens
`/settings`) for a deck the Settings rule hides; the header's mark after the bracket chip; the tile's glyph alone after
the bracket chip, only for a deck hidden on its own; the `/decks` key's item, only while such a tile is shown; Settings'
Your decks after Spares, in the page's checkbox rows, the second indented and dimmed while the first is off; the
`/friends` line's three variants with Settings linked.

Decisions where the boards are silent, all recorded in code comments:

| # | Where | Decision |
|---|---|---|
| 1 | Menu box | Drawn in the row rather than `ui/checkbox`, which is a fixed 18px with a `--fg-faint` edge and leads its label; the row needs 16/18px, a dashed edge, a locked fill, at the right end. Listed in `checkbox-usage.test.ts` with its reason. |
| 2 | Glyph vs notice | The glyph sits after the bracket chip and before a notice mark, on the tile and the header alike (the boards draw no notice beside it). |
| 3 | Settings-only hide | No header mark and no tile glyph for a deck the Settings rule hides: the README states the rule once, in Settings. |
| 4 | `/decks` prefs | Read per request after the cached payload, not inside it, so a friend's write never invalidates `/decks` (listed in `check:list-cache`'s `PER_REQUEST_READS`). |
| 5 | Menu tick | Not optimistic: the menu closes on the press, and the row and the mark redraw on revalidation, as Move and Delete do. |
