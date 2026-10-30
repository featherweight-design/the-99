# STATES — card surfaces

Two matrices. **Six rows × two widths × four states** carries forward from
`design_handoff_the99_card_rows/STATES-card-rows.md` — now on `main`, and reconciling cleanly — amended
only where this handoff changes a row.
**The card view tile × four states × two sizes** is new. `—` means the slot draws nothing, which is a
state and not an omission.

## The state definitions

Unchanged from card-rows R1, and repeated because the tile now inherits them.

| State | Data | Dot | Availability slot | Shell |
|---|---|---|---|---|
| **owned** | in the collection, no finished deck claims a copy | filled `--success` | — (marker returns `null` at `free`) | flat |
| **unowned** | not in the collection | hollow, 1px dashed `--fg-locked` | **row:** `BuyTag` — full `buy $12.40` on Shopping, collapsed to a bare `$` on All. **tile:** the same collapsed `$` chip | flat |
| **committed** | owned; every copy claimed by a finished deck | filled `--avail-hard-fg` | marker/chip, hard — solid `--avail-hard` diamond | flat |
| **over-committed** | demand across finished decks exceeds copies owned | filled `--avail-hard-fg` | marker/chip, over — doubled `--danger` diamonds | row: `inset 0 0 0 1px --avail-over-border` · **tile: border tint** |

The fifth state, **soft** (`N free`), is the same slot occupant one step quieter and no surface
treats it specially.

## Matrix 1 — the six rows

| Row | owned | unowned | committed | over-committed | this handoff |
|---|---|---|---|---|---|
| `collection/rows-view.tsx` | `×1` · identity pips · name · type · set › | **impossible** — /collection lists what you own | + `none free` inline after the name | + `short 1`, inset ring | **unchanged** |
| `decks/decklist-row.tsx` | dot · name `×2` · **cost track** · ✕ | dashed dot · **cost** · **`$`** (All) / `buy $12.40` (Shopping) | committed dot · **cost** · `none free` | committed dot · **cost** · `short 1` · `2nd copy` · inset ring | **gains the track; buy tag collapses on All** |
| `decks/card-search-row.tsx` | thumb · name · type · **cost (34px, shipped)** · `×1 owned` · + | `not owned` in `--warning` | + `none free — in Atraxa` desktop / `none free` phone | + `short 1` | **unchanged — the precedent** |
| `decks/unresolved-row.tsx` | **exempt from both rulings — no oracle id.** One drawing per width | | | | radius only |
| `decks/update-diff-row.tsx` | dot · name · `auto` · type · `Keep` | dashed dot · `BuyTag` | committed dot · `none free` | committed dot · `short 1`, inset ring | **slot yes, pips no** |
| `commanders/synergy-row.tsx` | shared dot, filled | **dashed** — was a solid ring | committed dot (ships today) | **slice B** — no data path on this route | **slot slice B, pips no** |

Two cells impossible by construction, one deferred, twenty-one drawn.

## Matrix 2 — the card view tile

