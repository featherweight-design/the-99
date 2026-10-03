# Consider tiles and the Consider tab

Design brief, 2026-10-02. A rework of an existing surface (the deck page's Consider tab and its
tiles); no new feature.

## The findings

From Hugh's walk on 2026-10-02 (intake item H30), in his words:

> [Consider tiles should] be brought more in line with other card tiles (e.g. remove CMC pips on
> top of cards, ownership/commitment indicators moved off the card, etc.). Currently, game changer
> marks are above the card name, where as combo markers are below (inconsistent). Consider tab
> redesign: Above plus more prominent section headers, collapsible sections, etc. Also, color
> contrast accessibility of '+X pts vs. all decks' text color is very low on all themes.

1. **The tile still draws on its art.** `SuggestionTile` (`suggestion-tile.tsx`) puts four things
   over the illustration: the availability chip (:250), the ownership dot or the buy tag
   top-right (:263, :267), the cost pips bottom-left (:335), and a detail hint on hover (:331).
   The other two card tiles moved all of that off the art in the card captions round
   (`CardTileCaption`, `ui/card-tile-caption.tsx`), on `/collection`'s grid and the deck's Card
   view.
2. **Part of this is already ruled and unbuilt.** The push line handoff placed the Consider tile's
   marks on "own line above the name, ownership dot leading, no pips on the art"
   (`design/design_handoff_the99_push_line/STATES-push-line.md`, §C2). Its R2 audit records that
   the product owner asked for that change, for conformity with `/collection`'s tile, as an
   amendment to the Add panel tile (`READINESS-r2-audit.md`, item 1c). The marks line shipped
   (`suggestion-tile.tsx:359`). The dot and the pips did not, and still sit on the art.
3. **Marks above the name, the combo below it.** Four fact marks (bolt, stripped peak, turn
   again, drawn up: `CARD_FACTS`, `src/lib/copy/card-mark.ts`) draw on their own line above the
   name (:359). The combo's lemniscate is drawn only by `ComboClause`, which takes the type line's
   place under the name (:410), built to the Consider tile's states 2 and 3 (#844). §C2 ruled
   otherwise: it names the lemniscate as a fifth mark, puts all five on the tile's line above the
   name, and gives "Underworld Breach is bolt *and* lemniscate" as an example. So the shipped
   split departs from §C2, and the two rulings were never reconciled.
4. **The lift line fails contrast on every theme.** `+N pts vs. all decks` is mono 9.5px in
   `--accent-shadow` (:99–103), a token the synergy discovery handoff named
   (`design/design_handoff_the99_synergy_discovery/README.md`, "Tile lift line"). Measured as
   WCAG contrast against the tile's ground, `--surface`, and its hover ground,
   `--elevated-hover`, from the hexes in `src/app/globals.css`:

   | Theme | on `--surface` | on `--elevated-hover` |
   |---|---|---|
   | amonkhet (default) | 2.13 | 2.09 |
   | kamigawa | 2.13 | 2.09 |
   | ixalan | 1.97 | 1.93 |
   | eldraine | 1.67 | 1.63 |
   | kaldheim | 1.57 | 1.51 |
   | phyrexia | 1.48 | 1.45 |

   Text this size needs 4.5:1. For reference, the tile's other small mono lines use
   `--fg-faint`, which reads 3.81 to 4.82 on `--surface` across the same six themes, and
   `--accent` reads 4.25 to 8.53. Neither is a recommendation; both are what the tile already
   draws.
5. **The shelf headers are quiet.** Each shelf opens with an `h3` in mono 10.5px (phone) / 11px
   (desktop), uppercase, tracked 0.14em, in `--accent` (`consider-panel.tsx:244`), with a coverage
   or count clause beside it in `--fg-faint` (the unowned shelf draws its clause in `--warning`,
   :258, and only its count in `--fg-faint`), and `Show all N →` at the right end (:287). That is
   the Add panel handoff's shelf header as drawn
   (`design/design_handoff_the99_add_panel/README.md`, Component notes).

## What ships today (the record)

- **The tab.** On the phone a toolbar row (sort, owned and unowned counts) sits above the shelves;
  on desktop the same toolbar is on the tab row (`ConsiderToolbar`, `consider-toolbar.tsx`). Then one
  mark key for the whole panel (`AddSurfaceMarkKey`), then the shelves.
- **The shelves.** One per card role in `SHELF_ROLES` that has an owned suggestion, including
  roles already at target and the targetless `Threats & synergy`, sorted most-short-of first
  (`consider-panel.tsx:51–64`). Then the synergy shelf (`ranked by synergy`), then the unowned shelf (EDHREC
  picks the reader does not own). A role with no owned suggestion draws no shelf.
