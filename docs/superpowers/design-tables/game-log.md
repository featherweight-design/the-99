# Design Property Table — Deck Game Log

Source of truth for this table:

- `design/design_handoff_the99_game_log/README.md` — the authoritative **Component notes** table.
- `design/design_handoff_the99_game_log/The 99 - Game Log.dc.html` — the rendered canvas; every
  pixel value below that is not named in the component table was read off this file (line refs given
  where useful).
- `design/design_handoff_the99_game_log/STATES-log-form.md` — the fourteen form states.
- `design/design_handoff_the99_game_log/LOW-N-summary.md` — the low-N ladder and the seven checks.
- `design/design_handoff_the99_game_log/game-log · copy strings.ts` — copy keys and their arguments.

Breakpoint: Tailwind `md:` = **768px**. "Mobile" = the 390px phone frames on the canvas
(`width:392px` bezel, 12px padding → 368px viewport). "Desktop" = the 900px browser frames.

## Token ↔ hex map

The canvas hardcodes hexes; the component table names tokens. This is the mapping used throughout,
derived from `brand/README.md` plus the component table's own token names. Where the canvas and the
component table disagree, the disagreement is called out inline.

| Token | Hex | Canvas usage |
|---|---|---|
| `--bg` | `#14110E` | product frame background, label on accent/success fills |
| `--surface` | `#1E1A15` | axis cell, form container, form rows, history row, browser-chrome bar |
| `--surface-rail` | `#1A160F` | canvas documentation panels (not product) |
| `--surface-sunken` | `#181410` | aggregate panel, ladder tier frames |
| `--elevated` | `#2A241D` | mark chip fill, split-bar track |
| `--elevated-hover` | `#211C15` | checked axis row fill |
| `--border` | `#2A241D` | axis cell, history row, aggregate panel, delete button |
| `--border-strong` | `#3A3229` | form container, unchecked checkbox, result/pod unselected, `L`/`D` square |
| (canvas literal) | `#4A4033` | neutral split-bar segment, dashed date underline, dashed moved-row border, N=5 ladder frame |
| `--accent` | `#C9A24B` | brass, selected pill, CTA fill, checked checkbox border, record figure |
| `--accent-hover` | `#D8B25E` | brass hover |
| `--accent-shadow` | `#6E5B33` | checked axis row border |
| `color-mix(--accent 12%, transparent)` | `rgba(201,162,75,0.12)` | checked checkbox fill, selected pod square fill |
| `--fg` | `#EDE6D8` | headings, axis row label |
| `--fg-body` | `#C6B79A` | body copy, N<3 figures, `L`/`D` square glyph, mark chip label |
| `--fg-muted` | `#A89B84` | secondary data, checked gloss, Cancel label, Mixed sentence |
| `--fg-faint` | `#8E8269` | labels, hints, rest gloss, meta line, Mixed label |
| `--fg-locked` | `#6A6152` | `{n} marked` counter, sub-line at N=1, delete glyph, `—` no-marks |
| `--success` | `#6FA368` | Won fill, worked, Keep |
| `--warning` | `#E0913C` | hurt, Fix |
| `--danger` | `#C6533F` | delete hover only — **never** on a result |

Fonts: `--font-display` = `'Cinzel', serif`; `--font-sans` = `'IBM Plex Sans', sans-serif`;
`--font-mono` = `'IBM Plex Mono', monospace`.

> **Canvas conflict, recorded:** the component table says the neutral split-bar segment and the
> moved-row dashed border are `--border-strong`; the canvas draws both as `#4A4033`, while it draws
> the form container's stated `1px --border-strong` as `#3A3229`. Implement the **token** named in
> the component table (`--border-strong`) — the component table wins per the handoff's own rule that
> shipped code/tokens beat canvas hexes.

> **Eng-audit correction (READINESS.md finding 1), recorded:** the canvas draws the tab row as
> 999px pills; the shipped `builder-tabs.tsx` is a baseline text row with a 2px accent bottom
> border. **The shipped component wins.** The pill geometry below is documented as drawn, but the
> implementation target is the shipped tab treatment plus one entry and an optional count.

---

## Component: Games tab pill

Component note: `BuilderTabs` unchanged — 999px pill, 13px, brass solid selected, `1px --border`
ghost at rest. Count appended as `· {n}` when `n > 0`; bare label at 0.

### Tab row (container)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 7 | 10 |
| align-items | — (canvas omits at phone) | center |
| padding-bottom | 12 (within header block) | 18 |
| border-bottom | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |
| Tab order | Decklist · Consider · Games | Decklist · Consider · Games |

### Pill — at rest (unselected)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-sans` | `--font-sans` |
| font-size | 12 | 13 |
| font-weight | 500 | 500 |
| color | `--fg-muted` (`#A89B84`) | `--fg-muted` (`#A89B84`) |
| background | transparent | transparent |
| border | 1px solid `--border-strong` (`#3A3229`) | 1px solid `--border-strong` (`#3A3229`) |
| border-radius | 999 | 999 |
| padding | 5 12 | 5 14 |

> Component note says the ghost border is `1px --border`; the canvas draws `#3A3229`
> (= `--border-strong`) on every rest pill, in all five frames. Canvas is internally consistent —
> flagged, and the shipped component's own rest border wins.

### Pill — selected

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-sans` | `--font-sans` |
| font-size | 12 | 13 |
| font-weight | 600 | 600 |
| color | `--bg` (`#14110E`) | `--bg` (`#14110E`) |
| background | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |
| border | — (no border) | — (no border) |
| border-radius | 999 | 999 |
| padding | 5 12 | 5 14 |

### Pill — hover (unselected)

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | shipped `BuilderTabs` hover — unchanged by this handoff | shipped `BuilderTabs` hover — unchanged by this handoff |

### Conditional rendering — the count

| Condition | Renders |
|---|---|
| `n === 0` | `gameLogCopy.tab.label` → bare label. No count span, no badge, no icon. |
| `n > 0` | `gameLogCopy.tab.labelWithCount(n)` → `Games · {n}` |
| always | The tab itself is **never** hidden, at any `n`. |
| never | `Games · 2–1` — the count is games logged, never the record. |

---

## Component: Record line / headline

Component note: Cinzel 26px `--fg` headline (20px phone), body 13.5px `--fg-body` beneath, record
itself mono 13px `--accent` tabular inside that body line.

### Headline block (container)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block (stacked) | flex |
| align-items | — | baseline |
| gap | — | 14 |
| flex-wrap | — | wrap |
| margin | — | 20 0 6 |

### Headline text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-display` (Cinzel) | `--font-display` (Cinzel) |
| font-size | 20 (N≥3) / 21 (N=1) | 26 |
| font-weight | 700 | 700 |
| line-height | 1.25 (N≥3 phone) | normal |
| color | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |
| margin | 0 | 0 |

> Component note gives "20px phone"; the canvas draws 21px in the N=1 phone frame (line 417) and
> 20px in the N=3 phone frame (line 539). Component table wins: **20**.

### Record figure — N = 1 (`1–0 · won it`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 12 | 13 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| font-variant-numeric | — | tabular-nums |
| margin-top | 5 | — (baseline-aligned inline) |
| Copy key | `headline.oneGameRecord(result)` | `headline.oneGameRecord(result)` |

### Sub-line (body beneath the headline)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13 | 13.5 |
| line-height | 1.6 | 1.6 |
| color | `--fg-faint` (`#8E8269`) at N=1 · `--fg-body` (`#C6B79A`) at N≥3 | same |
| max-width | — | 620 (N=1) / 640 (N≥3) |
| margin-top | 9 | 0 |

### Record inside the sub-line (N ≥ 2)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 12 | 13 |
| color | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |
| font-variant-numeric | — | tabular-nums |

### Denominator emphasis inside the sub-line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 600 | 600 |
| color | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |

### Copy keys and arguments

| Condition | Key | Arguments |
|---|---|---|
| N = 1 | `headline.oneGame` | — |
| N = 1 record | `headline.oneGameRecord(result)` | result string |
| N = 1 note | `headline.oneGameNote` | — |
| N = 2, Fix strongest | `headline.twoGames(axis)` | axis label |
| N = 2, Keep strongest | `headline.twoGamesKeep(axis)` | axis label |
| N = 2 note | `headline.twoGamesNote` | — |
| N ≥ `PATTERN_MIN`, Fix | `headline.finding(axis)` | axis label |
| N ≥ `PATTERN_MIN`, Keep | `headline.findingKeep(axis)` | axis label |
| Fix + Keep empty, Mixed non-empty | `headline.findingNone` | — |
| No axis marked in any game | `headline.recordOnly(games, record)` | games, record |
| Sub, marked < count | `headline.sub(marked, count, record)` | marked, count, record |
| Sub, marked === count | `headline.subAll(count, record)` | count, record |
| Record | `headline.record(w, l)` / `headline.recordWithDraws(w, l, d)` | figures |
| Long record | `headline.recordLong(record, games)` / `headline.recordLongOne(record)` | record, games |

### Conditional rendering

- Headline fallback order at every N ≥ 1: strongest **Fix** → strongest **Keep** → **Mixed-only**
  plain statement → record line alone (case 4 renders **no aggregate panel at all**).
- `net` is never rendered. No percentage formatter exists anywhere in this feature.
- `PATTERN_MIN` is read from one exported constant; `3` is inlined nowhere.

---

## Component: Axis cell

Component note: `role-counter-cell`'s **geometry** verbatim, fill one surface step up. 200px wide
desktop, wrapping; a 44px row at phone with label · sub · figure.

### Cell container — Desktop

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | block |
| align-items | center | — |
| gap | 10 | — |
| width | auto (full) | 200 |
| flex | 1 1 auto | none (no grow, no shrink) |
| min-height | 44 | — |
| background | `--surface` (`#1E1A15`) | `--surface` (`#1E1A15`) |
| border | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |
| border-radius | 8 | 9 |
| padding | 0 12 | 11 14 |

### Cell row (desktop label + figure line)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (cell itself is the row) | flex |
| align-items | — | baseline |
| justify-content | — | space-between |
| gap | — | 8 |

### Label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-sans` | `--font-mono` |
| font-size | 13 | 10 |
| letter-spacing | — | .1em |
| text-transform | none | uppercase |
| color | `--fg` (`#EDE6D8`) | `--fg-faint` (`#8E8269`) |
| flex | 1 1 auto | — |
| min-width | 0 | — |
| white-space | — | nowrap |
| overflow | — | hidden |
| text-overflow | — | ellipsis |

### Figure

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 12 (N=1) / 13 (N≥3) | 13 (N=1) / 16 (N≥3) |
| font-weight | 600 | 600 |
| font-variant-numeric | — | tabular-nums |
| flex | none | none |
| color · N < `PATTERN_MIN` | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| color · N ≥ `PATTERN_MIN`, Fix | `--warning` (`#E0913C`) | `--warning` (`#E0913C`) |
| color · N ≥ `PATTERN_MIN`, Keep | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| Copy key | `cell.figure(marked, count)` · `cell.figureOneUp` · `cell.figureOneDown` | same |

> Component note fixes the desktop figure at **mono 16px** (role-counter-cell verbatim). The canvas
> draws 13px in the N=1 frame (line 383) and 16px at N≥3 (lines 482/496/598). Component table wins:
> **16** at every N; the N=1 frame's 13px is a canvas inconsistency.

### Sub-line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 11 (N=1) / 10.5 (N≥3) | 9.5 |
| color | `--fg-locked` (`#6A6152`) at N=1 · `--fg-faint` (`#8E8269`) at N≥3 | same |
| flex | none | — |
| margin-top | — (inline, phone) | 6 |
| Copy key | `cell.sub(up, down)` · `cell.subOneGame` | same |

### Cell slot order

| Slot | Mobile | Desktop |
|---|---|---|
| 1 | label | label (left of the baseline row) |
| 2 | sub | figure (right of the baseline row) |
| 3 | figure | bar (below) |
| 4 | — | sub (below the bar) |

### Cell strip (the wrapping container of cells)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| flex-wrap | — | wrap |
| gap | 6 | 12 |

---

## Component: Split bar

Component note: 5px, radius 999px, track `--elevated`, two flex segments: worked `--success`, hurt
`--warning`. Single `--border-strong` segment below three games. No transition.

### Track

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (not drawn in phone cells) | yes |
| height | — | 5 |
| border-radius | — | 999 |
| background | — | `--elevated` (`#2A241D`) |
| overflow | — | hidden |
| margin-top | — | 8 |
| display | — | flex |
| transition | — | none |

### Segment — worked (N ≥ `PATTERN_MIN`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | 100% |
| width | — | `worked / (worked + hurt)` as a percentage |
| background | — | `--success` (`#6FA368`) |

### Segment — hurt (N ≥ `PATTERN_MIN`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | 100% |
| width | — | `hurt / (worked + hurt)` as a percentage |
| background | — | `--warning` (`#E0913C`) |

### Segment — neutral (N < `PATTERN_MIN`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | 100% |
| width | — | 100% |
| background | — | `--border-strong` (canvas draws `#4A4033`) |

### Semantics

- The whole bar is **the games that marked this axis**, not the games played.
- At N = 1 it is a single neutral segment.
- No animation: no growth-on-load, no transition, no count-up on the figure.

---

## Component: Bucket heading

Component note: Mono 10px uppercase `letter-spacing .14em`, `--warning` for Fix, `--success` for
Keep, with a mono 10px `--fg-locked` gloss beside it. Absent entirely at N=1.

### Heading row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | flex |
| align-items | — | baseline |
| gap | — | 9 |
| margin — Fix (first) | 0 0 9 | 0 0 11 |
| margin — Keep (second) | 15 0 9 | 20 0 11 |

### Heading label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 9.5 | 10 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color — Fix, N ≥ `PATTERN_MIN` | `--warning` (`#E0913C`) | `--warning` (`#E0913C`) |
| color — Keep, N ≥ `PATTERN_MIN` | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| color — N = 2 | `--fg-faint` (`#8E8269`), neutral | `--fg-faint` (`#8E8269`), neutral |
| Copy key | `buckets.fix` / `buckets.keep` | same |

> Component note fixes the label at mono **10px**; the canvas phone frame draws 9.5px (lines
> 544/554). Component table wins: **10**.

### Heading gloss

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (absent in the phone frame) | yes |
| font-family | — | `--font-mono` |
| font-size | — | 10 |
| text-transform | — | none |
| letter-spacing | — | normal |
| color | — | `--fg-locked` (`#6A6152`) |
| Copy key | — | `buckets.fixNote` / `buckets.keepNote` |

### N = 1 heading (replaces both buckets)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 9.5 | 10 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| margin-bottom | 10 | 12 |
| Copy key | `buckets.oneGameHeading` | `buckets.oneGameHeading` |

### N = 1 footnote (desktop only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — | yes |
| font-family | — | `--font-mono` |
| font-size | — | 10.5 |
| color | — | `--fg-locked` (`#6A6152`) |
| margin-top | — | 13 |
| Copy key | — | `buckets.oneGameNote` |

### Conditional rendering

| Condition | Renders |
|---|---|
| N = 0 | No aggregate panel at all. |
| N = 1 | No `Fix`, no `Keep`, no bucket heading. Only `buckets.oneGameHeading`. |
| N = 2 | Fix and Keep appear, headings neutral. |
| N ≥ 3 | Fix and Keep in state colour. |
| bucket empty | that bucket's heading and cell strip do not render |
| Order | **Fix above Keep**, always. |

