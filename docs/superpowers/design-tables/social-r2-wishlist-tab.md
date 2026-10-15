# Social R2 — Collection › Wishlist tab: design property table

Source: `design/design_handoff_the99_social_r2/` — `R3 - Wishlist-Desktop.dc.html` (W1–W4, 1300) and
`R3 - Wishlist-Phone.dc.html` (WP1–WP4, 390), README "Round 3 changes" (wins over round 2), READINESS (🟢 2026-10-15),
with `STATES-social-r2.md` and `social-r2 · copy strings.ts` for states and slot names. Both boards share one stylesheet.

**Scope:** the tab's own content below the shipped collection head and place strip. Head, tabs, rail, tab bar, card
details, spares and friend pages are out of scope. Board annotations (the dashed pink `.new` outline, captions) are not
properties.

**Fonts:** Sans = `IBM Plex Sans`; Mono = `IBM Plex Mono`; Display = `Chakra Petch`.
**Copy slots** name keys in `wishlistCopy` (`page.*`, `tile.*`, `details.*`). Wording is not a property.

---

## 1. Page order (top to bottom, inside the tab body)

| # | Element | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| 1 | Toolbar: search field (+ Sort pill on desktop) | search field alone | search field, Sort pill pushed right |
| 2 | Collected receipt strip | when present | when present |
| 3 | Meta row(s) | count row; friends line on its own second row | one row: count left, friends line right |
| 4 | Grid of tiles / empty card | 3-up grid / empty card | 6 × 178px grid / empty card |
| — | Results panel | absolute overlay under the field | absolute overlay under the field |

---

## 2. Toolbar

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Toolbar `.tb` | display | — (field is a block in `.pbody`) | flex; align-items center |
| | gap | — | 12px |
| | padding | — | 18px 34px 0 |
| Search field `.sf` / `.psf` | display | flex; align-items center | flex; align-items center |
| | margin | 14px 14px 0 | 0 (inside toolbar padding) |
| | height | 44px | 46px |
| | width | full column (390 − 2×14) | 560px, `flex: none` |
| | gap (icon → text) | 10px | 12px |
| | padding | 0 14px | 0 16px |
| | border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| | border-radius | 10px | 10px |
| | background | not set (inherits page `--bg`) | `--bg` |
| | font-size / family | 15px Sans | 15px Sans |
| | color (placeholder) | `--fg-placeholder` | `--fg-placeholder` |
| | slot | `page.search.placeholder` | `page.search.placeholder` |
| Search field, focused/typing (`.on`) | border-color | `--accent` | `--accent` |
| | color (typed text) | `--fg` | `--fg` |
| Caret (drawn) | size | 1.5 × 18px | 1.5 × 18px |
| | background | `--accent` | `--accent` |
| | margin-left | −8px | −8px (inline; class default −10px) |
| Search icon (magnifier) | size | 18 × 18, viewBox 24 | 18 × 18, viewBox 24 |
| | stroke / width | `--fg-muted`, 2 | `--fg-muted`, 2 |
| | fill | none | none |
| | shape | circle cx11 cy11 r6.5 + path `M16 16l4.5 4.5` | same |
| Sort pill `.dd` | rendered | **not drawn on phone** | yes, `margin-left: auto` (right edge of toolbar) |
| | display | — | inline-flex; align-items center |
| | gap | — | 10px |
| | height | — | 44px |
| | padding | — | 0 16px |
| | border-radius | — | 9px |
| | background | — | `--surface-raised` |
| | border | — | 1px solid `--surface-raised` |
| | color | — | `--fg` |
| | font | — | 500 14.5px Sans |
| | content | — | shipped Sort control, value + `▾` (no key in the copy file; current option `Newest`) |
| | condition | — | shown when the list has cards (W2–W4); absent when empty (W1) |

---

