# Re-ruling — in-flight feedback after the two-lane split (R3)

`design/design_handoff_the99_in_flight/` · supersedes R2's placement rulings.
Drawn on the build in `design/design_handoff_the99_commanders_discover/`, which is what it
must match. Verified against `page-header.tsx`, `discovery-view.tsx`, `commanders-view.tsx`,
`rack/filter-rack.tsx`, `rack/select.tsx`, `rack/result-line.tsx`, `ui/pending-mark.tsx`
on `design/in-flight-handoff`.

## The correction

R2 was Green against the surface it was drawn on. `#435` (`3da8c52`) deleted that surface.
`page-header.tsx` is now `PageHeader({ lane })` — a fixed title and a fixed gloss, no counts,
no scope toggle: *"the scope is now the route, the nav is the switch, and the counts the
subtitle reported have moved onto the rack's result line."*

R2's mechanism was **a pending clause replaces the subtitle clause its control owns**. There
are no clauses. All three participles are homeless, and two have no owner left to be homeless
for.

| R2 participle | Owner then | Owner now |
|---|---|---|
| `counting…` | scope control | **none** — scope is the route |
| `re-ranking…` | sort control | **none** — `ordered()` sorts in memory, always did |
| `re-scoring…` | availability | **none** — client swap on owned, absent on discover |

What is left is one control on either lane that can reach the server: **discover's scope**,
and only on a cache miss.

## The ruling

### 1. The crown is the whole treatment. Answer (a).

**No copy state beyond the mark the control already wears.** Not because the wait doesn't
deserve description, but because the thing that made R2's treatment free is gone.

A subtitle clause was a line already on the page that *was going to change anyway* — the
participle borrowed a slot the arriving answer would overwrite. It cost no new element, no
new region, no reflow, and no reader had to learn it. **Nothing on the rack has that shape.**
The result line is a count, not a description; the rack is three fixed rows; the lane
announcer is for events, not states. Every candidate location is a new element, and a new
element that appears while waiting is the region loader ruling 7 already refused.

The shipped mark is not a dim — Hugh's standing position is met and was met before this
document. `PendingLabel` **replaces the label with the crown**, in the chevron's own 28px
slot, so the control is the same width waiting as idle; `PENDING_OPACITY` 0.55 and `aria-busy`
ride along; the control is never disabled and its menu still opens. The label already reads
the destination value, because selection is optimistic. So the control says, in one place:
*you pressed this, it now says the thing you asked for, and the answer is not here yet.*

### 2. The result line holds.

**Its outgoing sentence, verbatim, for the whole flip** — `3,301 commanders`, or
`412 of 3,301 commanders match` — and the sheet footer's copy of it (`Show 3,301 commanders`)
holds with it. It rewrites **once, on arrival**.

No pending form, no ellipsis, no dash, no blank, no `aria-busy`, no second node. The line is
the count of the list on screen; the list on screen is the previous answer and is still true;
therefore the count is still true. A line that goes vague while its subject stays exact is the
only way to make that pair disagree.

This is the substantive half of "nothing": **nothing** is a thing the code must be told to do,
because the natural implementation of a pending flag is to reach for the nearest count.

### 3. Why not the result line — the collision, ruled on.

Asked for explicitly, so it stops being re-opened. Three ways to lose before accessibility is
even considered:

- **Replace** the sentence → deletes a true count to report a wait.
- **Append** to it → the fourth-clause reflow R2 spent a page refusing, on a line the rack
  promises will not change height.
- **Dash it** (`— of 3,301`) → breaks the locked rule that missing data is omitted, never
  zeroed or dashed. The data is not missing.

And the collision is real. `result-line.tsx` is *the rack's only live region*, `aria-atomic`,
debounced 300 ms **so that a reader typing four letters hears one count**. A participle there
either announces mid-flight — against ruling 5, and 300 ms behind a press that was already
acknowledged — or must be surgically hidden from the one node whose entire job is to be heard.
**Muting a live region to say something that carries no information is the argument against
saying it.**

### 4. The 500 ms gate retires with the participle.

`PENDING_GATE_MS` existed for one purpose: to stop the subtitle participle appearing and
leaving inside a 270 ms flip. With no participle there is nothing to gate.

**The crown was never gated** — in R2 or in the build; `select.tsx` renders it the moment
`pending` is true. That is correct and stays. A press must be acknowledged on the press; half a
second of a control that looks untouched is the complaint `#338` and PRs #411/#416 answered.
And a crown that flashes for 200 ms is not the failure a flashed sentence is: it is a label
swapping to a mark inside its own box — no reflow, nothing to read, one thing said.

