# Card row (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **The one-line card row** (card rows addendum L1, Hugh 2026-10-16, replacing the foil mark PR 2's two-line row, #1886). Every card row is one
  34px line at EVERY width, in All and Shopping (Hugh, 2026-10-16: the phone's two-line rows, Shopping's option B and the All row's pips under
  the name, are retired, and no row class is gated on `md`). A coarse pointer keeps a 44px hit on the ✕, the lock, the other-ways press, the auto
  tag, the undo press and the `+N` through `TOUCH_HIT` (`src/components/ui/touch-hit.ts`, an `::after` drawn past the control), and the buy tag's own
  `before:` hit, so no target grows the row. **The right-hand columns are fixed, by `order`**: All's
  72px pip track and the ✕ (the marker, the price, the auto tag and the lock mark flow left of them), Shopping's 84px buy tag and the ✕. A Shopping row
  draws no pips and no EDHREC figure; All draws no other-ways press at any width (the press, `OtherWaysPress`, is Shopping's, 26px with
  `-my-[3px]` so the row stays 34px). **The marks fold by the row's own width** (`FOLD`, a container query on `DecklistRow`'s wrapper, `@container`,
  at every width; every fold below yields to `foldsFrom`: a tier that would fold exactly one mark folds none): wide is 480px and up, middle 360 to 479, tight under 360. All: the 5th mark and beyond at every width, every mark after the second at the
  middle tier, every mark after the first at the tight one (one more at each tier than Shopping's rhythm, Hugh 2026-10-16: an All row draws a card to buy as a bare `$`, its price in the `$`'s tooltip on a hover or a tap, and the room the price took goes to the marks; the price is Shopping's), and the availability word drops to its glyph (and a count) from the middle tier (d9, 2026-10-16); Shopping: every mark and the word at
  the middle tier, with one `+N` standing in for them in the middle and tight tiers alike (d9, 2026-10-16: a phone Shopping row is a tight one). The folded availability glyph opens its word on a tap too (`tapOnTouch`, `TOUCH_HIT`). A folded mark is `sr-only`, never `display: none`, so a screen reader keeps it; the `+N` spans
  (one per tier in All; Shopping's one span covers both narrow tiers; a tier that would fold exactly ONE mark folds none and draws that mark itself, so a `+N` always counts two or more, Hugh 2026-10-27, overriding the handoff's drawn `+1`: the 16px mark takes about 3px more than the `+1`'s 11px mono, and that comes out of the truncating name, never the fixed columns; `foldsFrom`) are aria-hidden, bare mono in `--fact`, and a fine pointer's hover, or a coarse pointer's tap (`tapOnTouch`), opens the tooltip listing what they hold (`FactTooltip`'s `lines`; the tap goes no further than the bubble), and while the pointer is on one the row's card preview is held off (`plusPointer`), so the tooltip is not covered. A two-faced card's
  row, tile and cart line print its front face beside the `//` mark (`frontFaceName`), never the whole `A // B` and the mark; the whole name stays the
  press's accessible name and the Mana Pool line's. The auto tag, the lock
  mark and the ownership slot never fold. **The glint takes a filled dot's place at every width** (centred on its 8px slot, and the dot is not drawn; a dashed or
  proxied row, and a stepper row, keep the dot and draw no glint there). The card preview on hover stays a fine pointer's. A basic land's stepper row and a read-only
  precon row stay as they were. `over $N` folds into the buy tag's outline at every width, with its words in the tag's description and the key's item.
  `ShoppingKey` is one grid (`cheaper stand-ins`, the friend-spare item's position, `press to add`, the outlined `over $N`). The deck's mark key names `foil` in every view when a
  row or tile in view draws the glint (a foil basic land is a tile only). `docs/superpowers/inventories/foil-row.json` holds the rows, at 390, 800, 900 and 1300, and `phone-one-line.json` the phone rows at 360, 390 and 430.
  The combo mark (PR 2 of the addendum) is the row's last mark, after the facts, folding with them: a card's two-card combo partner in this
  deck, commanders counted (`loadInDeckPartners`, the bracket's three §4.3b rules), spoken in the row's description and glossed `Two-card combo`
  in the mark key when a list row in view draws it. `docs/superpowers/inventories/combo-row.json` holds its rows.
