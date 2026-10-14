# The 99 — Decks over 99 (design handoff, R1)

**Amendment 3 of four.** No new brief: this amends `design/design_handoff_the99_decks/` (the
deck card and the builder spine) and inherits the deck-import handoff's rule about the status
vocabulary, which it then breaks on purpose — see decision 3.

File: `The 99 - Decks Over 99.dc.html` (canvas — pan/zoom). Read `STATES-over-99.md` for the
state matrix, `over-99 · copy strings.ts` for production copy.

**The one-line summary:** *over is a stage of building, so it is drawn in the building colour.*
The count keeps its denominator and gains `+5`. The bar re-scales to `max(99, built)` so the
overflow is drawn to scale in amber beside a still-green 99. The pill gains a fifth value,
`Over`, and `Complete` narrows to exactly 99.

**No `--danger`, no `role="alert"`, no band, no disabled control, no confirm step, no ceiling.**

---

## The three changes

| # | Element | Shipped | Called |
|---|---|---|---|
| 1 | Count | `104` / `104 / 99` | `104 / 99` **+5**, built figure in `--warning` |
| 2 | Bar | `Math.min(100, built/99)`, one fill, `--success` at ≥99 | denominator `max(99, built)`: `99` in `--success` + remainder in `--warning`, 1px `--bg` seam |
| 3 | Pill | `Complete` at `built >= 99` | **`Over`** at `built > 99`; `Complete`/`Playable` narrow to `=== 99` |
| + | Spine | — | one trim line under the owned/to-buy caption |
| + | Deck card | — | `5 to cut`, in the unresolved marker's slot and type |

Under 99, every surface is byte-identical to what ships.

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A1 | The count at 64 / 99 / 104 | ✓ | ✓ (B3) |
| A2 | The bar at 64 / 99 / 104 / 137 | ✓ | ✓ (B3) |
| A3 | The pill scale, all five values with their predicates | ✓ | — |
| B1 | Deck card at 99/99 — the state above the change | ✓ | — |
| B2 | Deck card at 104, with `5 to cut` | ✓ | ✓ |
| C1 | Builder spine at 104, trim line placed | ✓ | ✓ |
| C2 | Trimming back — the reveal at 99, unsuppressed | ✓ | — (shipped band) |
| D | The lifted cap's blast radius: validation, dead copy, availability, export, ceiling, a11y | ✓ | ✓ |

---

## Decisions log

### 1. The bar's **denominator becomes the total**, and that is what makes the cap safe to lift
Four shapes were on the table:

- **Pin at 100% and recolour the whole fill amber.** Cheapest, and it throws away the only
  quantity the player needs. 104 and 137 look identical.
- **Let the fill overflow the track.** A 104% width inside `overflow: hidden` is 100%; without
  the hidden it breaks the card. Nothing to draw.
- **A second track below the first.** Two tracks for one number, at 6px each.
- **Re-scale the denominator to `max(99, built)`.** **Chosen.** The 99 stays `--success`
  because ninety-nine of those cards *are* the deck; the remainder is `--warning` and it is
  literally the trim, at scale. At 104 that is a 4.8% amber cap; at 137 it is 27.7%.

The re-scaling is also what removes the need for a numeric ceiling (decision 6): the bar
cannot overflow its track at any total, so an unbounded cap has no drawing problem.

**The 1px `--bg` seam at the boundary is the only new pixel.** At 6px tall, `--success` and
`--warning` abutting read as one warm gradient; the seam makes them two facts.

### 2. The count keeps `/ 99`
`104 / 104` would be the deck congratulating itself for the wrong number. 99 is a rule of the
format, not a target the deck outgrew. So the denominator holds and the built figure takes
`--warning`, with `+5` beside it as a **second figure rather than a recolour** — a player
should not have to subtract at a glance, and a lone amber `104` next to a `99` is exactly that
subtraction.

**The phone deck card must stop hiding `/ 99`.** It hides it today because the bar carries the
denominator visually, which is true only while the bar cannot overflow. A bare `104` over a
nearly-full bar reads as a big healthy deck. `/ 99` returns at `built > 99` only, and `+5`
drops rather than shrinks — `5 to cut` under the bar says it in words at the width where words
fit better than three figures.

### 3. A **fifth pill value**, `Over` — and why that is cheap here
The deck-import handoff refused a fifth pill value in as many words: threading a new input
through the server list and the optimistic client list "would multiply the surfaces that can
disagree mid-mutation". That reasoning was about `unresolvedCount`, which is **a new argument**.

`statusPill()` already takes `built`. `Over` is one branch above the existing first test, on an
argument that is already there, derived from the same number the pill has always been derived
from. There is no new plumbing and no new way for two surfaces to disagree.

