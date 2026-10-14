# Set collections — the addendum, R3 (six findings from the shipped surface)

`design/design_handoff_the99_set_collections/` · 2026-09-12 · additive to R3

**R2, from review.** Two changes, both widening the round. **(1) The grid minimum becomes one
constant, 146px** — R1's desktop cell at 116 was still too small, and once the minimum rises to the
art's own width the phone exception is unnecessary: 146 puts two cells on a 390px screen by itself.
So R1's `md` step (176 → 136) and its flagged phone upscale both disappear into the constant.
**(2) Finding 3 is the whole rack, not only Clear** — read against the chassis package, Clear is the
third of four things on this bar that do not conform, and fixing it alone leaves a chip line under a
control row the chassis does not recognise. The pips become **Scryfall's mana symbols drawn as
images**, rarity becomes **`Rarity ▾` with the shared anchored panel** (a chip group in the phone
sheet), Clear becomes three scopes, and the bar becomes three fixed-height rows. Both widths drawn.

**Deliverable:** `The 99 - Set Collections Addendum.dc.html` (canvas, six-theme `theme` prop,
`showRejected` prop for the two rejected distributions).

The shipped handoff's five files are **locked and unedited**, exactly as the top-off addendum was
handled. One exception is named rather than edited: `DENSITY-four-hundred-cells.md`'s density table
is **superseded by §1 below**; its three arguments for what pays for the scroll all stand.

Read against `main` this round: `components/sets/set-grid-view.tsx`, `set-cell.tsx`,
`set-index-view.tsx`, `lib/sets/filters.ts`, `lib/copy/set-collections.ts`,
`components/collection/color-filter-row.tsx`, `components/ui/button.tsx`, `ui/text-field.tsx`,
`components/collection/browser.tsx` (for its owned-params list), plus
`design_handoff_the99_filter_chassis/` R2 and its STATES file, which govern finding 3.

| File | What it holds |
|---|---|
| `The 99 - Set Collections Addendum.dc.html` | §1 the grid, before/after at 1180 and 390 with the derivation table and the bill. §2 Clear, three states desktop + phone. §3 the name search, desktop, phone and zero. §4 the index row, four cases. §5 the 174px pair in all six themes. §7 the phone head at rest and scrolled, against the shipped one. §6 the file-by-file contract. |
| `ADDENDUM-STATES.md` | The rack at six states and two widths, the grid at three, the index row at four — including what each must **not** do. Companion to the unedited `STATES-set-grid.md`. |
| `ADDENDUM-READINESS.md` | Self-assessment, the one decision I want confirmed, the one open item. |
| `addendum copy strings.ts` | Only the strings this round adds or changes. Everything else is referenced, not duplicated. |

---

## 27 · Findings 1 and 2 are one ruling, and one constant: `repeat(auto-fill, minmax(146px, 1fr))`

A fixed-width child in a wrapping row and a `1fr` track differ in exactly one way — the grid gives
the leftover width to the cells instead of to the right margin. **So "does the row distribute" and
"do the cells grow" are the same sentence read from either end**, and F is the whole design: it sets
the column count, the column count sets the size, and there is no second constant to keep in step.

**F = 116 at `md` and up, 160 below it.** That is the only number that changes between widths.

**Desktop.** At 1180 the shipped row lays 8 cells in 998px of a 1100px grid and strands 102px beside
a grid whose left edge is aligned to the head, the section heading and the result line. The same 8
cells become **8 tracks of 128.8px** — 11% more art, a flush edge, 13px more name measure, and the
same column count, which is the point: *the reader does not get a ninth cell to scan, they get the
eight they had, bigger*. Across 1024–1440 the track lands **124–129px** — a 3px spread, so no
per-breakpoint table — and always under `image_uri_small`'s 146px, so the image contract is
untouched. The upper bound is structural, not declared: a track can never reach `2F + gap = 242px`,
because at that width another column fits and the count goes up instead.

