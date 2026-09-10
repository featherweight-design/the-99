# The 99 — Printed name (design handoff, R2)

**Addendum, not a surface.** Two shipped surfaces gain a name they do not have today: the decklist
row on `/decks/[id]` in list and grid view, and the shared card modal.

Source of truth: `docs/superpowers/specs/2026-09-09-printed-name-design.md`. **It was not in the
tree when this was drawn** — this pass is drawn against the four locked decisions as the covering
note states them, and every §6 item it had to assume is listed in `READINESS.md` rather than
answered silently. **Where the spec and this handoff disagree, the spec wins** and these drawings
are what to correct.

`design_handoff_the99_card_surfaces/` is both the structural and the content sibling: it owns the
decklist row, the deck grid tile and the modal this addendum writes into, and its `$` collapse is
the reason the row has no spare pixel left to pay with.

File: `The 99 - Printed Name.dc.html` (canvas — pan/zoom). Read
`DENSITY-the-longer-name.md` for the measured ladder at 320, 390 and 400,
`STATES-printed-name.md` for the matrix, `printed-name · copy strings.ts` for the two new
strings, `READINESS.md` for the §6 assumptions.

**The one-line summary:** *the deck tile caption holds 93px of name — 11px less than the tightest
row and 80px less than the desktop row — and it is the only surface where the spec's own example
clips.*

## R2 — what the audit changed

Four claims in R1 did not survive verification; these three are patched in place and everything else is as drawn.

| # | R1 claimed | The tree says | R2 |
|---|---|---|---|
| **0** *(R3)* | The desktop row gives the name **96px**, making it the tight surface | **Arithmetic error** — the fixed spend was subtracted twice. One subtraction gives **201px / 174px after the count**, matching the drawing's measured 194px | **Re-derived throughout.** The finding survives and moves: **the deck tile caption (93–94px) is the tightest block**, and the only place the canonical example clips |
| **1** | `grid-view.tsx` clamps the caption to two lines, so the tile is the generous case | **Single-line truncate** — `deck-card-tile.tsx:186`, `collection/grid-view.tsx:88`. The only two-line clamp is `suggestion-tile.tsx:296`, a different surface | **The tile is the tightest surface, not the roomiest.** Ruled as a second single-line ladder — **no clamp added.** See call 3 |
| **2** | A hover tooltip is rejected, and the deck tile does not change | The deck tile **already ships `title={card.name}`** (`deck-card-tile.tsx:188`) | **Dropped, and replaced with `aria-label`.** New ledger item — the tile does change. See call 4 |
| **3** | Per-face printed name on a two-faced card is an open §6 gap | still open | **Ruled: front face on rows and tiles, both faces in the modal.** See call 5 |

**Corrections adopted from the audit, not re-asserted below:** the deck row and tile **do** need a
printing join (`lib/decks/read.ts:196-254` is oracle-only) — ledger item 5 now says so plainly;
#467's truncation is on the Add panel, not `decklist-row.tsx`, so there is **no branch to delete**;
`flex-auto` stays over `flex:1` because every sibling has been `flex-none` since #354, which
already delivers call 2's outcome; the modal field is labelled **Set**, not Printing, and still
names set and number, so the one-word `oracle` label stands. And the desktop row figures are
ceilings — they omit the AutoTag and the provenance mark — noted where they appear.

## The four locked decisions, as drawn

Not re-opened. Recorded because each one has a consequence this handoff had to draw.

1. **The displayed name follows `resolvedPrinting()`** — the same printing the art already comes
   from. Consequence: **no new query and no new prop plumbing.** Every surface that shows the art
   already knows which printing it is showing; the name comes off the object that is already there.
2. **A card you do not own keeps its oracle name.** Drawn as its own row state. There is no printing
   in hand to print a name, and inventing one would be the app asserting a printing the player does
   not have.
3. **Rows and tiles show the printed name alone.** No parenthetical, no second line, no marker.
   Consequence, stated because call 2 depends on it: **a truncated printed name has no fallback on
   that surface**, which is why the ladder is measured rather than estimated.
4. **The modal is the only place the oracle name survives on screen.** Consequence: the modal is
   also the recovery path for every truncation this addendum permits — and the name is the modal's
   own trigger, one tap from the row that clipped it.

## The two calls

