# One filter chassis — R2

**Deliverable:** `The 99 - Filter Chassis.dc.html` (canvas, six-theme `theme` prop).
**Brief:** `docs/superpowers/design-briefs/2026-09-11-one-filter-chassis.md`, read at `main`.
**Mirrors:** `design_handoff_the99_set_collections/` — same shape, same token discipline, same
two-decimal contrast bar.

| File | What it is |
|---|---|
| `The 99 - Filter Chassis.dc.html` | The deliverable. Chassis anatomy, /decks at five dimensions in five desktop states, four phone frames, the pip before/after in all six themes, the other three routes proved against /decks, the rulings, the contract. |
| `STATES-filter-chassis.md` | Six states × four routes × two widths, in full, including what each must not do. |
| `filter-chassis · copy strings.ts` | Production strings, with the reuse from `lib/copy/lanes.ts` marked rather than duplicated. |
| `READINESS.md` | Self-assessment, the one decision I want confirmed, and what I would cut. |
| `brand/` | The brand sheet, carried so the folder opens standalone. Unmodified. |

Open `The 99 - Filter Chassis.dc.html` directly in a browser — it needs no server. The `theme`
prop switches all six palettes; every frame is drawn at its true width, so pan rather than
resizing the window.

---

## Three corrections to the handoff prompt, folded

1. **The pip mechanism is the opposite of what the prompt instructed.** The prompt required
   token-coloured **masks**, "not inline art with baked fills", citing set collections' finding 1.
   The brief locks **Scryfall's full-colour SVGs drawn as images, not masked** (§2.5, §4) — and §4
   states it was rewritten after opening the endpoint specifically to correct that inference.
   Finding 1 concerns **set icons** (`svgs.scryfall.io/sets/*.svg`, a bare `<path>` with no fill);
   mana symbols are a different endpoint whose files open with a filled `<circle>`. Drawn per the
   brief. A single-colour mask would flatten every hybrid pip to one colour, which is the thing
   the decision exists to prevent.
2. **Four routes, not three.** `/discover` shares `FilterRack` with `/commanders` and is the
   fourth row of §1's table. It is drawn.
3. **Set filtering is locked but its matching rule is not.** §6 leaves it open with three
   defensible answers and a data dependency. Ruled below as decision 9.

---

## Changed at R2, from review

1. **The wrapping sort was a defect, fixed by a rule rather than a nudge** — decision 18.
2. **Every shipped filter is inventoried and slotted** — new §1b in the canvas, and decision 19.
3. **Score against was drawn wrong.** R1 made it a dropdown; it ships as an inline segmented pair
   with a mono caption. Corrected, and it produced the segmented control type — decision 20.
4. **/collection compact is drawn in full**, with the commander sheet — §3b. Decision 21 moves the
   view toggle to the result line.
5. **Sheet order is fixed and pips lead it** — decision 22.

R1's frames are superseded rather than kept: this is one canvas revised in place, as set
collections was through its own R2 and R3.

---

## Decisions

**1. The chassis is a full-width bar above the content, three rows, always all three.**
Controls · chips · result. Lifted from `filter-rack.tsx`, which already carries the invariants and
the tests: never collapses, never reorders, never changes height when the results change. What is
new is that it now holds five dimensions, mounts on four routes, and opens every dimension with one
panel shape.

**2. Row 2 prints `no filters on` at rest rather than collapsing.** That line is what makes the
fixed-height promise cheap — there is no state in which the chassis grows or shrinks between
result changes.

**3. Every desktop control is 34px.** The rack ships search at 34 and Order at 32 in the same
flex row; one rhythm, and the 2px mismatch goes.

**4. One panel shape opens every dimension: anchored, never in flow.** 280px, `--surface-rail`,
`--border-strong` hairline, 44px rows, rotated-diamond marker, per-row counts, a footer stating
`n of m on` beside a Clear for that dimension. This is `ui/filter-panel.tsx`'s behaviour and
`rack/select.tsx`'s behaviour unified — see decision 12 for the flag on that.

**5. Colour is inline on desktop and a panel on the phone.** A per-width rule, not a per-surface
one. Five pips are five taps at rest and the pips are their own labels; putting them behind a
`Colour ▾` costs a tap and hides the one dimension whose whole state is legible at a glance.
This is what both the collection bar and the rack already do.

**6. An active filter is carried twice: an `--accent` trigger border with the value in the label,
and a chip in row 2.** Never colour alone. The trigger reads `Status · Building`, or
`Status · 2 on` past one value.

**7. The pip carries no opacity, no tint and no token colour.** Lit is a 2px `--accent` ring;
unlit is no ring. All three shipped colour controls carry unlit as `opacity: 0.34`–`0.40`, which
measures **1.38:1** against `--surface-sunken` at its worst — under the 3:1 non-text floor on three
live surfaces today. A faded cream circle with a black glyph inside it is also illegible in a way a
faded flat square was not, so the dimming had to go regardless of the measurement. `--accent`
against `--surface-sunken` floors at **4.42:1**, so the ring clears 3:1 in all six themes;
`--border-strong` floors at **1.24:1**, which is why the unlit pip carries no rim at all and why a
hairline could never have been the carrier.