All tab only (ruling 2). Drawn at **148px** desktop (five columns of an 820px pane at gap 20) and
**159px** phone (2-up at 358px, `grid-view`'s shipped padding and gap).

| State | top-left | top-right | bottom-left | caption |
|---|---|---|---|---|
| **owned** | — (marker returns null at `free`) | `×2` badge (absent at one copy) | filled `--success` dot + cost pips | name · `✕` |
| **unowned** | **the collapsed `$` chip** | — | dashed hollow dot + cost pips | name · `✕` |
| **committed** | chip, hard — `none free` | — | `--avail-hard-fg` dot + cost pips | name · `✕` |
| **over-committed** | chip, over — `short 1` | — | `--avail-hard-fg` dot + cost pips | name · `✕` — tile border `--avail-over-border` |

**Bottom-right is empty in all four states, deliberately.**

**The top-left corner is the availability slot, and it is never empty on a card the player does not
own.** R1 called the chip the tile's slot occupant and simultaneously drew unowned with both corners
bare — a contradiction, because `AvailabilityMarker` only speaks about copies you *own* and ruling 1
dropped `BuyTag`. That left unowned carried by an 8px dashed stroke alone, which card-rows' FLOOR
doc calls a defect twice over: a zero-occupant slot, and the dot standing in for the floor.
**R2 fills it with the collapsed `$` chip from call 1.**

**Owned is the one state that draws nothing there, and that is the marker's own contract** — it
returns null at `free`, the same as on every row. Nothing to say is not the same as nothing to show.

**Still no price, no word, no auto tag, no set/rarity caption** (ruling 1, plus the delta list). A
bare `$` passes ruling 1's *facts not affordances* test where `buy $12.40` did not: it says **that**
the card must be bought, which is a fact about the card, and not **what** it costs or **where** to
get it, which are the shopping view's job.

**The Shopping second-copy pair still cannot occur on a tile**: it needs the full `BuyTag` beside a
marker, and card view is All-only. The tile's slot holds exactly one thing, always.

## Per-row geometry, both widths

All six rows use radius **7px**, `--row-bg` tracking the hover swap, and the inset ring for
over-committed. **Tiles use radius 9px phone / 10px desktop and keep the border tint** — see
`README.md` call 1.

| Row | Desktop | Phone |
|---|---|---|
| `rows-view` | grid `52 54 1fr 150 92 18`, 44px, pad `12px 18px`, gap 16 | grid `38 40 1fr auto`, 56px, pad `10px 12px`, gap 10 |
| `decklist-row` | flex, 34px, pad `9px`, gap 10, **cost track 40px** | flex, **44px no meta / 52px with**, pad `8px / 4px`, gap 9 |
| `card-search-row` | flex, 56px (30×42 thumb), pad `9px`, gap 12, cost slot 34px | flex, 62px (32×45 thumb), pad `8px / 4px`, gap 9 |
| `unresolved-row` | flex, 44px, pad `6px 9px`, gap 10 | flex, 44px, pad `6px 8px`, gap 9 |
| `update-diff-row` | flex, 44px, pad `0 6px 0 12px`, gap 10 | flex, 44px, pad `0 6px 0 12px`, gap 9 |
| `synergy-row` | flex, 44px, pad `0 6px 0 12px`, gap 10 | flex, 52px (meta line), pad `0 6px 0 12px`, gap 9 |

## The pip ladder

Desktop, 12px pips, gap 3, fixed 40px track, right-aligned.

| Cost | Slots drawn | Measured | Rule |
|---|---|---|---|
| `{U}` | 1 | 12px | plain |
| `{2}{W}` | 2 | 27px | plain |
| `{1}{W}{B}` | 3 | 26px | **shingles** — three plain would be 42px and burst the track |
| `{2}{U}{B}{R}` | 4 | 33px | shingled |
| `{W}{U}{B}{R}{G}` | 5 | **40px** | shingled — this is the track |
| `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}` | 4 + `+7` | 40px | **capped** |

Phone, 13px, gap 3, on the meta line, **no fan and no cap**: `{1}{W}{B}` = 45px,
`{W}{U}{B}{R}{G}` = 77px, ten symbols = 157px of a 358px line.

**Hybrid and Phyrexian** keep `CostPips`' shipped treatment: two colours split the pip on a 135°
gradient, one fills it, and the numeral draws whenever the symbol has one — so two-brid `{2/W}` is a
white pip reading 2 rather than a white pip claiming to be free. **Colourless and generic** draw the
grey `--fg-faint` pip, which is also the `+N` overflow pip's skin.

## Tap targets

| Control | Phone | Desktop |
|---|---|---|
| whole row (browse, unresolved, search) | ≥44px | — |
| card name (modal trigger) | rides the row's height | rides the row's height |
| `✕` remove, row | 44×44 (glyph stays 13px; the padding is the target) | inline, group-hover |
| `✕` remove, **tile** | **44×44 in the caption** | **32×32 in the caption, tile-hover** |
| `$` chip / `BuyTag` | **never a target** | **never a target** |
| tile art (modal trigger) | the whole art block | the whole art block |
| view toggle segment | **44×44** | **32×32** |
| modal flip control | **44×44** | 34×34 |
| `+` add / toggle | 44×44 | 34×34 |

**The marker is never a tap target** and has no hover, no focus ring and no `title`. **The hover
preview is never a target either** — it is `aria-hidden` and pointer-transparent.

**The view toggle's segments were 28×24 / 30×28 at R1 — inherited from `/collection`, flagged rather
than adopted silently, and now ruled.** Refresh R2's floor takes no exception here, because R2's own
exception test is *shortcut or only route* and the toggle is the only route to card view. **Both
surfaces move to 44×44 phone / 32×32 desktop in one PR**, which keeps them one control. Container
94×48 phone / 70×36 desktop. See `README.md` § *Reconciled with refresh R2*.

**The tile's desktop `✕` moves 24 → 32px** for the same reason: it is the only route to removing a
card in card view, so it does not qualify for the tile-art exception either.

## Colour is never the only carrier

| Fact | Colour | The other carrier |
|---|---|---|
| unowned | — (hollow) | **dashed** stroke, plus a slot occupant at every width and on every surface: `buy $12.40` on Shopping, the `$` glyph on All and on the tile |
| committed | `--avail-hard-fg` | the label `none free`, and a solid diamond where hollow means soft |
| over-committed | `--avail-over-fg` + ring/tint | the label `short N`, and a **doubled** glyph |
| mana cost | pip fills | the **`sr-only` cost string** (`CostPips` gains one, ruling 6) and the numeral inside generic pips |
| pip overflow | — | the `+N` **numeral**; the `sr-only` string is never truncated |
| two-faced | — | the `//` **glyph**, plus `sr-only` "two-faced card", plus the flip control's accessible name |
| list vs card view | **none — the active segment is bone on `--elevated`, not accent** | `aria-pressed`, the `≣` / `▦` glyph shapes, and the `--border-strong` ring |
| All vs Shopping filter | **none — active pill is bone on `--elevated`** | the count in the label, and the ring |

**Accent appears nowhere on the builder's control bar.** Refresh R2 reserves it for *in use / to
buy*, and the bar sits on the one screen where accent carries that meaning on the rows beneath it.
Selected state on the bar is bone on `--elevated` with a `--border-strong` ring — the treatment the
active grouping pill already ships.

**Mana colour is the one place this handoff relies on hue for a distinction** — W/U/B/R/G pips are
the game's own colour code, and the `sr-only` string is what carries it in words. That is
`CostPips`' shipped bargain, and ruling 6 makes the string mandatory rather than optional.

## Accessibility

- **Rows with a row-level `aria-label` hoist the marker's prose into it** (`rows-view`,
  `synergy-row`); rows without one let the marker speak with `spoken` (`decklist-row`). Unchanged.
