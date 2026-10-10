# Deck printings, part A: choosing in card details (design property table)

Source: `design/design_handoff_the99_deck_printings/` (R3, approved 2026-10-10). Values come from
`DP Picker.dc.html` (the shared part every A frame imports), the R3 canvas §A1/§A2/§A3/§D1,
`README.md`, `STATES-deck-printings.md`, `READINESS-audit.md` (E8, E9, errata) and the copy file.
R1 §A (the "In this deck" block, catalog choose role, `Use the default`) is fully superseded by
R2/R3 and contributes nothing here.

Copy is recorded as a **slot**, never as wording. Slots named `deckPrintingsCopy.picker.*` are the
new deck-scope strings; `printingPickerCopy.*` slots are the shipped collection strings.

"Desktop" = the 440 desktop column / 820×620 modal. "Mobile" = 390 full sheet (`ph: true`).

## 1. Context: where the picker sits

| Element | Desktop | Mobile |
|---|---|---|
| Host | Shipped card details modal, opened from a deck (`CardDetailProvider deckId`). 820×620, radius 16, `--surface-rail`, 1px `--border-strong`. Art column 320px `--surface-sunken`; content column padding `30px 30px 22px`, scrolling body flex column gap 18 | Shipped full sheet: 180px art header, body padding `16px 20px 22px`, flex column gap 12 |
| Modal order (unchanged from `main`) | title + pips, rules text, Two-card combos, In this deck (proxy), four-cell meta row, [region when open], footer (Buy at Mana Pool, Find a deck for it, Prev / N of M / Next) | Set row promoted to the top of the body, region attaches directly below it, then the Rarity/Identity 2-col grid (1px `--border`, radius 12) |
| Set field position | First cell of the meta row: flex, gap 26, align flex-start, padding-left 12; siblings Rarity, Identity, You own | First item of the sheet body, full width |
| Region position | Below the meta row, inside the scrolling column (sibling in the gap-18 stack) | Attached under the Set field (shares its dashed border, no top edge) |
| Top fade | 36px `linear-gradient(var(--surface-rail), transparent)`, drawn ONLY when the column is scrolled (`h.scrolled`) | — |
| Art column price tag | Mono 10px, `--accent`, 1px `--accent-dim` border, radius 4, padding `2px 7px`. Moves with the pick (art, tag, Set field move together). Prices the printing under the art; `no stock` slot if that printing has none (D2: never the fallback figure) | Not drawn at 390 (shipped sheet) |
| New block | — (no new block, no "In this deck" row) | — |

## 2. Set field (the disclosure trigger)