---

## Component: Aggregate panel (the container the buckets live in)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `--surface-sunken` (`#181410`) | `--surface-sunken` (`#181410`) |
| border | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |
| border-radius | 10 | 11 |
| padding | 13 14 | 16 18 |
| margin-top | 18 | 24 |

---

## Component: Mixed line

Component note: One line above a `1px --border` rule. Mono 10px uppercase `--fg-faint` label + mono
11px `--fg-muted` sentence. No cells, no colour.

### Container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | flex |
| align-items | — | baseline |
| gap | — | 10 |
| flex-wrap | — | wrap |
| margin-top | 14 | 18 |
| padding-top | 12 | 14 |
| border-top | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |

### Label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 9.5 | 10 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| Copy key | `buckets.mixed` | `buckets.mixed` |

> Component note fixes mono **10px**; canvas phone frame draws 9.5. Component table wins: **10**.

### Sentence

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10.5 | 11 |
| color | `--fg-muted` (`#A89B84`) | `--fg-muted` (`#A89B84`) |
| Copy key | `buckets.mixedLine(axis, up, down)` · `buckets.mixedLineMulti(clauses)` | same |

> Component note fixes mono **11px**; canvas phone frame draws 10.5. Component table wins: **11**.

### Conditional rendering

- Renders **whenever Mixed is non-empty, at every N** — including N = 1 and N = 2.
- Never a third heading, never a cell strip, never a state colour.

---

## Component: "Log a game" button (collapsed)

Component note: Brass-outline button, `1px --accent`, label 13.5px 600 `--accent`, radius 8px,
`10px 18px`; 44px full-width at phone. Never brass-solid.

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | inline-flex |
| align-items | center | center |
| justify-content | center | — |
| width | 100% | auto |
| height | 44 | — |
| min-height | 44 | 44 (component note: "collapses to a 44px row") |
| padding | — (height-driven) | 10 18 |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 13.5 | 13.5 |
| font-weight | 600 | 600 |
| color | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |
| background | transparent | transparent |
| border | 1px solid `--accent` (`#C9A24B`) | 1px solid `--accent` (`#C9A24B`) |
| border-radius | 8 | 8 |
| margin-top | 16 | 20 |
| Copy key | `form.open` | `form.open` |

### Hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `--accent-hover` (`#D8B25E`) | `--accent-hover` (`#D8B25E`) |
| border-color | `--accent-hover` (`#D8B25E`) | `--accent-hover` (`#D8B25E`) |

### Focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | global `:focus-visible` — 2px brass at +2px offset, not overridden | same |

### Conditional rendering / behaviour

- Position: **above the aggregate, below the record line.**
- Never brass-solid — `Build this deck` owns solid brass.
- Activating it **replaces this row in place** with the form container.
- Focus returns to this row after save.
- The empty-state CTA opens this same form, already expanded.

---

## Component: Form container

Component note: `--surface` on `1px --border-strong`, radius 12px, padding 20px. Replaces the
collapsed row in place.

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `--surface` (`#1E1A15`) | `--surface` (`#1E1A15`) |
| border | 1px solid `--border-strong` (`#3A3229`) | 1px solid `--border-strong` (`#3A3229`) |
| border-radius | 12 | 12 |
| padding | 16 | 20 |
| transition | shipped panel transition (open/close) — the only animated thing in the feature | same |

### Form header row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| justify-content | space-between | space-between |
| margin-bottom | 14 (drawn as header block padding-bottom) | 18 |
| border-bottom | 1px solid `--border` (`#2A241D`) — phone header block only | — |

### Form heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-display` (Cinzel) | `--font-display` (Cinzel) |
| font-size | 17 | 19 |
| font-weight | 700 | 600 |
| color | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |
| Copy key | `form.heading` | `form.heading` |

### `played tonight` date affordance

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10 | 11 |
| color — `played` prefix | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| color — the date word | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| border-bottom | 1px dashed `#4A4033` | 1px dashed `#4A4033` |
| Copy key | `form.playedToday` → `form.played(date)` | same |

### Date affordance — hover / focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| behaviour | activating opens a date field; the field itself refuses forward dates | same |
| outline | global `:focus-visible` 2px brass at +2px | same |

### Field row (Result + Pod, desktop side by side)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block (stacked) | flex |
| gap | — | 34 |
| align-items | — | flex-start |
| flex-wrap | — | wrap |
| margin-bottom | — | 20 |

### Field group label (Result / Pod size)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 9.5 | 10 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| margin-bottom | 8 | 9 |
| Copy key | `form.resultLabel` / `form.podLabel` | same |

### Pod hint (`players at the table`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (absent at phone) | yes |
| font-family | — | `--font-mono` |
| font-size | — | 10 |
| text-transform | — | none |
| letter-spacing | — | 0 |
| color | — | `--fg-locked` (`#6A6152`) |
| Copy key | — | `form.podHint` |

### Column grid (the two axis fieldsets)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block — two stacked headed blocks | grid |
| grid-template-columns | — | 1fr 1fr |
| gap | 16 (margin-bottom between blocks) | 16 |

---

## Component: Result group

Component note: Three 40px segments (44px phone), radius 8px. Won selected: `--success` fill, `--bg`
label. Lost / Draw selected: `1px --accent`, label `--fg`, no fill. Unselected: `1px --border`,
label `--fg-body`. Radio group, no default.

### Group container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 7 | 8 |
| margin-bottom | 16 | — |
| role | radiogroup | radiogroup |

### Segment — unselected

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | none |
| height | 44 | 40 |
| padding | — (height/flex-driven) | 9 20 |
| display | flex | inline-flex |
| align-items | center | center |
| justify-content | center | center |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 13.5 | 13.5 |
| font-weight | 500 | 500 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| background | transparent | transparent |
| border | 1px solid `--border` (component note) — canvas draws `#3A3229` | same |
| border-radius | 8 | 8 |

### Segment — `Won` selected

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 600 | 600 |
| color | `--bg` (`#14110E`) | `--bg` (`#14110E`) |
| background | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| border | — (fill only) | — (fill only) |
| border-radius | 8 | 8 |

### Segment — `Lost` / `Draw` selected

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 600 | 600 |
| color | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |
| background | transparent — **no fill** | transparent — **no fill** |
| border | 1px solid `--accent` (`#C9A24B`) | 1px solid `--accent` (`#C9A24B`) |
| border-radius | 8 | 8 |

### Focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | global `:focus-visible` 2px brass at +2px | same |
| initial focus | opening the form moves focus to the Result group | same |

### Conditional rendering / behaviour

- **No default.** Nothing is selected until the player picks.
- `--danger` never appears on a result, in the form or in history.
- Copy keys: `form.won`, `form.lost`, `form.draw`.
- Save enables on a Result alone.

---

## Component: Pod group

Component note: Seven 40px squares (44px phone), radius 8px, mono 14px 600. Selected `1px --accent`
+ `--accent` label + `color-mix(--accent 12%, transparent)`. Default 4. Radio group.

### Group container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 5 | 6 |
| margin-bottom | 18 | — |
| role | radiogroup | radiogroup |
| items | 7 (values 2–8) | 7 (values 2–8) |

### Square — unselected

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | none |
| width | auto (flex 1) | 40 |
| height | 44 | 40 |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 14 | 14 |
| font-weight | 600 | 600 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| background | transparent | transparent |
| border | 1px solid `--border-strong` (`#3A3229`) | 1px solid `--border-strong` (`#3A3229`) |
| border-radius | 8 | 8 |

### Square — selected

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |
| background | `color-mix(in srgb, var(--accent) 12%, transparent)` (`rgba(201,162,75,0.12)`) | same |
| border | 1px solid `--accent` (`#C9A24B`) | 1px solid `--accent` (`#C9A24B`) |
| border-radius | 8 | 8 |

### Focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | global `:focus-visible` 2px brass at +2px | same |

### Conditional rendering / behaviour

- **Defaults to 4.** The control *is* the `check` range 2–8 — it cannot produce an invalid value.
- Not a stepper, not a select.

---

## Component: Axis column

Component note: `fieldset` + `legend`. Legend mono 10px uppercase `letter-spacing .14em` —
`--success` for worked, `--warning` for hurt — with a mono 10px `{n} marked` counter beside it in
`--fg-locked`.

### Fieldset

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `fieldset` | `fieldset` |
| border | none | none |
| padding | 0 | 0 |
| margin | 0 0 16 (between the two stacked blocks) | 0 |

### Legend row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | flex |
| align-items | — | baseline |
| gap | — | 8 |
| margin-bottom | 8 | 9 |

### Legend text

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 9.5 (canvas) — component note fixes **10** | 10 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color — What worked | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| color — What let me down | `--warning` (`#E0913C`) | `--warning` (`#E0913C`) |
| Copy key | `form.workedLabel` / `form.hurtLabel` | same |

### `{n} marked` counter

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10 | 10 |
| text-transform | none | none |
| letter-spacing | normal | normal |
| color | `--fg-locked` (`#6A6152`) | `--fg-locked` (`#6A6152`) |
| Copy key | `form.marked(n)` | `form.marked(n)` |

### Row list

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| gap | 5 | 5 |
| rows rendered | **all 8** | **all 8** |

> The canvas draws 4 rows + `… 4 more` on the phone form purely to fit the frame. **In the build all
> eight render in both columns.** No disclosure, no truncation on the axis list.

### Conditional rendering

| Condition | Renders |
|---|---|
| `n === 0` marked | counter **absent** — never `0 marked` |
| `n > 0` marked | `form.marked(n)` |
| Accessible name | the legend supplies it: "what worked, mana" — not "mana" twice |

### Row order (locked, both columns, all N)

| # | Key | Label | Gloss · worked | Gloss · let me down |
|---|---|---|---|---|
| 1 | `speed` | Speed | got going fast | started too slow |
| 2 | `card_flow` | Cards in hand | kept drawing | ran out of gas |
| 3 | `mana` | Mana | hit every land drop | screwed or flooded |
| 4 | `interaction` | Answers | answered the threats | nothing for their threats |
| 5 | `board` | Board presence | built a board | got outsized |
| 6 | `resilience` | Comebacks | recovered from a wipe | never recovered |
| 7 | `engine` | The deck's plan | the plan fired | never came together |
| 8 | `closing` | Closing the game | converted the win | stalled out |

Order is the constant's order. Not alphabetical, not by frequency. Labels and both glosses live in
`src/lib/copy/game-log.ts` (`axisCopy`), bound by `Record<GameAxisKey, …>`;
`src/lib/decks/game-axes.ts` is keys and order only.

---

## Component: Axis row

Component note: `label` wrapping a checkbox. min-height 46px (48px phone), `--surface` on
`1px --border`, radius 8px, padding `5px 12px`, gap 11px.

### Row — at rest (unchecked)

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<label>` wrapping a real checkbox | `<label>` wrapping a real checkbox |
| display | flex | flex |
| align-items | center | center |
| gap | 11 | 11 |
| min-height | 48 | 46 |
| background | `--surface` (`#1E1A15`) | `--surface` (`#1E1A15`) |
| border | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |
| border-radius | 8 | 8 |
| padding | 5 12 | 5 12 |
| hit area | the whole row | the whole row |

### Row — checked

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `--elevated-hover` (`#211C15`) | `--elevated-hover` (`#211C15`) |
| border | 1px solid `--accent-shadow` (`#6E5B33`) | 1px solid `--accent-shadow` (`#6E5B33`) |
| border-radius | 8 | 8 |
| padding | 5 12 | 5 12 |

### Row — hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| cursor | pointer | pointer |
| (no other declared change — the handoff declares no hover fill on the axis row) | — | — |

### Row — focus (via the wrapped checkbox)

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | global `:focus-visible` 2px brass at +2px | same |

### Row — disabled (state 10, saving)

| Property | Mobile | Desktop |
|----------|--------|---------|
| interactivity | non-interactive | non-interactive |
| position | unchanged — nothing unmounts, nothing collapses | unchanged |
| legibility | unchanged — full-opacity ink retained | unchanged |

### Text stack (label + gloss)

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 1 auto | 1 1 auto |
| min-width | 0 | 0 |
| display | flex | flex |
| flex-direction | column | column |
| gap | 2 | 2 |

### Row label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-sans` | `--font-sans` |
| font-size | 13.5 | 13.5 |
| font-weight | 400 | 400 |
| color — rest & checked | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |
| color — moved row (one beat) | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| Copy key | `axisCopy[key].label` | `axisCopy[key].label` |

### Gloss

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10 | 10 |
| color — at rest | `--fg-faint` (`#8E8269`) — **not** `--fg-locked` (4.57:1 vs 2.84:1) | same |
| color — checked | `--fg-muted` (`#A89B84`) (6.19:1) | same |
| a11y binding | the gloss is the checkbox's `aria-describedby`, not part of its name | same |
| Copy key | `axisCopy[key].worked` in the worked column · `axisCopy[key].hurt` in the hurt column | same |

---

## Component: Axis checkbox

Component note: 18px (20px phone), radius 5px, `1px --border-strong`. Checked: `1px --accent`, fill
`color-mix(--accent 12%, transparent)`, glyph `✓` in the column's colour. Decorative — the row is
the hit area.

### Box — unchecked

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 20 | 18 |
| height | 20 | 18 |
| flex | none | none |
| border-radius | 5 | 5 |
| border | 1px solid `--border-strong` (`#3A3229`) | 1px solid `--border-strong` (`#3A3229`) |
| background | transparent | transparent |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| content | empty | empty |

### Box — checked

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 20 | 18 |
| height | 20 | 18 |
| border | 1px solid `--accent` (`#C9A24B`) | 1px solid `--accent` (`#C9A24B`) |
| background | `color-mix(in srgb, var(--accent) 12%, transparent)` (`rgba(201,162,75,0.12)`) | same |
| border-radius | 5 | 5 |

### Glyph (`✓`, U+2713)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 12 | 11 |
| color — worked column | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| color — hurt column | `--warning` (`#E0913C`) | `--warning` (`#E0913C`) |
| rendering | text glyph, not an SVG — no `viewBox`, no `stroke-width`, no path | same |
| a11y | decorative; the real `<input type=checkbox>` carries state | same |

---

## Component: Moved row

Component note: Unticked, `1px dashed --border-strong` for one beat, gloss replaced by
`moved to {other column}` in `--fg-locked`, then back to rest.

### Vacated row — during the beat

| Property | Mobile | Desktop |
|----------|--------|---------|
| checkbox | unticked, empty, 1px solid `--border-strong` (`#3A3229`), background transparent | same |
| border | 1px **dashed** `--border-strong` (canvas draws `#4A4033`) | same |
| background | `--surface` (`#1E1A15`) | `--surface` (`#1E1A15`) |
| border-radius | 8 | 8 |
| padding | 5 12 | 5 12 |
| min-height | 48 | 46 |
| gap | 11 | 11 |
| label color | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| gloss text | replaced by the moved string | replaced by the moved string |

### Moved gloss

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10 | 10 |
| color | `--fg-locked` (component note) — canvas draws `--fg-faint` `#8E8269`; STATES says "same `--fg-faint`" | same |
| font-style | the destination column name is italic on the canvas | same |
| Copy key | `form.movedToHurt` / `form.movedToWorked` | same |