**Phone, and the arithmetic that decides it.** At 390px the content width is 358 and the gap is 10.
Three tracks are `(358−20)/3 = 112.67`; two are `(358−10)/2 = 174`. **There is nothing in between** —
an `fr` track takes the whole remainder, so any minimum from 113 to 174 produces 174 and any minimum
up to 112 produces 112.67. The choice was never a size, it was a column count, and three columns is
108 → 112.67: a 4% change that answers nothing Hugh asked for. **Two cells at 174 × 243** — 1.6× the
width, 2.6× the area. This band is also why R2 could delete R1's phone exception: **146 is inside
it**, so the desktop constant produces the phone answer for free and the two widths stop being two
rules.

**The bill, named rather than buried.** The desktop page goes ≈10,300 → ≈16,500px. **The phone page
goes ≈29,000 → ≈64,000px** — it more than doubles. That is the cost of the ask, and it is charged
against DENSITY's own three mitigations (sticky head, `extras ↓`, missing-only) plus a fourth that
lands in the same package: **§3's name search is the first control on this page that can take 276
rows to one.** Read that way, findings 2 and 4 pay for each other.

**Two ways to flush the edge, drawn and rejected.** *Give the remainder to the gaps*
(`space-between`): the column gap becomes 24.6px against an 18px row gap, and a wrapped final row of
three cells spaces those three across the whole width — the classic last-row defect, on the one row
every reader reaches. *Centre the fixed grid*: the grid's left edge is load-bearing — the ratio, cost
strip, section headings, result line and cells share one left margin, and centring puts the cells
51px inside it.

**Two consequences worth naming.** The caption at 174px holds three things, so **rarity comes back at
phone** (`hidden md:inline` retires) and the shipped `042 · uncommon` caption is one format at every
width. And the cell ends up with **no width or height literal at all** — the track sets the width,
`aspect-ratio: 63/88` sets the height — which makes the identical-geometry constraint true by
construction rather than by discipline.

**The one engineering line that decides the reflow constraint: `auto-fill`, never `auto-fit`.**
`auto-fit` collapses empty tracks, so a filter leaving three cells would stretch those three across
the whole column — the exact reflow the brief forbids, one keyword away.

## 28 · Finding 3: the rack conforms — four changes, one PR

The brief asked for Clear. Read against `design_handoff_the99_filter_chassis` R2, **Clear is the
third of four things on this rack that do not conform**, and each is drawn at both widths:

**1 · The pips are art, not palette.** `color-pip.tsx` draws a token square at `opacity .34–.40`
when unlit, which measures **1.38:1**. The chassis ruling: **Scryfall's full-colour symbol SVGs
drawn as images, never masked and never dimmed** — the files open with a filled `<circle>`, and a
single-colour mask would flatten every two-tone hybrid to one hue. Lit is a `2px --accent` ring
(**4.42:1** floor); unlit carries **no rim at all**, because `--border-strong` there measures
1.24:1 and could never be the carrier. The symbols themselves floor at **9.51:1**. Circles, 22px
desktop and a real 44px on the phone. The set page's `--w … --g` tokens keep their real job one
layer down, inside the cell art. **This is the one place in the package where a colour is a literal
rather than a token, and it is deliberate.**

