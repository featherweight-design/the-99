# The 99 — Small polish (design handoff, R2)

`design/design_handoff_the99_small_polish/` · 2026-10-14 · mirrors `design_handoff_the99_basic_lands_stepper/`.
Voice: Kitchen Table. Theme drawn: Kaldheim, except where all six are asked for.

**Status: R2 approved (LGTM, Hugh, 2026-10-14).** R1's boards stay beside R2's for the diff.

**Source of truth:** `docs/superpowers/design-briefs/2026-10-14-small-polish.md` on branch `brief/small-polish`
(not on main yet). Five independent items; each section below answers that item's open questions in order.

Canvas: `The 99 - Small Polish (R2).dc.html` (the five calls) plus a phone and a desktop board per item. R2 redrew three:
`R2 - Lock-*`, `R2 - Motion-*` (they replay on their own every 2.6s), `R2 - Token-*`. Placeholder and Skeleton are unchanged
from `R1 - Placeholder-*` and `R1 - Skeleton-*`.
Open with `support.js` beside them. The same canvas is live as a Design artifact in account 2.

**No About entry, no `ABOUT_VERSION` bump.** All five are cosmetic or a loading state (brief §The About entry).

---

## 1. The lock glyph

**Call: one glyph.** `Padlock` (`shell/padlock.tsx`) and `LockMark` (`decks/lock-mark.tsx`) become one SVG component,
`Lock`, in the LockMark's language: a solid body and a 1.6 shackle. Three sizes and an `open` state:

| Size | Box | Shackle (stroke, round caps, no fill) | Body (fill, `evenodd`) | Keyhole | Used by |
|---|---|---|---|---|---|
| `sm` | 9×12 | `M2.4 5V3.1a2.1 2.1 0 0 1 4.2 0V5`, 1.3 | `M1.5 4.6h6A1.5 1.5 0 0 1 9 6.1v4.4A1.5 1.5 0 0 1 7.5 12h-6A1.5 1.5 0 0 1 0 10.5V6.1A1.5 1.5 0 0 1 1.5 4.6Z` (7.4 tall) | none | tab-bar bracket |
| `md` | 11×14 | `M2.8 6V3.8a2.7 2.7 0 0 1 5.4 0V6`, 1.6 | `M2 5.8h7a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7.8a2 2 0 0 1 2-2Z` (8.2 tall) | dot, r 1, at (5.5, 9.9), cut out | every LockMark site |
| `lg` | 12×15 | `M3 6.5V4a3 3 0 0 1 6 0v2.5`, 1.6 | `M2 6h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z` (9 tall) | circle r 1.3 at (6, 9.7) plus a 1.2×1.35 slot, cut out | rail foot, first-run page line and cards |

Exact paths with the keyhole subpaths are in `R2 - Lock-Phone.dc.html`. **R2:** the body is taller at every size (lg 9 of 15, was 7.5 of 14), and each box grows 1px rather than squeezing the shackle; every site centres the glyph in a flex row, so the extra pixel moves nothing around it. `open` drops the shackle's right leg (the path
ends at the top of the arc), for `md` and `lg`; `sm` has no open state because nothing draws one.

Answers, in the brief's order:

1. **The redraw:** a filled body with a keyhole, so the 🔒 reading comes from the body's mass, not from a heavier
   outline. Drawn at 1× and 2× on every theme's rail and tab bar (`R1 - Lock-Phone`, `R1 - Lock-Desktop`).
2. **One glyph or two: one.** The deck's lock and the nav's lock are the same icon at `md` and `lg`. This gives the nav
   an open state for free, and fixes a LockMark quirk: its keyhole was painted in `--bg`, which drew a dark dot on
   `--surface` tiles. The keyhole is now cut out of the body and shows the real ground. Every tone rule stays: `Lock`
   takes an `ink` prop; nav sites pass `--fg-locked`; deck sites keep LockMark's `tone`/`open`/`ink` logic unchanged.
