# About The 99 — R2

**R1 was the wrong artifact.** It answered the five open questions and delivered a page of
paragraphs — which cannot teach a fit score, a doubled diamond, a dashed cell or six status badges.
R2 keeps every locked decision and changes the unit: **an entry is a figure with a caption.**

**Deliverable:** `The 99 - About Page (R2).dc.html` (canvas, six-theme `theme` prop, Kamigawa
default to match the surfaces under review).
`The 99 - About Page (R1).dc.html` is kept for the audit trail. It is superseded.

| File | What it is |
|---|---|
| `The 99 - About Page (R2).dc.html` | The deliverable. Specimen grammar and the annotation key (§1), the mark (§2), **the page at desktop with all four chapters and twenty-four figures (§3)**, the behind and current readers (§4), phone (§5), the account menu (§6), the contract (§7). |
| `STATES-about.md` | Every state, both widths. **Superseded by `STATES-about-r2.md` where they disagree.** |
| `STATES-about-r2.md` | The states the figures add: specimen, annotation, per-figure phone reduction, and what a specimen must never do. |
| `about · copy strings.ts` | Entry copy. **R2 adds `caption` and `keys[]` per entry** — see the delta note at the foot of `READINESS.md`. |
| `READINESS.md` | R1's assessment. |
| `READINESS-r2.md` | This round: what is green, the three Product calls, what is unverified. |

---

## What the twenty-four figures are

Organised by what the reader is doing (ruling 4), six entries per chapter, **twelve insets and
twelve plates**.

**01 Your collection** — the import drop and its *replaces* rule · the rows we could not place,
with the reason chip · **free / committed / over-committed as four real rows** (plate) ·
**set completion: owned, `BY NAME`, `FOIL`, missing-dashed and never-stocked cells** (plate) · the
buy tag's four states · the printing picker's filled *Your pick* diamond.

**02 Finding a commander** — **Ready to build: the hero pair, the fit chip, `1615 of your cards
fit · 550 in use`, and the daily rotation out of the top nine** (plate) · **how a fit score is
made: the three-segment bar, the legend, the opened key and `15 + 25 + 33 = 73`** (plate) · the
lane row, including the two-segment *measurable fit* form · **Discover: the counts row plus all
five orders with their glosses, and which two change the list rather than reorder it** (plate) ·
role coverage against baseline · partners, and why a pair deck's 99 is 98.

**03 Building the 99** — **every mark on a decklist: four tiles, by corner** (plate) · how much we
auto-fill and the *Top off* pass · **why a card is filed under Ramp, with per-role baselines**
(plate) · the Add panel with ownership on every result · **draft, commit, versions, and a version's
own record** (plate) · the shopping roll-up, including why a card you own can be on it.

**04 Playing and tuning** — the log form in fifteen seconds · **what the log says back: Fix, Keep,
Mixed, and the three-game threshold** (plate) · **all six status badges with their progress bar,
explaining figure and single next action** (plate) · folders, and why they are not a filter · the
resume rows with the status keyline · the three Commitments figures.

---

## The grammar, in four rules

1. **Inset or plate.** Inset: 300px figure left, caption right — one row or one control. Plate:
   caption above, figure the full column — anything with parts that need naming.
2. **Specimens are the real components.** Fed fixture props from one module, sitting on
   `--surface-sunken` inside a `--border` hairline at radius 8, `aria-hidden` in full, inert. Not
   screenshots: a screenshot is one theme, one density, and stale by the next refresh.
3. **Annotation is a numeral and a line.** 14px `--accent` circle beside the part, one mono
   `--fg-faint` line per numeral under the figure, four per figure maximum. No leaders, no arrows,
   no hover — the constraints are no motion and nothing interactive, and this is the only
   annotation that survives both. Every key line is prose in reading order.
4. **Phone halves the grid, never the marks.** 4 tiles → 2×2, 3 key columns → 3 rows, the status
   table drops its progress column, the set grid drops to 3 cells, Ready-to-build draws one card.
   A 6px diamond stays 6px, because that is the size the reader has to recognise in the app.

## What did not change

One artifact. Redirect, not a banner. Organised by doing, not by screen. Auth-gated. The account
menu as the permanent entry point — `About The 99`, first, no badge ever. The `NEW` plate, with one
boundary added: **it sits on the title line and never inside a specimen's hairline**, so the app's
eleven marks and the page's one mark never share a plate.

## Source read for this round

`marks.tsx`, `ui/availability-marker.tsx`, `ui/ownership-dot.tsx`, `ui/cost-pips.tsx`,
`ui/colour-pips.tsx`, `cards/two-faced-mark.tsx`, `commanders/fit-bar.tsx`,
`commanders/fit-legend.tsx`, `commanders/coverage-sort.tsx`, `home/ready-to-build.tsx`,
`home/hero-commander.tsx`, `home/commitments-card.tsx`, `decks/buy-tag.tsx`,
`decks/deck-card-tile.tsx`, `decks/builder-spine.tsx`, `decks/status-pill.tsx`,
`decks/shelf-line.tsx`, `sets/set-cell.tsx`, `lib/decks/status.ts`, `lib/decks/status-style.ts`,
`lib/copy/refresh.ts`, `lib/copy/lanes.ts`, `lib/copy/game-log.ts`, plus R1's four surfaces.