> **Recorded conflict:** the component table says the moved gloss is `--fg-locked`; STATES-log-form's
> copy table says it keeps "same `--fg-faint`"; the canvas draws `#8E8269` = `--fg-faint`. Two of
> three sources say `--fg-faint` — implement **`--fg-faint`**, and it is also the contrast-safe
> choice the READINESS note argues for.

### Receiving row — after the tap

| Property | Mobile | Desktop |
|----------|--------|---------|
| state | checked, normal checked treatment (no special styling) | same |
| background | `--elevated-hover` (`#211C15`) | `--elevated-hover` (`#211C15`) |
| border | 1px solid `--accent-shadow` (`#6E5B33`) | 1px solid `--accent-shadow` (`#6E5B33`) |
| gloss | that column's own gloss, `--fg-muted` (`#A89B84`) | same |

### Behaviour

- Ticking an axis on one side **unticks** it on the other. No dialog, no error, no undo prompt.
- After one beat the vacated row returns to rest (solid `--border`, its own gloss, `--fg-faint`).
- Announced once on the existing live region: `announce.moved(axis, column)`.
- Form state, not a server concern — `worked` and `hurt` are disjoint before submit.

---

## Component: Save / Cancel

Component note: Brass solid `Save this game` (the shipped primary), neutral ghost `Cancel`.
48px / 44px stacked full-width at phone. Enabled on a result.

### Footer container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | center |
| gap | 9 | 16 |
| flex-wrap | — | wrap |
| margin-top | 18 | 20 |
| padding-top | 16 | 18 |
| border-top | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |

### Save — enabled (rest)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 100% | auto |
| height | 48 | — |
| padding | — (height-driven) | 11 20 |
| display | flex | inline-flex |
| align-items | center | center |
| justify-content | center | — |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 14.5 | 14 |
| font-weight | 600 | 600 |
| color | `--bg` (`#14110E`) | `--bg` (`#14110E`) |
| background | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |
| border | — | — |
| border-radius | 8 | 8 |
| Copy key | `form.save` | `form.save` |

### Save — hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `--accent-hover` (`#D8B25E`) | `--accent-hover` (`#D8B25E`) |

### Save — disabled (states 2, 8, 9, 14)

| Property | Mobile | Desktop |
|----------|--------|---------|
| state | `disabled` — shipped primary-button disabled treatment | same |
| accompanying error | **none** — a disabled save is never accompanied by an error | same |

### Save — in flight (state 10)

| Property | Mobile | Desktop |
|----------|--------|---------|
| state | disabled | disabled |
| Copy key | `form.saving` | `form.saving` |

### Save — focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | global `:focus-visible` 2px brass at +2px | same |

### Cancel

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 100% | auto |
| height | 44 | — |
| padding | — (height-driven) | 11 18 |
| display | flex | inline-flex |
| align-items | center | center |
| justify-content | center | — |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 13.5 | 13.5 |
| font-weight | 500 | 500 |
| color | `--fg-muted` (`#A89B84`) | `--fg-muted` (`#A89B84`) |
| background | transparent | transparent |
| border | 1px solid `--border-strong` (`#3A3229`) | 1px solid `--border-strong` (`#3A3229`) |
| border-radius | 8 | 8 |
| Copy key | `form.cancel` | `form.cancel` |

### Cancel — disabled (state 10)

| Property | Mobile | Desktop |
|----------|--------|---------|
| state | disabled during save | disabled during save |

### Optional-marks note

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (absent in the phone frame) | yes |
| font-family | — | `--font-mono` |
| font-size | — | 11 |
| color | — | `--fg-faint` (`#8E8269`) |
| Copy key | — | `form.optionalNote` |

### Behaviour

- Save enables on a Result **alone**; marks are optional.
- Cancel discards with **no confirm** and collapses to state 1.
- On save the form collapses to state 1 and focus returns to the collapsed `Log a game` row.

---

## Component: Refusal

Component note: Shipped `MutationError` under the save button, form state preserved. `logGame`
returns `DeckMutationResult`, so no new surface.

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | shipped `MutationError` — a `<p role="alert">` taking one `message` prop | same |
| position | directly under the save button, inside the form container | same |
| styling | shipped `MutationError` — no override | same |
| form state | every value preserved: result, pod, date, both mark lists | same |
| Save button | re-enabled | re-enabled |
| Copy key | `form.refused` (log) · `history.deleteRefused` (delete) | same |
| announcement | the refusal string, once, on the existing live region | same |

---

## Component: History row

Component note: min-height 52px (64px phone, two lines), `--surface` on `1px --border`, radius 9px,
padding `8px 12px 8px 14px`, gap 14px. Slots: result 26px · meta 132px mono 11px tabular · marks
(wrapping) · delete 30px.

