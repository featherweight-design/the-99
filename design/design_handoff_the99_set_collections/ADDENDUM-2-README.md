# Set collections — addendum 2, R1: the desktop head takes the collapse too

`design/design_handoff_the99_set_collections/` · 2026-09-18 · additive to the R3 addendum

**One ruling reversed.** `ADDENDUM-STATES.md` §"The phone head — two states" listed five Must-nots
for the collapse; the fifth — *"Must not change the desktop head — same container, full form, `md:`
sizes untouched"* — is overturned. Everything else in that section stands and is not reopened here:
the two phone heights (148 / 52), the no-reflow rule, the no-interpolation rule, the delta-strip
gate, and the reserve-the-rest-height rule. This file rules only on the four calls the brief left
open, and it is additive: the R3 addendum's five files are **locked and unedited**.

**Deliverable:** `The 99 - Set Collections Addendum 2 · Desktop Head (R1).dc.html` (canvas, six-theme
`theme` prop, `showRejected` and `litPips` props).

Read at `main` this round: `components/sets/set-grid-view.tsx`, `components/sets/use-head-collapse.ts`,
`components/sets/cost-strip.tsx`, `components/sets/delta-strip.tsx`, `components/sets/set-icon.tsx`,
`components/sets/set-index-view.tsx`.

---

## 0 · The finding before the four calls: the rest form is not what changes

The reversed Must-not forbade a **second height**, not a redraw — so the round's first decision is
that **the desktop head at rest is the shipped desktop head, unchanged**. No `md:` size, no copy
string, no token moves. The frames at 1180 and 1440 draw the shipped head *as* the rest state,
beside the one genuinely new form.