## 3. Results panel (search open)

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Panel `.res` | position | absolute, z-index 5 | absolute, z-index 5 |
| | placement | left 14px, right 14px, width auto; top 64px of tab body (6px under the field's bottom at 58px) | left 34px; top 226px of `<main>` (≈9px under the field's bottom at ≈217px); width 560px = field width |
| | background | `--surface-raised` | `--surface-raised` |
| | border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| | border-radius | 12px | 12px |
| | box-shadow | 0 22px 50px rgba(0,0,0,.6) | 0 22px 50px rgba(0,0,0,.6) |
| | padding | 6px 0 | 6px 0 |
| Result row `.rr` | display | flex; align-items center | flex; align-items center |
| | gap | 12px | 12px |
| | height | 56px | 56px |
| | padding | 0 10px 0 14px | 0 10px 0 14px |
| | border-top | 1px solid `--elevated` (none on first row) | 1px solid `--elevated` (none on first row) |
| Thumbnail `.th` | size | 30 × 42px, `flex: none` | 30 × 42px, `flex: none` |
| | border-radius | 3px | 3px |
| | overflow | hidden | hidden |
| | background | `--surface-sunken` | `--surface-sunken` |
| | img | 100% × 100%, object-fit cover, block | same |
| Name block `.rn` | display | flex column; gap 2px; flex 1; min-width 0 | same |
| Name `.rn b` | font | 600 14px Sans | 600 14px Sans |
| | color | `--fg` | `--fg` |
| Sub line `.rn span` | font | 11px Mono | 11px Mono |
| | color | `--fg-faint` | `--fg-faint` |
| | content, not on list | owned count (`you have N`; no key in copy file) | owned count (`you have N`) |
| | content, on list | `page.search.onList` **only** (owned count dropped) | owned count `·` `page.search.onList` |
| Add button `.wbtn` | rendered | card not on the list | card not on the list |
| | display | inline-flex; align-items center | inline-flex; align-items center |
| | gap | 7px | 7px |
| | height | **44px** | 36px |
| | padding | 0 13px | 0 13px |
| | border | 1px solid `--accent` | 1px solid `--accent` |
| | border-radius | 8px | 8px |
| | background | transparent | transparent |
| | color | `--accent` | `--accent` |
| | font | 600 13px Sans | 600 13px Sans |
| | white-space | nowrap | nowrap |
| | slot | `page.search.addShort` | `page.search.add` |
| Bookmark icon (in Add) | size | 15 × 15, viewBox 24 | 15 × 15, viewBox 24 |
| | stroke / width | currentColor (`--accent`), 1.8, linejoin round | same |
| | fill | none (outlined: not yet on the list) | none |
| | path | `M6.5 3.5h11v17l-5.5-4-5.5 4z` | same |
| Stepper in row | rendered | card on the list (replaces Add in the same slot) | card on the list (replaces Add in the same slot) |
| | wrapper | `.step` alone, **no `want` label** | `.wrow`: flex, align center, gap 12px, 12.5px Mono (inline override of 13.5), `--fg-muted`; label `details.want` then `.step` |
| `.step` | display | inline-flex; align-items center | inline-flex; align-items center |
| | height | **44px** | 34px |
| | border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| | border-radius | 8px | 8px |
| | overflow | hidden | hidden |
| − / + presses | size | **44 × 44px** | 34 × 34px |
| | display | flex; centered | flex; centered |
| | color / size | `--fg`, 16px | `--fg`, 16px |
| | accessible names | `details.fewer` / `details.more` | `details.fewer` / `details.more` |
| Count `.step b` | min-width | 30px, text-align center | 30px, text-align center |
| | font | 600 14px Mono | 600 14px Mono |
| | color | `--fg` | `--fg` |
| | border-left / border-right | 1px solid `--border-strong` | 1px solid `--border-strong` |
| | line-height | 44px | 34px |
| | range | 1–99 (− held at 1 in R1; cap 99) | same |

Superseded, do not build: `.wbtn.done` / `page.search.added` (round 2's `Added`: border `--border-strong`, color
`--fg-body`, weight 500). Round 3 turns Add into the stepper instead.

---

## 4. Dimming behind the open panel

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| What dims | the grid only | the grid only (meta row and toolbar are NOT dimmed) |
| opacity | .35 | .4 |
| Other change | grid gets `margin-top: 30px` (sits under the panel; the meta row is not drawn in WP2) | none; meta row stays at full opacity |
| Scrim | none | none |

---

## 5. Collected receipt strip

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Strip `.rcpt` | display | flex | flex |
| | align-items | **flex-start** | center |
| | gap | 12px | 12px |
| | margin | 12px 14px 0 | 14px 34px 0 |
| | padding | 12px 16px | 12px 16px |
| | border-radius | 10px | 10px |
| | background | `--surface-raised` | `--surface-raised` |
| | border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| | font-size / family | **13.5px** Sans | 14px Sans |
| | color | `--fg-body` | `--fg-body` |
| | role | status (`role="status"`) | status |
| | slot | `page.collectedLeftShort(names)`, first names | `page.collectedLeft(names)`, full names |
| Names `b` | color / weight | `--fg`, 500 | `--fg`, 500 |
| Check `.c` | glyph / color / size | `✓`, `--success`, 16px | `✓`, `--success`, 16px |
| Dismiss `.x` | glyph | bare `✕` | bare `✕` |
| | margin-left | auto (right edge) | auto |
| | size | CSS 32 × 32px; caption says **a 44px press** on phone (caption wins as intent; flag) | 32 × 32px |
| | display | flex; centered; `flex: none` | same |
| | color | `--fg-muted` | `--fg-muted` |
| Placement | | after the search field, before the meta row | after the toolbar, before the meta row |