**2 · Rarity is a trigger and a panel, and it fits by getting shorter.** Four values, single-select,
with an off state — the chassis's own test makes that a panel dimension, not a segmented run and not
four buttons. **The copy already exists in the shipped file, unused:** `rarity.all` = *Rarity · all*
and `rarity.value(r)` = *Rarity · uncommon*. The trigger was always the intent; the letters were the
shortcut. Arithmetic: four 34px letter buttons plus gaps are 158px, the trigger is 149px at its
longest value and 106px at rest. Row at 1100: field 132 min + pips 154 + rarity 149 + missing 106 +
three 8px gaps = **565 of 1100**, so the field takes 667 at rest and the row cannot wrap. **At phone
it had to leave the row rather than join it** — four letters at a 44px target are 180px, and there
was never room. Panel: `filter-panel.tsx` mounted not forked — 280px anchored (never in flow, or it
pushes the grid down from inside a sticky head), 44px rows, rotated-diamond marker filled `--accent`
when on, **per-row counts from the same filtered computation the result line uses**, footer `n of 4
on` beside a Clear for that dimension, and **no search field** (four values have nothing to search,
which is `searchable`'s existing rule). Compact: a **44px chip group in the existing sheet**, after
the pips — four short values is what a chip group is for, unlike `Set` with its 41 — wrapping to two
rows, which a sheet may do and the control row may not.

**3 · Clear leaves the control row.**

**4 · Three rows, always all three**, which matters more here than on any other route: this bar lives
**inside a sticky head**, and every height change under a reader's thumb moves the grid they are
reading.

### Clear, specifically

Ruled against the chassis, not the older hairline. The chassis gives Clear **three scopes** — a
chip's `×`, a panel footer, and `Clear all filters` on the chip line's trailing edge. This page has
no panels, so it gets two, and the answer to "what should this button look like" is **it is not a
button on that row**.

Four things are wrong with the shipped control and only one is the skin: it is the only
`GhostButton` in a row of 32px hairlines (600-weight sans label, heavier border); it sits **inside a
sticky head whose height it changes**; it says `Clear filters` beside three controls without saying
which; and it appears **at one filter**, where the lit control beside it is the shorter route off.

So the page adopts the chassis's rows 2 and 3 (it already has 3): **chips, in dimension order, never
click order, with `Clear all filters` on the trailing edge past one active control, and `no filters
on` at rest.** The rest line is what buys the sticky head the thing it most needs — **its height
stops depending on the filter state.** Colour collapses past one pip (`White` at one, `3 colours`
past that), never one chip per hue.

**The chip line can never reach two lines here**, unlike `/decks`: three dimensions means the widest
possible line is ≈380px of 1100, so the chassis's one legitimate height change is unreachable and the
head's height is a constant. At phone the chips **scroll horizontally and never wrap**, and the chip
target is **34px, not 44** — named as the refresh's granted exception on its own test: a chip is a
shortcut, never the only route, and every value it removes is also removable at 44px on the
persistent row or in the sheet.

### Three amendments back to the chassis, from drawing it on this page

1. **`Clear all filters` must clear the search** (all four routes). The chassis excludes sort because
   *sort does not narrow*; a search does, so a Clear that leaves it on leaves the reader looking at
   four cells under a control that claimed to clear everything. The field's own `×` stays scoped.
2. **There is a fifth control type: the toggle.** The chassis names four, chosen by the shape of the
   values. Missing-only's whole value is on or off, so it is not segmented (which is for dimensions
   with *no* off state) and a panel for one boolean is absurd. It stays the shipped hairline carrying
   `--accent` border and label when on — the same twice-carried rule as an active trigger — and the
   badge never counts it, because it is visible on the row beside the badge.
3. **A trigger's value may be a word the page does not otherwise print.** `Rarity · uncommon` is
   lowercase because the caption below it reads `042 · uncommon` in the same register; the sheet's
   chips are Title Case, because a chip is a control and not a caption.

### One dependency, named

§2 mounts `filter-panel.tsx` and the chassis's pip component. **If the chassis package lands first,
this page adopts both and the PR shrinks to a chip line and a trigger. If this page lands first it
must not fork either** — a forked pip is how six themes of measurement get re-derived by hand, and a
forked panel is what the chassis's own flagged decision is about.

## 29 · Finding 4: the name search is the chassis's field slot, and it leads

Nothing about the *position* is a new decision: the chassis has a field slot, it is first in row 1,
it is the only child that shrinks, it lives on the phone's persistent row rather than in the sheet,
and the badge never counts it because it is visible. Four routes already do this. The decisions that
are this page's:

