# R5 — the six held items, ratified

`design/design_handoff_the99_availability/` · 2026-09-02 · **ratification, new files only**

Closes R4's blocker. `ADDENDUM-2-READINESS.md` §*Resolved engineering-side — Design to ratify, not
to redraw* was read at `origin/main`; **items 1, 3, 4, 5, 6 and 10 are ratified below**, together
with the pip-ring call item 11's acceptance raised and the count-only pair item 4's expansion asks
for.

Canvas: `The 99 - Availability Ratification (R5).dc.html`. **Nothing redrawn, no file replaced, no
copy file touched.**

**Verdict: 🟢 Green.** No decision is waiting on anyone. Three sentences change in prose, two
drawings are recorded stale, one R4 file is withdrawn.

---

## 0. Provenance, and two corrections to R4

**The readiness doc is on `origin/main` and R4 was wrong to call it absent.** It is not in this
project's working tree, and neither is the shipped feature: local `src/` still holds only
`components/shell/nav.tsx`. Everything below is read from the repo at `main` and cited to it —
`ADDENDUM-2-READINESS.md`, `src/components/collection/rows-view.tsx`,
`src/components/collection/color-pip.tsx`.

**`R4 · copy diff.ts` is withdrawn.** Item 8's sweep already ships with the ratified wording, so
that file patches strings that no longer exist in that form. It is left in place rather than deleted
— new files only — and marked dead here and in the canvas. Items 8 and 9 are out of scope;
acknowledged, and the reasoning agrees on both.

