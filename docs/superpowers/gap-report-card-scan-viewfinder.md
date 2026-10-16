# Gap Report: Card scan, the viewfinder (PR 3)

Agent 2 (Verify), 2026-10-16, against `docs/superpowers/design-tables/card-scan-viewfinder.md`.
Theme Kamigawa (`src/app/globals.css:123`). Copy wording out of scope; every key the table names exists in
`src/lib/copy/collection-edit.ts:535-585`, and every one the drawn states need is used except `camera.photosLine` and
`camera.choosePhotos` (deviation 1).

**Legend correction.** The table's legend has two Kamigawa border tokens swapped and three "confirm" rows unresolved.
In the Kamigawa block: `#262A35` is `--border-strong` (not `--border`), `#181C26` is `--border` (the hairline),
`#343843` is `--border-dashed`, `#D33E7E` is `--accent-strong` (`--accent-hover` is `#FF62A9`, lighter), `#12141B` is
`--surface-rail` (not `--surface`, `#16181F`). `#1B1D25` has no token (nearest `--surface-raised`, `#191B22`). Gaps 2–5
follow from this.

## Visual gaps

1. `src/components/collection/scan/scanner-view.tsx:344` — SurePanel (phone: V3, V4, R1, R2) — position — design:
   absolute, left/right 8, bottom 92 → implementation: the class list carries both `absolute` (from `PANEL_PHONE`) and
   `relative`; Tailwind 4.3.3 emits `.relative` after `.absolute` (compiled and checked), so the panel is
   `position: relative`, the first in-flow child of the section, shifted up 92px: off the top of the screen under the
   bar. The held badge's `absolute` needs no `relative` here; drop it.
2. `scanner-view.tsx:52, 135, 194, 206, 217, 404` — desktop container border, segment border, Stop border, DarkLine
   border, phone panel border, count card back 1 border — border colour — design: `#262A35` (`--border-strong`; the
   segment at 90%) → implementation: `--border` (`#181C26`).
3. `scanner-view.tsx:222, 251, 405` — `.big2` outline (R1 press), unsure dot off, count card back 2 border — colour —
   design: `#343843` (`--border-dashed`) → implementation: `--border-strong` (`#262A35`).
4. `scanner-view.tsx:206, 217` — DarkLine and phone ResultPanel background — design: `rgba(18,20,27,.92)` /
   `.94` (`--surface-rail`) → implementation: `color-mix(--surface 92% / 94%)` (`#16181F` base).
5. `scanner-view.tsx:337` — Held press (V4) — background — design: `#D33E7E` (`--accent-strong`, darker) →
   implementation: `--accent-hover` (`#FF62A9`, lighter).
6. `scanner-view.tsx:405` — count card back 2 — background — design: `#1B1D25` (no token) → implementation:
   `--surface-raised` (`#191B22`). Nearest token; confirm or accept.
7. `src/components/collection/scan/scan-view.ts:29-35`, `scanner-view.tsx:94` — Guide — looks — design: four colours,
   including default `rgba(230,232,240,.55)` solid, and dark → lit, light on → ok → implementation: three looks
   (`dash`/`lit`/`ok`) chosen by panel kind only; no default look, and `dark` and torch-on never move the guide
   (V7/V8 over a Looking panel stays dashed).
8. `scanner-view.tsx:96` — Guide box (desktop) — left — design: 150px → implementation: centred
   (`left-1/2 -translate-x-1/2`), about 130px in the 434px inner panel.
9. `scanner-view.tsx:78-87` — AddedFlight tray pulse (V5) — design: absolute z5, left 10 bottom 16, 72×60, radius
   12, `box-shadow 0 0 0 2px rgba(255,77,154,.6)` → implementation: not drawn.
10. `scanner-view.tsx:219` (desk use) — ResultPanel heading on desktop (W3 `view.notSure`) — font-size — design:
    unset (inherits) → implementation: 16px. Low confidence on what it inherits.
11. `scanner-view.tsx:291` — sleeve line, desktop — colour — design: `.cap` `#959AAD` (`--fg-muted`) →
    implementation: `--fg-body`. Unreachable today (deviation 4).

## State reachability gaps

1. V7 / V8 Dark — trigger — design: mean brightness under ~90/255 held for ~1s, leaving once bright → implementation:
   `isDark` at `DARK_LUMA = 40` (`src/lib/scan/camera.ts:46`), judged per frame with no hold
   (`use-card-scan.ts:121`), so the DarkLine appears far later in dimming and can flicker frame to frame. ⚠️ PARTIALLY
   REACHABLE.
2. V6 / W3 None of these — behavior — design: adds nothing, keeps reading (search by name is PR 4) → implementation:
   `onNoneOfThese={closeScanner}` (`src/components/collection/add-cards-sheet.tsx:379, 605`) closes the scanner back
   to the sheet. Ruling needed: keep reading, or accept close-to-search as PR 3's stand-in for PR 4.

All other states REACHABLE: D6 / W6 (`getUserMedia` rejection, `use-card-scan.ts:88`), D7, V1, V1n, V2, V3, V4, V5
(flip needs the guess's `imageUri`), V6, V9, R1, R2, W2.

## Deliberate deviations (not gaps)

1. DEVIATION — Choose photos not drawn on D6/W6 until PR 5 (`scanner-view.tsx:426-455`); the D6 photos line
   (`camera.photosLine`) and footer are left out with it.
2. DEVIATION — None of these at min-height 44, not 40 (`scanner-view.tsx:296`).
3. DEVIATION — guess area `aria-live="polite"` (`scanner-view.tsx:75`).
4. DEVIATION — sleeve line never shown, no sheen signal (`screen-state.ts:45`).
5. DEVIATION — unsure dots map to scanner steps 0/1/2 (`screen-state.ts:35-39`).
6. DEVIATION — mode line reuses the mode labels plus a colon (`scanner-view.tsx:236`).

VERDICT: 11 visual gaps, 2 state gaps