- **What it matches.** Substring on the **printed name**, case-insensitive and diacritic-folded
  (`aether` finds Æther, `jotun` finds Jötun), matching **either half of a `//` name**, across both
  sections. Not the type line, not oracle text, not the collector number — the control is named for
  the name, and a field that quietly matched rules text would make the result line's count
  unexplainable.
- **What it is called.** Placeholder `Find a card in this set`; accessible name **`Search cards in
  Edge of Eternities`**. The set must be in the name: this field and the index's `Find any set` are
  one tap apart, look identical, and search populations that are opposites.
- **What it does to the money.** It re-scopes the cost strip and the `Send N` button, deliberately —
  decision 6's one-selector rule says the filters *are* the selector, and a search is a filter by any
  reading a player would give it. **Load-bearing engineering consequence: the query is a fourth field
  on `SetGridFilters` and goes through `applyFilters`, never a second pass over `shown`.** A separate
  pass is how the result line, the `Send N` label, the cost denominator **and now the rarity panel's
  per-row counts** stop agreeing — four readings of one computation, and the panel is the new one.

**It reaches nothing** — every cell is in hand, so this is a presentation change over loaded data:
`history.replaceState` like the other three filters, 150ms debounce (the shipped card-search window),
no request, no router, no dropdown of names, no Enter to submit. **Never in the sheet**, because a
second field behind `Filters` is two controls with one accessible name — the defect
`MissingOnlyToggle` already exists to avoid on this page.

**Phone arithmetic**, since the persistent row is the tightest 358px in the feature: `Filters` with a
badge is 93, `Missing` is 76, two gaps are 16 — the field gets **173 at rest against a 132 minimum**.
It shrinks and nothing else does; the row cannot wrap.

**Zero with a query** is a new branch: the heading names the query, the body says the search covers
this set's names only and that the other filters are still on, and two corrections are offered
narrowest-first — `Clear the search` beside `Clear all filters`. That is the chassis's empty-state
shape with the query as the control to blame, which on this page it usually is. With missing-only on
and everything matched already owned, the existing good-news branch carries it unchanged: its
`what` argument takes `cards matching “plains”`.

**The parameter is `q`**, matching the index. R2's decision 15 wrote "no shared key names" with
`/collection`; read literally that bans `q`, but the shipped surface already shares `c` for colour
with `browser.tsx`'s owned-params list and no bug came of it. **Narrowed: the rule is that no value
carries, and that no one name means two different things.** `q` means "what I typed" on all three
routes. What would still be the bug decision 15 was written about is carrying `/collection`'s `q`
into this route on the `By set` link — the pill still carries nothing.

## 30 · Finding 5: the extras figure becomes a figure

`EOC · 2025 · 4/123 extras` is a code, a date and *a ratio* on one line at `--fg-faint`. The first
two are provenance; the third is a count of the same kind as the figure 300px to its right, so the
row states two ratios in two registers in two places, and the smaller reads as noise beside a year.
It moves **under the base ratio, one type step down** — which is how the set page's own two sections
already rank their figures.

Four rules travel with it:

1. **It takes `--fg-muted`, not `--fg-locked`.** It is a figure, so it is text and owes 4.5:1;
   `--fg-locked` measures 3.16–3.44:1 and is only legitimate on the cell's rarity word, which is a
   redundant restatement of a filter. `--fg-muted` floors at 6.53:1.
2. **So the base ratio brightens to `--fg-body`.** With both at `--fg-muted` the only ranking left is
   1px of type size. Complete rows keep `--success` on the base ratio and **leave the extras line
   muted** — a finished base run with 119 extras outstanding must not read as a finished set.
3. **Never `0 / 0 extras`.** The shipped `extrasTotal > 0` guard moves with the line, and an
   unindexed row has no ratio so it has no second line either — the tag stands alone.