**8. Circles, 22px desktop and a real 44px on the phone.** The asset is a circle; the rack's 6px
rounded square and the column's 7px one would either crop the artwork or float it in a box. The
phone pip is 44px itself, not a 26px pip inside a 44px hit area.

**9. `Printed in ▾`, matching any printing, on both commander lanes.** §6 option (1).
Option (2) — owned printing — is the better long-term answer and engineering is right that it is
the direction, but it cannot ship on the surface that needs it: `candidates.ts` partitions
`/discover` to commanders the player does not own, so an owned-printing filter there matches
nothing, ever. That forces the dimension owned-lane-only — a **third** per-lane difference in the
same round §3.5 argues for convergence — and needs a printing-aware query plus an answer for what
the row then draws and names. (1) needs neither.

The brief's second half — a row matching on a set while drawing another set's art — is answered by
**the name, not the query**. `Printed in Duskmourn` is true of the oracle card whichever printing
the row happens to draw. `Set: DSK` implies the thing on screen. One word, and the row needs no
change. When the commander lane becomes printing-aware, (2) is a filter swap behind an unchanged
control, and `Printed in` is still the honest label.

**10. `/collection`'s `Set ▾` keeps its name.** It answers a different question — sets you hold
cards from, counted from `setCounts` — so the two controls are named differently because they are
different. This is set collections' own `Set ▾` / `By set` collision (its decision 20) in a new
place, and it is ruled the same way.

**11. Sort stays in the chassis, in a separated trailing slot past a hairline, on every route and
at both widths.** Not because sort is a filter — the hairline is what says it isn't — but because
every alternative is worse here. `/decks`' desktop sort lives in a toolbar that disappears with the
sidebar, so "leave it" is not on offer; the other three routes already trail it inside the bar.
At phone it is the 44px icon trigger on the persistent row, which `filter-rack.tsx` already ships
via `iconOnly={!wide}` on two routes. **The deck sheet's Sort group is retired** — the one place
the app answers this question two ways. Consequence accepted: sort is then never inside a sheet,
the sheet is filters only, and the badge stays honest.

**12. Clear is three scopes, each worded to say which.** The chip's `×` removes one value; the
panel footer clears that dimension; `Clear all filters` at the chip line's trailing edge clears
every dimension and never the sort. This deliberately **keeps** `filter-panel.tsx`'s per-dimension
Clear rather than collapsing to one global control: `FilterChangeIntent` exists because "Clear" and
"toggled the last one off" land on the same state and must announce differently, and one global
Clear would throw that away. Retired instead: the deck column's footer Clear, the deck sheet's
footer Clear, and the column's `allOn` / `someOn(n)` line.

**13. `result-line.tsx` is the shared answer to §3.3, moved up unchanged.** Mono 11px,
`--fg-muted` (**6.53:1** floor, measured), tabular, one live region per surface, `aria-atomic`,
drawn instantly and announced at 300ms, stating the lane rather than a ratio at rest. It already
carries the reasoning and the tests, and the collection bar already debounces its own count the
same way. The `Exactly excludes n that Any would show` aside stays appended to that same sentence.

**14. The empty state names one fix, and sits below the chassis.** `commandersCopy.empty` is the
best copy in the app on this problem — it names the control and promises the row count that
dropping it returns. `/decks` and `/collection` show a generic nothing-found today; this makes the
good one shared. The chassis is never replaced by the empty state, because the filters that caused
the emptiness have to stay on screen and stay removable.

**15. The two commander lanes converge and keep exactly two differences, both data rather than
layout.** Score-against stays owned-lane only (tests assert its absence on discover; a greyed
stand-in was already rejected); sort options stay per-lane, since two of discover's five decide
what the lane is ranked on. The test for whether a difference is meaningful is a question a player
could ask — *what would this control do here?* Score-against on discover has no answer.

**16. The match modifier survives untouched on the two commander lanes.**
`rack/colour-control.tsx`'s call 1 is preserved verbatim: with no pip lit it is greyed in place,
keeps its value, keeps `aria-disabled`, stays focusable. `/decks` and `/collection` AND their
colours together and mount no modifier, unchanged from today.

**18. The control row never wraps. There are two forms and nothing in between.** Wide above
900px, compact below. Search is the only child that shrinks (`min-width: 132`); every control is
`flex: none` with `white-space: nowrap`; the trailing sort group is `flex: none` too, so it can
never be pushed to a second line. The switch is set by `/collection`'s seven controls, not
`/decks`' five: 132 + 148 + 150 + 78 + 120 + 1 + 160 + 70 + seven 12px gaps + 44px padding =
**887px**.