**The alternative — falling back to `Building` — was rejected as a lie of omission.** A player
at 104 is not building toward anything; they are cutting. And `Building` at 104 sits next to a
`99 / 99` deck reading `Complete`, which makes the bigger deck look less finished in a way
that says nothing about why.

`Over` wears **Building's exact treatment**: `--warning`, the 13% wash, the same geometry.
Playable and Complete already share `--success`, so a colour shared between two values is the
vocabulary's own pattern, and this is the honest pair — Building and Over are the two states
with work left in them.

**`Complete` and `Playable` narrow to `built === 99`.** Without that, 104 with everything owned
still reads `Complete`, and the pill is the one thing on `/decks` a player scans.

### 4. The trim line goes **in the spine's centre column**, not in a `RollupBands` band
The spine already has a place for full-width bands below it, and this line does not belong
there. `RollupBands` is the availability system: claims about your *collection*, red-left-ruled
because two decks wanting one card is a genuine conflict with another deck.

Being over 99 is a claim about **this deck's arithmetic**. It belongs beside the arithmetic —
directly under the `96 owned · 8 to buy` caption, which is the caption that splits the same
figure. Putting it in a band would make it the loudest element on a page where nothing is
wrong, and would put it in the same visual family as a real conflict.

The line reads:

> **Five over the ninety-nine.** Cut five and it is legal. Building long and trimming back is
> a normal way to get there.

The third clause is doing real work: it is the sentence that tells a first-time overfiller they
have not broken anything. At 390px it drops (the same shortening rule `RollupBands` applies
when it stacks two lines) and the first two clauses stay.

### 5. `5 to cut` on the deck card reuses the unresolved marker exactly
Same slot (below the bar), same type (mono 10 / 10.5px), same colour (`--warning`), same
6 / 7px offset. **The two can coexist and stack over-first**, because a 104-card import with
two unnamed lines is one paste away and both lines are true. Neither is a status and neither
becomes one.

### 6. **No numeric ceiling**
No 120, no 200, no "sane maximum". A ceiling needs a number nobody can defend, and the case it
would guard against — a 400-line collection export pasted into a deck — is already bounded by
the import's byte caps and, past those, draws correctly: 25% green against 75% amber is an
accurate picture of what just happened.

### 7. Only a human add and an import can exceed 99
`add-validation.ts`'s `deck-full` guard goes. **Every other stop stays**: the 68-card fill, the
two last-31 fill controls and every suggestion path stop at 99 exactly as they do now, because
the app cannot know which five cards the player meant to cut. `planLastSlots` needs no edit at
all — `openSlots <= 0` already returns an empty plan, so at 104 the last-31 strip unmounts on
its own arithmetic.

### 8. `MATURE_DECK_SIZE` stays `>= 99` — deliberately not narrowed to match the pill
An over deck claims your collection **hard**, which is correct: 104 sleeved cards are 104 cards
another deck cannot have. The pill is about legality; `MATURE_DECK_SIZE` is about physical
cards. Narrowing it to `=== 99` for symmetry would silently downgrade a 104-card deck's claims
to "soft" and make its cards look available.

### 9. Export stays enabled, and gains one line
Export is disabled at `built === 0` and nowhere else. A 104-card list exports as 104 cards —
the player is very likely pasting it somewhere to do the cutting. One sentence is added inside
the export dialog when the deck is over: *"This list is 104 cards. Five over what a Commander
deck can hold."* Stating a fact where the list leaves the app is not the same as refusing to
let it leave.

### 10. The completion reveal needs no new suppression, and gains a good one
`shouldCelebrate` is untouched. Two consequences fall out of `Complete === exactly 99`:

- **A deck that arrives over 99 never celebrates** — not by a new rule, but because it is not
  Complete. That closes the #42 celebration collision from a third direction for free.
- **Cutting 104 → 99 by hand fires the reveal**, and it should. The status flips on a removal
  the player performed: not an import arrival, not a fill. The three existing suppressions
  stay exactly as they are.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new
component, no new band, no new modal.**

