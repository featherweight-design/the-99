# Set collections addendum (R2) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or
> superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Land the addendum's Design-owned findings on `/collection/sets` and
`/collection/sets/[code]` — four from R2, plus R3's sixth.

**Architecture:** **Five PRs** — R2's four, plus R3's finding 6 as PR 5 (itself split 5a/5b).
Each is independently testable and independently rejectable, and each is cut from `main`
after the previous merges: no stacking.
Findings 1+2 touch the grid container and the cell; finding 5 touches the index row and the
copy module. Neither depends on anything. Finding 3 is one conformance change across the
rack — Design ruled it explicitly indivisible — and finding 4 lands in it or after it, never
before.

**Tech stack:** Next.js 16 App Router, React 19, Tailwind 4, Vitest. Visual rulings are
proved by **Playwright browser probes** — `scripts/probe-sets.mjs` imports `chromium` from
Playwright, drives a real browser and signs in through Clerk's test instance. It is run by
hand and is deliberately not part of `pnpm test`; only the unit runner is Playwright-free.

**Spec:** `design/design_handoff_the99_set_collections/ADDENDUM-README.md`,
`ADDENDUM-STATES.md`, `addendum copy strings.ts`.
**Readiness:** `docs/superpowers/readiness-set-collections-addendum.md` (🟢 Green).

## Global constraints

- **The grid minimum is `146`, and there is no second density rule.** The README's
  `F = 116 at md and up, 160 below it` is stale R1 text, and `ADDENDUM-READINESS`'s
  `116 → 8 columns, 160 → 6` is a sensitivity note about a lever rather than an alternative.
  See the readiness doc's erratum.
- **Quote 7.77:1 for the pip floor, not 9.51:1.** The assets are committed and carry their
  real colours; the chassis package already corrects the figure.
- **Quote the route's own geometry, never the canvas's.** The content box is 1112px and the
  measured track is ~150px; §27's 1100px and 124–129px are canvas figures the route does not
  produce. The column count is the same either way.
- **`auto-fill`, never `auto-fit`.** One keyword decides the no-reflow constraint.
- **The cell carries no width or height literal at any width.** Track sets width,
  `aspect-ratio: 63/88` sets height.
- **Mount `ui/colour-pips.tsx` and `ui/filter-panel.tsx`; never fork either.**
- **The rack is three fixed rows** — controls, chips, result — and its height never depends
  on the filter state. It lives inside a sticky head.
- **The query is a fourth field on `SetGridFilters` and goes through `applyFilters`.**
  Never a second pass over `shown`. The result line, the `Send N` label, the cost
  denominator and the rarity panel's per-row counts are four readings of one computation.
- **`Clear all filters` clears the query too**, which means adding `q` to the owned-key list
  `setFilters` deletes before serialising. It currently deletes `c`, `r` and `m` only and
  preserves every other live parameter, so an empty query would serialise to no `q` while
  leaving the old one in the URL — the promised behaviour failing quietly.