3. **First-run card ink: `--border-strong` → `--fg-locked`.** A solid glyph in a divider color measures 1.2 to 1.5:1 on
   `--surface-rail` and reads as a smudge. `--fg-locked` is the card's own title and reason ink (3.14 to 3.35:1).
4. **Bracket size: 9×12 (R2; was 9×11)**, solid body, no keyhole. A 1px hole aliases at 1×, and the solid body alone reads as a lock
   at that size. The 14px bracket line has no room for more.

Still decorative everywhere (`aria-hidden`); every locked thing keeps saying its state in words.

## 2. Search placeholder contrast

**Call: option 2, a new `--fg-placeholder` token.** Declared in all six theme blocks of `globals.css`:

| Theme | `--fg-faint` | `--fg-placeholder` | on `--surface-sunken`, was → now | on `--surface` | `--fg` vs it | `--fg-muted` vs it |
|---|---|---|---|---|---|---|
| Amonkhet | `#8B8270` | `#8B8270` | 4.82 → 4.82 | 4.55 | 3.06 | 1.40 |
| Kamigawa | `#6F7486` | **`#7D8294`** | **4.02 → 4.89** | 4.64 | 3.13 | 1.37 |
| Ixalan | `#808C7C` | `#808C7C` | 5.24 → 5.24 | 4.82 | 2.79 | 1.38 |
| Phyrexia | `#78747E` | **`#827E88`** | **4.20 → 4.84** | 4.65 | 3.09 | 1.37 |
| Eldraine | `#898395` | `#898395` | 5.15 → 5.15 | 4.79 | 2.78 | 1.27 |
| Kaldheim | `#7C8A8C` | `#7C8A8C` | 5.00 → 5.00 | 4.59 | 2.31 | 1.39 |

