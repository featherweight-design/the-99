# Design Property Table: the overview's own loading (addendum, 2026-09-25)

Sources are in `design/design_handoff_the99_analysis_tab/addendum_overview_loading/`.

- **R** = `ADDENDUM-README.md`
- **C** = `Overview Loading Addendum.dc.html`
- **F13** = `Analysis Tab 1300.dc.html`
- **F39** = `Analysis Tab 390.dc.html`
- **FX** = `analysis-fixtures.js`
- **A** = `../READINESS-overview-loading-audit.md` (Green; findings 1 to 7, and Hugh's ruling)

Each row is checked against the build in the last column.

## Hugh's ruling, 2026-09-26: the first press does not shift

Design flagged one cost (R §Layout, C 1b): the slot growing in place when a first press's overview
lands after its verdict. Hugh ruled that a first press holds the tab instead (A, "Hugh's ruling").

| Rule | Build |
|---|---|
| A first Analyze that also writes holds the empty state's ring through the write | `staged` / `hold` in `builder-shell.tsx`; `AnalysisPanel` `hold` prop ✅ |
| The heading steps through the stages | `Working out your bracket…` while the bracket is read, then `panel.writing` (`Writing the overview…`, the slot's own wording per `/copy-review`) ✅ |
| Verdict, overview and Suggested changes paint together | Behind the loader the reading is mounted hidden while the overview is written, so Suggested changes reads then. Probe: one frame at both widths ✅ |
| A failed or refused write releases at once | The write's promise `finally` ends the hold, so the slot draws 1d or 7h ✅ |
| A time limit releases onto 1b | `OVERVIEW_HOLD_MS` = 25s. Probe: 25.0s at both widths ✅ |
| Re-analysis unchanged from the addendum | No hold when a reading is already on screen ✅ |
| One combined announcement on the held path; `Overview ready.` on the fallback | Panel appends `synopsisCopy.ready` when a hold lets go onto a written overview. The overview's own line is quiet for that press ✅ |

### Engineering calls under the ruling (2026-09-26)

- **Two stages, not three.** Reading the deck and determining the bracket are one server call
  (`fetchDeckProfile`), so no third stage can be timed honestly. Stage one keeps the shipped
  `Working out your bracket…`; `/copy-review` settles its wording against Hugh's
  `Determining your bracket…`.
- **The limit is 25s, not 15s.** Five live writes on Hugh's pulled decks each made one model call
  and took 17.0, 17.3, 17.9, 18.2 and 18.3s. At 15s every first press would fall back. A write
  whose first answer is refused makes a repair call and runs about 35s; that one falls back.
- **On the fallback, Suggested changes lands with the overview.** Next runs a page's server
  actions one at a time, so Suggested changes' read waits behind the write. It is drawn at the
  foot of the tab and moves nothing above it. On the held path this ordering is invisible,
  because the hold ends when the write does.

## States (R §The Overview slot)

| State | Trigger | Rendered | Build |
|---|---|---|---|
| 1a first press | profile loading, no reading | 2b ring, `Working out your bracket…` | Unchanged ✅ |
| 1a re-analysis | profile loading over a stale reading | Banner button disabled in place: pulse + `Working out your bracket…`, no note; Overview untouched | `AnalysisBanner` busy form ✅ |
| 1b first press (fallback only, per the ruling) | `busy \|\| pending`, no synopsis | Status row: pulse + `Writing the overview…` | `overview-writing` ✅ |
| 1b re-analysis | `busy \|\| pending` over a held synopsis | Label row: pulse + `writing a new one for your changes`; held paragraph whole; no ruling D row | `overview-writing-new` ✅ |
| 1c | re-read after a write, current | Paragraph + `View full overview →`; `Overview ready.` once | Paragraph keyed on the synopsis id; `anim-overview-in` when it replaces a held one ✅ |
| 1d first press | `lastFailed`, no synopsis | `synopsisCopy.failed` `role="alert"` + Try again, no credit note | `FailedRow`. The note is dropped only after this page's press (A finding 3) ✅ |
| 1d re-analysis | `lastFailed`, stale, held paragraph | Failure + Try again, hairline, `olderThanList` mono, held paragraph | `heldFailed` branch ✅ |
| 7d | overview already current | No status line | A press never writes (`pressWrites` false) ✅ |
| Reload mid-write | `pending` with no press of this page | 1b, re-read until it settles | 5s poll in `useDeckSynopsis` (A finding 4) ✅ |

## Status row (1b first press / fallback), F13:140, F39:142

| Property | Mobile (390) | Desktop (1300) | Build |
|---|---|---|---|
| role | `status` | `status` | ✅ |
| display / align | flex, center | flex, center | ✅ |
| gap | 10px | 10px | `gap-[10px]` ✅ |
| min-height | 44px | 36px | `min-h-[44px] md:min-h-[36px]` ✅ |
| Text size / leading | 13px / 1.55 | 13.5px / 1.55 | `text-[13px] md:text-[13.5px] leading-[1.55]` ✅ |
| Text color | `--fg-muted` | `--fg-muted` | ✅ |
| text-wrap | pretty | pretty | ✅ |

## Pulse (FX:381)

| Property | Value | Build |
|---|---|---|
| Dots | 3, 5×5px, radius 999 | `WorkPulse`: `h-[5px] w-[5px] rounded-full` ✅ |
| Gap | 4px | `gap-[4px]` ✅ |
| Fill | `--fg-muted` | ✅ |
| Animation | `at-wave 1.6s ease-in-out`, 0.16s stagger, rest 0.22 | `.anim-at-wave` + `animationDelay` ✅ |
| Reduced motion | (none drawn) | Held at full ink by the existing `.anim-at-wave` rule (A finding 6) ✅ |

## Label row (1b re-analysis), F13:139, F39:141

| Property | Mobile (390) | Desktop (1300) | Build |
|---|---|---|---|
| Row | flex, center, gap 10px, wrap | Same | `flex flex-wrap items-center gap-[10px]` ✅ |
| Status span | inline-flex, gap 8px, `role="status"` | Same | ✅ |
| Text | mono 10px `--fg-muted` | mono 10.5px `--fg-muted` | `font-mono text-[10px] md:text-[10.5px]` ✅ |

## 1d failure block, F13:141-147, F39:143-149

| Property | Mobile (390) | Desktop (1300) | Build |
|---|---|---|---|
| Line | 13px / 1.6 `--fg-muted`, `role="alert"` | 13.5px / 1.6 `--fg-muted`, `role="alert"` | ✅ (A finding 7) |
| Try again row | column, stretch, gap 9px, margin-top 4px | row, gap 16px, wrap, margin-top 6px | The shared `Press` ✅ |
| Try again button | 44px, outlined, 13px 500 | 36px, same | ✅ |
| Credit note | none after the press | none after the press | Kept on a stored failure seen on a later visit (A finding 3) ✅ |
| Hairline caption | margin-top 10px, padding-top 12px, border-top `--border`; mono 10.5px `--fg-faint` | Same | `overview-held-caption` ✅ |

## Banner busy button (1a re-analysis), F13:103, F39:107

| Property | Mobile (390) | Desktop (1300) | Build |
|---|---|---|---|
| min-height | 44px | 36px | ✅ |
| padding | 0 16px | 0 16px | `px-[16px]` while busy ✅ |
| Fill / ink | `--elevated` / `--fg-faint` | Same | ✅ |
| Content | pulse + `Working out your bracket…`, gap 9px | Same | ✅ |
| Credit note | hidden while busy | Same | ✅ |

## Motion

| Property | Value | Build |
|---|---|---|
| 1c replace | 150ms crossfade | `.anim-overview-in` (`backdrop-in` 0.15s), only when a new overview replaces a held one, so a held first press paints whole; none under reduced motion (A finding 5) ✅ |