**Do not re-point the constant at the crown. Delete it.** A gate is right for a sentence, which
must be read to be worth anything and costs a reflow to appear; it is wrong for a mark in a
fixed box that answers a question the reader asked with their finger.

> ⚠ **This is the one line where R3 disagrees with the gap report's keep-list**, which carries
> *"one gate, 500 ms, never tuned per control"* forward. Keeping it leaves a constant no code
> path reads, which is how a retired rule gets re-implemented a year later.

### 5. Nothing is announced mid-flight. Unchanged, and now cheaper.

The crown is `aria-hidden`; the control's accessible name carries the state. On settle the
**lane announcer** — `discovery-view.tsx`'s own region, for the two events the result line
cannot describe — speaks the re-rank once, naming the count the server returned. The result
line speaks only for client narrowings, on its own debounce. Two regions, two jobs, one message
per press.

### 6. The owned lane has no pending state at all.

`commanders-view.tsx` holds no transition and passes no flag. Search, pips, match, availability
and order all narrow or reorder rows already in memory. **Nothing on `/commanders` can wear a
crown.** Drawn in frame D so the absence is a ruling and not an omission.

### 7. Unchanged from R2, restated so the re-audit is one document.

- The list region is never touched: no skeleton, dim, overlay, transition, `aria-busy` or
  pointer trap. The outgoing rows are the previous answer and stay pressable.
- Client-side controls get no mark. A mark that fires for 0 ms is a flicker with a reason.
- No escalation tier at any duration. No spinner, no progress bar, no "taking a moment".
- Failure is the route's: the error path owns the page, the rack returns to the state it was
  in, count included. The result line is not a status bar.
- **The boundary is a content test.** Outgoing rows → in place. No outgoing rows (first paint,
  reload, cold shared URL) → `LoadingScreen`, still the only skeleton. No third component.
- Motion: one thing moves, the crown's 1,200 ms pulse. `prefers-reduced-motion` holds it at
  0.7 and changes nothing else, because nothing else was ever motion.

## 390 px

Same rules, no variants.

- **Discover's scope lives in the sheet at this width**, so a flip started there is marked
  there: the radiogroup takes `aria-busy` and the dim, and the crown replaces the **selected**
  option's label only, in `currentColor` against the brass wash. The gloss under it holds — it
  describes the scope, not its arrival.
- **Dismissing the sheet mid-flight leaves no mark behind it.** Correct, and the same call R2
  made about scrolling away from a control: the list they are looking at is the list they still
  have, and the count under it is still its count. No sticky pending bar, no toast.
- **The footer count holds** with the result line — it is the same sentence.
- **Nothing changes height.** The rack's three rows are fixed, the chip line reserves 30 px, and
  the trigger keeps one glyph slot at both states. There is no shift to reserve against at this
  width, which is the one open item R2 carried and R3 closes.

## Two corrections folded in

1. **"Two participles under `I own`" was already one** before the split — `commanders-view.tsx`
   never passed an availability pending flag, which R2's own ruling 4 said in prose two pages
   earlier. The sentence contradicted the ruling above it. **Post-`#435` it is zero.**
2. **`ordering` was never optional.** R2's assembler typed it optional and ran
   `.filter(Boolean)`, which taken literally deleted `ranked by fit` from the owned subtitle
   rather than holding it. The true statement is narrower: the owned lane has no sort *control*,
   so that clause could never go **pending** — not the same as not existing. Retired with the
   assembler.

Both are statements about **ownership**, not about the subtitle, which is why they outlive it.
Their shared shape is this ruling in one line: *a control that does not reach the server has no
state to report, and drawing one for it invents a wait.*

## What must not happen

- **No `RegionLoader`, under any name.** A fourth rack row, a reserved status line, a spinner
  beside the count — all the same component with different padding.
- **No pending form on the result line, and none on the sheet footer.** Ruling 2 is the one an
  implementer is most likely to undo by reflex.
- **No second live region, and no `aria-busy` on the result line.** Two regions exist and both
  have jobs.
- **The crown must not be gated**, and `PENDING_GATE_MS` must not survive by being given a new
  job.
- **The client-side controls must not gain a crown for consistency.** Order in particular looks
  like scope and is not.
- **The participles must not be re-homed.** If a future control reaches the server, it gets the
  crown, and this document is the argument for why that is enough.