---

## 6. Meta row (count and friends line)

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Row `.meta` / `.pmeta` | display | flex; justify-content space-between | flex; align-items center; justify-content space-between |
| | padding | 12px 14px 0 | 14px 34px 0 |
| | font | 11.5px Mono | 12.5px Mono |
| | color | `--fg-muted` | `--fg-muted` |
| Count | slot | `page.meta(wanted)` | `page.meta(wanted)` |
| Friends line `.r` | position | **its own second `.pmeta` row**, padding-top 6px (12px 14px 0 otherwise) | right side of the same row |
| | color | `--fg-faint` | `--fg-faint` |
| | font | 11.5px Mono | 12.5px Mono |
| | slot | `page.friendsLine` | `page.friendsLine` |
| | condition | viewer has at least one friend | same |
| Row condition | | absent when empty (WP1) and while the search panel is open (WP2) | absent when empty (W1); present under the open panel (W2) |

---

## 7. Grid and tile

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Grid `.grid` / `.pgrid` | display | grid | grid |
| | grid-template-columns | repeat(3, 1fr) | repeat(6, 178px) |
| | gap | 8px | 20px |
| | padding | 12px 14px 14px | 18px 34px 34px |
| | order | `Sort` (default Newest) | `Sort` (default Newest) |
| Tile `.tile` | width | auto (track) | 178px |
| | border-radius | 9px | 10px |
| | overflow | hidden | hidden |
| | background | `--surface` | `--surface` |
| | border | 1px solid `--border` | 1px solid `--border` |
| | display | flex column (art, then caption) | flex column |
| | interaction | whole tile opens card details; no controls on the tile | same |
| Art `.ar` | aspect-ratio | 63 / 88 | 63 / 88 |
| | position / overflow | relative / hidden | relative / hidden |
| | border-radius | 0 0 9px 9px | 0 0 10px 10px |
| | background | `--surface-sunken` | `--surface-sunken` |
| | img | absolute inset 0, 100% × 100%, object-fit cover, block | same |
| | inner edge `::after` | absolute inset 0, radius inherit, box-shadow inset 0 0 0 1px rgba(0,0,0,.25) | same |
| | content | full card image, any printing (G1) | same |
| Caption `.cpt` | display | flex column; justify-content center | same |
| | gap | 3px | 4px |
| | padding | 6px 7px 8px | 7px 10px 9px |
| | min-height | 54px | 62px |
| Name row (wrapper) | display | flex; align-items center; gap 6px; min-width 0 | same |
| Name `.cn` | font | 600 12px Sans | 600 13px Sans |
| | line-height | 16px | 17px |
| | color | `--fg` | `--fg` |
| | overflow | nowrap, hidden, ellipsis | same |
| Sub `.cs` | font | 9px Mono | 9.5px Mono |
| | line-height | 1.2 | 1.2 |
| | color | `--fg-faint` | `--fg-faint` |
| | overflow | nowrap, hidden, ellipsis | same |
| | slot | `tile.caption(want, have)` | `tile.caption(want, have)` |
| Want figure `.cs b` | weight / color | 600, `--fg-body` | 600, `--fg-body` |
| Spare marker on tile | rendered | **never** (R3: off wishlist tiles) | **never** |
| Collected tile / `tile.collected` / `.tile.dim` | rendered | **never** (R3: a collected card leaves the list) | never |

---

## 8. Empty state

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Card `.pempty` / `.empty` | margin | 16px 14px 0 | 22px 34px 0 |
| | border | 1px dashed `--border-dashed` | 1px dashed `--border-dashed` |
| | border-radius | 12px | 12px |
| | padding | 22px 20px | 30px 32px |
| | layout | block: ghosts on top, then title, then body | flex row; align-items center; gap 28px (ghosts left, text right) |
| Ghosts `.ghosts` | display | flex; gap 10px; margin-bottom 16px | flex; gap 10px; `flex: none` |
| Ghost card `.ghost` (×2) | size | 58 × 81px | 74 × 103px |
| | border-radius | 7px | 7px |
| | border | 1px dashed `--border-dashed` | 1px dashed `--border-dashed` |
| | background | repeating-linear-gradient(135deg, `--surface` 0 3px, `--surface-rail` 3px 6px) | same |
| | second ghost | transform rotate(4deg) | rotate(4deg) |
| Title `b` | display | block | block |
| | font | 700 18px Display | 700 19px Display |
| | color | `--fg` (inherited) | `--fg` |
| | margin-bottom | 6px | 6px |
| | slot | `page.emptyTitle` | `page.emptyTitle` |
| Body `p` | font | 14px Sans, line-height 1.6 | 14px Sans, line-height 1.6 |
| | color | `--fg-muted` | `--fg-muted` |
| | margin | 0 | 0 |
| | max-width | — | 600px |
| | slot | shorter phone wording, **no key in the copy file** (flag for /copy-review) | `page.emptyBody` |
| Condition | | wishlist has no lines; search field above; no Sort, no meta row, no friends line | same |