- **The cap.** Each shelf shows `SHELF_CAP` = 6 tiles (`src/lib/decks/shelf-cap.ts`), with
  `Show all N →` to expand in place and a collapse control to close. The grid is 2-up on the
  phone and 6-up on desktop (`consider-panel.tsx:291`). Nothing collapses a whole shelf today.
- **The tile, top to bottom.** Art (with the four occupants above), then the mark line, the name
  (two lines, clamped), then the type line or the combo clause, then the evidence row (the EDHREC
  inclusion bar and figure, or a role or no-figure line), then the lift line when there is one,
  then the card note (`CardNote`, :466), then Add.

## The shipped tile pattern to align to

- **`CardTileCaption`** (`src/components/ui/card-tile-caption.tsx`): under the art, a mono meta
  line and then the name, at a fixed height. The meta line carries one shared slot for the
  availability chip, the collapsed buy tag and the proxy mark: one box, three inks.
- **`AvailabilityMarker`** at `density="chip"` (`src/components/ui/availability-marker.tsx`), in
  the caption on both caption tiles, and **`OwnershipDot`** (`src/components/ui/ownership-dot.tsx`),
  in the caption on the deck tile only (`deck-card-tile.tsx:347`); `/collection` draws none, since
  every card there is owned.
- **The card captions rulings** (`docs/superpowers/design-briefs/2026-09-14-modifiers-below-the-card.md`,
  §2): ruling 1, "Modifiers leave the art"; ruling 2, "Cost pips are deleted from the card view,
  not relocated." Consider was not in that round's scope.
- **The fact marks** (`CardFactMark`, `src/components/cards/card-fact-mark.tsx`) at 16px everywhere,
  hovered through `FactTooltip`. On `/collection`'s tile they sit in the meta line's left group.

## The ask

- **Consider tiles that read as the same family as the other card tiles**: nothing on the art,
  ownership and availability in a caption, no cost pips, and the marks and the combo clause in
  one consistent place.
- **A Consider tab whose sections a reader can find and fold**: more prominent shelf headers,
  and shelves that collapse.
- **A lift line that reads** on every theme.

## Open for Design

1. **The tile's caption.** Adopt `CardTileCaption` as is, or a Consider form of it. The Consider
   tile carries more than the other two tiles: evidence, lift, note and Add. Say what the caption
   holds and what stays in the body below it.
2. **Where the buy tag lives.** Every role shelf and the synergy shelf are built from owned
   cards only, so every unowned card is on the unowned shelf, and the `$` tag can only ever draw
   there, saying what the shelf heading already says. Keep it in the caption slot, or drop it there.
3. **Marks and combo together.** Confirm §C2 (the lemniscate joins the marks line), or keep the
   clause under the name and amend §C2. Say where a card wearing a bolt and completing a combo
   draws both.
4. **The lift line's ink.** A token and a size that clear 4.5:1 on all six themes. If the line
   should stay quieter than the inclusion figure beside it, say how it does that without falling
   under the bar.
5. **The shelf header.** Its size, weight and face, and whether the coverage clause and
   `Show all N` stay on the header line.
6. **Collapsing a shelf.** What a collapsed shelf shows (its header alone, or a count too); the
   default state (all open, or only the first few); whether the state survives a reload, a tab
   change, or a card added from the shelf. A collapsed shelf and a capped shelf
   (`Show all N`) are two different controls on one header: say how they sit together, or
   whether one replaces the other.
7. **The phone.** The 2-up grid with a caption is taller per tile. Say whether the phone keeps
   2-up.
8. **The About entry.** Whether this is a cosmetic change, which owes no entry under the card
   captions precedent (Hugh, 2026-09-15), or a feature, since collapsible shelves are new. Hugh
   decides.

Copy for any new string goes through `/copy-review`, not this round.

**Out of scope:** what a shelf contains and how it is ranked, the quick-add search rows, the
top-off list, and the card note's own content.

## Where it lives

- `src/components/decks/consider-panel.tsx`: the tab, the shelves, the headers, the cap.
- `src/components/decks/suggestion-tile.tsx`: the tile.
- `src/lib/decks/shelf-cap.ts`: `SHELF_CAP`.
- `src/lib/copy/decks-builder.ts`: the tile and shelf copy, including `lift`.
- `src/app/globals.css`: the theme tokens measured above.
- Handoffs: `design/design_handoff_the99_add_panel/` (the tile and shelf as first drawn),
  `design/design_handoff_the99_card_captions/` (the caption pattern),
  `design/design_handoff_the99_push_line/` (§C2, the marks, and the unbuilt tile amendment),
  `design/design_handoff_the99_synergy_discovery/` (the lift line).
- Intake: H30.