- **Every visible figure on the index row is in the row's `aria-label`**, which is explicit
  and replaces everything its descendants contribute.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test`, the stub-DB build,
  then `git fetch origin && git rebase origin/main`.

---

## PR 1 — Findings 1+2: one grid declaration

**Files:** Modify `src/components/sets/set-grid-view.tsx` (the grid container),
`src/components/sets/set-cell.tsx` (delete every size literal).
**Test:** `set-cell.test.tsx`, `set-grid-view.test.tsx`, `scripts/probe-sets.mjs`.

- [ ] **Step 1 — Failing test.** In `set-cell.test.tsx`, walk **every rendered element**,
  not the root: the component puts sizes on the root button, the inner plate and the name,
  so a root-only assertion passes while the plate still carries `h-[162px]`. Assert no
  element's class list carries a width or height that is a MEASUREMENT at any breakpoint —
  an arbitrary value (`w-[116px]`), a scale step (`h-10`) or a fraction (`w-1/2`) — while
  allowing `w-full`, which is the cell taking the track's width and so is the ruling rather
  than a breach of it — as is `h-full`, which is how the art fills the aspect-ratio plate.
  Test the matcher itself: a regex that matches nothing passes every
  assertion while proving nothing. Assert the plate carries `aspect-[63/88]`, and check
  inline `style.width`/`style.height` on the cell and the plate too — the by-name marker
  inside carries a deliberate 7px box and is a glyph, not the cell. In
  `set-grid-view.test.tsx`, assert the grid's `gridTemplateColumns` is
  `repeat(auto-fill, minmax(146px, 1fr))` and that the string contains no `auto-fit`.
- [ ] **Step 2 — Run, verify failure.** `pnpm vitest run src/components/sets`
- [ ] **Step 3 — Implement.** Replace the fixed-width grid with the one declaration.
  Delete `set-cell.tsx`'s width/height literals; the art keeps `aspect-[63/88]`.
- [ ] **Step 4 — Retire `hidden md:inline` on the rarity word.** At 174px the caption holds
  three things, so `042 · uncommon` is one format at every width.
- [ ] **Step 5 — Probe.** **Replace**, do not supplement. `scripts/probe-sets.mjs` asserts
  `116x162` desktop, `108px` phone and three phone columns; all three are now wrong and a
  conforming build would fail them. **The probe runs at 1280**, which is where seven tracks
  are real — the desktop NavRail is `w-[62px] shrink-0`, so a 1180px viewport gives six and
  the seventh starts at 1212. In their place: at 1280 assert 7 tracks, a flush right edge
  (the last TRACK reaches the grid's own right edge — `auto-fill` keeps empty tracks, so
  measuring the last filled cell false-fails a sparse set) and a height derived from the
  measured width at 63/88; at 390 assert 2 tracks at 174px and the same derived height;
  keep the identical-geometry check, which still holds and is the reason the ruling is
  safe. Run the layout checks off ANY cell, not only a missing one, or a complete set skips
  every geometry assertion and the probe reports green having measured no layout at all.
- [ ] **Step 6 — Gate and commit.**

**Watch for:** the one-column case falls out of the declaration already — do not add a
breakpoint for it. **The boundary is 302px of content** (`2 × 146 + 10`), about 334px of
viewport. `ADDENDUM-STATES` labels its "~330px" as content, but at 330px of content the
declaration still gives two tracks of 160 — so read it as the viewport figure it matches,
and assert 302 content / 334 viewport, not 330 of either.

---

## PR 2 — Finding 5: the extras figure becomes a figure

**Files:** Modify `src/components/sets/set-index-view.tsx`,
`src/lib/copy/set-collections.ts`. **Test:** `set-index-view.test.tsx`.

- [ ] **Step 1 — Copy.** Add `setsIndexCopy.row.extrasLine(have, total)` →
  `` `${have} / ${total} extras` `` and `extrasAria(have, total)` →
  `` `, and ${have} of ${total} extras` ``.
- [ ] **Step 2 — Failing tests**, one per case in ADDENDUM-STATES' four-case table:
  extras owned, extras none owned, complete with extras outstanding (base ratio
  `--success`, extras line stays `--fg-muted`), not indexed (no second line at all).
  Plus: never `0 / 0 extras`, and the `aria-label` carries the appended clause.
- [ ] **Step 3 — Run, verify failure.**
- [ ] **Step 4 — Implement.** Move the figure out of the `CODE · YEAR · n/m extras` line and
  under the base ratio, one type step down, at `--fg-muted`. Brighten the base ratio to
  `--fg-body`. The guard becomes `counted && indexed && extrasTotal > 0` — the shipped one
  omits `indexed`, so an unindexed row with extras would print a second line the four-case
  table forbids. Append the clause to both `ratioAria` and `zeroAria`.
- [ ] **Step 5 — Run, verify pass. Gate and commit.**

**Watch for:** `--fg-locked` is wrong here — the figure is text and owes 4.5:1.

---

## PR 3 — Finding 3: the rack conforms

**Files:** Modify `src/components/sets/set-grid-view.tsx`, `src/lib/copy/set-collections.ts`.
Delete `src/components/collection/color-filter-row.tsx`'s use on this route.
**Test:** `set-grid-view.test.tsx`, **`src/lib/copy/set-collections.test.ts`** — it iterates
`rarity.letters`, which this PR retires, so the suite fails without it — and
`scripts/probe-sets.mjs`.

Indivisible by Design's ruling: the pips, the rarity trigger, the chip line and the
three-row bar are one conformance change, and splitting them leaves the page in neither
vocabulary.

- [ ] **Step 1 — Copy.** Reuse `chassisCopy.chips.none` (`No filters on`) and
  `filterCopy.chips.clearAll` (`Clear all filters`) rather than adding the addendum's
  lowercase variants — the addendum's own note says to do this once the chassis lands, and
  it has. Add the page's own `clearAllAria` — **`Clear all filters` in this PR, which is
  all it can clear; PR 4 extends it to `Clear all filters and the search` when there is one.
  Shipping the longer label here would be a false promise in an independently releasable
  PR.** It must also CONTAIN the visible label either way (WCAG 2.5.3). Then the chip
  labels, and a `FilterPanelCopy` block for rarity that READS `setFilterCopy.rarity.all`
  and `.value` rather than restating them — one source, or a later copy edit makes the
  trigger disagree with the chips beside it. `FilterPanel` hands `triggerOne` the option's
  `label`, which is Title Case (`Uncommon`), so lowercase it on the way in: the trigger
  reads `Rarity · uncommon`, matching the `042 · uncommon` caption below it, while the
  sheet's chips stay Title Case because a chip is a control and not a caption.
  Retire `setFilterCopy.rarity.letters` — and with it the shipped test that iterates it
  (`set-collections.test.ts`), which is replaced by one asserting the trigger's two labels
  and one asserting every rarity has a chip.
- [ ] **Step 2 — Failing tests**, one per state in ADDENDUM-STATES §1–5, each asserting the
  must-nots as well: row 2 present at rest; no phone badge at zero; no opacity on an unlit
  pip; no `Clear all filters` at one filter; chips in dimension order; colour collapsing
  past one pip; the panel carrying no search field and refusing two values.
- [ ] **Step 3 — Run, verify failure.**
- [ ] **Step 4 — Pips.** Replace `ColorFilterRow` with `ColourPips`, `form="wide"` on the
  control row and `form="sheet"` in the phone sheet.
- [ ] **Step 5 — Rarity, DESKTOP ONLY.** `FilterPanel` owns its own mobile sheet, whose
  rows are a 48px marker list — not the 44px chip group §28 draws, and with no way to put
  the pips above it. So the panel is mounted **on the breakpoint** and the page's existing
  `FilterSheet` keeps the phone form: pips, then a chip group, then Clear and Show. That is
  what "mounted, never forked" costs here, and it is cheaper than either alternative.
  Replace the four letter buttons with `FilterPanel`,
  `searchable={false}`, `widthPx={280}`, **`desktopRowMinPx={44}`** — the panel defaults to
  40 and the chassis contract is 44, which `/decks` passes for the same reason —
  **`selectionMode="single"`** — `multi` would expose
  `aria-multiselectable="true"` for a control that holds one value. The off state is the
  caller's: `onToggle` returns an empty selection when the lit value is picked again, which
  is how *all* is reached. `single` also drops the desktop footer Design drew (`n of 4 on`
  beside `Clear rarity`); that is the accepted cost of not forking the shared panel, and
  the chip line carries the same removal one row down. **Two ADDENDUM-STATES §4 clauses are
  therefore knowingly unmet and are NOT to be tested for**: that footer, and "opening lands
  focus on the current value" — the panel's non-searchable path calls `openPanel(false)`
  and leaves `activeCode` null, and flipping that to `true` is not enough on its own, since
  the selected-option lookup behind it is guarded by `searchable` and falls back to
  `options[0]`; the shared component has to seed `activeCode` from the selection. Both are one-line changes in the shared panel and belong to
  the chassis package, where four routes get them. The readiness doc records all three. Mount it **on the breakpoint, never
  CSS-hidden** — the panel holds
  its own open state and picks popover or sheet off the same hook. The phone sheet gets a
  44px chip group from `rarity.options`, after the pips.
- [ ] **Step 6 — Chips.** Clear leaves the control row for the chip line's trailing edge,
  past one active control. Row 2 prints the rest line rather than collapsing. Desktop never
  wraps; phone scrolls horizontally from its trailing edge and never wraps, chip target
  34px.
- [ ] **Step 7 — Probe.** Assert the head's height is identical at rest, at one filter and at
  three; assert no unlit pip has an `opacity` below 1; assert the panel is absolutely
  positioned rather than in flow.
- [ ] **Step 8 — Gate and commit.**

**Watch for:**
- `FilterPanel`'s marker is its own square-and-tick, not the addendum's rotated diamond.
  Mounting unforked is the harder rule and Design named it as the dependency; the marker
  is the panel's to change, in the chassis package.
- Do **not** mount `FilterChassis` itself. Its `sort` slot is documented as never empty and
  this page has no sort. The page adopts the chassis's rows and vocabulary, which is what
  §28 rules; §28's named dependency is the pip and the panel, and those two only.
- `/collection` still mounts the dimmed `ColorFilterRow`. That is the chassis package's
  migration, not this one — but the two routes will differ visibly until it lands.

---

## PR 4 — Finding 4: the name search

**Files:** Modify `src/lib/sets/filters.ts`, `src/components/sets/set-grid-view.tsx`,
`src/lib/copy/set-collections.ts`. **Test:** `filters.test.ts`, `set-grid-view.test.tsx`.

- [ ] **Step 1 — Failing tests on the pure model.** `SetGridFilters` gains `query: string` —
  **not the handoff's `name: string`**: `name` already means the card's name on every type in
  that module, and a filter field sharing it reads as the thing being matched. The URL
  parameter is `q` either way. See the readiness doc.
  `applyFilters` matches a case-insensitive, diacritic-folded substring of the printed name
  (`aether` finds Æther, `jotun` finds Jötun), matching **either half of a `//` name**.
  Not the type line, not oracle text, not the collector number. `serialiseFilters` writes
  `q` and omits it when empty; `parseFilters` reads it back.
