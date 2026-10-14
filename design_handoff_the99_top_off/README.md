# The 99 — Top off the last 31 (design handoff, R1)

**R3 — one call: the ledger meets the shipped auto lifecycle.** `clear-auto.tsx` is three controls
(the kept note, the bulk keep, the sweep) with a per-row keep beside them, and **keeping clears a
card's auto flag**. R2 ruled on one of the three. **The call: keeping is a graduation out of
provenance, not a third reversal — so a kept card leaves its pass**, the same exit R2 already wrote
for a card removed by hand. Both R2 calls are taken and #361 is confirmed clean. See §3c.

**R2 — the two calls the R1 audit sent back, both taken out loud.** #359's scope was quoted back to
Design and it asks for a schema change; R1 declined it and R2 takes it (§3b). The sticky bar R1
leaned on is not on this route; R2 gives the commit quick-add's slot (§The constraint). Everything
else in R1 stands and the audit found no other Design-owned gap.

**#360**, folding **#359** (undo and provenance) and **#361** (the two CTAs read as out of place),
both held closed pending this. One surface: the deck builder's `LastSlotsStrip` on `/decks/[id]`.
`design_handoff_the99_deck_tuning/` is the structural sibling — same folder convention, same
copy-export shape, same `STATES-*.md`-alongside-the-canvas shape, same READINESS format.

**⚠ What Design could not read, stated once and then worked around.**

- **#359's scope arrived with the R1 audit and is now honoured in full.** It reads: *record
  provenance per fill so that a top-off can be reversed independently of the seed; surface the
  distinction in the UI, so the user can see which cards came from which pass before deciding;
  schema change.* All three clauses are taken — see §3b. It is the only one of the three issues
  whose own words Design has seen, and it overturned an R1 ruling.
- **#360 and #361 are still summaries.** #360's four scope items are the prompt's and are treated
  as the questions, per the prompt's framing; #361 is one line. **If #361 carries a constraint the
  prompt did not carry, the same correction is still open there** — it is now the only place in
  this handoff where that risk remains.
- **The design table is not here either.** `docs/superpowers/design-tables/synergy-discovery.md` is
  absent (this project carries only `appshell.md`) — **but its content was located.** §FillControlA
  and §FillControlB are specified in full, with all eleven states, both geometries and every
  string, in `design_handoff_the99_synergy_discovery/STATES-fill-controls.md` and its README's
  component table. That is the artefact this pass replaces, and it is **quoted, not guessed**.