**R4's stated reason for the outset ring is withdrawn with it — the ring survives, the argument
doesn't.** R4's item-11 spec (canvas spec panel and `R4-README.md`'s item-11 table) calls the ring
load-bearing because `--b` is `#1E1B1A` against a `#1E1A15` surface. **That cannot be what it
does:** a ring painted in the row background is row colour on row colour, so it never separates a
pip from the surface. It was written before `rows-view.tsx` was readable — the shipped
`inset 0 0 0 1px rgba(0,0,0,0.35)` already does that job, at every pip count, which is exactly why
§1 keeps it. **The outset ring's only job is pip-over-pip separation.** Where R4's spec table and
this document disagree about the reason, **this one governs**; the 1px itself is unchanged.

**Item 7 needs nothing.** The §5/§6 ordering was reverted by the R4 drop and restored by you; the
pure-move-over-renumber call is right, because the heading numbers are the anchors every reference
resolves against. Future passes are new files only. This one is.

---

## 1. Item 11's follow-up → **both shadows coexist, with no four-plus switch**

**Keep the inset edge exactly as it ships; add the outset ring unconditionally.**

```
box-shadow: 0 0 0 1px var(--pip-ring),
            inset 0 0 0 1px rgba(0,0,0,0.35);
```

The two answer different questions. `inset 0 0 0 1px rgba(0,0,0,0.35)` defines a pip against **the
row** — it exists because `--w` is `#F4E9C4` and needs a rim on a dark surface, at every pip count.
The outset ring defines a pip against **the pip under it**. Neither substitutes: drop the inset and
white loses its rim even at one pip; keep only the inset and five overlapping circles merge into one
dark-veined shape.

**And the ring gates itself, which is why there is no state to add.** An outset ring painted in the
row's own background is invisible when nothing is underneath it — at one to three pips it paints row
colour onto row colour, pixel-identical to today; at four and five it is the only thing between two
circles. The conditional version is the tempting one and the wrong one: it would make a primitive
count its siblings to decide how to look.

| | |
|---|---|
| **Order** | Outset **first**. The inset edge must stay the innermost line — it is the pip's own rim, not a divider. |
| **The one piece of plumbing** | `--pip-ring` on the row element: `--surface` at rest, `--elevated-hover` on hover. The row already swaps that background, so the ring rides a swap it already makes. **Hard-coding `--surface` leaves a visible hairline on hover at four-plus pips** — the only way to get this wrong. |
| **Scope** | The two inline spans in `rows-view.tsx` (`:72`, `:79`). **`ColorPip` is untouched** — its outset slot is spoken for by the `2px var(--accent)` selected ring, it never overlaps, and it is a control rather than a readout. |
| **Cost** | A covered pip shows a ~6px crescent minus 1px of rim. Checked at five pips, both widths: still reads as five colours, in order. |

Drawn three ways in the canvas — inset only, outset only, both — at 1 / 3 / 5 pips plus a hover row.

---

## 2. Item 1 → **behaviour ratified; §6's sentence is the error**

The worked table is right and the implementation is right: **a deck's own copies count for neither
side of the sum.** Claims-exclusion alone renders Arcane Signet as `0 free — in Kykar` inside
Atraxa, which is the exact sentence §6 exists to prevent. Supply-and-claims exclusion is not a
stronger version of the rule; it **is** the rule — "this card is built with, here" removes the copy
from both roles at once.

Replace §6's rule sentence with:

> **Inside a deck's own list, that deck's copies count for neither side of the sum — not as supply,
> not as a claim.**

…followed by the formula, so nobody re-derives it:
`free = (owned − ownClaim) − (hard − ownHardClaim)`.

**The withdrawn flag is correctly withdrawn,** and the reading behind it is worth keeping: from a
self-excluded vantage, `free === 0` means *exactly enough for everyone, including this deck*. So
`none free` on a deck's own list isn't merely unreachable — it would be **false**. That is a
stronger guarantee than "the state doesn't occur", and it belongs in the code note rather than the
prose about noise.

---

## 3. Item 3 → **ratify the omission, and don't fund the alternative**

**Ship without the pill.** The pill was reused in #43 as *visible evidence* for a claim about a list
— and evidence you derived rather than read is not evidence. `Complete` inferred from `hard > 0` is
a guess in the shape of a fact, which is the one failure mode a claim about somebody's *other* deck
cannot have.

**Do not widen `hardDeckNames` to `{ name, pill }[]`.** The clause already carries the severity: the
marker is hard *because* the claiming list is finished, so the pill restates in a second vocabulary
what the state itself encodes. A Task 1 ripple through every marker caller to re-say one thing is
the wrong trade even at zero risk.

**Stale drawing:** §3's card-detail state draws `[Complete]` after the clause. The canvas keeps it
as a record; **the design table's card-detail row is the thing to amend** — drop the pill from the
availability line, leave the rest of the row alone.

---

## 4. Item 4 → **shipped behaviour ratified; the drawing is the error**

**Keep the shipped denominator.** It is a page-level constant that predates this pass and reads
identically under every other filter; a fifth filter that alone reported a different total would
teach the player that the number means something filter-specific, which it doesn't. The numerator is
the part this pass changes, and it agrees exactly.

**The `1,418` captions are a fixture artefact — mine, in three places.** The fixture collection
should carry the quantity figure in that slot so the next drawing inherits the right one instead of
re-deciding it.

One structural note, not a change request: **the menu counts and the denominator are different bases
in one screen** — per-card in the menu, per-copy in the caption — so the four menu counts cannot be
summed against it. Both are individually right (a per-card menu should count cards) and I would ship
it. If a future pass wants them comparable, **move the denominator's base, not the menu's**: the
menu is the number a player learns their collection's shape from.

---

## 5. Item 5 → **ratified, and the seam stated once**

**Right call, and §6 was under-scoped rather than the panel over-reaching.** "A deck's own decklist"
named a *surface*; the reason it gave named a *vantage point* — inside a list, the card is built
with. The panel is where you add to that list, so the vantage is identical, and the same card one
panel apart cannot answer twice.

So rather than relocate the seam, **name it, so the next surface costs no round:**

> **The vantage point is the deck you are editing, not the surface you are looking at.**

Anything mounted inside a deck route excludes that deck; anything outside it computes against
everything. That covers the decklist, the add panel, a card modal opened from the builder and
whatever the builder grows next — and leaves `/collection` and `/commanders` exactly as #43 drew
them.

`deckId` on `searchCards` is the honest form of that sentence: the file already lives under
`src/app/decks/[id]/`, so the scoping existed implicitly and this makes it visible. Agreed — not new
coupling.

---

## 6. Item 6 → **qualify the callout, and promote the warning**

Agreed, and it is item 1 seen from the other side. `free = owned − hard` is the **off-decklist**
case, not an inherited general rule — "inherited unchanged" is the phrasing that would get it
recomputed somewhere it doesn't hold.

Qualify it as the default case, and make the plan's implementer warning the **headline** rather than
the footnote:

> **Never recompute `free` from `owned` and `hard` — read it from the map, which knows where you're
> standing.**

A formula in a handoff gets copied; a warning under a formula gets skipped.

---

## 7. Item 10 → **ratified; no character budget**

The Gap §2 resolution is the right closure — the name is the only part allowed to truncate, full
name in `title` and always in the accessible name, no counting and no breakpoint hook. Two things
make the worst case cheaper than it looks, and both are worth writing down so this doesn't come
back:

- **The half that truncates is the half that isn't load-bearing.** `short 1` is the shortfall — the
  actionable fact — and it is `flex-none`, so the number never clips. The name is context.
- **The over state is the one with a roll-up above it.** The longest clause only occurs where the
  deck-level line is already on screen naming the problem, so a truncated name is not the player's
  only route to it.

---

## 8. Items 2 + item 4's expansion → **two count-only siblings; structure ratified, wording yours**

Expansion accepted, and **hard needs one for a better reason than tidiness**: both states currently
reach their count-only form by slicing a clause out of a string, so the copy file is authoritative
for the words but not for *that* phrasing — and a future edit to a full string silently reshapes a
sliced one. Two dedicated keys end that.

**R4's proposed strings are withdrawn; copy content is yours.** The structure Design owns:

> **Every marker state that names a deck ships a sibling that doesn't.** Three states name decks
> (hard, hard-multi, over) and a degraded read can strip the name from any of them, so the
> count-only variant is part of the state, not a fallback bolted on later.

Two keys close the two that slice today; `hardMulti` is already count-only by construction. **One
naming ask only:** whatever suffix the pair takes, take the same one — so the next state's author
copies a pattern instead of inventing one.

---

## Files

- `The 99 - Availability Ratification (R5).dc.html` — the ring drawn three ways at 1/3/5 pips plus a
  hover row, and the ratification ledger.
- `R5-README.md` — this file.
- `R5-READINESS.md` — verdict and what carries forward.

R1/R2/R3 documents, all earlier canvases, `availability · copy strings.ts` and every R4 file:
**untouched.**
