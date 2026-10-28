# Gap report: Shopping for all decks v2, PR 8 (chassis, search, sort)

Property table: `docs/superpowers/design-tables/all-decks-cart-v2-pr8.md` (enumerated from the handoff alone). Verified against `main` at c07eec0 (PR #2327), by reading the code. The 33 visual and 5 state gaps the verify pass listed are dispositioned below. Wording is out of this report's scope (`/copy-review`: no CUT, TIGHTEN or RENAME on `noMatch.*`, the chip or the sort and result strings).

## Fixed in the follow-up PR

| # | Gap | Fix |
|---|---|---|
| 12, state 4 | Search field takes no accent edge with a query on (`.fld.on`) | `DeckSearchField` gains `active`; the cart passes it |
| 15 (phone half) | The ⇅ button does not read as open while its sheet is | accent edge and 3px ring while open |
| 21 to 27 | Phone sort sheet: radius, surface, scrim, grab, padding, header, rows, marker, no close button | rebuilt to Controls B2: 18px sheet on `--surface-raised`, `rgba(8,6,4,.62)` scrim, 38x4 grab, title with the view name on its right, 48px rows, ring radios, no close button (scrim, grab drag, Escape and a pick dismiss it) |
| 32, 33 | No-match block geometry | padding 26/22, left aligned, body max 440, press radius 10, 14px, padding 0 14 |
| state 2, state 8 | By deck's row 3 ignored the search | `result.filtered` in By deck with a search on |

## Not fixed here: the shared chassis, menu and field vs the mock

These are values the SHIPPED `FilterChassis`, `OrderMenu` and `SearchField` draw for every route (`/decks`, `/collection`, the commanders rack, the precon list). The handoff says the cart uses the shipped chassis ("same anatomy and sizes as /decks", "no new tokens"), and its mock draws a few of those parts differently. Matching the mock would change four other routes, so it needs a ruling, not a quiet fork:

- desktop sort menu: `▾` caret, open state, `Sort` header, 220px raised panel, ring radios, 13.5px items (gaps 15 desktop half, 16 to 20);
- trigger height 34 vs 32, mono vs sans (16);
- chassis frame: the cart's pinned wrapper and `FilterChassis` each draw padding, background and a bottom edge (1 to 3), row gap 8 vs 10 (4), hairline on phone and its size and colour (6, 7);
- search field radius, padding, gap, font size, clear control (8 to 11, 13);
- ⇅ drawn as the text glyph, as `/decks` does, where the mock has a two-arrow SVG (14);
- NO FILTERS ON size and caps, chip ✕ colour, Clear all: always present, pushed right, mono underline (28 to 30);
- reading dot spacing (31); desktop list gap 12 vs 14 (5).

## Not reachable yet

State 1 (By friend, reading): the mock draws `result.readingByFriend` alone. By friend still draws only once it has panels, so the state is PR 7's.