| Property | Desktop | Mobile |
|---|---|---|
| Container layout | `display:flex`; padding `8px 12px`; margin `-8px -12px` (bleeds into the cell) | `display:flex; align-items:center; gap:12`; `min-height:62`; padding `11px 14px` |
| Background | `var(--elevated)`; `transparent` when one/no owned printing | `var(--elevated)`; `transparent` when one/no owned printing |
| Border | `1px dashed var(--border-dashed)`; single: `1px solid transparent` | `1px dashed var(--border-dashed)`; single: `1px solid var(--border)` |
| Radius | 8 | 10 closed; `10px 10px 0 0` open (region attaches) |
| Thumb | — | 40×56, radius 5, `aria-hidden`, art of the printing shown; `flex:none` |
| Text column | `flex:1; min-width:0`; flex column gap 5 | same |
| Label | Field label slot (`Set`): IBM Plex Mono 11px, `letter-spacing:0.14em`, uppercase, `--fg-faint` | same |
| Value | `{setCode} · {collectorNumber}` of the printing the deck shows (pick → Collection's pick → default): 15px, `--fg` | same |
| Disclosure line wrapper | Rendered only when owned printings > 1. Flex, align center, gap 6, IBM Plex Mono 11px | same |
| Disclosure, nothing picked | Shipped slot `{count} printings you own {chev}`: `--accent`, 11px mono. No diamond | same |
| Disclosure, picked | 3 parts: (a) diamond 7×7, `rotate(45deg)`, `background:var(--accent)`, `aria-hidden`; (b) **pinned line label slot** `deckPrintingsCopy.picker.pinned`: 10px, `letter-spacing:0.14em`, uppercase, `--accent`; (c) `· of {count} {chev}`: 11px mono, `--fg-faint` | same |
| Chevron | `▾` closed, `▴` open | same |
| Count | number of OWNED printings of the card | same |

## 3. Region (open picker)

| Property | Desktop | Mobile |
|---|---|---|
| Container | `margin-top:24` (0 when drawn standalone); `padding-top:22`; `border-top:1px solid var(--border)` | `margin-top:-1`; `padding:14`; `border:1px dashed var(--border-dashed)`; `border-top:none`; radius `0 0 10px 10px` |
| Role / source | Shipped `PrintingRegion role="art"` (owned source), plus `scope="deck"` | same |
| Intro line | `<p>`, margin `0 0 16px`, 13.5px, line-height 1.5, `--fg-muted`, top of region. **Intro slot, deck variants:** nothing picked → `deckPrintingsCopy.picker.regionIntro(n)` (n = owned count); picked → `deckPrintingsCopy.picker.regionIntroPicked` (no args). Shipped `regionIntro` / `regionIntroPicked` must NOT render | same slot and type, at the top of the attached region |
| Search + chips wrapper (overflow only) | flex column, gap 10, margin-bottom 14 | same |
| Search field | flex, align center, gap 8; height 38; padding `0 12px`; radius 9; `--surface-sunken`; `1px solid var(--border-strong)`; 13.5px. Icon `⚲` in `--fg-faint`; placeholder slot (shipped) in `--fg-locked` | height 44; font 16px; rest identical |
| Finish chips | inline-flex; padding `5px 11px`; radius 999; 12.5px; `1px solid var(--border-strong)`. Off: `--fg` on `--elevated`. On: `--bg` on `--accent`. Labels: shipped slots `All {n}`, `Foil {n}`, `Non-foil {n}`. Row: flex wrap, gap 8 | height 44; padding `0 11px`; rest identical |
| Tile grid | `role="radiogroup"`; `grid-template-columns:repeat(3, minmax(0,1fr))`; gap 16 | gap 12 |
| Tiles listed | Owned printings only | same |

## 4. Tile

| Property | Desktop | Mobile |
|---|---|---|
| Wrapper | `role="radio"`, `aria-checked` true on the pick; `cursor:pointer`. Keyboard focus: `outline:2px solid var(--accent)`, offset 2, radius 12 | same |
| Art | width 100%, `aspect-ratio:63/88`, radius 10, `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35)`; foil adds a sheen gradient | same |
| Art, this deck's pick | `outline:2px solid var(--accent)`, offset 3 | same |
| Art, Shown now | `outline:1px dashed var(--fg-faint)`, offset 3 | same |
| Corner badge | absolute, top 8, right 8, radius 5, centred, 11px. Pick: 21×21, `--accent` bg, no border, `--bg` ink, `✓`. Shown now: 19×19, `color-mix(in oklab, var(--bg) 72%, transparent)` bg, `1px dashed var(--fg-faint)`, `--fg-body` ink, `◇`. Other tiles: none | same |
| Name line | margin-top 7; 12.5px; line-height 1.3; `--fg`; weight 600 on the pick, 400 otherwise. Set code after it: margin-left 5, IBM Plex Mono 10.5px, weight 400, `--fg-faint` | same |
| Meta line | margin-top 2; IBM Plex Mono 10.5px; `--fg-faint`; `#{collectorNumber} · ×{qty}[ foil]` (owned quantity) | same |
| State label | margin-top 3; flex, align center, gap 5; IBM Plex Mono 9.5px; `letter-spacing:0.14em`; uppercase. Pick: shipped tile slot `Your pick` (meaning: this deck's pick), `--accent`, preceded by 7×7 accent diamond. Shown now: shipped tile slot `Shown now`, `--fg-muted`, no diamond. Rendered only on those two tiles | same |
| Shown now target | The deck's fallback: the Collection's pick, else the default (audit errata: pass the resolved fallback, not the printing on screen). Drawn only while nothing is picked | same |
| Dormant tile | — (never in deck scope) | — |

## 5. Save-failed notice

| Property | Desktop | Mobile |
|---|---|---|
| Position | Inside the region, directly BELOW the tile grid (`margin-top:12`) | Not drawn at 390 (audit E8); same component |
| Layout | flex, `align-items:center`, gap 8 | — |
| Text | **Failed slot** `deckPrintingsCopy.picker.failed` (no args): 12.5px, `--fg-body` | — |
| Glyph | `!` before the text, `aria-hidden`, IBM Plex Mono, weight 600, `--warning` | — |
| Colour rule | No red / `--danger` (STATES "Must not: Red") | — |
| Retry button | — | — |
| Tiles | Revert to their pre-press state (no `Your pick` tile, Shown now back on the fallback) | — |
| Region | Stays open | — |

## 6. Live announcement

| Property | Both widths |
|---|---|
| Slot | `deckPrintingsCopy.picker.announcePicked(printing)`, the modal's one live region; arg = the picked printing's name. Not drawn |

## 7. Controls absent in deck scope

| Element | Desktop | Mobile |
|---|---|---|
| Reset ("use default") | — (picking another tile is the way back) | — |
| Dormant tile (pick no longer owned) | — | — |
| Notice when a pick leaves the Collection | — | — |
| Unowned / catalog printings | — | — |
| Prices on tile meta | — | — |
| Pending banner, Commit, History line after a pick | — | — |

## 8. E9: details mounted without deck context

| Surface | Rule |
|---|---|
| Review screen (`review-changes`) and update diff (`update-diff`), mounted with `deckPage` and no `deckId` | Must NOT offer the pick: no deck scope is passed, so the deck-scope picker (pinned line, deck intro, deck write) does not render there (audit E9). The art follows the one resolver chain (README: "one rule covers every surface"). Not drawn |
| `proxy-list-view` | Mounts no details provider (E9); nothing to do |
| Switch `DECK_PRINTINGS_ENABLED` off | From a deck the Set field is as on `main`; chain skips step 1; picks kept |

## State coverage

| State | Trigger | What renders | Key props (`DP Picker` spec) |
|---|---|---|---|
| Nothing picked (collapsed) | Deck has no pick, owned > 1 | Set field, value = deck's current printing; disclosure `{count} printings you own ▾`; no region | `v:none` (desktop, 390) |
| Open, nothing picked | Field pressed, no pick | Field (chev ▴) + region: intro slot `regionIntro(n)`; owned tiles; `Shown now` badge/label/dashed outline on the fallback; no preselection; focus ring on the focused tile | `v:noneOpen`, focus `lcc` (desktop) |
| Picked (collapsed) | Deck has a pick | Diamond + pinned slot + `· of N ▾`; value = picked printing; art and price tag follow | `v:picked` (desktop, 390) |
| Picked, open | Pick exists, field open | Pinned line (▴); intro slot `regionIntroPicked`; pick tile with 2px accent outline, ✓ badge, `Your pick` + diamond, weight 600; NO Shown now tile | `v:pickedOpen` (desktop hero, D1, 390 hero) |
| Save failed | Write rejected | Tiles reverted (as nothing-picked open); `!` + failed slot below the grid | `v:failed` (desktop only) |
| One owned printing | owned = 1 | Plain MetaField: no disclosure line; transparent bg; desktop border solid transparent, phone border `1px solid var(--border)` with thumb | `v:single` (desktop, 390) |
| No owned printings | owned = 0 | Same as one printing | not drawn separately |
| Overflow | Many owned printings (shipped threshold) | Intro + shipped search field + finish chips above the grid | `v:many` (desktop only; drawn with a pick, so pinned line + picked intro) |
| Pick left the Collection | Picked printing no longer owned | Deck falls to Collection's pick, then default; pick cleared; that tile gone from the list; Shown now on the new fallback; no dormant tile, no notice | `v:gone` (desktop only) |
| Commander | Details opened from the deck head's art (each partner from its own details) | Same Set field and region, no separate control | not drawn as a frame |
| Switch off | `DECK_PRINTINGS_ENABLED` unset | `main` behaviour; picks kept | — |
| Review / update diff | No `deckId` | No pick offered (E9) | — |

## Deck scope versus the collection picker

Visually the deck-scope picker is the shipped component with **no new geometry, tokens or
styles** (README: "unchanged, except that the write goes to the deck"; "no new tokens"). The
differences are text slots, which controls are present, and where the write goes:

1. Pinned line label slot: `deckPrintingsCopy.picker.pinned` replaces `printingPickerCopy.printing.badgePicked` on the Set field line only (tiles keep `Your pick`).
2. Intro slot: `regionIntro(n)` and `regionIntroPicked` swap to the deck variants; same `<p>`, 13.5px, `--fg-muted`.
3. Reset: hidden.
4. Dormant tile: hidden; a lapsed pick is cleared instead.
5. `Shown now`: names the deck's fallback (Collection's pick, else default), not the printing on screen.
6. `Your pick` tile: means this deck's pick.
7. Failed notice: deck slot `failed` (`!` in `--warning`, text `--fg-body`, below the grid).
8. Announcement: deck slot `announcePicked(printing)`.
9. Write target: `(deck_id, oracle_id)`, never the art preference.
10. Not offered where details mount without a deck (E9).