4. **The accessible name grows with it.** The row is one `<Link>` with an explicit `aria-label`,
   which replaces everything its descendants contribute, so a second visible figure that is not in
   the label is invisible — exactly the defect `set-cell.tsx` already fixed for its price tag and its
   two marks. One clause appended: `…and 4 of 123 extras`.

Geometry: the figure column goes one line to two (15 + 2 + 13 = 30px against the name-and-bar block's
24), so the desktop row grows 4px and **the phone row does not move** — it is already pinned to its
44px floor with 14px spare. The code line loses ~74px, which is measure the set name gets back on the
width where it truncates. Not on offer: a third line, or a second completion bar for the extras.

---

## 31 · Finding 6: the phone head takes 48% of the screen before a card is seen

Raised from the shipped surface after R2 landed. **The head is not too big; it is too resident — and
it is resident in the literal sense.** The whole block is one `sticky top-0 z-[2]` container in
`set-grid-view.tsx` **with no width qualifier on the sticky**, so the screenshot is not the top of the
page: **it is every screen of the page.** All 325px follow the reader down all 399 cells. That
reframes the finding — **this is not "add a collapse", it is "the collapse the existing sticky head
never got"** — and it is why the head cannot simply be trimmed: every line in it is correct, and most
are read *once*, but the sticky makes the page pay for all of them permanently. **Three registers —
identity, money, controls — and only the controls earn the whole scroll.**

**Grounding, since this finding arrived as a screenshot.** There is **no `set-head.tsx`** — the head
is written inline in `set-grid-view.tsx`, inside the same sticky container as the control row and the
result line, which is the file §28 already changes. In source order: `SetIcon` at
`size={30} desktopSize={44}`; an `h1` at `text-[20px] md:text-[24px] line-clamp-2`; the ratio at
`font-mono text-[11px] --fg-muted`; **one interpolated provenance string**,
`setPageCopy.head.meta(code, date, baseTotal, extrasTotal)` at `text-[10px] --fg-locked`, gated on
`sections.indexed`; then `setPageCopy.head.ratioNote`, same size and token, **ungated — the source
comment calls it "the one line that always stands"**; then the **`DeltaStrip`**, which the screenshot
does not show because it was not firing; then `CostStrip`; then the controls; then the result line.
Two consequences: both reference lines are `--fg-locked` (not `--fg-faint`), and **the head already
has a variable-height member**, so "fixed height" is a promise this head has never kept.

**The honest denominator is 672px, not 844.** Safari’s bar and the app’s own nav rail are 172px you
do not own. Against 672 the shipped head is **325px, or 48%** — one row of cells above the fold.
**At rest it becomes 148px (22%); past the first flick, 52px (8%)** — four cells, then six.

**Where the 177px went — four moves, no facts deleted.**

1. **The scope note is absorbed into the figure it explains. −15px.** `head.ratioNote` — *base run
   only · extras counted apart* — is a whole `<p>` saying what the 208 counts, and the one line that
   renders **even when there is no ratio to annotate**. So put it *in* the 208: **`162 / 208 base ·
   78%`**, extras ratio trailing. One word does what a caption did. **The note keeps its own line at
   desktop** and keeps standing alone in the unindexed state, where *base* has nothing to ride on.
2. **Provenance drops to what identifies the set. −15px.** `head.meta()` is **one interpolated string
   of four values**, not four nodes, so this is a phone-only form beside it —
   `head.metaShort(code, year)` → `HOB · 2026`, on the title line’s trailing edge. **The full string is
   unchanged at desktop**; the counts it carried are now the two figures in move 1, which is the only
   reason dropping them costs nothing.
3. **The cost card becomes a cost line. −137px.** `CostStrip` is a wrapping flex row whose label,
   figure, denominator, **up to four caveat lines** (`unpriced`, `noFigure`, `soldOut`, `stale`) and
   44px button stack to ~137px on a phone — the worst case is worse than the screenshot, which fires
   one. It becomes `$188.66  to finish · 45 of 46  ▾` in one 44px row, **expanding in place on tap**.
   **The caveat count is why truncation is not enough:** a strip whose height depends on how many
   pricing facts are true is an unpredictable sticky head — the ghost-Clear defect from §28.
