# Small polish batch: lock icon, placeholder contrast, motion retune, precon tile skeleton, token tile actions

Design brief, 2026-10-14. Asks for one small Design round on five unrelated polish items, the third entry in the Design
queue (priorities board, "Small polish", ranked by Hugh 2026-10-13). Each item is its own section: what is wrong, the
evidence from the code and staging, what is locked, and what is open for Design. They share a brief because each is
small and none needs a new surface. **They are independent**: Design can answer any subset and the rest wait.

Line numbers were read on 2026-10-14 against `origin/main` and move. Staging figures are read-only.

| # | Item | Kind | Origin |
|---|---|---|---|
| 1 | The lock icon | glyph redraw | Hugh, 2026-10-13 |
| 2 | Search placeholder contrast | palette call | contrast audit |
| 3 | Motion PR 6: retune ratified motion, new effects | ruling plus new visuals | motion plan, 2026-10-12 |
| 4 | Precon tile skeleton | new loading state | 7e finding, 2026-10-14 |
| 5 | Token tile actions below the tile frame | Card view layout | 04's walk, 2026-10-14 |

## 1. The lock icon

**What Hugh said (2026-10-13):** make it read more like 🔒, because the box part is too thin.

**There are two lock glyphs in the app, and the one Hugh means is the outlined one.**

| Glyph | File | Drawn as | Size | Body |
|---|---|---|---|---|
| `Padlock` | `src/components/shell/padlock.tsx` | outlined SVG, stroke only, no fill | `rail` 12×14, `bracket` 9×11 | an empty rounded rect: 10.5×7 inside a 1.5 stroke (`rail`), 7.8×5.3 inside a 1.2 stroke (`bracket`) |
| `LockMark` | `src/components/decks/lock-mark.tsx` | CSS, filled body with a keyhole punched in the page ground | 11×13 | solid 11×6.5, radius 2 |

`LockMark` already has a solid body and a keyhole, which is the 🔒 reading. `Padlock` does not: its body is a thin
outlined box about half the glyph's height, with no fill and no keyhole, and at the 9×11 bracket size the stroke
leaves a 5.3px-tall hollow, so the "box part" reads as a rectangle outline. That is the one Hugh named.

**Every place `Padlock` is drawn** (all decorative, `aria-hidden`; every locked thing says its state in words):

1. The desktop rail's well, at its foot: `rail` size, `--fg-locked`, above the LOCKED label (`src/components/shell/nav.tsx:321`).
2. The phone tab bar's bracket label: `bracket` size, `--fg-locked`, inline with the bracket's text (`nav.tsx:442`).
3. The first-run locked step cards: `rail` size, `--border-strong`, at the card's end (`src/components/home/first-run.tsx:87`). Note its ink is
   `--border-strong`, a divider color, not a text color.
4. The first-run page line at `md` and up: `rail` size, `--fg-locked`, before the line's text (`first-run.tsx:125`).

These are the first-run locked-nav handoff's surfaces (`design/design_handoff_the99_first_run_onboarding/`, design
table first-run-locked-nav.md rows 1b.2 and 4.11 — the box model the SVG was measured from).

**Every place `LockMark` is drawn**, for context, since Design may want the two to agree:

1. A locked card's row in the deck list and the Lock cards mode toggle on the row (`decklist-row.tsx:795`, `:823`).
2. The same two on the Card view tile (`deck-card-tile.tsx:436`, `:506`).
3. The toolbar's Lock cards button (`group-toggle.tsx:137`).
4. The upgrade path's line (`upgrade-path.tsx:341`).
5. The decklist legend's key entry (`decklist.tsx:285`).

**Locked:** the lock glyphs are decorative; the state is always in words beside them. The tone rules stay: `Padlock`
takes the ink of its surface, `LockMark` takes `--fg-body` closed and `--fg-faint` open at rest.

**Open for Design to call:**
1. The `Padlock` redraw: a filled body with a keyhole (the `LockMark` language), a heavier outline, or something else.
   At 12×14 and at 9×11, drawn at 1× and 2×, in `--fg-locked` on every theme's rail and tab bar.