- [ ] **Step 2 — Run, verify failure.**
- [ ] **Step 3 — Implement in `filters.ts`.** Fold with
  `s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()` — **plus an explicit
  ligature pass**. NFD decomposes a base letter from its combining marks; it does not
  decompose a ligature, so `"Æther".normalize("NFD")` still holds `Æ` and the required
  `aether` case fails. Map `æ→ae`, `Æ→AE`, `œ→oe`, `Œ→OE` before folding, and test the
  `aether` case specifically rather than trusting the normaliser to cover it.
- [ ] **Step 4 — Failing tests on the view.** The field is first in the control row and the
  only shrinking child; it is on the phone's persistent row and never in the sheet; the
  badge does not count it, **while the result line does** — the badge counts the dimensions
  hidden behind the sheet, the line describes the page, and reading one off the other makes
  a query-only search state the whole set's figures; `Clear all filters` clears it; the cost
  strip and `Send N` re-scope with it; the zero-with-a-query branch names the query and offers
  `Clear the search` before `Clear all filters`; with missing-only on and every match owned,
  the shipped `headingOwnsAll("cards matching “plains”")` branch carries it.
- [ ] **Step 5 — Implement.** `SearchField` from `ui/text-field.tsx`, placeholder
  `Find a card in this set` (`Find a card` on phone), accessible name
  `Search cards in {setName}`. 150ms debounce, `history.replaceState`, no request, no
  router, no dropdown, no Enter to submit.