4. **The result line loses its redundant half. −10px.** `result.rest(shown, yours, missing)` restates
   a subtraction the ratio above already made; its `role="status"` live region is unchanged, because
   it is what announces a filter change.

**The mechanism is not new — the container is already sticky.** What is new is that it has two
heights. **The collapse happens once, at a threshold, never continuously** — a head that interpolates
with scroll offset is always moving under a reader’s thumb. **Down at 120px, back at 40px**: an 80px
hysteresis band, so a thumb resting mid-gesture cannot flutter it. The resident bar is set, ratio,
search and `Filters` — where you are, how far along, and the two ways to change what you are looking
at. The money and the provenance are not on it, because neither is acted on mid-scroll.

Five things it must not do:

- **Must not reflow the grid.** Sticky already overlays, so §27’s track count is untouched at every
  scroll position — but the document flow above the grid does change height on collapse. Reserve the
  rest height, or the page jumps 96px the first time it crosses the threshold.
- **Must not carry the filter state.** The badge on `Filters` does it, from the `filtersOn` count that
  already exists — which is why §28’s rest line matters here: at zero filters there is no badge.
- **Must not animate the title’s size.** The `h1` is `line-clamp-2`, so a long name is already two
  lines and interpolating it reflows mid-scroll. Cross-fade the block, 140ms, instant under
  `prefers-reduced-motion`.
- **Must not change the desktop head.** Same sticky container, full form kept: ~14% of a 900px
  viewport, `md:` sizes untouched, and **all four content moves are phone-only forms beside the
  shipped strings**, never replacements of them.
- **Must not collapse the delta strip’s message away.** It renders inside this container and is the
  one member of the head that is news rather than reference; if it is firing, the collapse waits.

**Two things I did not do.** *Hide the head behind a scroll-up gesture* — the usual answer, and it
costs the thing this page is for: you scroll up constantly on a 399-cell grid to re-check a number
you passed, and a head that springs down over the cells each time is worse than one that is simply
small. *Move the cost strip below the grid* — it is the page’s one commercial moment and the reason
the missing cells are dimmed at all; a line that expands on tap keeps it above the fold at a sixth of
the height.

## Sequencing

**§2 is one PR, not four** — the pips, the rarity trigger, the chip line and the three-row bar are one
conformance change on one component, and splitting them leaves the page in a state that is neither
the old vocabulary nor the new one. **Finding 4 lands in that PR or after it, never before**: the
search is the chassis's field slot, and adding a field to today's row puts it beside a `GhostButton`
at 358px with no width to give it. **Findings 1+2 and 5 are independent of both**, one file each. **Finding 6 is one file
(`set-head.tsx`) and independent of everything** — but it is the finding that pays for finding 2: the
bigger phone cells cost scroll, and the head hands 177px of it back above the fold. Nothing in this round touches the sticky head's contents,
the cost strip, the delta strip, the modal, or any token.

## Still open

1. **The worst upscale in the system is 1.21×**, at 736px of content, and 1.19× on a phone. R1 filed
   this as a risk to be discovered per width; at F = 146 the constant states it, and nothing here
   needs `normal` — DENSITY's ban on it stands. If review still finds the phone cell soft, the fix
   remains a larger source **for the two-column grid only**.
2. **B, R and G's pip colours are assumed, not quoted.** The chassis brief quotes W (`#F8F6D8`) and
   the WU blue half; the other three are the canonical values and must be confirmed on first fetch.
   The measured floor carries 6.5 points of headroom over 3:1, so no plausible value threatens it.
3. **The chip line's own skin is specified here for the first time** (22/34px, `--surface-sunken` on
   `--border`, mono 10.5/11px, `×` at `--fg-muted`). The chassis names the line and its position but
   not its pixels; if that package specs them differently, it wins and this page follows.