- **`CostPips` is `aria-hidden` today** and gains an `sr-only` sibling carrying the cost in words
  (ruling 6). One string, one mapper — see `card-surfaces · copy strings.ts`.
- **The tile's art is a `CardDetailTrigger`** carrying its own `aria-label`, which replaces
  everything nested inside it. So the chip is `spoken` and the dot, badge and pips sit **outside**
  the trigger's subtree, the way `suggestion-tile` already arranges its marks and for the reason
  recorded there.
- **The hover preview is `aria-hidden` and has no focus behaviour.** It is a pointer affordance
  duplicating a row that is already reachable; the modal is the keyboard and screen-reader path.
- **The view toggle is two `aria-pressed` buttons**, matching `/collection`.
- **The flip control's accessible name is the other face's name**, and the modal announces the face
  change. Prev/Next resets to the front face.
- Focus is the global `:focus-visible` — 2px brass at +2px offset, not overridden per surface.

## Zero net motion

No transition and no animation on any shell, dot, marker, pip, tile, glyph or preview. Locked
constraint, card-availability design row 3.7. Three places where this handoff could have reached for
motion and does not:

- **The hover preview appears** rather than fading or scaling. The 240ms delay does the work.
- **The flip swaps the image** rather than turning it over.
- **The view toggle re-renders in place.** No cross-fade between list and card view, which is also
  what `CONTROLS`' *neither control may animate the list* rule already required of the discovery
  controls.

A hover background swap is not motion, and the `✕`'s hover colour change stays.