Phone (the handoff's anatomy, enforced 2026-09-27): result, meta and stamp on line one with the
delete at its end (`ml-auto`), the marks on line two at full width (`order-last basis-full`). From
`md` the marks share line one again. `probe:games-log` measures both.

### History section heading row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 10 | 10 |
| margin-bottom | 10 | 10 |
| margin-top | 22 | 22 |

### History heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10 | 10 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| Copy key | `history.heading` | `history.heading` |

### History heading note (`newest first`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10 | 10 |
| color | `--fg-locked` (`#6A6152`) | `--fg-locked` (`#6A6152`) |
| Copy key | `history.headingNote` | `history.headingNote` |

### Row list

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| gap | 6 | 6 |
| length | full list, newest first, **no pagination, no cap, no filter, no grouping** | same |

### Row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-wrap | wrap (result + meta line 1, chips line 2) | nowrap |
| align-items | center | center |
| gap | 14 | 14 |
| min-height | 64 | 52 |
| background | `--surface` (`#1E1A15`) | `--surface` (`#1E1A15`) |
| border | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |
| border-radius | 9 | 9 |
| padding | 8 12 8 14 | 8 12 8 14 |

### Meta slot

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | auto | 132 |
| flex | none | none |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 11 | 11 |
| color | `--fg-faint` (`#8E8269`) | `--fg-faint` (`#8E8269`) |
| font-variant-numeric | tabular-nums | tabular-nums |
| Copy key | `history.meta(pod, date)` — pod size first, date second | same |

### Marks slot

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 1 auto | 1 1 auto |
| min-width | 0 | 0 |
| display | flex | flex |
| gap | 6 | 6 |
| flex-wrap | wrap | wrap |
| truncation | **none** — no truncation of the mark list | none |

### Row layout — Mobile two-line rule

| Line | Contents |
|---|---|
| 1 | result square + meta |
| 2 | chips, wrapping |
| min-height | 64 |

---

## Component: Result square

Component note: 26px, radius 7px, mono 12px 600. `W`: `1px --success`, label `--success`.
`L` / `D`: `1px --border-strong`, label `--fg-body`. Never `--danger`.

### Square — `W`

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 26 | 26 |
| height | 26 | 26 |
| flex | none | none |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| border-radius | 7 | 7 |
| border | 1px solid `--success` (`#6FA368`) | 1px solid `--success` (`#6FA368`) |
| background | transparent | transparent |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 12 | 12 |
| font-weight | 600 | 600 |
| color | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| Copy key | `history.won` | `history.won` |

### Square — `L` / `D`

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 26 | 26 |
| height | 26 | 26 |
| border-radius | 7 | 7 |
| border | 1px solid `--border-strong` (`#3A3229`) | 1px solid `--border-strong` (`#3A3229`) |
| background | transparent | transparent |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 12 | 12 |
| font-weight | 600 | 600 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| Copy key | `history.lost` / `history.drawn` | same |
| forbidden | `--danger` never appears here | `--danger` never appears here |

---

## Component: Mark chip

Component note: mono 10.5px `--fg-body` on `--elevated`, radius 999px, padding `4px 11px 4px 8px`,
with a 6px filled dot — `--success` worked, `--warning` hurt. Vocabulary order, **not** grouped by
direction.

### Chip

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 6 | 6 |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10.5 | 10.5 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| background | `--elevated` (`#2A241D`) | `--elevated` (`#2A241D`) |
| border | — | — |
| border-radius | 999 | 999 |
| padding | 4 11 4 8 | 4 11 4 8 |
| Copy key | `axisCopy[key].label` | `axisCopy[key].label` |

### Dot

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 6 | 6 |
| height | 6 | 6 |
| flex | none | none |
| border-radius | 999 | 999 |
| background — worked | `--success` (`#6FA368`) | `--success` (`#6FA368`) |
| background — hurt | `--warning` (`#E0913C`) | `--warning` (`#E0913C`) |
| rendering | a filled div, not an SVG — no `viewBox`, no `stroke` | same |

### Ordering

- Chips are in **vocabulary order** (the constant's order), not grouped by direction.
- Direction is the **dot**, not the order. Worked chips first would sort two lists inside one row.

---

## Component: "no marks" dash

Component note: Em dash mono `--fg-locked` in the chip slot. Absence, not a gap.

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10.5 (chip-slot type scale) | 10.5 |
| color | `--fg-locked` (`#6A6152`) | `--fg-locked` (`#6A6152`) |
| background | — (no chip) | — (no chip) |
| border | — | — |
| padding | — | — |
| Copy key | `history.noMarks` (`—`, U+2014) | `history.noMarks` |

### Conditional rendering

| Condition | Renders |
|---|---|
| game has ≥ 1 mark | chips |
| game has 0 marks | the em dash in the chip slot — never an empty gap |

---

## Component: Delete affordance

Component note: 30px `×` (44px phone), `1px --border`, glyph `--fg-locked`, `--danger` on hover.
**One confirm**, since 2026-09-27 the deck delete's own pane (`DeleteConfirm`, `ui/delete-confirm.tsx`)
floating under the × in the deck ⋯ menu's panel (`useAnchoredPanel`), 224px wide (Hugh: "our UI is
consistent; re-use this UI"). Heading `history.confirm` (`Delete this game?`), sentence
`history.confirmBody`, `history.confirmNo` (`Keep it`, focused on open) and `history.confirmYes`
(`Delete game`, `--danger`), `history.deleting` in flight. A refusal stays in the pane as its alert.
Escape and KEEP return focus to the ×. The inline `Delete this game?` · `Delete` / `Keep` row it
replaced is retired. `probe:delete-confirm` presses all three doors (deck ⋯, shelf ⋯, game ×) at 390
and 1300 and proves they draw identical markup, that the deck and game panels are 224px and float
inside the margins clear of the tab bar, that the cancel holds focus, and that the deck panel's
186→224 widening holds its trigger-side edge.

### Button — rest

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 44 | 30 |
| height | 44 | 30 |
| flex | none | none |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| border-radius | 7 | 7 |
| border | 1px solid `--border` (`#2A241D`) | 1px solid `--border` (`#2A241D`) |
| background | transparent | transparent |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 13 | 13 |
| color | `--fg-locked` (`#6A6152`) | `--fg-locked` (`#6A6152`) |
| glyph | `×` (U+00D7) — text glyph, not an SVG | `×` (U+00D7) |
| accessible name | `history.delete` | `history.delete` |

### Button — hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `--danger` (`#C6533F`) | `--danger` (`#C6533F`) |
| border-color | `--border` (unchanged unless the shipped ghost-danger pattern says otherwise) | same |

### Button — focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | global `:focus-visible` 2px brass at +2px | same |

### Confirm pane (since 2026-09-27; the inline confirm is retired)

| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | `DeleteConfirm` in a fixed panel anchored under the × (`useAnchoredPanel`), not a dialog | same |
| width | 224 (`DELETE_CONFIRM_WIDTH`) | 224 |
| heading copy key | `history.confirm` | `history.confirm` |
| sentence copy key | `history.confirmBody` | `history.confirmBody` |
| confirm copy key | `history.confirmYes`, `history.deleting` in flight | same |
| dismiss copy key | `history.confirmNo`, focused on open | same |
| destructive action colour | `--danger` fill on the confirm | same |
| button height | 32, the deck pane's | 32 |
| refusal | `history.deleteRefused` as the pane's own `role="alert"`, cleared when the pane closes | same |

### Behaviour

- Exactly **one** confirm step — §4 has no edit action, so delete-and-relog is the correction path.
- Delete revalidates through `deckSurfaces()`.
- Announced once: `announce.deleted(record)` / `announce.deletedLast`.

---

## Component: Empty state

Component note: Brand sheet's card-fan mark at 150px (96px phone), Cinzel 26px (21px phone)
headline, two body paragraphs at 14.5px `--fg-body`, and a brass-solid CTA.

> **Errata (2026-09-13).** Four corrections supersede the drawing for this component.
> 1. The desktop container **centres its content** (`justify-content: center`) rather than
>    hugging the left edge of a 1500px tab. The canvas was drawn at a narrower frame, where
>    left-aligned and centred were the same picture.
> 2. The desktop container aligns on `flex-start`, not `center`. The mark is centred against
>    the collapsed pitch but floats to the middle of a 900px-tall expanded form, which is the
>    state the surface is seen in most.
> 3. **The scope note is removed** — the `--surface-sunken` block with the accent left border
>    and the 20px `i` disc, and its `empty.scope` string. It restated the tab's own promise
>    underneath a headline that had already made it. Its two property tables are deleted
>    below, and the token map no longer lists it.
> 4. **The CTA note was never built.** Its table is deleted too: `empty.ctaNote` is not a key
>    in `gameLogCopy`, and `GamesPanel` draws no mono line under the CTA. It was documented
>    but never shipped, so the table described a surface nobody could open.

### Container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | flex |
| align-items | — | flex-start |
| justify-content | — | center |
| gap | — | 34 |
| padding | 34 20 40 | 44 24 34 |
| text-align | center | left |

### Card-fan mark — frame

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 96 | 150 |
| height | 96 | 150 |
| flex | none | none |
| margin | 0 auto | — |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| position | relative | relative |

### Card-fan mark — back card (left)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| width | 38 | 56 |
| height | 58 | 84 |
| border-radius | 6 | 8 |
| background | `#2A241D` (`--elevated`) | `#2A241D` (`--elevated`) |
| border | 1.5px solid `#3A3229` (`--border-strong`) | 1.5px solid `#3A3229` |
| transform | rotate(-18deg) translateX(-14px) | rotate(-18deg) translateX(-21px) |

### Card-fan mark — middle card

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| width | 38 | 56 |
| height | 58 | 84 |
| border-radius | 6 | 8 |
| background | `#33291F` | `#33291F` |
| border | 1.5px solid `#4A4033` | 1.5px solid `#4A4033` |
| transform | — (none) | — (none) |

### Card-fan mark — front card (right, brass)

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| width | 38 | 56 |
| height | 58 | 84 |
| border-radius | 6 | 8 |
| background | `#3E3020` | `#3E3020` |
| border | 1.5px solid `--accent` (`#C9A24B`) | 1.5px solid `--accent` (`#C9A24B`) |
| transform | rotate(18deg) translateX(14px) | rotate(18deg) translateX(21px) |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |

### Card-fan mark — `99` numeral

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-display` (Cinzel) | `--font-display` (Cinzel) |
| font-weight | 800 | 800 |
| font-size | 15 | 22 |
| color | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |

> `#33291F`, `#4A4033` and `#3E3020` are the brand sheet's card-fan mark, copied verbatim. They are
> the mark's own values, not new tokens.

### Content column

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | 1 1 auto |
| min-width | — | 0 |
| max-width | — | 720 |

> The `max-width` is what makes the centring visible. Without a ceiling the column grows to
> the full tab and `justify-content` has no free space to distribute. 720 is the widest at
> which the expanded form's two mark columns still read as a pair rather than as two distant
> lists.

### Heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `--font-display` (Cinzel) | `--font-display` (Cinzel) |
| font-weight | 700 | 700 |
| font-size | 21 | 26 |
| color | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |
| margin | 22 0 0 | 0 |
| Copy key | `empty.heading` | `empty.heading` |

### Body paragraph 1

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5 | 14.5 |
| line-height | 1.6 | 1.65 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| max-width | — | 520 |
| margin | 11 0 0 | 12 0 0 |
| Copy keys | `empty.body` + `empty.bodyQuote` + `empty.bodyAfter` | same |

### Quoted output clause (inside paragraph 1)

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<i>` | `<i>` |
| font-style | italic | italic |
| color | `--fg` (`#EDE6D8`) | `--fg` (`#EDE6D8`) |
| Copy key | `empty.bodyQuote` | `empty.bodyQuote` |

> **Errata (2026-09-13).** The quote was `ran out of gas, 3 of 3 games` and NO SURFACE
> PRINTED IT. The per-column glosses render only on the log form's checkboxes; the
> aggregate cell draws the axis label, the `M of N` figure and `N up · N down`. The one
> string whose job is to demonstrate the tab's output was demonstrating something the app
> could not say.
>
> It quotes `headline.finding` verbatim now — `Cards in hand is letting this deck down` —
> which the tab writes at `N >= PATTERN_MIN` today and still writes after #10's tuning
> suggestions land, since those render on their own surface. `game-log.test.ts` pins the
> two together, so the quote cannot drift from the sentence it quotes again.
>
> The handoff under `design/design_handoff_the99_game_log/` still shows the old quote and
> is left as delivered: `design/` is the record of what Design shipped on the day, not the
> live spec. This table is the live spec.

### Body paragraph 2 (the cost)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5 | 14.5 |
| line-height | 1.6 | 1.65 |
| color | `--fg-body` (`#C6B79A`) | `--fg-body` (`#C6B79A`) |
| max-width | — | 520 |
| margin | 9 0 0 | 10 0 0 |
| Copy key | `empty.cost` | `empty.cost` |

### CTA row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | flex |
| align-items | — | center |
| gap | — | 16 |
| flex-wrap | — | wrap |
| margin-top | 20 | 22 |

### CTA button (brass solid)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 100% | auto |
| display | block | inline-flex |
| padding | 13 18 | 11 20 |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 14 | 14 |
| font-weight | 600 | 600 |
| color | `--bg` (`#14110E`) | `--bg` (`#14110E`) |
| background | `--accent` (`#C9A24B`) | `--accent` (`#C9A24B`) |
| border-radius | 8 | 8 |
| Copy key | `empty.cta` | `empty.cta` |

### CTA button — hover

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `--accent-hover` (`#D8B25E`) | `--accent-hover` (`#D8B25E`) |

### Conditional rendering

| Condition | Renders |
|---|---|
| N = 0 | The empty state is the **whole tab**. |
| N = 0 | **No** history heading, **no** empty aggregate strip, **no** record line, **no** collapsed `Log a game` row (the CTA is the entry point). |
| CTA activation | opens the same inline form, already expanded — no second surface. |

---

## State Coverage — STATES-log-form.md

### Fields

| | Field | Control | Default | Can it be invalid |
|---|---|---|---|---|
| A | Result | 3 segments, radio | **none** | no — one of three, or unset |
| B | Pod size | 7 squares 2–8, radio | **4** | no — the control *is* the `check` range |
| C | Played at | `played tonight`, opens a date field | **today** | yes — a future date, see state 9 |
| D | What worked | 8 checkboxes, `fieldset` | none | no |
| E | What let me down | 8 checkboxes, same 8 labels | none | no |

Save is enabled by **A alone**. D and E are optional per §3.

### The fourteen states

| # | State | Triggering condition | Save | What renders |
|---|---|---|---|---|
| 1 | **Collapsed** (resting state) | form not rendered; the tab's default on every visit but the first | — | A 44px `Log a game` row: brass outline, `1px --accent`. Above the aggregate, below the record line. |
| 2 | **Just opened — nothing selected** | A unset · B = 4 · D, E empty | **disabled** | Every axis row at rest; both `{n} marked` counters absent; no error, no red. Glosses at `--fg-faint`. Focus is on the Result group. |
| 3 | **Result only** | A set · B = 4 · D, E empty | **enabled** | `form.optionalNote` beside the button. The fifteen-second log, fully legitimate. |
| 4 | **Partial — one column** | A set · D = 2 · E empty | **enabled** | Left legend reads `2 marked`; right legend has **no** counter. An empty column is a normal answer, never a prompt. |
| 5 | **Partial — both columns** | A set · D = 2 · E = 1 | **enabled** | Both counters present. The expected shape: two to four marks total. |
| 6 | **The conflict** | an axis ticked on one side is tapped on the other | enabled | The vacated row unticks, takes `1px dashed --border-strong` for one beat, gloss becomes `form.movedToHurt` / `form.movedToWorked`. The tapped row ticks normally. **No dialog, no error, no undo prompt.** Announced once: `announce.moved(axis, column)`. |
| 7 | **All eight marked, one column** | D = 8 | enabled | Allowed. Counter reads `8 marked`. Not capped (README gap 5). |
| 8 | **Marks with no result** | A unset · D = 3 | **disabled** | Save disabled and **unexplained** until Result is touched — then it enables. No inline error text for an untouched required field. |
| 9 | **Future `playedAt`** | C ahead of today | **disabled** | The date field itself refuses forward dates; the form never submits one. §4's server rule stays as the backstop. |
| 10 | **Saving** | submit in flight; all fields disabled | in flight | Button reads `form.saving`, disabled; Cancel disabled; axis rows go non-interactive but **stay in place and stay legible** — nothing unmounts mid-write. |
| 11 | **Saved** | server accepted | — | A FIRST game's save stays in state 10 until the game is on the page, then the empty state gives way to the log (Hugh, 2026-09-27: collapsing on resolve painted the empty pitch again for a beat). Any later save: form collapses to state 1. Record line, aggregate and history update together. Focus returns to the collapsed row. Announced: `announce.saved(record)` / `announce.savedFirst`. **No toast, no confetti.** |
| 12 | **Refused** | server rejected | enabled | Shipped `MutationError` under the save button; form intact, **every value preserved**. |
| 13 | **Cancelled** | Cancel pressed | — | Collapses to state 1. Values discarded with **no confirm**. |
| 14 | **Reopened after cancel or save** | form opened again | disabled | Back to state 2. **The form does not remember**: pod returns to 4, result unset, marks empty. |

### The seven rules the matrix is generated from

1. **Nothing is required except the result**, and the one required field is the one the player is
   guaranteed to know. Everything else either defaults (pod, date) or is honestly optional (marks).
2. **A disabled save is never accompanied by an error.** Nothing has gone wrong in state 2 or 8.
3. **The conflict is a move, not a validation.** Ticking on one side unticks on the other.
4. **Nothing unmounts mid-write.** During a save the rows go non-interactive in place.
5. **A refusal preserves everything.**
6. **The form never pre-fills from history.** Defaults are constants (pod 4, today), never
   last-values.
7. **Empty is a normal answer, never a prompt.** No "add at least one" hint, no pulsing empty column,
   no required-field asterisk on D or E.

### Copy keys, per state

| State | Copy key |
|---|---|
| Collapsed | `form.open` |
| Column headings | `form.workedLabel` · `form.hurtLabel` |
| Counter | `form.marked(n)` — absent at 0 |
| Optional-marks note | `form.optionalNote` |
| Date | `form.playedToday` → `form.played(date)` |
| Save · rest | `form.save` |
| Save · in flight | `form.saving` |
| Cancel | `form.cancel` |
| Moved | `form.movedToHurt` / `form.movedToWorked` — replaces the gloss, same `--fg-faint` |
| Refused | `form.refused` |

### Announcements — one live-region message per settle, never one per tick

| Event | Copy key |
|---|---|
| Axis moved between columns | `announce.moved(axis, column)` |
| Game saved | `announce.saved(record)` / `announce.savedFirst` |
| Game deleted | `announce.deleted(record)` / `announce.deletedLast` |
| Save refused | the refusal string, once |

Individual checkbox state is already spoken by the checkbox. Only the **move** is announced, because
two rows changed and the player touched one.

---

## Low-N — tiers and mechanical checks (LOW-N-summary.md)

`PATTERN_MIN = 3`, one exported constant, read by the headline, the bucket headings and the cell ink.

### Dial 1 — the denominator, always inside the figure

| Games | Figure |
|---|---|
| 1 | `1 down` / `1 up` |
| 2 | `2 of 2` |
| 3 | `3 of 3` |
| 5 | `4 of 5` |

No percentages, at any N. `net` is never rendered.

### Dial 2 — the heading, which changes grammar at three

| Games | Headline |
|---|---|
| 1 | **One game logged.** — *a description* |
| 2 | **Cards in hand went wrong both times.** — *a leaning* |
| 3+ | **Cards in hand is letting this deck down.** — *a finding* |

| Games | Sub-line |
|---|---|
| 1 | `Nothing to read into yet — it is on the record. Two more and this turns into something you can act on.` |
| 2 | `Two games. Both of them, which is worth noticing and not yet worth calling a pattern.` |
| 3+ | `Marked in 3 of 3 games: every one you have logged. Record 2–1 across 3 games.` |

### Dial 3 — ink, which is earned at three

| | Below three | Three or more |
|---|---|---|
| Figure | `--fg-body` | `--warning` (Fix) / `--success` (Keep) |
| Bar | one neutral `--border-strong` segment | split `--success` / `--warning` |
| Bucket heading | **absent at N=1**, neutral `--fg-faint` at N=2 | `--warning` Fix, `--success` Keep |

### The tiers in full

**N = 0** — No summary. The empty state is the whole tab. No Keep / Fix strip with nothing in it, no
history heading over nothing.

**N = 1 — a record**
- Headline: `One game logged.` Record beside it: `1–0 · won it`.
- **No bucket headings at all.** The marks appear under `What that one game said`, which is a true
  title, in vocabulary order — not split into Keep and Fix.
- Figures `1 up` / `1 down`, `--fg-body`. Bar: one `--border-strong` segment.
- Sub-line per cell: `1 game`.
- A single forward-looking clause, and it promises a **count**, never a recommendation.

**N = 2 — a leaning**
- Headline in the leaning voice; the sub-line names the denominator in words.
- **Keep and Fix appear**, headings neutral. Mixed appears if non-empty.
- Figures `2 of 2`, `1 of 2` — still `--fg-body`. Bar still neutral.
- Ordering is already `summarizeGames`' final ordering; nothing about the sort changes with N.

**N ≥ 3 — a finding**
- Headline is the strongest Fix in the finding voice, denominator inside the sentence.
- Full ink: `--warning` on Fix figures, `--success` on Keep, split bars.
- Mixed prints as its one line under the rule.

**Headline fallback order, at every N ≥ 1**
1. Strongest **Fix**.
2. If Fix is empty — strongest **Keep**, phrased as a keep (`Board presence is carrying this deck.`).
3. If both are empty and **Mixed** is not — say so plainly (`Nothing has pointed one way yet.`).
4. If no axis was marked in any game — the record line alone (`3 games logged. 2–1.`), with no
   aggregate panel at all.

### What was rejected

- **Opacity / fading the panel at low N.** Low N is quieter in *ink*, never in legibility.
- **A confidence badge, a star rating, an error bar.**
- **"2 more games for a pattern" as a progress meter.**
- **Hiding axes marked only once.**
- **Rounding or bucketing the counts** (`most games`, `sometimes`).
- **Sorting differently at low N** (e.g. by recency until three games).

### The seven mechanical checks, verbatim

1. No string in the feature contains `%` applied to a game count.
2. `net` appears in no rendered string.
3. Every rendered count is accompanied by its denominator in the same element.
4. `PATTERN_MIN` is read from one constant by the headline, the bucket headings and the cell ink —
   the number `3` is inlined nowhere.
5. At N=1 no element carries `--success` or `--warning`.
6. At N=1 no element renders the words `Keep` or `Fix`.
7. Bucket ordering is `summarizeGames`' output order at every N, unmodified.

> **Eng ruling on check 7 vs the N=1 vocabulary order (READINESS finding 3):** `summarizeGames`
> returns `axes` in vocabulary order and the three buckets in net-magnitude order. At N=1 no buckets
> render, so check 7 is vacuous there.

---

## Cross-cutting contract

### Motion

| Property | Mobile | Desktop |
|----------|--------|---------|
| form open/close | the shipped panel transition — the **only** animated thing | same |
| figures | no count-up | no count-up |
| bars | no growth, no transition | no growth, no transition |
| new motion classes | none | none |

### Focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| ring | global `:focus-visible`, 2px brass at +2px offset, not overridden | same |
| on form open | focus moves to the Result group | same |
| on save | focus returns to the collapsed `Log a game` row | same |

### Semantics

| Element | Contract |
|---|---|
| Axis columns | two `fieldset`s with `legend`s carrying the column headings |
| Axis box | real `<input type=checkbox>` wrapped in a `<label>`; the 18px box is decoration, the row is the hit area |
| Gloss | the box's `aria-describedby`, not part of its name |
| Result, Pod | radio groups |
| Live region | the existing one; one message per settle |
| Refusal | shipped `MutationError`, a `<p role="alert">` taking one `message` prop |

### Target sizes

| Target | Mobile | Desktop |
|---|---|---|
| Form axis row | 48 | 46 |
| Result segment | 44 | 40 |
| Pod square | 44 | 40 |
| Delete | 44 | 30 |
| Collapsed `Log a game` row | 44 (full-width) | 44 |
| Save | 48 | — (11 20 padding) |
| Cancel | 44 | — (11 18 padding) |

### Colour is never the only carrier

- Worked and hurt are two headed columns in the form, two headed groups in the panel, and a dot plus
  a position in history.
- The 6px dot repeats a mark this product already uses for owned / unowned.

### Forbidden by the handoff

No new token · no new hex · no new motion class · no new empty-state construct · no modal · no toast
· no tray · no confirm dialog · no tooltip · no disclosure on the axis list · no virtualisation · no
pagination on history · no percentage formatter · no rendered `net` · no `--danger` on a result · no
card named, shown, suggested, linked or implied anywhere on this surface.

---

## Amendments after the handoff

### A1 · A game can carry a note (2026-09-13)

`deck_games.note` and the History row's note line, both drawn from **#10's**
deck-tuning handoff rather than invented here — see
`docs/superpowers/design-tables/deck-tuning.md` §Note line and §Note quote rule,
and `design/design_handoff_the99_deck_tuning/README.md` §The history row
rendering one. Nothing about the properties is new; what is new is that this
half of #10 shipped ahead of the rest of it.

**What #9's row gives up:** nothing. The `<li>` becomes a column so the note can
be a second line, and every slot that was its child moves into an inner row with
the same classes. A game with no note renders the same single line at the same
`min-height`, which is the handoff's own requirement.

**The field followed the same day.** `deckTuningCopy.note` and the log form's
note input and counter shipped 2026-09-13 to `deck-tuning.md` §Game Log Form —
Note Field, so the form writes notes and `logGame` enforces the cap in code
points. What is still #10's is the note being quoted to the model.

**A game already logged has no edit path** — §4 ships no edit action, and the
row's only control is delete. A note added to an old game is written by hand
against the database, and there the column's check is all there is.
