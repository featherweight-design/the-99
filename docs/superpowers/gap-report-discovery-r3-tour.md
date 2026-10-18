# Gap report: Discovery R3·1b, the first-run tour

Branch `discovery-tour` (working tree as of 2026-10-17, including the uncommitted `PICTURE_FOCUS` change).
Source of truth: `design/design_handoff_the99_discovery_onboarding/design-tables/discovery-r3.md` (The spotlight,
The tour card, Step geometry), `STATES-tour-and-need.md` (lines 1-51), `r3/TourCard.dc.html` and
`r3/FirstRunDesk.dc.html` / `r3/FirstRunPhone.dc.html` (the boards' `renderVals`) where the table is silent.
Binding: readiness gaps 1, 4, 6, 13, 14 and plan decision 5. Copy wording, R3·2 and R3·3 are out of scope.

Evidence beyond the code: the probe's own screenshots in the session scratchpad (`tourshots/tour-*-{phone,desktop}.png`).

## Pass 1: properties

### The spotlight

| Property | Result |
|---|---|
| Scrim | ✅ MATCH — `rgba(6,5,8,.66)`, a fixed `inset-0` SVG over page, rail/tab bar and header (`first-run-tour.tsx:33,168-176`) |
| Cutout room | ✅ MATCH — slot 5, account 4, card 8, banner 8 (table: 5 / 4 / 7–8 / 7–8) (`tour-steps.ts:43-48`). The phone board draws 3 on a tab and 6 on the card; the table's 5 and 8 govern |
| Cutout radius, slot / card / banner | ✅ MATCH — 14 / 20 / 16 |
| Cutout radius, account button | ❌ MISMATCH at 390 — design: 15 around the header's 38px square (phone board `R[5] = [329,23,38,38,4,15]`), round only on the rail's circle / implementation: always `round` (`tour-steps.ts:45,53`), and the rect is `TargetBox`'s 44px box including the button's 3px pad (`account-menu.tsx:511`), so a 52×52 circle (r 26) around a square. 1280 matches (36 box, round) |
| Ring | ✅ MATCH — `0 0 0 2px accent/75%, 0 0 0 6px accent/20%` via `color-mix`, theme accent (`first-run-tour.tsx:181`) |
| How it is drawn | ✅ MATCH (plan decision 5 supersedes the box shadow) — one SVG `<mask>` with a rounded rect per lit target; the ring is its own element at the cutout; the control is the live app |
| Under it | ✅ MATCH — host `div` appended to `<body>`, `useInertPage(host)` marks every sibling (the app root) `inert`; the card is in the host |
| Between steps | ✅ MATCH — mask rect and ring transition position/size over 240ms on `--motion-ease-out`; card fades 0→1 over 160ms. (Note, not a gap: the corner radius is not in either transition list, so it steps from 14 to round between steps 4 and 5) |
| Reduced motion | ✅ MATCH — `motion-reduce:transition-none` on both, the fade skipped under `prefersReducedMotion()` |
| Layer | ✅ MATCH — z 70/71 over the toast's z 60 and every sheet's z 50/60; host is the last child of `<body>` |

### The tour card (`TourCard`)

| Property | Result |
|---|---|
| Width | ✅ MATCH — `md:w-[340px]`; 390: `left-16 right-16` = 358 |
| Place, 1280 | ✅ MATCH (rule reproduces the board for steps 1, 2, 6) — see Step geometry for steps 3/4 and 5 |
| Place, 390 | ✅ MATCH — `bottom: 100px` (`PHONE_DOCK`) |
| Surface | ✅ MATCH — `--surface-raised`, 1px `--border-strong`, radius 14, `0 24px 60px rgba(0,0,0,.55)` |
| Padding | ✅ MATCH — `md:p-[14px_16px_14px_18px]`, `p-[14px_16px_16px]` |
| Kicker | ✅ MATCH — mono (Plex Mono) 10.5, `.14em`, uppercase, `--accent` |
| Title | ✅ MATCH — `font-display` 600, 19/1.2 (`md`), 20 at 390, `--fg`, mt 6/8 as the board |
| Body | ✅ MATCH — 13.5/1.55 (`md`), 14 at 390, `--fg-body` (inherited from the card), mt 6 |
| Precon line (step 1) | ✅ MATCH — as body, mt 8, `Precons I own` `--fg` 600 |
| Footnote (step 1) | ✅ MATCH — mono 10.5 `--fg-faint`, mt 10 |
| Picture (steps 2–4) | ✅ MATCH — full width × 118 (`md`) / 128, radius 9, 1px `--border-strong`, `object-fit: cover`, board's `object-position` per capture; caption mono 10 `--fg-faint`, mt 6 |
| Theme grid (step 5) | ✅ MATCH — tour panel: 3×2 gap 8 / 2×3 gap 6 (row) 8 (column), mt 12; cell padding 5 (5 6 at 390), radius 9, min-height 48 at 390; miniature full × 46 / 52 × 38 beside the name |
| Selected miniature, fill and ring | ✅ MATCH — `--elevated` behind, 1.5px `--accent` outline |
| Selected miniature, tick | ❌ MISMATCH — design: 13px accent circle on the CELL's top-right corner (`top:-5px;right:-5px` of the cell), glyph 8.5 / implementation: inside the miniature at `top-[3px] right-[4px]`, glyph 9 (`theme-picker.tsx:76-81`) |
| Names | ❌ MISMATCH — design: 10.5/500 `--fg` on every cell (12.5 at 390) / implementation: `--fg` only on the selected cell, `--fg-body` on the other five (`theme-picker.tsx:278-280`). Sizes match |
| Name / plane spacing | ❌ MISMATCH (board, minor) — design: label box `gap:1px` / implementation: `gap-[2px]` (`theme-picker.tsx:274`) |
| Plane | ✅ MATCH — mono 8.5 (9 at 390) `--fg-muted` |
| Miniature interior | ✅ MATCH by gap 14 — the shipped `ThemeMiniature` is mounted rather than the board's drawing |
| Status (step 5) | ✅ MATCH — the picker's own `role="status"`, mono 10.5 `--fg-faint`, mt 10, opens with `<name> applied.` |
| Note block (step 6) | ✅ MATCH — 1px `--border` top rule, mt 14 + pt 12, gap 6; label mono 10 caps `.14em` `--fg-faint`; line 13 (14 at 390) italic `--fg-muted` 1.55; `Read the note ›` 13 (14) `--accent`, underline at 55%, offset 3, min-height 24 / 44 |
| Progress | ✅ MATCH — six rotated squares, 6px, current 8px `--accent`, done accent/45%, to come `--border-strong`, gap 6 |
| Next / Finish | ✅ MATCH — `--fg` fill, `--bg` text, 600, 12.5 / 32 / r8 / px 14 at `md`; 14 / 44 / r10 / px 20 at 390 |
| Back | ✅ MATCH — 1px `--border-strong`, transparent, `--fg`, 32 / 44, px 12 / 16, r 8 / 10 |
| ✕ | ✅ MATCH — 32×32 13px (`md`), 44×44 15px; `--fg-faint`; focus `--fg` + 2px accent ring; the board's negative margins |
| Role | ✅ MATCH — `role="dialog"`, `aria-modal`, labelled by the title, `useDialogA11y` holds focus, initial focus on Next |

### Step geometry, as drawn (the boards' rects fed through the app's rules)

| Step | Result |
|---|---|
| 1 at 1280 | ✅ MATCH — cutout from (90,186,1162×304) pad 8 r 20; card (912, 504) |
| 2 at 1280 | ✅ MATCH — slot (12,163,38) pad 5 r 14; card (74, 132) |
| 3, 4 at 1280 | ❌ MISMATCH (2px) — design: card (74, **214**) for the slot at y 247 / implementation: `rect.y - 31` = **216** (`tour-steps.ts:78`). The −31 offset reproduces step 2 only |
| 5 at 1280 | ❌ MISMATCH (1px) — design: card x **74** (the column every rail-side card uses) / implementation: `13 + 36 + 24` = **73** (`tour-steps.ts:81`; the test pins 73). y (foot 14 above the frame) matches |
| 6 at 1280 | ✅ MATCH — banner (90,120,1162×46); card (90, 184) |
| 1 at 390 | ❌ MISMATCH — design: the lit control is step 1's Upload and ways group (16, 14, 358×411) with the page at 380, the fan scrolled above the fold, and the docked card clearing it / implementation: `tour:step-one` is the whole card, fan included (`first-run-step-one.tsx:66`), and the page scrolls the card's TOP to 14 (`first-run-tour.tsx:124-125`); the card docked at bottom 100 then sits over the lit card's lower half (Paste a list and below; probe screenshot `tour-collection-phone.png`) |
| 2, 3, 4 at 390 | ✅ MATCH — the tab's own 52-tall `flex-1` box (≈75×52 at y 778), scroll 0 |
| 5 at 390 | ❌ MISMATCH — see Cutout radius, account button: a 52px circle where a 46px r 15 square is drawn |
| 6 at 390 | ✅ MATCH — the banner's box, scroll 0 |

## Pass 2: states (`STATES-tour-and-need.md`)

### The tour's life

| State | Result |
|---|---|
| Not for this account | ✅ REACHABLE — `tourDue` needs the first-run checklist and a null `tour_seen_at` (gap 1's decided rule; no backfill); an account with cards or decks never gets it |
| Waiting | ✅ REACHABLE — waits for `load`, then `ARRIVE_MS` (600) with no lock or hold open; re-armed on every over-page change |
| Running | ✅ REACHABLE — scrim, cutout, card; `spendTourAction` fires as step 1 appears; ends on ✕, Esc, Finish, `Read the note ›` |
| Spent | ✅ REACHABLE — `spendTourWrite` stamps once; `tourDue` false thereafter |
| Leaving mid-tour | ✅ REACHABLE — reload, closed tab or Back after step 1 shows: already spent. The banner-link clause is dropped (gap 4) and the banner is inert |
| No R1 moment during the run | ✅ REACHABLE — `takeVisit()` at open |

### Each step

| Step | Result |
|---|---|
| 1 | ⚠️ PARTIAL — 1280 as drawn; at 390 the whole card is lit and scrolled to its top, the fan stays on screen, and the docked card covers the lit card's controls ("the page scrolls so the lit control clears it" is not met) |
| 2 | ✅ REACHABLE — rail lock-well slot / tab, capture, scroll top |
| 3 | ✅ REACHABLE |
| 4 | ✅ REACHABLE — lights Decks |
| 5 | ✅ REACHABLE — rail-foot / header account button; the shipped picker with `panel="tour"` (gap 14) |
| 6 | ✅ REACHABLE — banner lit, card under it at 1280; Next reads Finish |

### Presses on the card

| Press | Result |
|---|---|
| Next | ✅ REACHABLE — next step, glide + crossfade |
| Back | ✅ REACHABLE — steps 2–6 |
| Finish | ✅ REACHABLE — `onEnd(false)` |
| `Read the note ›` | ✅ REACHABLE — ends the tour, mounts the shipped `NoteDialog` (dialog at `md`, sheet below); closing returns to Home |
| ✕ / Esc | ✅ REACHABLE — `onEnd(false)`, no confirm, no toast |
| A miniature | ✅ REACHABLE — the picker's own `applyTheme` (`data-theme`, cookie) and status |
| Enter | ✅ REACHABLE — focus starts on Next |
| Anything under the scrim | ✅ REACHABLE — app `inert`, the SVG takes the pointer |

### When the tour waits, or never opens

| Situation | Result |
|---|---|
| A sheet, dialog or menu open on load | ✅ REACHABLE — `overPageCount()` locks/holds (sheets, the account menu); a visit left without opening spends nothing |
| Arrived on another route first | ✅ REACHABLE — opens on the first Home whose page is the checklist (gap 1) |
| `PRECONS_ENABLED` off | ✅ REACHABLE — `precons={ways?.precons}` drops the line |
| `NO_COLLECTION_ENTRY_ENABLED` off | ✅ REACHABLE — `ways` null: the shipped card is lit, no precon line |
| `ABOUT_SHEET_ENABLED` off / no banner (gap 6) | ⚠️ PARTIAL — 1280: no cutout, centred card, body sentence dropped, note and Finish kept. 390: the same content, but the card stays docked at bottom 100 rather than centred (`place` is null off desktop; probe screenshot `tour-whatsNew-fallback-phone.png`) |
| Reduced motion | ✅ REACHABLE |

## Gaps

### Visual

1. `src/components/discovery/first-run-tour.tsx:124` + `src/components/home/first-run-step-one.tsx:66` — step 1 at 390 — lit control and scroll — design: Upload + ways group lit, fan above the fold, docked card clear of it → implementation: whole card lit, its top scrolled to 14, docked card over its controls.
2. `src/lib/discovery/tour-steps.ts:45` + `src/components/shell/account-menu.tsx:511` — account cutout at 390 — radius and box — design: r 15 around the 38px square, 4px room (46×46) → implementation: round around the 44px TargetBox (52×52, r 26).
3. `src/components/shell/theme-picker.tsx:76` — selected tick (tour panel) — position — design: cell's top-right corner, top/right −5, glyph 8.5 → implementation: inside the miniature, top 3 right 4, glyph 9.
4. `src/components/shell/theme-picker.tsx:278` — theme names (tour panel) — color — design: `--fg` on every cell → implementation: `--fg-body` on unselected cells.
5. `src/components/shell/theme-picker.tsx:274` — name/plane gap (tour panel) — design: 1px → implementation: 2px.
6. `src/lib/discovery/tour-steps.ts:78` — steps 3/4 card at 1280 — y — design: 214 → implementation: 216.
7. `src/lib/discovery/tour-steps.ts:81` — step 5 card at 1280 — x — design: 74 → implementation: 73.

### State

1. Step 1 at 390 — ⚠️ PARTIAL — the lit control is not cleared by the docked card.
2. Step 6 with no banner at 390 — ⚠️ PARTIAL — docked, not centred.

VERDICT: 7 visual gaps, 2 state gaps

## Disposition (author)

**Fixed:**
- 1, state 1: at 390 step 1 lights the card's controls under the fan (`first-run-step-one.tsx` registers `tour:step-one`
  on the card at desktop and on its controls column below `md`), and the page scrolls them to 14px from the top. While
  the tour runs at 390 the body gains the docked card's height as bottom room, so a short first-run page can still
  bring them clear of the card (`probe:tour`: `step 1 at 390: the lit controls clear the docked card`).
- 2: at 390 the account cutout is the header's 38px square with 4px of room and a 15 corner (`cutoutFor(..., phone)`).
- 3, 4, 5: the tour panel draws the tick on the cell's corner (top/right -5, glyph 8.5), every name in `--fg`, and a
  1px name/plane gap (`theme-picker.tsx`, `panel="tour"` only).
- 6: a slot's card sits 32px above the slot: the boards draw 31 at Commanders and 33 at Decks, so one rule is 1px off
  each, where 31 was 2px off at Decks.
- State 2: at 390 step 6's fallback card stands centred, as at 1280.
- Noted: the cutout's corner now glides with it (`rx`, `border-radius` in the transitions).

**Kept, 1px:** 7. The account step's card lands at x 73 against the board's 74: the boards place it 25px past the
button's box where they place a slot's 24px past the slot's, so one rule cannot hit both to the pixel.
