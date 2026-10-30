# The Analysis tab, consolidated — handoff package (final, after three touch-ups + the synopsis addendum)

**Canvas:** `The 99 - Analysis Tab.dc.html` (pan/zoom; `theme` in Tweaks). It mounts
`Analysis Tab 1300.dc.html` and `Analysis Tab 390.dc.html` (one `state` prop each, so every state is a
real full-page drawing at each width) and `Synopsis Sheet.dc.html` (the synopsis body). Fixtures and
the inlined asset art are in `analysis-fixtures.js`.

**This replaces the tab's layout and every state.** The five rounds' rules and copy stand except where a
ruling below overrides them: `design_handoff_the99_deck_analysis/` (Round 0),
`design_handoff_the99_verdict/` + `_addendum/` (the two-level stack), `design_handoff_the99_declaration/`,
`design_handoff_the99_push_line/` (§B upgrade path, §C stale). The departures in
`gap-report-deck-findings.md` and `gap-report-deck-lean.md` are kept.

Read with `STATES-analysis-tab.md`, `SYNOPSIS-modal.md` and `analysis-tab - copy strings.ts`.
This file is the current spec; where `README.md` (the R1 rationale) disagrees, this wins.

---

## 1 · The page around the tab (shipped, not designed here)

Drawn from `spine-desktop.tsx` / `spine-mobile.tsx`, `art-wash.tsx`, `full-card-trigger.tsx`,
`status-style.ts`, `pending-banner.tsx`, `builder-tabs.tsx`, checked against staging. Below the
header: the `v{n} · committed {date}` strip, or the pending banner on a draft. Then the tabs.
**No dot on the Analysis tab** (it does not exist; Round 4's is not built).

**One header change:** the **bracket chip rides the art wash**, after the status pill, at both widths
(Round 0 §5, *one chip, two altitudes*). One order at both widths: deck name → pips + commander ·
colour → chips row (status pill, bracket chip) → progress bar. That moves the status pill off the
commander line at 1300 and off the front of the meta row at 390, a change to both spines. Chip: 22px
chip-form mark(s) + name, mono 11 / 10, rank ink, plate `color-mix(ink 12%, --bg)` under a 55% ink
hairline, radius 6. A range reads unrounded (*Optimized or cEDH*). Absent before a first reading.
Tapping it opens the Analysis tab.

## 2 · The tab

Gutters: `pt-[18px] px-[16px] pb-[32px] md:pt-6 md:px-[30px] md:pb-10` (the tab row's own 30 / 16).

**Before a reading (2a–2c): one empty state, full width.** The 2/3 · 1/3 grid is withheld. Under the
**Overview** label: the five bracket marks on a ring (150px box, 50px radius, all at 44, 1 at twelve
o'clock, clockwise, each in its rank's ink), display heading, body, **Analyze** (bone, the filled CTA)
and **How we make these decisions →** beside it (opens 3c). No "about two seconds".
- **Loading** — the ring lights 1→5 clockwise in a loop (`at-wave`, 1.6s, 0.16s stagger); Analyze
  disabled; heading *Reading your deck…* is the live region. Reduced motion: static, full ink.
- **Error** — the ring at 0.3, still; failure heading and body; **Try again**.

**With a reading (2d–2i), top to bottom:**

| # | 1300 | 390 |
|---|---|---|
| 0 | **The one banner**, only when the deck has changes (*Re-analyze*) or a re-read failed (*Try again*) — `--surface-rail`, `--border-strong`, radius 11, sentence + one bone button | first |
| 1 | **Overview** — left column (2fr): the generated summary, card names bold `--fg` 600 on the dotted `--accent` card-open underline (`CardDetailTrigger`, which also hosts the hover preview), then **View full synopsis →** | second |
| 2 | **Bracket box** — right column (1fr). Marks (36 / 26; a range draws both, the upper at 0.65) beside the name in the display face at 21 / 19 in rank ink, `analyzed {when}` under it. Then the reason, then lean *or* declaration *or* version row, then the population foot. No label, no control, no provenance sentence | third |
| 3 | **Climb** — left column under the Overview. The lower rung carries **what would have to go →** (opens 3b) | fourth |
| 4 | **Findings** — full width, five tiles; **How we make these decisions →** at the head row's right end (opens 3c) | rows in one box; the opener under it, 44px |
| 5 | **Recommended mix** — full width under a rule; `RoleCounterStrip` in an inset mode (`px-0`, top rule) | last |

**Rules.** A current reading shows **no re-analyze control**; re-analysis is offered only by the
banner. **No `out of date` tag anywhere, no dimming**: the banner is the only place staleness is
said. No changed-cards list (the pending banner's *Review n changes* already is one) and no hint at
whether the changes matter. **Try again** only for a true failure. A failed re-read keeps the held
reading whole. The lean (2h) reads *Your commander is one half of a {A} + {B} two-card infinite combo…*.
Every opener uses → because every one opens a sheet. The climb states, the findings open.

## 3 · The sheets

All are `ModalChrome` (title, aside, close; `mark` becomes optional). Phone: a sheet from 52px, 43px
header. Depth stops at two: only a card stacks on a sheet, and nothing in a card opens anything.

| Sheet | Opened from | Desktop | Header | Body |
|---|---|---|---|---|
| **3a Receipt** | *see the card(s) / combo(s)* | **760**, 4 across, ~172px tiles (same size as the phone's 2 across) | fact mark · label · count | tiles, name 12 `--fg-body`; no fact mark on a tile; combo body unchanged |
| **3b What would have to go** | the climb's lower rung | **700** | the target's chip mark · **{Target}, two things would have to go** (14px at 390); no aside | the rule boxes + *Which cards go is yours…*. **One target only: the bracket directly below.** No target chips, no *open your decklist* |
| **3c How we make these decisions** | findings head row · the empty state | **560** | no mark, no aside | the shipped provenance body, unchanged; outside links leave the app |
| **6 Synopsis** | *View full synopsis →* · a version's panel | **700** | no mark · *Synopsis* · `{deck} · written {when}` | see `SYNOPSIS-modal.md` |

**A card opened from any sheet is the shipped `CardModal`, stacked** — nothing added to it, no remove
action. The one addition is the way back:
- **Desktop:** `CardModal` gains `backLabel?: string`. When `stacked` with one, the desktop ✕
  (`closeRefs[1]`: absolute top 22 / right 24, 34px, `--surface-raised`, `--border-strong`) becomes a
  pill in the same slot and plate reading **← {backLabel}** (mono 11, `--fg`, padding 0 14 0 12).
  Nothing else in the modal moves. The sheet behind stays in place on `--surface-sunken` (header 0.55,
  body 0.35), its header visible above the card; no second backdrop. ← and Esc go back one level; a
  click on the page behind closes both. Labels: receipt → the finding's label; 3b → the target
  bracket's name; synopsis → *Synopsis*; reasoning → its title.
- **Phone:** unchanged — the card sheet from 96px, ✕ on the art band; the 44px strip of the sheet
  behind is the way back.

## 4 · Calls still open for Hugh

1. **The climb in the left column** under the Overview. Fallback: full width under the top row.
2. **A stale range withholds its declaration chips** until the re-read; an existing answer stays. Undrawn.
3. **Deck-stats ledger ruled out of this tab** (canvas §4); it stays at the foot of the Deck panel.

## 5 · What engineering builds

1. **Persist the profile with the deck** — `determinedAt`, `determinedCardCount`, the fingerprint read
   against. On load: equal → ready; different → the banner. A committed version's reading never goes stale.
2. **`AnalysisPanel`** — the empty state before a reading; the grid and the banner after. The trigger
   leaves the tab body except as the empty state's CTA and the banner's button.
3. **Spines** — the chips row and the bracket chip (§1).
4. **`RoleCounterStrip`** inset mode.
5. **`ModalChrome`** — optional `mark`; widths 560 / 700 / 760.
6. **`BracketClimb` / `UpgradePathPanel`** — opens in `ModalChrome`, lower rung only, head in the header.
7. **`ProvenancePanel`** — toggle becomes a sheet opener; body in `ModalChrome`.
8. **`CardModal`** — `backLabel` (§3).
9. **Synopsis** — the fourth body, the tab entry point, the Versions-panel link (`SYNOPSIS-modal.md`).

## 6 · Most likely to break in build

1. **A second place that says stale.** The banner is the only one — no tags, no dimming, not on the mix.
2. **Reserved space.** No skeleton rungs, tiles or prose placeholders; absent until there is content.
3. **A sheet opening a sheet**, or a new card body instead of `CardModal`.

## Addendum — the credit note

`CREDITS-overview.md` and canvas §7: the note on every press that writes the overview, and the used-up states. Audited on its own.

## Addendum — opening the tab (canvas §8)

While the stored reading is fetched, the tab draws **only** a neutral loader: the five chip marks (22) in a row with the `at-wave` light, and *Loading…* in mono 11 / 10.5 `--fg-faint`. It does **not** draw the Overview, the empty-state ring, the bracket box, the banner, the mix or the header chip. Shown after 150ms, held at least 400ms, 420 / 320px block, `role="status"` + `aria-busy`. Reduced motion: static at 0.5. Preferred fix: load the stored reading server-side with the page, since the header chip needs it anyway; then this shows only on a slow client refetch.

## 7 · Files

- `The 99 - Analysis Tab.dc.html` — the canvas: §1 order, §2 nine states × two widths, §3 sheets,
  §4 ledger call, §5 About entry, §6 the synopsis, §7 the credit note, §8 opening the tab.
- `Analysis Tab 1300.dc.html`, `Analysis Tab 390.dc.html`, `Synopsis Sheet.dc.html` — the frames.
- `analysis-fixtures.js` — every figure and string on the frames.
- `STATES-analysis-tab.md` — the matrix. `SYNOPSIS-modal.md` — the synopsis addendum.
- `CREDITS-overview.md` — the credit-note addendum.
- `analysis-tab - copy strings.ts` — new and conformed strings only.
- `ABOUT-entry.md` — the filled §G template. `READINESS.md` — open items. `README.md` — R1 rationale.
- `assets/` — ten bracket marks (Round 0, verbatim) and five fact glyphs (paths from the glyph
  modules). `brand/` — for self-containment. `support.js` — the canvas runtime.