2. Whether the two glyphs become **one** (so the deck's lock and the nav's lock are the same icon at two sizes), or stay
   two with a shared body proportion. One glyph would also settle `Padlock`'s open state, which it does not have.
3. Whether the first-run card's `--border-strong` ink stays, given that a heavier glyph in a divider color would read
   differently from the same glyph in `--fg-locked`.
4. The `bracket` size: it is a hand-measured 9×11 that cannot carry a keyhole; say whether it stays that small.

## 2. Search placeholder contrast

**What is wrong.** A placeholder is text, and WCAG AA asks 4.5:1 for it. Search fields draw their placeholder in
`--fg-faint`. The shared field chrome does it for every field built on `TextField`
(`src/components/ui/text-field.tsx:44`: `placeholder:text-[color:var(--fg-faint)]` on `bg-[color:var(--surface-sunken)]`),
and nine more sites set the same class by hand. The filter panel's comment says so in terms: "The placeholder is the
primitive's --fg-faint, like every search field" (`filter-panel.tsx:896`). The design tables specify it too
(`deck-import.md`, `deck-notes.md`: placeholder `--fg-faint`).

**The numbers.** Measured from `src/app/globals.css`, WCAG relative luminance, every theme (all six are dark):

| Theme | `--fg-faint` | on `--surface-sunken` (the field) | on `--bg` | on `--surface` | on `--surface-raised` | on `--elevated` |
|---|---|---|---|---|---|---|
| Amonkhet | `#8B8270` | 4.82 | 4.95 | 4.55 | 4.41 | 4.04 |
| Kamigawa | `#6F7486` | **4.02** | 4.12 | 3.81 | 3.70 | 3.41 |
| Ixalan | `#808C7C` | 5.24 | 5.32 | 4.82 | 4.62 | 4.20 |
| Phyrexia | `#78747E` | **4.20** | 4.29 | 4.04 | 3.93 | 3.70 |
| Eldraine | `#898395` | 5.15 | 5.22 | 4.79 | 4.59 | 4.23 |
| Kaldheim | `#7C8A8C` | 5.00 | 5.22 | 4.59 | 4.37 | 3.78 |

The range across every ground is 3.41 to 5.32. **On the ground the placeholder actually sits on** (a field's
`--surface-sunken`) it is 4.02 to 5.24: **two of six themes fail**, Kamigawa (4.02) and Phyrexia (4.20), and the other
four pass by 0.3 to 0.7. For comparison `--fg-muted` on the same ground is 6.5 to 7.2, and `--fg-locked`, deliberately a
step quieter and held to a 3:1 floor for disabled things, is 3.2 to 3.4.

**Why it is a palette call and not a one-line fix.** `--fg-faint` is read by **878 `var(--fg-faint)` sites in 248
files**; it is the app's quiet-text ink, not a placeholder ink. Raising it to 4.5 on `--surface-sunken` in the two
failing themes raises every caption, hint and faint label in them. I did not trace every one of the 43 `placeholder`
attribute sites: those not carrying the class inherit the field chrome or the browser's own placeholder color, so the
count of fields actually at `--fg-faint` is not a figure I can give.

**Locked:** the placeholder has to stay distinguishable from entered text (`--fg`) and from a field's label. The
`--fg-locked` 3:1 rule for disabled/locked things is separate and not in question.

**Open for Design to call:**
1. **Raise `--fg-faint`** in the failing themes only (one value in each of two theme blocks), accepting that all 878
   uses move with it. Design can see what moves by looking at the faint captions on those two themes.
2. **A separate placeholder token** (`--fg-placeholder`, at least 4.5:1 on `--surface-sunken` in every theme), read by
   `FIELD_CHROME` and the nine hand-set sites, leaving `--fg-faint` alone. A smaller change, one more token per theme.
3. **Use `--fg-muted`** for placeholders. Passes everywhere; the risk is a placeholder reading as entered text.
4. The target: 4.5:1 on the field's own ground in all six themes, or a measured exception. If it moves, Design names
   the values per theme.

## 3. Motion PR 6: retune the ratified motion, and the new effects