That matters for how the saving is read. The container is `md:sticky top-0 z-[2]` today, with no
width qualifier on the desktop half, so — exactly as on the phone — **276px is not a first-screen
cost that scrolls away. It is every screen of a ≈16,500px page.** On a 900px window (≈820px of
content under the app's chrome) the head is **34% at rest and 7% collapsed**: two rows of cells
above the fold become five.

## 1 · Call 1 — what the collapsed bar carries. The rack survives *as the same nodes*

"Survives, reduces, or goes" has a fourth answer and it is the cheap one: **row 1 of the rack stays
mounted and the members around it hide.** The collapsed desktop form is that row, unchanged, with a
22px identity prefix ahead of it (icon · truncating name · `162 / 208`, on a hairline rule).

The phone's bar had to be its own row because **its controls change identity across the threshold** —
the field becomes a button back to the head, and `Filters` is a sheet trigger that does not exist at
`md`. At desktop nothing changes identity: the rack is inline, row 1 is one 32px line of five
controls, and it already fits with room (§4's arithmetic). Keeping it buys three things a redrawn bar
cannot:

1. **No second search field.** §29 forbids two controls with one accessible name on this page. A
   redrawn bar mounts a field behind a `display:none` twin — precisely the defect
   `MissingOnlyToggle` exists to avoid.
2. **Nothing to rescue.** Focus, the caret, the 150ms debounce and an open rarity panel all survive
   the threshold, because the element under them is never unmounted. The phone bar's whole
   `openHead()` → `scrollTo` → `requestAnimationFrame(focus)` dance has no desktop counterpart to
   write.
3. **No desktop badge to invent.** The filter state is carried by the lit controls themselves — a
   ringed pip, `Rarity · uncommon` in `--accent`, `Missing only` lit — which is the chassis's own
   twice-carried rule. The phone needed a badge only because its controls were behind a sheet.

**Rows 2 and 3 go.** The chip line's job is already doubled by the lit controls beside it. The result
line **keeps its live region and loses only its visible form** (`sr-only`) — which is exactly what
the shipped head already does with it while shy, so a filter changed from the bar is still announced.
One consequence, accepted: a sighted reader who filters from the bar sees the grid change and not the
count. Keeping row 3 makes it a 78px bar, which is not a collapse.

## 2 · Call 2 — the collapsed height is 56px, derived from the row it carries

`pt-[10px]` + a **34px row** + `pb-[12px]` = **56px**, against a rest head of **276px**.

| Member | Rest | Collapsed |
|---|---|---|
| `pt-[10px]` | 10 | 10 |
| Identity block — 44px icon beside a four-line stack (h1 29, ratio 16, provenance 14, scope note 14) | 73 | — |
| Identity prefix — 22px icon, 15px name, ratio | — | in row |
| `DeltaStrip` wrapper, not firing | 0 | 0 |
| `CostStrip` + its `mt-[10px]` — label, figure, one caveat, 32px Send | 85 | — |
| Rack row 1 + its `mt-[10px]` / the bar's 34px row | 42 | 34 |
| Rack row 2, chips + `mt-[8px]` | 30 | — |
| Rack row 3, result line + `mt-[8px]` | 24 | 0 (`sr-only`) |
| `pb-[12px]` | 12 | 12 |
| **Total** | **276** | **56** |

**34px and not 32** because a lit pip's 2px `--accent` ring sits outside the control's own box; a
32px row clips it, and clipping the one carrier of the lit state is the pip defect by another route.
**Not 44**, because 44 is the phone's target: these controls are 32px at `md` in the open head, and a
bar that grew them would be a second skin for the same rack.

**Why 52 on the phone and 56 here differ by four pixels, not forty.** Same row twice, sized by its
own width's target — 44px controls in a flush 52px bar, 32px controls in a 56px bar that keeps the
head's real 10/12 padding and carries five controls where the phone carries two.

**One figure for every width above `md`.** Everything deciding this head's height is a type size or a
fixed padding; the only width-dependent member is whether the `line-clamp-2` title wraps, and 1440
makes that *less* likely. **Rest is 305 when it wraps; the bar is 56 for every set in the catalog**,
because it truncates at one line by design. Neither figure is a constant in code — the head measures
itself and the threshold reads the measurement.

## 3 · Call 3 — the threshold. Same rule, one constant retuned

**Same rule.** The shipped hook already derives both offsets from measurement rather than constants:
`reopenAt = gridTop − bar` (where the reserve would start showing) and `collapseAt = reopenAt + band`
(the open head entirely past). That derivation is width-agnostic — it asks *has the open head gone
past* and *would the reserve show*, which are the right questions at 1440 as much as at 390. A
desktop-specific rule would be a second state machine for one number, and that number is already a
variable.

| Case | Rest | Bar | Reopen | Collapse |
|---|---|---|---|---|
| 1180, one-line title | 276 | 56 | 220 | 340 |
| 1440, one-line title | 276 | 56 | 220 | 340 |
| Either, wrapped title | 305 | 56 | 249 | 369 |
| Either, delta firing | — | — | gated | gated |
| Phone, unchanged | 148 | 52 | 96 | 176 |

**One constant retuned: `HYSTERESIS_PX` 80 → 120 at `md`.** A mouse wheel step is ~100–120px in every
major engine, so an 80px band can be crossed in *both* directions by two consecutive notches — the
flutter the band exists to prevent, arriving on an input the phone does not have. A thumb scrolls
continuously; a wheel quantises, and the band must exceed the quantum. 120 is one notch plus
headroom, and it is a term in the existing expression (`HYSTERESIS_PX` becomes a function of
`isDesktop`, which the hook already takes), never a new branch.

**Two gates the desktop adds.** An **open rarity panel** freezes the head as the phone sheet does —
the panel is anchored to a trigger in the row, and collapsing under it moves its anchor 220px while
it is open. And a collapse is forbidden while **focus is inside the members the collapse hides**
(the cost strip's Send, its disclosure, a chip's ×), because hiding them takes the keyboard with them.

**One gate that stops applying, carefully.** `mayCollapse` drops its `!isDesktop` term, and the
breakpoint reopen goes with it — but **the crossing must still not animate** (the two widths are
different designs, not two heights of one; animating it clipped the desktop controls inside a 75px
box on the way to a height belonging to another design), and a bar height measured at one width must
still be cleared at the other.

## 4 · Call 4 — the CostStrip, and whether the bar may carry the figure

**There is no desktop expanded state to design, because the desktop form has no collapsed one.**
`cost-strip.tsx` ships the full card at `md:flex`, always open and never closable, with both
disclosure buttons `md:hidden`. The phone's "expands in place on tap" has no desktop counterpart to
rule on, and it stays that way: the caveat lines — up to four — are the audit trail for the figure,
and at desktop there is room for all four beside a 32px button. **This round changes nothing in that
file.**

**The bar carries no money, and the desktop case is stronger than the phone's.** The figure re-scopes
with the filters, and the collapsed bar is the one place where the filters can be changed with the
denominator off screen: `$188.66 over 45 of 46` becoming `$12.04 over 3 of 3` under the reader's
cursor, with the caveat count that explains it hidden, is a money figure that cannot be audited where
it is read.

**The consequence, named rather than buried:** the collapse also hides `Send N to ManaPool`, the
page's one primary action. Accepted — it is 120px of scroll from anywhere on the page, the reserve
means it lands whole rather than half-drawn, and a commercial action that follows the reader down a
16,500px grid is the pattern this whole finding exists to remove.

## 5 · Drawn and rejected

- **The whole rack survives.** Three rows plus a one-line prefix is 78px at best, 108 with a chip
  line — 28% of the saving for 100% of the complexity, and it keeps the two members whose state is
  already doubled elsewhere.
- **The rack goes.** The phone can drop its rack because `Filters` survives on the bar. At `md` there
  is no sheet and no trigger, so dropping the rack leaves **no route to the filters at all** from
  below 340px of a 16,500px page.
- **A desktop `Filters` button and panel.** One control instead of five, and a sixth control type
  invented for one state: a trigger that opens what is inline 220px above it. Two ways to reach one
  rack, one existing only while scrolled, is the fork the chassis package exists to prevent.

## 6 · File by file — three files touched, no new copy string

| File | What changes |
|---|---|
| `components/sets/use-head-collapse.ts` | `mayCollapse` drops `!isDesktop`; the breakpoint reopen goes with it. `HYSTERESIS_PX` becomes a function of `isDesktop` (80 phone, 120 `md`). Two gates join `deltaFiring` and `sheetOpen`: an open rarity panel, and focus inside the hidden members. The reserve, the measured offsets, the 180ms step, the reduced-motion path and the anchoring switch are unchanged — which is why this is a small diff. |
| `components/sets/set-grid-view.tsx` | The `shy` branch stops being phone-shaped: at `md` it is the identity prefix followed by the rack's own row 1, not a second bar. The open identity block, the cost wrapper and the chip line hide as they already do; the result line's `sr-only`-when-shy behaviour now applies at `md` too. Rack rows 2 and 3 are the only members whose hiding is new. |
| `components/sets/cost-strip.tsx` | **Untouched.** |
| `lib/copy/set-collections.ts` | **Untouched.** `head.ratioAria` and the set name are the only strings the bar prints and both exist. No `Filters` label, no badge aria, no back-to-search label — the desktop bar carries the controls themselves. |

## 7 · Sequencing

One PR, and it must land **after** R3 finding 6, never beside it: this round is a change to the state
machine that finding shipped, and the two touch the same two files. Nothing here depends on findings
1–5. Nothing here touches a token, the grid, the cell, the index row, the delta strip or the modal.
