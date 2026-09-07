# STATES — the filter rack, six states × two lanes

Companion to `README.md`. The canvas draws the states that differ visually; this file is the whole
matrix, and it is the document to audit against the spec's locked decisions.

Invariants across all twelve cells:

- The rack is **present, in place, in one order**. It never collapses, never reorders, never becomes
  sticky, and it does not change height when results change.
- **Every control on the lane renders**, in every state. Greying is the only degradation.
- The **chip line reserves its height** (22px desktop / 30px phone) even with no chips, so the first
  chip never pushes the list.
- **One result line**, bottom of the rack, and it is the lane's only live region.
- The only commitment control anywhere is **Clear**.
- **Neither lane has a header CTA.** The row is the action. `Clear` and the zero state's correction
  are the only buttons above or around the list.
- **No row shows a printing thumbnail at rest, on either lane, at either breakpoint.** The art bleed
  is the card image; `I3` is the only frame with a thumb and it applies only if a printing is named.
- **Both lanes are drawn at both breakpoints.** Owned: `B` desktop, `E1`/`E2` phone. Discover: `C`
  desktop, `E6` phone. The phone rows are two bands, not a transcription of the desktop column.
- **The two lanes' right-hand columns are different by design.** Owned prints fit out of 100 with a
  delta and the Pool / Roles / Synergy ramp; discover prints the support count over the EDHREC total,
  the deck count and the novelty count. Discovery does not blend, so there is no score to show.
- The row's figure set does not change with state. Filtering never trims a row to fit; a filtered row
  carries the same rank, thumb, role counters, synergy, availability line, receipts, fit and split bar
  as an unfiltered one.

| | owned lane | discover |
|---|---|---|
| Scope (Best fit / Something new) | **absent** — the lane is the scope | ✓, leads the rack |
| Search | ✓ | ✓ |
| Colour pips | ✓ | ✓ |
| Colour match | ✓ | ✓ |
| Availability | ✓ | **absent** |
| Order | Fit · Name · Recently added | Popularity · Name · Colour |
| Rows | 148 | 3,301 |

---

## 1 · No filters

**Owned** — canvas B. Search empty and placeholder-toned. Five pips unlit at `opacity .34`. Colour
match **greyed** (call 1). `Score against` at `All my cards`, hairline. Order at `Fit`, hairline.
Chip line holds `no filters — nothing to clear` in `#6E6654`; **Clear is present and inert**, not
absent. Result line: `148 commanders you own and haven't built` — a statement, not a count of
matches.

**Discover** — availability out, **scope in and leading**: `Best fit ▾` at default, hairline, no chip.
Result line: `3,301 commanders`. Order at `Popularity`.

Scope is never greyed and never empty — it always has a value, and `Best fit` is the default the lane
opens on. Moving it to `Something new` turns the trigger brass and adds one chip.

*Must not:* print `3,301 of 3,301`. With nothing filtered there is no ratio to state, and a
denominator equal to its numerator invites the reader to look for what was excluded.

**Phone** — E1. Persistent row: search · order icon · `Filters` with **no badge**, all 44px. Chip line
absent (nothing to summarise), result line directly under the row.

## 2 · Colour only

**Owned** — canvas D1. Two pips lit (`1.5px #EDE6D8`), wrapper border brass, **colour match now live**
at `Any` with `Any` filled. One chip: the pip squares + `Black · Green` + ✕. Result line
`31 of 148 commanders match`.

**Discover** — same, result line `412 of 3,301 commanders match`.

Un-lighting the last pip returns the match control to greyed **and keeps its value** — the chip goes,
the mode does not reset.

**Phone** — one chip on the row, badge `1`. Two or more pips collapse to `2 colours` before the row
runs out of width.

## 3 · Colour + search

**Owned** — canvas D2. Search filled, border brass, clear ✕ present. Two chips in control order —
`"druid"` then the colour chip — then Clear. Result line `4 of 148 commanders match`.

**Discover** — canvas C, at four chips: search, colours, match, order.

*Must not:* let search gain a scope of its own. It narrows this lane in place; there is no
"search everywhere" mode, and the zero state's offer is spelling help or the other lane, never a
different index.

**Phone** — E2. Badge `2` (colour + availability; search is never counted — call 4).

## 4 · Exact mode

**Owned** — canvas D3, drawn as the five-control worst case: query, two pips, `Exactly`,
`Free cards only`, `Name A–Z`. Every one of the five controls shows its own brass border, five chips
sit on one line, and the result line carries the aside:
`2 of 148 commanders match — Exactly excludes 6 that Any would show`.

The aside is **appended to the result line**, not a second line and not a separate note. It renders
only when `Exactly` is active **and** the count differs from what `Any` would return.

**Discover** — same shape, four controls (no availability), so four chips.

**Phone** — the fifth chip collapses: two chips + `+3` + Clear, badge `4` (owned) or `3` (discover).

## 5 · Sheet open

**Owned** — canvas E3. Sections in rack order: Colour identity (44px pips) · Colour match (two 44px
pills) · Score against (two 44px pills + one mono explainer) · Order (three 44px pills). Search is
**not** in the sheet — it stays on the persistent row behind the backdrop, which is the reason the
badge does not count it. Footer: filled `Show 4 commanders` + `Clear`.

**Discover** — canvas E4. Four sections, **Scope first**, carrying both glosses (*most of its support
list already owned* / *farthest from the archetypes you have built*) — the sheet is the only place
those glosses render, because the rack has no room for a second line. Colour match is **greyed with
an explainer line** because no pip is lit. Footer: `Show 3,301 commanders`, `Clear` inert at `#6E6654`.

Behaviour: taps apply immediately, the header count and the footer label both update live, and the
primary only dismisses. Esc, handle-drag, backdrop tap and the primary are all the same action.
**Esc never reverts.**

*Must not:* stage changes behind an Apply, or become a centred dialog at any width — the list behind
it is the thing being changed.

## 6 · Filtered to zero

**Owned** — canvas D4. Rack unchanged, result line `0 of 148 commanders match`, and below it: three
diamonds, *Nothing in the pile matches*, one sentence that **names the control** and what dropping it
returns, then a filled specific correction (`Drop Red`) and a hairline `Clear all filters`.

The specific correction is chosen as the **single control whose removal yields the most rows**; ties
break toward the most recently changed control. Where no single control fixes it, the sentence drops
the promise and only `Clear all filters` renders.

**Discover** — canvas D5. `0 of 3,301 commanders match`, heading *No commander by that name*, and the
body carries the lane boundary: this lane lists what you don't own, so if you own it already it is on
your commanders. Second button is `Search your commanders` — the same query, the other lane.

**Phone** — E5, drawn with five controls active and chip overflow, so the zero state, the `+3` chip
and the badge are legible in one frame. Buttons stack full-width at 48px.

*Must not:* hide, disable or collapse the rack. A zero result is a fact about the list; the controls
are how you leave it.