**What was left open, exactly.** The motion plan (`boards/plan-motion-2026-10-12.md`) split Hugh's brief (2026-10-12:
"every transition gets a small delay, then ease-in-out, gentle, never sharp or sudden") into five engineering PRs and
one Design-gated item. PRs 1 to 5 are merged: tokens and an eased `reveal()` (#1555), every jump onto `reveal()`
(#1563), hover and press (#1570), card art fade (#1567, tuned by #1605), charts draw (#1572); skeleton breathing
(#1607) and the AI sweep (#1673) followed. **PR 6 is the last item in the plan's PR split, "Later, Design-gated"**,
and it is two things:

**(a) E6, retune the ratified motion.** The plan's wording: "one prompt asking Design to re-time the ratified literals
to the tokens, or say which keep their argued curves". These each carry a written Design rationale, so engineering did
not retune them. As of today `globals.css` still reads:

| Class | Today | Rationale on record |
|---|---|---|
| `anim-menu-in` | 120ms, `ease-out` | sharpest entrance in the app (plan §1) |
| `anim-sheet-up` (account sheet) | 180ms, `cubic-bezier(0.22,1,0.36,1)` | handoff-specced |
| `anim-zoom-in` (card zoom) | 200ms, `ease-out` | handoff-ratified literal |
| `anim-card-turn` | 320ms, `cubic-bezier(0.2,0.7,0.2,1)` | the comment rejects ease-in-out as slow |
| `anim-stack-rise`, `anim-phone-card-enter` | 240ms, `cubic-bezier(0.2,0.7,0.2,1)` | stacked sheets R1 |
| `anim-carousel-prev/next` | 200ms, `ease-out` | ratified |
| `anim-rail-tag` | 100ms, `ease-out` | plan: "a 100ms fade reads as a blink" |
| `anim-overlay-in` / `-out` | 150ms / 120ms, `ease-out` | the escalation overlay's precedent |
| `.sheet-snap` | 240ms, `cubic-bezier(0.2,0.7,0.2,1)` | sheet snap (`.sheet-gentle` already carries the token timing) |

Current tokens (`globals.css`, the `--motion-*` block): `--motion-delay` 100ms, `--motion-duration` 320ms,
`--motion-quick` 200ms, `--motion-fade` 300ms, `--motion-ease` `cubic-bezier(0.45,0,0.55,1)`, `--motion-loop` 3200ms.
**Two rulings since the plan changed its rule and Design should draw from them rather than from the plan:**
hover and press feedback and menus take **no delay**, only the eased curve (Hugh, 2026-10-12, #1570); a delay is for
entrances the reader caused. The plan's unspecced keyframes (E2) were moved to the shared curve but not to the delay:
`anim-sheet-in`, `anim-backdrop-in`, `anim-quickadd-in` still run 140 to 180ms.

**(b) E7 to E9, new effects.** The plan lists them as "a small motion handoff" each marked as a new visual:
- **E7** hover lift or art brighten on tiles (deck, commander row, set cell, card tile);
- **E8** numbers count up (deck stats totals, money, Home counts) and announce the final value only;
- **E9** staggered fade-in of a "Show more" batch, capped at 12.
(E10, a palette cross-fade on theme switch, is recorded in the plan as "recommend never" and is not asked.)

**Not found:** no written Design prompt, spec or handoff for PR 6 beyond the plan's table and its single "Later" line,
and the priorities board's queued line ("Design brief: motion retune for ratified motions (card turn, zoom, carousel,
sheets) + new effects (tile lifts, count-ups, staggered rows)"). I did not find a handoff that settles any of E6 to E9.
I did not verify the status of E5 (a short fade on route content after a loading screen); it is not listed as merged.

**Locked:** reduced-motion policy from the plan: every movement off, opacity-only fades shorten to 100ms with no delay,
image fades off. Exits are about two-thirds of entrances. Drag/swipe is never transitioned. Ambient loops are exempt.
Each new class joins the named list in the `prefers-reduced-motion` block.

**Open for Design to call:**
1. **Per ratified motion (the table above): retime to the tokens, or keep the argued curve.** One answer per row, with
   the reason for any that keep theirs; the plan flags card turn, zoom, carousel and the phone sheets as the ones with
   written arguments against ease-in-out.
2. **Whether menus, popovers and card zoom take a delay**, given Hugh's 2026-10-12 "no delay for menus and press
   feedback" ruling; and what an entrance the reader caused (a sheet) waits.
3. **E7:** which tiles lift and what lifts (translate, shadow, art brighten); a per-tile transform on a 200-tile grid
   is a measured cost, so say whether it applies to the grids or only to the smaller lists.
4. **E8:** which figures count up, from what, how long; and that assistive tech hears only the final value.
5. **E9:** the stagger step and the cap (the plan's tokens say 40ms per item, 12 items).
6. Frames Design cannot draw as stills: give the timing per row as a table, since a screenshot cannot show motion.

## 4. The precon tile skeleton

**What is wrong.** Opening `/decks/precons` from the nav shows a crown-and-heading loading screen, not a grid of tile
shapes; and nothing in the app is a reusable tile skeleton to draw from.

**Evidence (code).**
- `/decks/precons` has no `loading.tsx` of its own. The pending-route table sends it to the **shared decks overlay**
  (`src/lib/shell/pending-routes.ts:48`: `if (second === "precons") return { kind: "overlay", key: "decks" }`), the same
  screen `/decks`, `/decks/import` and `/decks/shopping` draw: `LoadingScreen` with the crown, the heading "Shuffling
  up" and the status "counting the 99…" (`src/lib/copy/shell.ts`, `decks`). That status describes a deck count, not a
  list of precons.
- `LoadingScreen` (`src/components/shell/loading-screen.tsx`) is the only skeleton the shell draws: a centered crown that
  pulses, a heading and a status line, min-height 420px (520px at `md`). Since #1607 every skeleton breathes on one
  opacity loop, still under reduced motion.
- The only other skeleton shape in the app is Help me choose's results rows (`src/components/intake/choose-loading.tsx`,
  `ResultsSkeleton`), which is list rows, not tiles. **There is no tile skeleton** and no shared shape for one.
- What a loaded precons page draws: the header, a filter chassis, then tiles grouped by year (`PreconTile`:
  `TILE_SHELL`, a 63:88 art box, a caption). 197 precons on staging. The page is cached per reader; a cold or evicted
  load is the case a skeleton answers. I have not measured how long that wait is.

**Locked:** a loading state never holds content back and never changes the loaded page's layout. Skeletons breathe on
the shared opacity loop and respect reduced motion. The tile anatomy the skeleton imitates is the shipped one.

**Open for Design to call:**
1. **Tiles or the crown.** Whether the precon route gets a tile skeleton at all, or the shared crown screen stays and its
   words change (the status "counting the 99…" is wrong for this page whichever answer wins).
2. **If tiles:** the shape (art box and a two-line caption), how many at 390 and at desktop, whether the header and the
   filter chassis draw in their real form while only the grid is a skeleton, and whether the year group headings appear.
3. **Reusable or one-off.** The plan priorities note "no reusable tile skeleton exists": say whether this becomes the
   shared tile skeleton for the other tile grids (collection, discover, decks, sets, tokens) or stays the precons'.
4. The loading words for this route if the crown stays (copy goes through `/copy-review`).

## 5. Token tile actions below the tile frame in Card view

**What 04's walk found:** the token tile's actions sit below the tile frame in the deck's Card view.

**Today's layout** (`src/components/decks/token-tile.tsx`, drawn by `tokens-group.tsx`). One `<li>` per token holds, top
to bottom:
1. **The frame** (`TILE_SHELL_SCALED`, a bordered `--surface` box): the 63:88 art (a button that opens card details)
   and `CardTileCaption` inside it: an ownership dot, the cost pips, the token's name, a type/P/T sub-line. This is the
   only part with the border and the rounded corners.
2. **Outside the frame, unframed**, in this order, each with `2px` of horizontal padding:
   - the rules text, when the token shares its name, colors and P/T with another in the deck (`:97`);
   - the **actions row** (`:99`, `TokenControls`): an `in your collection` text (an uploaded token), `I have one` (hand mark, a dashed
     underlined text button, `✓ I have one` when marked) and the join button (`Add to Shopping`, bordered, accent-tinted when joined);
   - the **makers fold**: a button reading "from <card> + N" with a chevron, opening `TokenMakers` under the tile (`:104`);
   - the refusal line, when a press failed (`:117`).

**Sizes.** On a phone the grid is two columns with a 12px gap (`grid-cols-2`); at `md` and up it is
`repeat(auto-fill, minmax(178px, 1fr))` with a 20px gap (`tokens-group.tsx:102`). `I have one` is 44px tall on a phone and
24px from `md`; the join button is 32px tall with a 44px hit area on a phone (an `::after`), 24px from `md`; the makers
fold is 44px tall on a phone, 28px from `md`. So at 390 a tile is a frame about half the page width (two columns, 12px gap; I did not measure the
rendered width) with up to three stacked controls under it (44 + 32 + 44px of target height, less where they share a
line), none inside its border; at desktop the frame is 178px or wider with 24px controls
beneath. Each tile's `<li>` is not itself a bordered unit, so in a row of tiles the controls of one sit in the gap above
the next row, and tiles with and without rules text or a makers fold have different heights (`items-start` in the grid
keeps them top-aligned, so the bottoms are ragged).

**Staging, read-only:** across the 41 decks on staging, every deck has tokens: **1 to 20 per deck, median 6** (tokens
the deck's cards and commanders make, from `card_tokens`). So a typical Card view holds six token tiles and the largest
holds twenty, each with its controls beneath.

**Locked:** the presses themselves (`I have one`; join/leave the deck; the makers fold), their labels and the 44px phone
targets; the tile's art opens card details; ownership never takes a warning color or a verdict word. The Card view's
deck tile (`DeckCardTile`) is the anatomy to agree with.

**Open for Design to call:**
1. **Where the actions live.** Inside the frame under the caption (a taller bordered tile), on the frame (an overlay on
   the art, which the deck tile avoids by drawing nothing over its art), or a footer strip below the frame that reads as
   part of the tile (a shared border or surface). Draw it at 390 (two columns) and at 178px and wider.
2. **Whether all three controls stay visible.** A two-column phone tile has room for fewer; which presses are primary, and which
   go behind the makers fold or the card details sheet.
3. **Height consistency.** Whether tiles with and without rules text/maker fold share a height in a row.
4. **The states:** unowned, owned by upload, owned by hand mark, joined, a pending press, a refused press, an orphan
   (no maker, so no hand mark), a held token with the fold open.

## The About entry

**None of the five owes one.** Each is cosmetic or a loading state: a redrawn icon, a palette adjustment, a retime of
motion that already exists plus effects that teach nothing to discover, a skeleton and a layout. AGENTS.md's rule is a
feature the reader has to discover; none of these is, and the motion plan reached the same conclusion for its
whole line. No `ABOUT_VERSION` bump. Hugh decides which features owe an entry and may overrule this.

## Copy

Only item 4's loading status and heading, and any state labels item 5 changes. Everything goes through `/copy-review`.
US English; "select/unselect", never "tick".

## Paths

- Lock: `src/components/shell/padlock.tsx`, `src/components/shell/nav.tsx`, `src/components/home/first-run.tsx`,
  `src/components/decks/lock-mark.tsx`
- Placeholder: `src/components/ui/text-field.tsx`, `src/components/ui/filter-panel.tsx`, `src/app/globals.css`
  (the six theme blocks)
- Motion: `src/app/globals.css` (`--motion-*`, `.anim-*`, the reduced-motion block), `src/lib/ui/reveal.ts`,
  `boards/plan-motion-2026-10-12.md`
- Skeleton: `src/components/shell/loading-screen.tsx`, `src/lib/shell/pending-routes.ts`, `src/lib/copy/shell.ts`,
  `src/components/decks/precons/precon-tile.tsx`
- Token tile: `src/components/decks/token-tile.tsx`, `src/components/decks/token-row.tsx`,
  `src/components/decks/tokens-group.tsx`, `src/components/ui/card-tile-caption.tsx`

## Deliverable

A handoff in `design/design_handoff_the99_small_polish/`: one section per item with the answer to each open question,
the redrawn lock at both sizes on every theme, the placeholder values per theme, a timing table for the motion rows,
the precon skeleton at both widths, and the token tile's states at both widths, plus the `STATES` rows and
design-table sections they add. Any item Design does not answer stays on the queue as it is.