WCAG 2 relative luminance, measured from the hex values in `globals.css`. The two lifted values are `--fg-faint`
mixed toward `--fg-muted` (about 37% Kamigawa, 29% Phyrexia, sRGB) until they clear 4.6:1 on `--surface`, the lightest ground a
placeholder sits on (`tuning-limits-box.tsx`'s field is `--surface`; every other field is `--surface-sunken`). The four
passing themes repeat the `--fg-faint` hex rather than `var(--fg-faint)`, so the token is self-standing and a later
`--fg-faint` change does not move placeholders by accident. Write them as hex.

1. **Target met:** 4.5:1 on the field's own ground in all six themes, no exceptions.
2. **Distinguishable:** it stays 2.3 to 3.1 apart from entered text (`--fg`) and a step under `--fg-muted`.
3. **The unusual constraint:** no `--fg-faint` use moves (0 of 878). What moves is exactly these 9 class sites in 7
   files, each `placeholder:text-[color:var(--fg-faint)]` → `placeholder:text-[color:var(--fg-placeholder)]`:
   `ui/text-field.tsx:44` (FIELD_CHROME), `ui/text-field.tsx:158` (SearchField's input), `decks/update-entry.tsx:304`,
   `decks/import-entry.tsx:317`, `decks/notes/note-field.tsx:83`, `decks/tuning-limits-box.tsx:132`,
   `intake/theme-picker.tsx:127`, `intake/intake-form.tsx:308`, `intake/intake-form.tsx:359`.
4. The leading magnifier stays `--fg-faint`: it is an icon, held to 3:1, and passes everywhere.

The two design tables that name the placeholder ink (`deck-import.md`, `deck-notes.md`) change their `--fg-faint` to
`--fg-placeholder`, as does `filter-panel.tsx:896`'s comment.

## 3. Motion PR 6: retune, and E7 to E9

**Call: two classes and one kept curve.** One new token, `--motion-ease-out: cubic-bezier(0.2, 0.7, 0.2, 1)`, names the
decelerating curve three motions argue for, so no literal is left.

- **Answer**: anything that answers a press or a pointer (menus, popovers, the card zoom, hover tags). No delay,
  `--motion-quick` (200ms) on `--motion-ease`. Hugh's 2026-10-12 ruling, applied as locked.
- **Arrival**: a sheet or card the reader opened. `--motion-delay` (100ms), then `--motion-duration` (320ms) on
  `--motion-ease`.
- **Kept**: card turn, carousel and sheet snap keep the decelerating curve, on token durations.
- Exits are about two-thirds of their entrance.

### E6, one answer per row

| Class | Today | R1 | Why |
|---|---|---|---|
| `anim-menu-in` | 120ms `ease-out` | 0 + 200 `--motion-quick`, `--motion-ease` | Answer. 120ms was the sharpest entrance in the app. |
| `anim-sheet-up` (account sheet) | 180ms `(0.22,1,0.36,1)` | 0 + 320 `--motion-duration`, `--motion-ease` | The account menu at phone width: a menu, so no wait. 320 because it travels the screen. |
| `anim-zoom-in` | 200ms `ease-out` | 0 + 200 `--motion-quick`, `--motion-ease` | Answer to a press. Same length, curve to the token. |
| `anim-card-turn` | 320ms `(0.2,0.7,0.2,1)` | 0 + 320 `--motion-duration`, **`--motion-ease-out`** | **Kept.** Ease-in-out lingers at 90°, where the card is a sliver. |
| `anim-stack-rise` | 240ms `(0.2,0.7,0.2,1)` | 100 + 320, **`--motion-ease-out`** | **Kept curve** (decision 1 below). Arrival the reader caused; durations on tokens. |
| `anim-phone-card-enter` | 240ms `(0.2,0.7,0.2,1)` | 100 + 320, **`--motion-ease-out`** | **Kept curve** (decision 1 below). Arrival the reader caused; durations on tokens. |
| `anim-carousel-prev/next` | 200ms `ease-out` | 0 + 200 `--motion-quick`, **`--motion-ease-out`** | **Kept curve.** Presses repeat; an eased start makes every press feel late. |
| `anim-rail-tag` | 100ms `ease-out` | 0 + 200 `--motion-quick`, `--motion-ease` | Hover answer; the plan's "100ms reads as a blink". |
| `anim-overlay-in` / `-out` | 150 / 120ms `ease-out` | 0 + 200 / 0 + 140, `--motion-ease` | The escalation screen already waits its own threshold before showing, so no extra wait. Still kept under reduced motion. |
| `.sheet-snap` | 240ms `(0.2,0.7,0.2,1)` | 0 + 200 `--motion-quick`, **`--motion-ease-out`** | **Kept curve.** Follow-through after the finger lifts. `.sheet-gentle` is unchanged. |
| `anim-sheet-in` (E2) | 180ms eased | 100 + 320, `--motion-ease` | The filter sheet is an arrival. |
| `anim-backdrop-in` (E2) | 180ms eased | 100 + 320, `--motion-ease` | Moves with its sheet. |
| `anim-quickadd-in` (E2) | 140ms eased | 0 + 200 `--motion-quick`, `--motion-ease` | Results answering typing. |

**Q2, delays:** menus, popovers and the card zoom take none. A sheet the reader opened waits `--motion-delay` (100ms).

### E7, hover on tiles

The art brightens: `filter: brightness(1.06)` on the tile's art image, 200ms `--motion-quick` on `--motion-ease`, under
`@media (hover: hover)` only. **No translate, no shadow**, so no tile gets its own compositor layer on a 200-tile grid, and
only the hovered image repaints. Applies to the deck tile, the card tile (collection grid, add panel), the precon tile and the
set cell. Not to commander rows or any list row. The shipped border lift to `--border-strong` stays.

### E8, count-up

Two families only: **Home's count figures** and **the deck stats' count totals**. Never money (a ticking price reads as a meter),
never a percentage. From 0 on a visit's first paint; from the old figure when it changes. Waits 100ms, runs 320ms on
`--motion-ease`, whole numbers, `tabular-nums` so the width holds. Figures under 10 do not count. Assistive tech hears only the
final value: the moving digits are `aria-hidden`, and the real value is in the text (or an `sr-only` twin) from the first render;
nothing is announced as it counts.

### E9, staggered Show more

Item n of the new batch (0-based) fades in at `100 + 40 × min(n, 11)` ms, 200ms each on `--motion-ease`, opacity only, no
rise. The 12-item cap means everything past the 12th arrives with the 12th; a batch is fully in by 740ms. Rows and tiles alike.
The items already on screen do not move.

### Reduced motion

Every new or retimed class joins the named list. Movement goes. Opacity-only fades (overlay, backdrop, Show more) shorten to 100ms
with no wait. The count-up shows the final figure. The art brighten keeps its end state with no transition. Drag and swipe are
never transitioned. Ambient loops are exempt, as before.

## 4. The precon tile skeleton

1. **Tiles, not the crown.** `/decks/precons` leaves the shared decks overlay (`pending-routes.ts:48`) for a skeleton of its own.
   The decks overlay keeps its crown and words for `/decks`, import and shopping.
2. **Shape:** the shipped tile shell (`TILE_SHELL`, border `--border`, ground `--surface`), the 63:88 art box in `--surface-raised`
   with `TILE_ART_CLIP`, and three caption bars (owned line 42–46% wide, name 60–90% in `--elevated`, two or three identity
   dots). **Six at 390** (the first screen and one row past it), **two rows on desktop** with the list's own grid class, so the
   column count is the page's (six at 1280, four at 900). **The header draws for real**: back link and title, which never
   change; the count line is a bar. **The chassis is a still shape** of its real height (search, view toggle, pips, sort), and
   **one year heading** draws as a bar. The skeleton follows the stored view: rows (40×56 thumb and two bars) when the precons
   view cookie or `view=rows` says rows, tiles otherwise.
3. **Reusable: yes.** `TileSkeleton` goes in `ui/` beside `CardTileCaption`, built from the same shell constants. Precons adopt
   it now; other grids adopt it when their loading is next touched, not in this round.
4. **Words:** no visible heading or status. One `role="status"` line for screen readers, `Loading precons` (placeholder for
   `/copy-review`). The whole skeleton breathes on `.anim-skeleton`, still under reduced motion, and holds nothing back.

## 5. Token tile actions

**R2 (Hugh's audit: the R1 foot made tiles too tall, and the inline error was clutter).**

1. **Where:** a **foot inside the frame**, below the caption, behind a 1px `--border` hairline, within the tile's border and
   corners. Nothing is drawn over the art. Rules text, when attached, sits inside the frame under the caption, at most three lines.
2. **One line, always.** The state line alone: `Add to Shopping` (full width at 390, 32 tall with a 44 hit; 24px from `md`),
   `✓ In Shopping`, `in your collection`, or `✓ I have one` (a word here, not a press). 44px at 390, 30px from `md`. A token
   tile is that one line taller than a card tile and no more. R1 had two lines and a fold.
3. **The makers and `I have one` move to Token details.** The art already opens the token's card details. When it is opened
   from a deck, the sheet draws an **In this deck** box where a card's sits (under the price line), for a token:
   - `I have one` / `✓ I have one`, the one press the tile has no room for. The hand-mark rules are today's: offered only
     when a card in the deck makes the token, never when it is in your collection by upload or precon. **The Shopping press
     is NOT repeated here** (Hugh, R2 review): it lives on the tile alone, as a card's does, and card details carry no
     Shopping action or ownership line either.
   - the makers: today's `TokenMakers` in its row layout, under its heading `Generated by N cards`, each name opening that
     card's details stacked over this one, then its printing line. Its scroll box (past 5 names on a phone) comes with it.
     An orphan reads `from no card in this deck` there.
   - No box for a token opened outside a deck. Prev and Next still page the deck's tokens.
   The row view keeps its makers fold: it has the width, and the note was about tiles.
4. **A failed press is a toast** (`ToastFrame`, `placement="deck"`, the slot I got it's receipt uses): above the tab bar at
   390, bottom left of the deck pane from `md`. `role="alert"`, title `tokensCopy.row.refused` unchanged, detail the
   token's name (`Spirit token`), no action, 8 seconds via `useToastClock`, held on hover and focus. The press springs back.
   The tile, the row and the details box's I have one all fail through it, so `useTokenPress` announces instead of returning `refused`.
5. **Heights:** the Tokens grid stretches (`items-stretch`) with a spacer above the foot, so feet line up.
6. **States**, both widths: unowned, joined, owned by upload, owned by hand mark, pending (label kept, `aria-busy`, 60%),
   joined with no maker left. Refused is the toast.

Labels, presses, `aria-*` and 44px phone targets are the shipped ones (`tokensCopy.row`, `tokensCopy.makers`). Ownership
never takes a warning color or a verdict word.

---

## R2 changes (2026-10-14)

| Note from Hugh | R2 |
|---|---|
| Token tiles too tall; makers should live in Token details | One foot line; makers and `I have one` in an In this deck box in details (§5). |
| Inline save error is clutter | The deck toast, `role="alert"` (§5.4). |
| Can't see the motion run | The Motion boards now replay on their own every 2.6s. Open a Motion board on its own (or press its Play) to watch it; on the zoomed-out canvas boards are still images. |
| Lock body too short | Body taller at every size, boxes +1px (§1). |
| R2 review: Shopping belongs on the tile only | Details box drops the Shopping press and the ownership word; it holds I have one and the makers (§5.3). |

## Gap report

| # | Item | Gap |
|---|---|---|
| G1 | 5 | **`I have one` is one press away** from a tile (open details, then press). R2 keeps that, since the tile is now one line. The row view is unchanged. |
| G8 | 5 | The toast's detail line, `Spirit token`, is a new string (`small-polish - copy strings.ts`). |
| G9 | 5 | Unmarking `✓ I have one` from a tile is now in details too. If one-press unmarking matters, the tile's word can become a press again at no height cost. |
| G2 | 3 | The motion plan (`boards/plan-motion-2026-10-12.md`) is not in the repo on main or the brief's branch; the table is drawn from the brief's copy of it. The written argument for the stacked-sheet curve was not found, so those two rows were moved to arrival timing. If that argument stands, they join the kept rows. |
| G3 | 3 | E8 names two figure families. Which Home figures and which stats totals are "counts" is engineering's to list against the current components. |
| G4 | 2 | The brief counted FIELD_CHROME plus nine hand-set sites; the tree has FIELD_CHROME plus eight. All are listed. Fields whose `placeholder` attribute carries no class inherit the browser's color and are untouched. |
| G5 | 4 | Whether the client can read the precons view cookie when the pending overlay draws. If it cannot, tiles is the default and a rows reader sees tiles until the page lands. |
| G6 | 1 | The open state of `lg` is drawn but nothing uses it yet. |
| G7 | 3 | E5 (a fade on route content after a loading screen) is not covered; the brief could not confirm its status. |

## Decisions after R2 (engineering readiness audit, 2026-10-14)

Taken by the orchestrator as Hugh's proxy; no Design round.

1. **`anim-stack-rise` and `anim-phone-card-enter` keep the ratified curve.** R2 moved both to `--motion-ease`, but the
   stacked-sheets handoff drew them on the sheet-snap curve, `(0.2,0.7,0.2,1)`, and `.sheet-snap` keeps it in this table. A
   ratified curve is not retired by an inconsistency in a table, so both use `--motion-ease-out`, with the arrival timing
   (100ms delay, 320ms duration) on tokens. This answers G2.
2. **Overlay exit timer.** `pending-overlay.tsx` unmounts on a JS timer matched to `overlay-out`, so it moves to 140ms with the CSS.
3. **Skeleton art ground is `--surface-sunken`**, the shipped precon tile's, not `--surface-raised`, so nothing changes color when the page lands.
4. **The open precon keeps the shared decks loading screen.** Only the list gets the tile skeleton; the open precon route gets its own boundary so it does not inherit it.
5. **The stack drop (card-modal's WAAPI exit, 200ms ease-in) takes the exit rule**: about two-thirds of its entrance, same curve.
6. **E8's figures are listed by engineering in the plan**, starting with Home's collection kicker and commitments counts.