- [ ] **Step 6 — Rarity panel counts.** The panel's per-row counts read the same filtered
  computation, so a query narrows them too.
- [ ] **Step 7 — Gate and commit.**

**Watch for:** a second field behind `Filters` would be two controls with one accessible
name — the defect `MissingOnlyToggle` already exists to avoid on this page.

---

## Self-review

- **Spec coverage.** README §27 → PR 1. §28 + the three chassis amendments → PR 3
  (amendment 1's "Clear clears the search" lands in PR 4, which is where a query exists to
  clear). §29 → PR 4. §30 → PR 2. ADDENDUM-STATES' rack states → PR 3 and PR 4; grid states
  → PR 1; index-row table → PR 2.
- **Not covered, deliberately.** The addendum's three open items: the upscale — which is a
  **curve, not a number**: 1.03× at seven tracks (the `max-w` cap truncates that row), 1.18×
  at six, rising to 1.53× at two and 2.06× at one, where the addendum's 1.21× is the
  five-track case (see the readiness doc) — and the item is conditional, so nothing is done
  until review finds the cell soft; B/R/G pip colours (the
  chassis package's assets, already committed); the chip line's skin (the chassis wins if it
  specs them differently).
- **Type consistency.** `SetGridFilters` gains exactly one field, `query: string`, and
  `EMPTY_FILTERS` gains `query: ""`. Callers of `applyFilters` pass a whole
  `SetGridFilters` and need no change — but three **reset literals** do:
  `setFilters({ colors: [], rarities: [], missingOnly: false })` at `set-grid-view.tsx:432`,
  `:497` and `:584` stop satisfying the type the moment the field lands — and so does the
  round-trip fixture at `filters.test.ts:73`, which builds a bare object. Replace the three
  resets with `EMPTY_FILTERS` rather than adding `query: ""` to each, so the next field costs
  nothing, and give the fixture a query so the round trip proves the new key too.

---

## PR 5 — R3's finding 6: the phone head stops being resident

**Sequenced AFTER #549 and #550 merge.** It is the same sticky container both of them
rewrite, and #549's 44px chip band grew the phone head 366 → 388px — so R3's arithmetic,
read against `main`, is 22px stale before this starts. **Re-measure first**, with
`pnpm probe:sets` at 390, and write the real rest height into this plan before building.

**Files:** Modify `src/components/sets/set-grid-view.tsx` (the head is inline there),
`src/components/sets/cost-strip.tsx`, `src/lib/copy/set-collections.ts`.

### PR 5a — the content moves (no mechanism)

- [ ] **`head.ratioNote` is absorbed into the figure** it annotates: `162 / 208 base · 78%`,
  extras trailing. The note keeps its own line at desktop, and keeps standing alone in the
  unindexed state — where `base` has nothing to ride on, which is why it is ungated today.
- [ ] **`head.metaShort(code, year)`** → `HOB · 2026` on the title line's trailing edge, phone
  only. The full `head.meta` string is unchanged at desktop.
- [ ] **The result line drops its redundant half** — `result.rest` restates a subtraction the
  ratio above already made. Its `role="status"` live region is untouched: it is what
  announces a filter change.
- [ ] Probe the phone head's new rest height and record it here.

### PR 5b — the cost line and the collapse

- [ ] **Unit coverage, in `cost-strip.test.tsx`** — the suite already exists, and this is the
  one PR in the set whose behaviour is a state machine rather than a layout: the collapsed
  and expanded forms, each caveat branch (`unpriced`, `noFigure`, `soldOut`, `stale`), the
  hysteresis band's two thresholds, and the desktop form proving it did not move. The probe
  covers overlay-not-reflow, which is the part only a browser can answer.
- [ ] **`CostStrip` becomes one 44px row** that expands in place on tap. The caveat count is
  the reason truncation is not enough: a strip whose height depends on how many pricing
  facts are true is an unpredictable sticky head — the same class as §28's ghost Clear.
- [ ] **Two heights, one threshold.** Collapse at 120px of scroll, restore at 40px: an 80px
  hysteresis band so a thumb resting mid-gesture cannot flutter it. **Never interpolated
  with scroll offset.**
- [ ] **The bar overlays; it does not reflow.** Assert in the probe that the grid's computed
  track count is identical at scroll 0 and scroll 400 — R3 names this test itself.
- [ ] **Reserve the rest height in the document**, or the page jumps on the first crossing.
- [ ] **No desktop change**: same container, full form, `md:` sizes untouched.

**Watch for:** finding 6 rules that the collapsed bar must not carry the chip line, and
#549 spent four rounds making that chip line touchable at 44px. The badge carries the state
when collapsed — but confirm the chip line's own height still holds at rest, since it is
what makes the expanded head's height a constant.