| # | Question | Called |
|---|---|---|
| **1** | The modal's oracle-name line — size, weight, placement | **Between the title and the type line.** Body face 13.5px desktop / 13px phone, weight 400, `--fg-body`, no italic, with a mono 10.5px `--fg-faint` label reading `oracle`. Gap 5/6px to the title, 10px to the type line. **Absent, not blank, when there is no printed name.** |
| **2** | What gives when the name is too long for a row | **The name gives — on every surface, by one rule, and no field ever disappears.** The name block is the only shrinking child; the count rides inside it at `flex-none`. **Not a phone special case:** desktop is the tighter row, and the tile caption is tighter still. |
| **3** *(R2)* | The tile caption has no truncation ruling and no clamp | **No clamp. A second single-line ladder, and the ✕ leaves the caption line on the deck tile.** Equal-height tiles are load-bearing; a data-dependent caption height is not worth 12 characters. |
| **4** *(R2)* | The shipped `title={card.name}` on the deck tile | **Dropped.** Replaced by `aria-label` carrying the full printed name — the same rule the row got. |
| **5** *(R2)* | Per-face printed name on a two-faced card | **Rows and tiles show the front face's printed name alone; the modal title carries the full `printed // printed` string.** The shipped `//` layout mark keeps doing the work of saying there is a back. |

### 1 · The oracle-name line

**Placement: above the type line.** The type line *describes* the card; the oracle name *identifies*
it, and identity belongs beside identity. The name pair is also the thing that just changed, so a
reader resolves *which card is this* in one movement and only then reads what it does. Putting the
oracle name after the type line interleaves two answers to two different questions.

**The gaps carry the grouping, not a rule or a container.** 5px phone / 6px desktop from the title
to the oracle line, **10px** from the oracle line to the type line. The tighter gap is what makes
the two names read as one unit; the looser one keeps the type line a separate fact. No divider, no
indent, no background — a two-line header does not need furniture.

**Size and weight: 13.5px desktop / 13px phone, weight 400, body face.** The title is the theme's
display face at 29/22px, so nothing at 13.5px in Plex Sans competes with it — which is the point.
**The printed name is the card's name here; the oracle name is a gloss on it.** Ink is
`--fg-body`, one step brighter than the type line's `--fg-muted`, because a name outranks a type;
it measures 8.77:1 on `--surface` in every theme. **No italic** — italic is the modal's
reminder-text convention, and reusing it would make a name look like rules flavour.

**One label word, and it is mono lowercase.** Two bare names stacked is a puzzle: the reader cannot
tell which is authoritative or why a second one is being shown. `oracle` at 10.5px `--fg-faint`
settles it in 38px on a line with room, and mono-lowercase-as-field-label is the shipped register
(`no number · ×1`, `SLD · 2208`). **It can be one word because the modal's meta grid already
carries a `Set` field** naming the set and the collector number — the explanation is eleven
lines below and was there before this addendum.

**The line does not render when the printing prints its own name.** No label, no placeholder, no
reserved height; the type line returns to its shipped 6px and the header is byte-identical to today.
A reserved empty line would spend 23px on every ordinary card to make the ordinary case look
incomplete. **This is the state to regression-test**, because it is every card but a handful.

**Three things the header does not do.** It does not move `aria-labelledby` — the printed name is
the title and the title is the label. It does not link the oracle name anywhere. It does not repeat
the printed name inside the printing field.

### 2 · What gives — and the finding that reframes the question

**The brief offers the phone widths as the case, because #467 shipped a truncation there. Measured,
that is the wrong width — and post-audit, #467's truncation turns out not to be on this row at all
(it is on the Add panel). The measurement is what matters, and it holds.**

**R3 — these figures were re-derived after the audit; R1's were wrong.** R1 subtracted the row's
fixed spend twice and reported a 96px desktop name block. One subtraction from one usable width
gives:

- **400px desktop:** name block **201px**, **174px** after the count — about **27 characters**.
- **390px phone:** **202px** / **175px** — about 30–34 characters.
- **320px phone:** **132px** / **105px** — about **18–22 characters**.
- **deck tile caption:** **94px** at 148, **93px** at 159 — about **16–17 characters**.

`Battle of Olympus` measures 108px. **It fits on every row and clips on the deck tile at both
widths — the only surface where it clips at all.** So the finding holds and moves: the tight surface
is the tile, not a row, and the ranking is not width-monotonic — **320 with a count (105px) is
tighter than the 400px desktop row (174px)**, because the phone row spends 44px on a touch-target ✕
out of a much smaller budget. The surface to design for is the one with the least name, not the one
with the fewest pixels.

**#467's instinct was sound and its width was not.** Ruling the phone row was reasonable — 320 *is*
the tight row — but it ruled 390, the roomiest surface on the feature, and its truncation turns out
to sit on the Add panel rather than this row.

**So the name is what gives, on every surface, by one rule.** Truncation is not a phone special
case — it is what happens wherever the block is too narrow, which is the desktop row first and the
tile caption hardest:

> **1 · The name block is the only shrinking child — and on the row it already is.** `flex-auto`
> plus `flex-none` siblings has been the row's shape since **#354**, which delivers this outcome.
> **Keep `flex-auto`; do not swap it for `flex:1`.** The one requirement worth restating is
> `min-width:0`, without which the block will not shrink at all.
> **2 · The count rides inside the name block, after the name, at `flex:none`.** `×2` is never
> what vanishes.
> **3 · No wrap, ever, on a row.** Single line, end ellipsis.
> **4 · The full printed name goes in the row's `aria-label`. Never a `title`.**

**Why the name and not something beside it.** Nothing beside it can pay. The marker is the floor's
own slot (card-rows' FLOOR doc: never empty on an unowned card). The buy tag is *already* a bare
`$` after card-surfaces R2. The cost track is fixed at 40px precisely so adjacent rows align, and
a variable track is the failure `card-search-row`'s fixed slot exists to prevent. The `✕` is at
its target floor. **The row was fully spent before this addendum arrived** — which is also the
honest reason this is not a redesign of the row.

**Why not wrap.** A wrapped name makes one row taller than its neighbours, and card-surfaces already
ruled that row height may change only at a group boundary. Ninety-nine rows with a ragged edge is a
worse read than thirteen characters and an ellipsis. **The tile is refused a wrap too, for a
different reason** — a clamp costs the grid its equal-height read rather than shunting the rows
below it. Same conclusion by a different route, and **one single-line ladder now covers both
surfaces** (call 3).

**Why the count is protected and the name is not.** A row that loses a field stops saying something
it exists to say; a name that loses characters still says most of itself, and the modal — locked 4 —
says the rest one tap away. **A field is binary and a string is graceful.**

### 3 · The tile caption — no clamp, and the ✕ moves off the line

**The audit's finding inverts R1's reasoning, so the ruling changes with it.** The caption is single
line today, and at **93–94px** it is the tightest block on the feature — 11px under the next
surface and 80px under the desktop row's 174px. "The tile gets the more generous behaviour for
free" was true only of a clamp that does not exist.

**No clamp.** Two lines makes caption height depend on the data, and a grid of tiles whose captions
are sometimes one line and sometimes two is either ragged or padded to the worst case on every tile.
**Equal-height tiles are what makes a grid scannable** — that is the whole reason to be in grid view
rather than list view — and buying ~12 characters with the grid's own alignment is a bad trade. A
reserved two-line caption is the same trade paid up front, on every tile in the app.

**Instead, the ✕ leaves the caption line on the deck tile.** It becomes a 32×32 desktop / 44×44
phone control in the **top-left corner of the art block**, opposite the shipped `×2` count chip,
on the same group-hover-on-desktop / always-visible-on-phone rule it has now. That returns the
caption's full width to the name:

| Tile | caption width, R1 | caption width, R2 | chars at 12px |
|---|---|---|---|
| deck tile, 148 desktop | 94 (name + 32 ✕ + gap) | **132** | ~13 → **~19** |
| deck tile, 159 phone | 93 (name + 44 ✕ + gap) | **143** | ~13 → **~20** |
| collection tile, 148 | 132 (no ✕ on this tile) | **132** — unchanged | ~19 |

**This is a change to card-surfaces' territory and it is deliberate.** That handoff put the ✕ in the
caption when the caption held only a name; the printed name makes the caption the tile's tightest
element, and the art block has two free corners. It also makes the deck tile and the collection tile
agree on caption geometry for the first time. **Tiles stay equal-height either way** — the control
moves into a corner of a fixed-ratio art block, so no height changes anywhere. **If it is not
sanctioned, the fallback is the R1 geometry with a single-line ladder at 93–94px and no other
change** — the ruling below holds either way.

**The ladder, either way: single line, end ellipsis, full name in `aria-label`, recovery is the
modal.** Same rule as the row, same reason — and the tile's art block is already the modal's trigger,
so the recovery is a tap on the largest target on the surface.

### 4 · The shipped tooltip

`title={card.name}` on the deck tile is the exact control R1's Rejected list argues against, and it
shipped before either of us looked. **It goes.** A `title` is pointer-only recovery on a
phone-first surface, it fires on a delay the player did not ask for, and it duplicates what the
`aria-label` says properly. **The full printed name moves into `aria-label`** — one rule for the
row and the tile.

### 5 · Two-faced cards

**Rows and tiles show the front face's printed name alone.** A `//` string of unpredictable length
cannot land in a 93px caption or a 105px phone row block, and locked 3 forbids the second line that would
rescue it. The shipped `//` layout mark (card-surfaces ruling 6) already tells the reader there is
a back face, so the front-face name is not a claim that the card has one face — it is the same
abbreviation the surface already makes.

**The modal title carries the full `printed // printed` string**, and the oracle line carries the
full `oracle // oracle` string beneath it. The header is the one place with room for both, which is
locked 4's whole shape: **the modal is where the abbreviation is undone.**

**When only one face is renamed**, both halves still render — `Battle of Olympus // Aftermath` —
because a half-printed pair is exactly the case where showing one name would mislead.

## The other surfaces

**The collection grid tile and the collection row caption are the easy half.** Both already print
the set code beside the name, so the printed name arrives next to the one fact that explains it: a
reader seeing `Battle of Olympus · SLD · 2208` has the answer in the caption. **Nothing is added
to either surface — one string is re-sourced.** And `/collection` lists only what you own, so
locked 2's unowned case cannot occur there by construction.

**The deck grid tile caption is not a string swap** — it is call 3, and it is the tightest block on
the feature. Single line, end ellipsis, `✕` moved to the art corner, `title` removed.

## Rejected

- **A parenthetical on the row** (`Battle of Olympus (World at War)`). Doubles the widest field on
  the tightest surface to answer a question the modal answers in one tap. Locked 3 forbids it; the
  measurement agrees.
- **A marker glyph meaning "this is a printing's name".** Card-surfaces spent a whole ruling keeping
  the row to one small mark; this would be a second 7–9px shape meaning something unrelated a few
  pixels from the ownership dot. An unfamiliar name is not an error state.
- **A hover tooltip carrying the full name.** Pointer-only recovery on a phone-first surface, on a
  delay, duplicating the `aria-label`. **R2: this one is not hypothetical — it ships on the deck
  tile today (`deck-card-tile.tsx:188`) and R2 removes it.**
- **A two-line caption clamp on the tile.** *R2.* Makes caption height data-dependent and costs the
  grid its equal-height read, to buy ~12 characters. Reserving two lines up front pays the same cost
  on every tile in the app.
- **The full `//` string on a row or tile.** *R2.* Unpredictable length in the tightest block on
  the surface. Front face on rows and tiles; both faces in the modal.
- **Wrapping the name on a row.** See above.
- **Dropping the count to buy name width.** 27px, and it costs the row a fact.
- **A reserved empty oracle line.** 23px per ordinary card, to make the ordinary case look
  incomplete. Absent, not blank.
- **The oracle name below the type line.** Interleaves two questions.
- **Italic for the oracle name.** That is reminder text's convention.
- **A phone-only truncation rule.** The phone row is the roomiest surface on the feature; a rule
  that fires only there would leave the two tightest ones — the tile caption and the desktop row —
  unruled.
- **A second query for the printed name.** Locked 1 makes it free.

## Engineering ledger

1. **`decklist-row.tsx`** — name string comes from `resolvedPrinting()` instead of the oracle
   row. **The full printed name joins the row's `aria-label`.** *R2: no shrink-order work and no
   branch to delete — `flex-auto` plus `flex-none` siblings since #354 already gives call 2's
   outcome, and #467's truncation lives on the Add panel, which item 6 scopes out. Call 2 is
   therefore a ruling that ratifies the row's behaviour and extends it to the tile, not a diff.*
2. **`deck-card-tile.tsx`** — *R2, and it is no longer a string swap.* Remove `title={card.name}`
   (line 188); add `aria-label` carrying the full printed name; move the ✕ from the caption line to
   the art block's top-left corner (call 3). Caption stays **single line** — no clamp is added, and
   `suggestion-tile.tsx` is not a precedent to copy.
3. **The card modal header** — one new line between the title and the type line, rendered only when
   the printed name differs from the oracle name. `aria-labelledby` unchanged. Two new strings, both
   in `printed-name · copy strings.ts`.
4. **`collection/grid-view.tsx` and `collection/rows-view.tsx`** — string swap only.
5. **The deck row and tile need a printing join.** *R2 — R1's "no new query" was wrong here.*
   `lib/decks/read.ts:196-254` reads oracle-only, so `resolvedPrinting()` has nothing to resolve
   on this route and the join is real work. **The modal and both collection surfaces are still
   free** — they already resolve a printing to show the art. Locked 1 keeps the *shape* cheap: one
   join, no new prop threading, no second call per card.
6. **Nothing in `card-search-row`, `unresolved-row`, `update-diff-row` or `synergy-row`
   changes.** Search shows printings the player is choosing between and already names the set;
   the other three audit oracle cards. Same rule shape as card-surfaces parity Q2: the printed name
   goes where the player is looking at *their* copy.