- **The current row standards WERE readable, and the row is built to them.** `design_handoff_the99_card_rows/`
  (the parity floor, the shared dot, the canonical metrics) and `design_handoff_the99_card_surfaces/`
  (the cost-pip track, the buy tag's two densities) are both in this project and are treated as
  binding. See **§The candidate row** below.
- **Four components are absent.** `src/components/decks/last-slots-strip.tsx`,
  `builder-spine.tsx`, `src/components/ui/button.tsx` and the shopping row — this project holds only
  `src/components/shell/nav.tsx`. Strip, row and toolbar geometry is traced from
  `design_handoff_the99_synergy_discovery/The 99 - Synergy Discovery.dc.html`; the buy tag from
  `design_handoff_the99_card_surfaces/` (`--warning` ink, `--accent-shadow` hairline, radius,
  position — all unchanged, and the collapse deliberately declined, see below); the tick toggle
  from the synergy row's `+ / ✓`; `PrimaryButton` / `GhostButton` from their spec across five prior
  handoffs (brass outline, `1px --border-strong` ghost, 44px phone). **No new CTA is drawn.**
  **If the components disagree, they win** and the component table below is what to correct.
- **The 99/99 figure the fill moves** is `builder-spine.tsx`. Not redrawn here and not changed by
  this pass: it reads `built`, and this pass changes *when* `built` changes, not what it is.

File: `The 99 - Top Off.dc.html` (canvas — pan/zoom). Read `STATES-top-off.md` for the
panel's twenty states, the ledger's fourteen and the mark's four, `LONG-LIST-thirty-one-rows.md` for the
390px constraint, `top-off · copy strings.ts` for production copy, `READINESS.md` for the verdict.

**The one-line summary:** *a control that places 31 cards should ask first.*

---

## The three issues are one defect

The shipped strip is two buttons that each commit up to 31 cards on one tap, and the only route
back is a sweep that removes 92 of them. Read together, the three open issues say the same thing
from three directions:

- **#360** — you cannot see what a fill will do before it does it.
- **#359** — you cannot take a fill back at the scale you made it.
- **#361** — the two controls look wrong where they are.

**They are one defect: the fill is an act where it should be a proposal.** So the fix is one
change, and each issue closes as a consequence of it rather than as a separate feature.

> **The strip stops adding cards and starts opening a list.**

## The four calls

| # | Scope item | Called |
|---|---|---|
| 1 | Show the candidate cards before committing, with selective accept | **A ranked list, in the strip's own place, in the page.** Not a modal, not a tray, not a route. The strip's control changes from a verb to a door — `Choose the last 31` — and the list is the shipped synergy row with a tick box. |
| 2 | Support a mixed fill from both pools | **One list, both pools, interleaved by synergy, and no pool control at all.** Owned arrives ticked, unowned arrives unticked, and you cannot tick past the open slots. The mix is whatever the player ticks. |
| 3 | #359 undo/provenance, and #361's two CTAs | **#361 closes by deletion**: one door replaces two, and the `--warning` count moves off a button face onto the money. **#359 goes in the provenance line**, which is already where *where did this come from* lives: one clause, one ghost button, batch-scoped, no time window. |
| 4 | The panel mid-fill | **Partly accepted is the ordinary state.** The strip returns recounted (`The last 4`); the list remembers its declines and reopens with them. **Stopping short by choice and running out of cards are two different sentences** and never share one. |

### 1 · The list opens where the buttons were

The candidates render **in the strip, in the document flow, above the decklist they are about**.
Nothing overlays anything, and the page does not change route or grow a second scroll surface.

**Why not a modal or a tray:** this product has neither, by repeated ruling. And the specific
reason here is stronger than consistency — the decision being made is *which of these 38 cards join
these 68*, and a modal covers the 68. The list belongs on top of the thing it is about, in the
reading order that already exists: provenance line (why the deck looks like this) → the strip (what
is still open) → the decklist (what is in it).

**The control is a disclosure, not a dialog.** `aria-expanded` / `aria-controls`, the shipped
`CoverageDisclosure` contract, and it **does not steal focus**: opening a list of 38 rows and
throwing the cursor into row one is how a keyboard user loses their place. The list is simply next.

**Selective accept is a tick per row and one commit.** The row is the shipped synergy row —
ownership dot, name, type line, signed synergy in points, unsigned inclusion, under a header row —
**verbatim**, with the `+ / ✓` toggle moved from the row's end to its start. It moves because here
the toggle selects *into the deck* rather than into a build, and the reader is scanning a column of
decisions rather than a column of cards: the ticks need to line up.

**Nothing is added until the commit.** The primary states what it will place and what that costs,
before the tap: `Add 27 cards` · `95 of 99 when added · 3 to buy · $42.80`. That is the shipped
apply-plus-verdict pattern read forwards.

### 2 · The mixed fill needs no control, and that is the point

The two shipped CTAs were **not two actions**. Both add cards ranked by synergy to the same slots;
the only difference is whether the app was allowed to consider cards the player has not bought.
That is an **ownership filter**, and this product has an explicit locked ruling that ownership is a
label and never a filter, ranking input, or suppressor. The shipped pair put the refused filter in
the loudest place on the surface, and put a spending decision behind one tap.

So the list is **every legal candidate EDHREC ranks** — in colour, not in the deck, singleton-legal
— in one ranking, and ownership is a dot and a price tag on the row, exactly as it is everywhere
else in the app.

**The preselection carries the old behaviour.** The list arrives with every owned candidate ticked.
That *is* `Fill {n} from my collection`, expressed as a default instead of a commitment: same
cards, same count, same one gesture to accept it (`Add 24 cards`), and now visible first. Ticking an
unowned row *is* `Top up with cards to buy`. Neither needs a name.

**The arithmetic is the interface.** 38 candidates, 31 slots: **you cannot tick more than the slots
you have.** With 24 owned ticked, 7 slots are free, so the seven best unowned cards are one tap
each. Want an eighth? Untick something you own. **The trade is the design** — the player is not
choosing between two pools, they are spending 31 slots on 38 cards with the ranking in front of
them.

At the cap the unticked boxes go **inert, not hidden**, with one mono line saying why. Nothing
leaves a ranked list because the player ran out of room; the row is still evidence about the
commander.

**The money is said twice at most and never on a button.** Each unowned row carries the full
shipped buy tag; the commit row states one total in `--warning`. No basket, no per-row subtotal, no
cart. Applying puts the unowned cards on the shopping list, which is the surface that owns money.

**The buy tag keeps its figure at both widths** — the one place this pass declines a shipped call.
The card-surfaces pass collapses `buy $12.40` to a bare `$` on the All tab, which was right there:
it bought name width on a list of cards already committed to, where *whether* to buy is the only
live question. **Here the figure is the question.** So the tag stays whole and the phone row breaks
to two lines to pay for it. Same atom, same ink, same hairline — uncollapsed.

### The candidate row — built to card-row parity, plus the cost track

The row is **the parity shell, not a new row**, and every figure below is quoted from the two
standards rather than traced from the older synergy canvas.

| Property | Value | From |
|---|---|---|
| min-height | **34px desktop / 52px phone** (the meta-line height) | card-rows Q4, as amended by card-surfaces parity 3/4 |
| radius / padding / gap | **7px both widths · 9px desktop, 8 left–4 right phone · 10/9** | card-rows Q4 |
| name | **13.5px desktop / 12.5px phone, `--fg`**, `flex-auto` (never `flex-1`) | card-rows Q4; the `flex-auto` reason is `decklist-row`'s own comment |
| background | `--surface` on `1px --border` — the rows sit **on** the strip, which is the `--surface-rail` | card-rows Q4 |
| ticked | fill `--elevated-hover`, border `--accent-shadow` | the shipped selected-row treatment |

**The floor is carried, both halves.** Name, and **one availability slot holding exactly one of
`BuyTag` or `AvailabilityMarker`** — never both, never zero on a row with an oracle id:

| Ownership | Slot |
|---|---|
| Own none | `BuyTag`, **full form at both widths** (the All-tab collapse to `$` is declined here — see below) |
| Own it, every copy sleeved | `AvailabilityMarker`, count-only — `◆ none free` |
| Own it, copies spare | **silent.** The marker returns `null` at `free`; nothing to say is not nothing to show |

**The middle case is the state this list needed and the shipped strip could not have had.** Under
the old one-tap owned fill, a card whose only copy is sleeved in another deck was placed silently,
and the player found out when two decks disagreed. On a review list it is a fact on the row before
the tap — and **it does not gate the tick**: ownership is a label, and so is availability.

**The dot is the shared `OwnershipDot`, dashed for unowned.** Filled `--success` owned, filled
`--avail-hard-fg` committed, **`1px dashed --fg-locked` unowned** — not the solid hollow ring the
older canvas drew, which card-rows Q3 refuses by name because a solid hollow ring reads as a state
of something *present*. Committed is filled because a committed card *is* owned; hollow stays
reserved for absence.

**The cost track is the shipped 40px one, and this row takes it deliberately against parity Q2's
refusal.** 12px pips, 8px mono numeral, gap 3px, fixed 40px right-aligned track, **shingling from
three at −5px, capped at five slots**, and at six or more symbols four fanned pips plus the generic
`+N` pip. Position: **between the name block and the availability slot**, which is the only place
adjacent rows' pips land on one vertical line — and the slot is fixed at **84px** for the same
reason `card-search-row` fixes its own.

Parity Q2 answered *no* to pips on `synergy-row`, and this row is that row's shell. **The refusal is
honoured on its own rule, not overruled:** *cost pips go where the reader is choosing or paying,
never where they are auditing.* Q2's *no* was about the commander route's synergy panel, where the
reader is reading a ranking and the meta line is holding a slot open for the marker. **Here the same
shell is doing `card-search-row`'s job** — thirty-eight near-identical candidates, and what each
costs to cast is the differentiator — which is the exact case Q2 says pips belong to, and the case
the search row already ships them for. If eng or the audit reads Q2 as a blanket ban on the shell
rather than a rule about the reader, **this is the one call in the handoff to overturn**, and it
costs the 40px track and nothing else.

**The type line paid for the track.** The older drawing carried `creature · 3` — a hand-rolled mana
value in prose, which is precisely the drift the pip track replaces, and the floor refuses the type
line as floor anyway ("the decklist does not need it at all because you chose the card"). Dropping
it returns 150px, and the track spends 40.

**No pip contrast problem is invented.** `--b` is `#1E1B1A` against a `--surface` row, which the
shipped pips already solve with R5's ring rules — unchanged here, and not exercised by a Jeskai
commander.

### 3a · #361 closes by deletion

The pair reads as out of place because it is one action and a filter wearing two verbs. One door
fixes it, and the door **stays brass outline**: `Build this deck` owns solid brass, and reaching 99
is the player's goal rather than the app's. As the only control in the strip it does not need weight
to win a comparison — it needs to not look like a commitment, which an outline does and a fill
does not.

The `--warning` count that sat on the top-up's face moves to the commit row, beside a total. A
number in warning ink now appears only where it is about spending.

**Rejected: keeping both buttons and giving each a review step.** Two doors into two lists that
differ by a filter, and the mixed fill would have needed a third.
**Rejected: a segmented owned / to-buy header inside the list.** The same filter one level down,
and it hides half the ranking behind a tab.
**Rejected: a "fill it for me" express path beside the door.** That is the shipped defect with a
review step bolted next to it, and everyone would tap the express one.

### 3b · #359 — the schema, taken

**R1 ruled "no schema change" and "no new marker". #359 asks for both in its own words, and R2
takes them.** Design does not get to decline a schema change the issue exists to request — and R1's
argument was wrong on its own terms. **"No time window, ever" cannot be built on client memory.**
Row ids in a page's state die on reload, which is a five-second window with extra steps and a worse
failure mode, because nothing tells the player it closed.

> **A fill is a persisted pass. The provenance line is a ledger of passes. Each line reverses on
> its own, in any order, at any age, after any number of reloads.**

**The seed is a line in the ledger too.** That is the ruling that makes the rest coherent: if a fill
is a pass, the build is the first pass, and pretending otherwise leaves 68 of 95 cards with no
provenance in a table built for provenance. **Its reversal is the sweep**, which is where it already
lives — so the seed line *names* its reversal (`the sweep reverses it`) rather than growing a second
button for it.

**"Before deciding" is `Show these 27`.** The scope asks the player to see which cards came from
which pass *before* reversing one. Tapping it puts a **3px `--accent` left edge** on that pass's rows
in the decklist below — the same mark the provenance box wears, which is why it reads as *belongs to
that line*. It **marks; it does not dim, filter, reorder, collapse or scroll.** The deck stays whole,
because the question is *which of these are those*, not *show me only those*. The ledger line stays
put with its undo beside it: the decision and its evidence are one tap apart and never on separate
screens.

**The row keeps its floor and the tag keeps its text.** `AutoTag` ships unchanged — no pass ordinal,
no second tag — and `Clear all auto` still sweeps every pass at once. **The distinction lives where
the decision lives**, which is the ledger, not 95 rows.

| Scope | Where it lives | New? |
|---|---|---|
| **Not this card** | the decklist row's `✕` | shipped, unchanged |
| **Not that pass** | **a ledger line's `Undo these 27`** — per pass, persisted, no expiry | the addition |
| **Not any of it** | `Clear all auto`, a rule and a row away | shipped, unmoved |
| **Not a reversal at all** | `Keep` / `Keep all` — a **graduation**: the card leaves its pass and the ledger stops claiming it | shipped, unmoved, newly load-bearing |

**Ledger rules:**

- **Ordered oldest-first and never reorders.** The seed is always the top line; a new pass appends.
  Focus lands on the line a commit just created, which only works if lines do not move.
- **An undone pass leaves the ledger entirely.** It placed nothing, so it has nothing to account
  for, and a list of things that did not happen is a history browser.
- **Ordinals are stable and never renumber.** If top-off 1 is undone, the next pass is still 3.
- **A pass recounts to what survives, and names each exit.** `27 cards · 3 now yours, 2 removed
  since` / `Undo these 22` — a pass is a set of rows, not a transaction. **At zero survivors the
  line goes**, whether its cards were swept, removed or kept: nothing was reversed, but nothing is
  outstanding either.
- **No time window, and now that is true.** A line lives until its pass is undone or the sweep
  removes it.

**Rejected: an ordinal on the auto tag (`auto 2`).** A number no row explains, 95 times, to serve a
decision taken in one place.
**Rejected: a per-pass filter chip on the toolbar.** The toolbar filters by ownership, it is not a
history browser, and a chip per pass grows without limit.
**Rejected: keeping the single last-batch clause and simply persisting it.** It answers the reload
but not "independently of the seed", and not "which cards came from which pass".
**Rejected: a toast with an undo link.** It expires, it covers the decklist it is talking about, and
this product has no toast.

### 4 · Mid-fill: partly accepted, partly open

The shipped §7.6 line says *your collection ran out 7 short*. After a selective accept that
sentence is **often false** — the player left rows unticked on purpose — and blaming the collection
for the player's own restraint is the worst sentence this surface could say.

**So there are two lines, and `candidates remaining` is the test.**

- **Above zero** — the strip returns with a recounted heading (`The last 4`) and a caption saying
  how many are still on the list. Neutral, no shortfall language, and the door's note says the list
  reopens where it was left, declines and all.
- **At zero** — the shipped shortfall line prints **unchanged**, keeping the provenance line's
  `--accent` rule and never `--warning`: owning what you own is not an outage. The strip keeps the
  line and loses its control, which is the sweep's shipped behaviour at zero and the one case where
  the strip outlives its own control. Seven visibly open slots need their explanation more than the
  surface needs the tidiness.

**Declines persist in the list.** A declined row collapses to one line in its own slot — `not this
one` + name + `Show it again` — the tuning card's dismissed shape, same words, and **no question
asked**. That is what makes reopening the list a continuation rather than a reset.

**Nothing treats a partly-filled deck as unfinished business.** No banner, no nudge, no tab badge,
and the strip grows no second sentence urging the player on. Four open slots on a 95-card deck is a
deck; the count in the header is the only reminder it gets.

## The constraint: 38 rows at 390px

Full reasoning in `LONG-LIST-thirty-one-rows.md`. The call:

> **The list is the page. One scroll surface, no fixed heights, no nesting. The commit takes the
> quick-add dock's bottom slot, and quick-add stands down while the list is open.**

**R1 leaned on a bar that is not on this route.** `Build this deck` lives at
`commanders/detail.tsx:417-434` and it is **a link, not a commit** — no counts, no money, not on the
builder. The builder's bottom slot is the **quick-add dock** (`builder-shell.tsx:968-982`), in the
strip's own scroll column. R1 refused two pinned elements at 390px and then assumed one that does
not exist.

**So the commit takes that slot, and it is a swap rather than a stack.** The dock and the list are
**the same job** — putting a card in an open slot — and the list is that job done deliberately, with
the ranking, the price and the count in view. A search field for one card is not what a player wants
in the middle of choosing twenty-seven, and a keyboard directly under a 27-card commit is a hazard.

**The swap is legible, not silent:** the dock collapses to one mono line, `Quick-add is back when you
close the list`, for as long as the bar is up — so the affordance is accounted for rather than
vanished, and the bar's height stays close to the dock's, so the page's scrollable area barely
changes when the list opens. Closing or cancelling restores the dock in place, query and focus
intact. **§13's promise holds**: that state has no list open, so quick-add is exactly where it ships.

**Rejected: stacking both bars.** ~150px of a 390×844 viewport, and it puts a text field with a
keyboard directly under a 27-card commit.
**Rejected: an unpinned commit at the list's end.** The count and the money are the whole argument
for a review step; scrolling 38 rows to see what you are about to spend is the shipped defect in
slow motion.

The trap the brief names is caused by the obvious fix — a fixed-height scrolling well gives two
scroll surfaces for one gesture, an unknowable bottom, scroll chaining at the exact moment the
player slows down, and a primary either trapped below the well or carrying a count that is scrolled
away from the rows that changed it. **None of those are length problems; they are all the box.** So
there is no box: 38 rows in the document flow, and **the commit bar takes the quick-add dock's
slot** — carrying the primary, the Cancel, the live count and the money — so the state of the
selection is never scrolled away from the button that commits it and nothing is pinned twice.

The cost — scrolling past up to 38 rows to reach the decklist — is real and **bounded by
arithmetic** (`99 − built`), and `Close the list` in the strip's head collapses the whole thing to
one 44px door. The list is opt-in and opt-out.

**No virtualisation, no pagination, no show-more, no in-list search, no sticky list head, no
jump-to-top.** Each is argued in the sidecar file.

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new empty
state, no modal, no tray, no toast, no confirm step.**

| Component | Spec |
|---|---|
| **Strip** | **Unchanged box**: `--surface-rail` on `1px --border-strong`, radius 10px, padding `14px 16px`, same position under the provenance line. Heading mono 10.5px `--accent` uppercase `.14em`; caption mono 10.5px `--fg-faint`. |
| **The door** | `PrimaryButton` in its brass-outline form: `1px --accent`, transparent, label 13px 600 `--accent`, radius 8px, `10px 16px`; **44px full-width at phone**. A mono 10px `--fg-locked` `↓` after the label, decorative. `aria-expanded` / `aria-controls`, does not move focus. |
| **Door note** | Mono 10.5px `--fg-locked`, `flex:1`, min-width 240px. One clause at 390px. |
| **`Close the list`** | Mono 11px `--fg-faint` on `1px dashed --border-strong`, at the list head's end. 44px hit area at phone. |
| **Selection head** | Mono 11px counts, `--fg-body` for the live figure and `--fg-locked` for the static ones, above a `1px --border` rule. Two 30px ghost controls (`Tick the 24 I own`, `Clear all ticks`), **44px at phone, side by side on one row**. |
| **Header row** | Mono 9.5px uppercase `--fg-faint`, columns 96px synergy / 58px decks, right-aligned. Desktop only. |
| **Candidate row (desktop)** | **The parity shell at canonical metrics**: 34px, `--surface` on `1px --border`, radius 7px, padding 9px, gap 10px, name 13.5px `--fg` on `flex-auto`. Order: tick · dot · name · **40px cost track** · **84px availability slot** · 88px synergy · 52px inclusion. Ticked: fill `--elevated-hover`, border `--accent-shadow`. |
| **Candidate row (phone)** | **52px, the meta-line variant**, radius 7px, padding 8 left / 4 right, gap 9px. Line 1: dot + full name + **the availability slot** (the marker never moves down). Line 2: **13px pips, uncapped, no shingling**, then synergy and inclusion, mono 10px. **The name never truncates and the price never collapses.** The whole row is the label. |
| **Cost track** | `CostPips` at its shipped desktop metrics: 12px pips, 8px mono numeral, 3px gap, **fixed 40px right-aligned track**, shingling from three at −5px, capped at five slots, generic `+N` pip at six or more. `aria-hidden`; the `sr-only` alternative speaks the whole cost, uncapped. |
| **Availability slot** | Fixed 84px, right-aligned, `white-space:nowrap`, **exactly one occupant**: `BuyTag` (own none) or `AvailabilityMarker` count-only (own it, none free). Silent when the marker returns `null` at `free`. |
| **Tick box** | 18px desktop / **26px phone**, radius 5px, `1px --border-strong`, glyph `+` in `--fg-faint`. Ticked: `1px --accent`, glyph `✓` in `--accent`, fill `color-mix(--accent 12%, transparent)`. A real `checkbox` with `aria-checked`. |
| **Tick box, inert (at cap)** | `1px --border`, glyph `--fg-locked`, row at 0.55 opacity, `aria-disabled` + `aria-describedby` → the cap line. **Never hidden.** |
| **Ownership mark** | **The shared `OwnershipDot`, three states**: 7px filled `--success` owned, 7px filled `--avail-hard-fg` committed, 7px **`1px dashed --fg-locked`** unowned. `aria-hidden`; the words are in the row's accessible name. |
| **Buy tag** | The shipped `BuyTag`, **full form at both widths**: mono 10px `--warning`, `1px --accent-shadow`, radius 4px, `1px 6px`. The All-tab collapse to `$` is declined here — see above. |
| **Commit row** | Above a `1px --border` rule at the list's end. Brass-outline primary + ghost `Cancel` + mono consequence + mono `--fg-locked` slots-stay-open note. Disabled primary: `1px --border`, label `--fg-locked`, **no error beside it**. |
| **Commit row (phone)** | **The quick-add dock's slot, one occupant**: `#14110E` on `border-top 1px --border-strong`, padding `11px 12px 13px`. Three lines: the mono 10px swap notice, the counts line (mono 10.5px; money in `--warning`), then 44px primary `flex:auto` + 44px `Cancel`. |
| **Quick-add dock, retired** | Collapsed to its own mono 10px `--fg-locked` notice inside the commit bar. **Not removed from the DOM** — its query and focus are restored on close. |
| **Provenance ledger** | The shipped strip's box (`1px --border`, `border-left 3px --accent`, radius 9px, the 20px `i` disc), now holding a header line and one 34px line per pass. Lines: `--surface` on `1px --border`; the newest `--elevated-hover` on `1px --accent-shadow`. Pass label mono 9.5px uppercase, `nowrap`, in a fixed **66px** column; sentence 12.5px; `Show these {n}` on a dashed underline, `nowrap`; `Undo these {n}` a `GhostButton`, `nowrap`, in a fixed **126px** column — both fixed widths sized so **no label wraps mid-phrase at three digits**, which is the widest either gets. **Phone: one card per pass**, label and money on a line, sentence, then the two controls at 44px. |
| **Pass mark** | `border-left 3px --accent` on the pass's decklist rows. No dim, no filter, no reorder, no scroll, no motion. `Show these {n}` is `aria-pressed`. |
| **In flight** | Primary `1px --accent-shadow`, label `--fg-faint`, `fill.fillingRows`. `Cancel` disabled and **in place**. List non-interactive, fully legible, **no skeleton**. **No `Stop`** — this is a local write, not a model call. |
| **Declined row** | One line, 34px, `--surface-sunken` on `1px --border`, radius 7px. Mono 9.5px uppercase `--fg-locked` `not this one`, name 13px `--fg-faint`, `Show it again` on a dashed underline. **Same slot, no reorder, no animation out.** |
| **Illegal row** | Same line, `1px dashed --border-strong`, the reason in mono 9.5px uppercase, `untickable` in `--fg-locked`. Unticks itself and recounts. |
| **Provenance line** | **The shipped strip**, unchanged geometry: `1px --border`, `border-left 3px --accent`, radius 9px, the 20px `i` disc. Gains one bolded clause and a ghost `Undo those {n}` — right-aligned at desktop, **below the clause at 44px on phone**. |
| **Refusal** | Shipped `MutationError` under the control that was clicked. **Ticks preserved.** |
| **`Clear all auto`** | **Unchanged.** Toolbar, right-aligned, mono 12px, absent at 0 auto. |
| **The kept note, `Keep`, `Keep all`** | **Unchanged and unmoved**, all three. The note is the only deck-wide kept total on the surface; the two keeps are the only graduation acts. R3 adds no string to this cluster. |
| **Legacy ledger line** | One line, `1px dashed --border-strong`, sentence 12.5px `--fg-faint`. **No label column, no `Show these`, no undo** — it enumerates nothing, so it offers nothing. |

## Notes for engineering

- **One schema change, and it is #359's own request: a fill-pass table.** Per pass: deck id, a
  stable ordinal, kind (`seed` | `top-off`), created-at, and the row ids it placed (or a pass id on
  the deck-card rows — eng's call, and the only thing this design needs is that a placed row can
  name its pass and a pass can enumerate its surviving rows). Nothing else is persisted.
- **The scratch selection is still client state.** Ticks and declines over a live ranked query;
  survives closing the list, **not** a reload (gap 3). The pass ledger is the persisted thing; the
  selection is not.
- **`planLastSlots` keeps its arithmetic and loses its commit.** `openSlots <= 0` already returns an
  empty plan, so states 10 and 14 (strip absent at 99) fall out of it unchanged. What changes is
  that the plan now feeds a list rather than a mutation, and it returns **all** legal candidates
  rather than the first `n`.
- **The tick cap is `openSlots`, enforced server-side too.** `addCardToDeck` already validates,
  enforces singletons and caps at 99; the commit is a batch of those calls and the cap in the UI is
  a courtesy, not the guard.
- **One mutation per commit, not 27.** The batch must be one write that returns the deck's new
  count and shopping delta — the client prints them and does not compute them. A per-row write
  would make state 15 partially true, which is the one thing the refusal copy cannot say.
- **Undo is a real inverse mutation** scoped to a pass's surviving row ids, and it restores the
  shopping list. **Not a client buffer, and no longer reliant on page state** — that is the whole
  point of the table. If cards were removed by hand, the pass recounts; at zero survivors its line
  is gone.
- **`Show these {n}` is a client-side mark over data the page already has** — no fetch, no route
  change, no query param. Only one pass is marked at a time.
- **The seed pass is written by the build, not by this surface. There is no backfill.** A deck with
  no pass rows renders the legacy line (ledger state `l0`) — do **not** synthesise a seed from `auto` rows or
  from `filled`. A deck with no `auto` rows and no pass rows gets no ledger at all, which is state (a).
- **Keeping must clear a card's pass membership as well as its auto flag.** One join to maintain, in
  `keepAutoCard` / `keepAllAutoCards`, and it is the only shipped action R3 asks eng to touch.
- **`Keep all` empties every pass, so it removes the whole ledger** — the same revalidation the
  sweep already does. **The invariant to hold in code:** a pass with zero unkept, unremoved rows has
  no line, so the ledger is present exactly when the sweep is.
- **A pass's kept count and removed count are separate figures**, both derived, neither stored: the
  pass knows its original row ids, and each row is currently auto, kept, or gone.
- **Everything a fill places stays `auto`** (the shipped ruling), so the sweep still undoes all of
  it and `Clear all auto` needs no edit.
- **Revalidation goes through `deckSurfaces()`** — a fill moves the deck list, the home page and
  the shopping list.
- **EDHREC degraded:** ordering falls back to inclusion, then name, exactly as shipped. The list
  still opens; a degraded ranking is still a ranking, and the two figures already have absent
  states.
- **Live region:** the existing one. One message per settle, **ticking debounced** — 31 fast taps
  is one announcement. Never one per row.
- **Motion:** none added. Ticking is instant, opening is a height change with no transition, a
  decline collapses with no animation out.
- **Copy** lives in `src/lib/copy/top-off.ts` and both adds and deletes — see
  `top-off · copy strings.ts`, which lists all seven edits inside `synergyCopy.lastSlots`.
- **Mock data** is Kykar, Wind's Fury at 68/99: 31 open, 38 legal candidates, 24 owned, 7 already
  on the shopping list. The drawn selection is 24 owned + 3 bought = 27 → 95/99, `$6.10 + $4.80 +
  $31.90 = $42.80`, 10 to buy, 4 slots open, 11 candidates left. Every figure on the canvas is
  arithmetically consistent with that.

## Gap report

1. **The three issues were not readable.** #360's four scope items are the prompt's; #359 and #361
   are one sentence each. If either issue carries a constraint the prompt did not summarise — a
   required affordance, a rejected approach — this handoff cannot have honoured it. **This is the
   only thing here that could be wrong in substance rather than in judgement.**
2. **A price atom could not be located in this project**, only its specification. The figures are
   drawn in `BuyTag`'s shape; eng substitutes the real formatter, including staleness and currency
   behaviour, neither of which Design has specified. (Same gap the deck-tuning handoff flagged; it
   has not closed.)
3. **The selection does not survive a reload, and 31 ticks is real work.** Called deliberately, and
   now the *only* thing on this surface that a reload loses —
   persisting a scratch selection means a schema decision and a stale-candidate problem on every
   load. But a player who reloads mid-selection loses it, and the review step is exactly what makes
   that loss worth something. The first thing to want if anyone reports it.
4. **`Choose the last 31` is a door labelled with a count that the list may then contradict.** The
   heading counts slots (31); the list holds candidates (38). Two numbers about the same thing, one
   line apart. The caption states both, which is the mitigation, but it is the sentence most likely
   to be misread on this surface.
5. **The preselection is a default that will mostly be accepted unread.** That is the intent — it
   is the shipped one-tap fill, made visible — but it means the review step's benefit is mostly
   theoretical for the player who taps straight through. Design's position: a default you *can* see
   is categorically different from a commit you cannot, and the 24 rows are on screen either way.
6. **The ledger grows one line per pass, with no cap.** A player who tops off six times has a
   six-line ledger above their decklist, permanently. Accepted: each line is 34px, the ledger is
   the answer to "where did this come from", and #359 asks for exactly this. But **it is the one
   part of R2 that gets worse with use**, and the first thing to watch. Design's position if it
   bites: collapse the ledger to its header with a count (`four passes`) and disclose on tap —
   not a cap, and not a scroller.
7. **A pass whose cards were all removed or kept loses its line, so its money is unaccounted for.**
   If a player bought three cards in top-off 2 and then removed all three, the line is gone and the
   shopping list keeps the three. Correct — the shopping list is its own surface with its own
   removals — but nothing joins the two, and no one has asked for that join yet.
7. **Nothing announces that the list is worth opening.** The strip's caption names a candidate
   count and that is all. A player who never taps the door never learns there is a ranking behind
   it — deliberate, and the same trade the tuning panel makes with manual generation.
9. **Parity Q2 said no to pips on this shell, and this handoff says yes on Q2's own rule.** Argued
   above and drawn on the canvas. It is the second most likely call to be challenged, and the
   cheapest to reverse — the track is 40px and one component prop.
10. **The committed state on a candidate row needs the same aggregate parity slice B is blocked on.**
   Card-rows §4 is explicit that `synergy-row`'s availability marker waits on the commander route
   reading decks. This surface is the *deck* route, which already reads it, so the data is there —
   but the two surfaces then draw the same shell with different completeness, and **eng must not
   infer an over state from `committedTo`** here either.
8. **A 38-row list at 390px is a long scroll and this handoff argues it is the right one.** It is
   the call most likely to be challenged, and the honest counter-argument is that some players will
   read the first six rows and tap the commit. The reply is that the bar is *always* correct
   about what will happen, which the shipped button never was.

## Files
- `The 99 - Top Off.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `STATES-top-off.md` — three numbered sets that do not share a namespace: the panel's twenty
  states, the ledger's fourteen, the mark's four.
- `LONG-LIST-thirty-one-rows.md` — the 390px constraint and the no-inner-scroller call.
- `top-off · copy strings.ts` — the copy block, production-final, with the seven `lastSlots` edits.
- `READINESS.md` — self-assessed readiness and the open items.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