---

## 9. Failure toast (shared `ToastFrame`, not drawn on these boards)

Defined in the boards' stylesheet as "the shared ToastFrame"; it is the shipped component, so match it rather than these
values if they differ.

| Property | Value (both widths) |
|---|---|
| position | absolute; left 50%; bottom 28px; translateX(−50%); z-index 7 |
| display / gap | flex; align-items center; gap 14px |
| padding | 12px 10px 12px 18px |
| border-radius | 12px |
| background | `--elevated` |
| border | 1px solid `--border-dashed` |
| box-shadow | 0 18px 40px rgba(0,0,0,.5) |
| font / color | 14px Sans, `--fg`, nowrap |
| dismiss `.x` | 36 × 36, centered, `--fg-muted`, 14px |
| role | `alert` |
| slot | `details.failedAdd` (add failed) / `details.failedSet` (stepper write failed) |

---

## 10. Hover and focus

| Element | State | Mobile | Desktop |
|---|---|---|---|
| Search field | focused / typing | border `--accent`, text `--fg`, caret drawn | same |
| Everything else (Add, stepper, Sort, tile, ✕) | hover / focus | not drawn: use the shipped components' states | not drawn |

---

## 11. Responsive variants (summary)

| Area | Mobile (390) | Desktop (1300) |
|---|---|---|
| Sort pill | absent | right of the search field |
| Search field | full width, 44px, 14px side margins | 560px, 46px |
| Add button label | `page.search.addShort` | `page.search.add` |
| Hit size: Add, stepper presses | 44px | 36px / 34px |
| Stepper `want` label | absent | present |
| On-list sub line | `page.search.onList` alone | owned count · `page.search.onList` |
| Panel | 14px insets, top 64 | 560 wide at the field's left, top 226 |
| Dim | grid .35 + 30px top margin; meta row hidden | grid .4; meta row shown |
| Receipt | 13.5px, align top, first names (`collectedLeftShort`), ✕ 44px per caption | 14px, centered, full names (`collectedLeft`), ✕ 32px |
| Friends line | own row under the count | right end of the count row |
| Grid | 3 × 1fr, gap 8 | 6 × 178px, gap 20 |
| Tile | radius 9; caption 12/9px; min-height 54 | radius 10; caption 13/9.5px; min-height 62 |
| Empty | stacked, ghosts 58×81, title 18px, short body | row, ghosts 74×103, title 19px, `emptyBody` |

---

## State Coverage

| State | Trigger | Drawn | What renders |
|---|---|---|---|
| Empty | wishlist has no lines | W1, WP1 | search field, empty card. No Sort, no meta row, no friends line, no grid. |
| Populated | ≥1 line, viewer has no friends | W2 meta (no friends line), WP4 | toolbar (+ Sort on desktop), meta count, grid. |
| Populated with friend | ≥1 line and ≥1 friend | W3, WP3 | as populated + `page.friendsLine` (desktop right of count; phone own row). |
| Search open with results | field focused with a query | W2, WP2 | field `.on`, panel of rows, grid dimmed (.4 / .35); phone hides meta. |
| Result row, not on list | result card has no wishlist line | W2, WP2 | sub line = owned count; Add button (outlined bookmark). Press adds at owned + 1 (cap 99, G4). |
| Result row, on list (stepper) | result card already on the list, or just added | W2, WP2 (Ghoulcaller Gisa) | Add replaced in place by the want stepper (desktop with `want` label); sub line gains / becomes `page.search.onList`. |
| Collected strip present | cards left the list because the collection reached their want since last view (G5) | W4, WP4 | receipt strip under the search, above the meta; shown once; ✕ dismisses. Also follows lowering a want to what you hold. |
| Collected strip dismissed / already seen | after ✕ or a later visit | W3 | no strip. |
| Failure toast | an add or a stepper write fails | note only (STATES "A write fails") | old value put back; shared `ToastFrame`, `role="alert"`, `details.failedAdd` / `details.failedSet`. |
| Switch off | `SOCIAL_WISHLIST_ENABLED` off | — | no tab; route not found. |

## Flags for the reviewer

1. Phone receipt ✕: CSS 32px, caption says a 44px press. Build 44px on phone.
2. Phone empty body and the `you have N` sub line have no key in the copy file.
3. No copy key for the Sort control; it is the shipped Sort pill.
4. `page.search.added`, `tile.collected` and `.wbtn.done` are round-2 leftovers, superseded by round 3.