R1 allowed row 1 to wrap and the sort landed on its own line. That read as a layout bug rather
than a trailing slot — correctly, because a trailing slot that is not trailing is not a slot.
This also retires R1's "768–868px wraps to two lines" open item, which was the same defect
described as acceptable.

**19. The chassis has slots, not a dimension list, and four control types fill them.** A field
slot, a pip slot, an ordered run of dimension slots, a trailing slot for sort. The type is chosen
by **the shape of the values, not the route**, which is what makes status on `/decks` and type on
`/collection` the same object and lets a fifth route mount the chassis with no design round. All
twelve live controls are inventoried in §1b with what changes for each. Nothing is dropped.

- **Field** — search, all four routes.
- **Pip row** — colour identity, all four routes. The only bespoke control.
- **Segmented** — colour match, score against, view. **Only where the dimension has no off state.**
- **Trigger + panel** — status, last played, type, set, availability, printed-in, sort.

**20. Score against keeps its inline segmented shape and its mono caption.** R1 drew it as a
trigger, which was simply wrong against the shipped surface. Its correction is what produced
decision 19's segmented type and the no-off-state rule: last-played has two values *and* an off,
which is why it is a panel and why the shipped deck column draws it as two independently-clearable
rows rather than a pair of segments.

**21. `/collection`'s view toggle sits on the result line's trailing edge in the compact form.**
It is not a filter, so it is never counted by the badge or touched by Clear; the result line is the
one row with dead space to the right of it; and "how many results" beside "how they are drawn" is a
sentence that reads. The arithmetic it avoids: search 132 + sort 44 + Filters 44 + view 76 + three
8px gaps + 32px padding = 352 of 390px, which fits but leaves search at its minimum on the app's
most search-driven surface. Wide, it stays where it ships — outside the hairline, past the sort.

**22. Sheet order is fixed across routes, and pips lead it.** Pips, then segmented controls, then
chip groups, then anything carrying a hint line. R1 put the pip block between two chip groups in
the deck sheet and it unbalanced the sheet — five 44px circles of full-strength artwork outweigh
everything around them, so in the middle they are an interruption and at the top they are the
anchor. They are also the one dimension every route shares. A hint line is last in its group and
its group is near the bottom, because a sentence between two rows of controls is the same
interruption in another form.

**23. A control keeps its shape across both forms.** Only two things change between wide and
compact: target size, and whether a panel is anchored or a block in the sheet. A segmented control
does not become a pair of pills; a pip row does not become a dropdown — which is the specific
inconsistency `/collection` ships today, colour inline on desktop and behind a panel on the phone.
`Set` and `Printed in` are the one exception and the one place the compact form nests: 41 owned
sets is not a chip row, so in the sheet they are a 44px row opening `filter-panel.tsx`'s existing
searchable list as a second layer.

**17. The collection bar loses its `COLOR` caption.** It existed to explain five abstract squares.
Real symbols are their own label, and a mono caption inside a 34px well is furniture once they are.

---

## Flagged, not decided

**§2.1's locked "new chassis, not an adoption" retires a component that landed three weeks ago.**
Drawn as locked. But the brief's rejection names "the collection bar", and the collection bar *is*
five mounts of `ui/filter-panel.tsx` — 42.5KB with 34.6KB of tests, ratified in
`collection-filter-panel.md`, called "the reference implementation" in `rack/filter-sheet.tsx`'s
own header, and listed by set collections' readiness as "**mounted, not forked**".

So decision 4 specifies the panel as *what `FilterPanel` already does*. Read §2.1 as **a new
chassis around the existing panel** and nothing needs rewriting. Read it as **a new panel too** and
this round discards a tested component while set collections' Task 9 extracts a control that is
about to be replaced. That is the difference between a moderate refactor and a large one, and it is
the one decision I want confirmed before build.

---

## Measured, to two decimals, in all six themes

| | Floor | Where |
|---|---|---|
| Scryfall pip on `--surface-sunken` | **9.51:1** | R, Rune Frost |
| Scryfall pip on `--bg` (sheet ground) | **9.94:1** | R, Rune Frost |
| `--accent` ring on `--surface-sunken` | **4.42:1** | Oil Slick |
| Result line `--fg-muted` on `--surface-sunken` | **6.53:1** | Witchlight |
| *Shipped* token pip at `opacity .34` | **1.38:1** | U, Oil Slick |
| `--border-strong` rim on `--surface-sunken` | **1.24:1** | Oil Slick |

`W` = `#F8F6D8` and the `WU` blue half = `#C1D7E9` are quoted verbatim in the brief. **B, R and G
are the canonical pip colours and are not quoted anywhere I could read** — the figures assume
`#CBC2BF` / `#F9AA8F` / `#9BD3AE` and must be confirmed on first fetch. The floor carries 6.5
points of headroom over 3:1, so no plausible value threatens it.