| Component | Spec |
|---|---|
| **Built figure, over** | Mono 600, 13px / 15px (card), 14px / 20px (spine). Colour `--warning`. `/ 99` stays `--fg-faint` weight 400. |
| **`+5`** | Mono 600, same size as the figure, `--warning`, 6px after the denominator. Desktop card + both spines. Absent on the phone deck card. |
| **`/ 99` on the phone card** | Shipped: hidden. Called: present **only** when `built > 99`. |
| **Progress bar (over)** | Track unchanged (`--elevated`, 6 / 7px, radius 999px, `overflow:hidden`). Two children in a flex row: `99 / built` at `--success`, remainder at `--warning` with `box-shadow: inset 1px 0 0 var(--bg)`. Radius on the container only. |
| **Progress bar (≤ 99)** | Unchanged, including `Math.min`. |
| **`Over` pill** | `Building`'s values verbatim: mono 10px, `letter-spacing .06em`, radius 999px, padding `4px 9px` / `5px 10px`, colour `--warning`, background `color-mix(in oklab, var(--warning) 13%, transparent)`. |
| **`5 to cut` (deck card)** | Mono 10 / 10.5px `--warning`, `margin-top 6 / 7px`. The unresolved marker's slot and type. Stacks above the unresolved line when both fire. |
| **Trim line (spine)** | 12 / 12.5px, `--fg-body`, `line-height 1.5`, `margin-top 8px`, `max-width 520px` desktop / centred phone. Lead clause bold `--warning`. In the centre column, under the owned/to-buy caption. **Not** a band. |
| **Export dialog note** | The dialog's existing meta type, `--fg-muted`. One line, present only when over. |
| **`RollupBands`** | **Untouched.** |

## Notes for engineering

- **`src/lib/decks/status.ts`:** add `"Over"` to `StatusPill`; one branch — `if (args.built > 99)
  return "Over";` — above the `built === 0` test is wrong (0 is not over), so put it directly
  after it. `built < 99` becomes unreachable-safe as written but should read `built !== 99` for
  the reader. Four existing tests still pass; add two.
- **`src/lib/decks/add-validation.ts:42`:** delete the `deck-full` guard.
- **`src/lib/decks/mutation-result.ts:18`:** delete the `deck-full` message and the union
  member; delete **both** cap assertions — `mutation-result.test.ts` and
  `add-validation.test.ts:66` ("rejects any card when deck is already at 99").
  **Deleted, not reworded.**
- **`src/components/decks/deck-card.tsx`:** `progressFillColor` becomes a two-segment render;
  `fillPercent` becomes `99 / Math.max(99, built)`; `aria-valuemax` becomes
  `Math.max(99, deck.built)`; `aria-label` takes the over form; the `/ 99` span loses
  `hidden md:inline` behind an `over` condition; `+5` and `5 to cut` are new nodes.
- **`src/components/decks/builder-spine.tsx`:** the same bar change on `pct`, plus the trim
  line in the centre column. The fill's three-way ternary
  (`>= 99 ? success : >= 55 ? warning : danger`) becomes a two-segment branch at `> 99`.
- **`src/components/decks/export-dialog.tsx`:** one conditional line.
- **`src/lib/decks/availability.ts`:** **do not touch.** `MATURE_DECK_SIZE >= 99` is correct
  for an over deck (decision 8).
- **`src/lib/decks/celebration.ts`:** **do not touch.** Decision 10 falls out of `statusPill`.
- **`src/lib/decks/last-slots.ts`, `fill.ts`, `suggest.ts`:** untouched. All three already
  stop at 99 and `openSlots <= 0` already yields an empty plan.
- **Optimistic lists:** the builder's optimistic counts feed the spine, so an add that crosses
  99 must move the pill, the bar and the trim line in the same frame. They are all derived from
  `counts.built`, so this is free — but it is the thing to check first in review.
- **Copy** lives in `src/lib/copy/decks-builder.ts` — see `over-99 · copy strings.ts`. Two
  strings are **deleted** (the cap rejection and its aria); everything else is additive.

## Gap report

1. **`Over` is a fifth value in a vocabulary that was closed for a reason.** The reason does
   not apply (decision 3), but the next person to want a sixth will cite this precedent. The
   test is the one used here: is the input already an argument to `statusPill`?
2. **Nothing walks the player to the cards to cut.** The deck says "cut five" and then leaves
   them to scroll. A "5 over — review these" affordance filtering the decklist to the last five
   added is the obvious next feature and is deliberately not in this amendment: the last five
   added are almost never the five a player wants to cut.
3. **`toBuyCount` at 104 includes cards that will be cut.** `96 owned · 8 to buy` on an over
   deck is asking the player to buy cards for slots that do not exist. Not drawn differently —
   the figures are honest about the current list — but the Shopping view will offer eight cards
   for a deck that needs to lose five, and that is a real oddity.
4. **Two amber signals now share a surface.** `5 to cut` and the unresolved-rows marker are the
   same type at the same size in the same slot, distinguished only by wording. Drawn as a
   deliberate stack; if the audit finds it muddy, the unresolved line is the one that should
   move, because it is about lines rather than cards.
5. **`137` is drawn but not designed for.** The bar re-scales correctly and the copy still
   reads ("Thirty-eight over the ninety-nine"), but nobody has thought about what a 400-card
   "deck" should do to the rest of the builder — the decklist, the role strip, the Consider
   panel. Gap 6 of the reimport amendment is the same hole from the other side.
6. **The export note is the only place the format's rule is stated as a rule.** If Product
   wants the app to be firmer about legality, the export dialog is where that argument lands —
   not the deck card.
