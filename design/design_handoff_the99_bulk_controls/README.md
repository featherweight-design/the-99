# The 99 — The bulk controls (design handoff, R1)

**The brief's locked decision, restated so the audit has one line to check against:** two bulk
actions, differing only in the pool, **each labelled with its concession, and both concessions
legible before either is pressed**. Nothing in this handoff moves that. What it adds is the four
calls §5 leaves to Design, and the nine label states the figures can actually produce.

Source of truth: `docs/superpowers/design-briefs/2026-09-20-the-bulk-controls.md` on
`feat/informed-pair-row`, read in full. Shipped surfaces read at the same ref:
`top-off-list.tsx` (the control being replaced, its selection head, its pinned bar),
`buy-tag.tsx`, `provenance-line.tsx`, `pass-mark.tsx`, `lib/decks/fill.ts`,
`lib/decks/last-slots.ts`, `lib/profile/fit.ts`, `lib/copy/top-off.ts`.

Structural sibling: `design_handoff_the99_top_off/` — same component, same two widths, same
folder shape. Its rulings are treated as binding here and are named where they bind.

File: `The 99 - Bulk Controls.dc.html` (canvas — pan/zoom). Read `STATES-bulk-controls.md` for
the pair's eleven states, `bulk-controls - copy strings.ts` for production copy,
`READINESS.md` for the verdict.

**The one-line summary:** *the pool is the choice; the concession is what makes it one.*

## R2 — four changes on review

1. **One verb: select.** `Select 12 from my collection`, `Clear all selections`,
   `0 of 12 slots selected`, `Deselect one to swap another in`. This reaches past the pair into
   **nine shipped strings** the top-off round wrote — all listed in the copy file — and they move
   together or the surface speaks two languages.
2. **"Short of recommendations", not "short of the mix".** *Recommendations* is what this app is
   already understood to be giving; *the mix* needed a gloss. Nil reads
   `matches every recommendation`, unmeasurable reads `no recommendation for this commander`.
3. **Real mana pips.** The cost column draws the shipped `CostPips` at the component's own
   figures — 12px pips, 3px gap, five slots in the 72px `COST_TRACK` desktop; 13px, uncapped, on
   the phone meta line; `WUBRG_COLOR` tokens. The first canvas stood letters in for them, which is
   the drift the shared track exists to stop.
4. **The card mark rides the candidate row.** Game Changer, mass land denial, extra turns and
   tutors, as bare glyphs in `--fact` at 14px desktop / 13px phone — Round 1's mark and Round 2's
   two additions, nothing re-specified. **Where they go on this row** is the only new call:
   immediately after the name, before every boxed atom, because boxed is about your copies and bare
   is about the card. Reason: **this list is the last moment a player can decline the card**, and
   the right-hand control can put a Game Changer on the shopping list for real money. Costs eng one
   payload join — see the notes and gap 7.

---

## What is deleted, and what replaces it

```
- [ Select the 12 I can sleeve ]   [ Clear all selections ]

+ [ Select 12 from my collection  ]   2 creatures short of recommendations
+ [ Select the 12 this deck needs ]   4 to buy · $18.40
+ Clear all selections                                    ranked · synergy, then inclusion, then name
```

One control out, two in, and `Clear all selections` loses its box. Every other atom on the surface —
the rows, the buy tags, the column header, the cap line, the decline and its restore, the pinned
commit bar, the ledger's per-pass undo — is untouched. §4's list is honoured by not drawing any
of it.

## The four calls

| § | Open question | Called |
|---|---|---|
| 5.4 | Is the pair two buttons at all? | **Two ghost controls of equal weight, stacked, in a fixed 232px column, each with its concession on its own line.** Not segmented, not primary+secondary, not a disclosure. |
| 5.1 | The two labels | **`Select 12 from my collection` / `Select the 12 this deck needs`.** Both name the pool. Neither names its own concession — the note does that, so the two notes can be compared as a column. |
| 5.2 | Zero and unavailable | **The concession slot is never empty and never invented.** Nil is a sentence (`matches every recommendation`); an unmeasurable mix says so; a missing price drops the figure and keeps the count. |
| 5.3 | The phone | **Nothing new is pinned.** The bottom slot keeps one occupant — the commit bar. The pair stacks in the selection head, two 44px rows, each concession indented under its own button. |

### 1 · Two ghosts, one column, equal weight

The locked requirement is about **comparison**, not visibility. Two labels of different length
push their notes to different x positions, and two figures that do not share a left edge are read
one after the other rather than against each other. So the buttons take one fixed column and the
notes form a second.

**232px** is the wider label at its largest reachable figure — `Select the 47 this deck needs`, 27
IBM Plex Mono characters at 11px (0.6em advance ≈ 178px) plus the ghost's 11px padding either side
and a 16px allowance. The count can never exceed the open slots, so nothing in the pair wraps.

**Both are ghosts.** A primary would rank one concession above the other, and the pair exists
precisely because the app cannot know which the player minds — Hugh's own reasoning is that both
are acceptable *once stated*. The brass outline in this list is already spoken for by
`Add N cards`, the only control here that changes the deck.

**Rejected: a segmented control.** It makes the pool a mode the player sets and leaves set, which
is the ownership filter this product has ruled against, one level down. It also has to render one
concession as the unselected half's caption, which is the disclosure problem with extra chrome.
**Rejected: a primary with a secondary.** Weight is an opinion, and the app does not have one.
**Rejected: one button with a disclosed alternative.** The second concession then arrives after the
first choice is half made — the exact failure §7 says a post-press check would let through.
**Rejected: the concessions in one caption above the pair.** One sentence carrying two figures makes
the reader assign each to its own control, and at 390 it wraps to three lines before either button
is on screen.

### 2 · The labels

- **`Select 12 from my collection`** — the pool is cards with a copy free to sleeve (`canSeed`,
  the one predicate the seed already reads, unchanged).
- **`Select the 12 this deck needs`** — the pool is every legal candidate, unfiltered by ownership.

**They select; they do not commit.** That is not a softening: on this surface nothing is added until
`Add 12 cards`, and a bulk control that committed would reintroduce the defect the whole top-off
round closed. The fill runs, its result becomes the selection, and the commit bar states the
consequence as it does for a hand-made one.

**The shipped `Select the N I can sleeve` is retired, not re-pointed.** Its wording was correct
about its pool and silent about its concession, which is the reported failure in one string. The
replacement names the pool in the player's own terms (*my collection*) and lets the note carry
what it costs.

**Neither label names its concession.** `Select 12 I can sleeve, 2 creatures short` puts the
comparison inside a button face, where it cannot line up with the other one.

### 3 · The concession, at zero and at the edges

The figures are computed from a **real fill against this player's collection**, so each note has to
read at nothing, at a lot, and with a source missing. Eleven states are drawn; the rules behind
them:

- **Nil is stated, not omitted.** `matches every recommendation` — a blank beside one control and a
  figure beside the other reads as a missing figure, and the nil *is* the answer the player came
  for.
- **A missing price drops the figure and keeps the count.** `4 to buy`. This is `price.ts`'s
  shipped rule and the buy tag's own behaviour on the rows below: no dash, no `$0.00`, no
  "price unavailable". A figure stands as soon as one copy is priced (price-strip's threshold).
- **An unmeasurable recommendation says so.** `SkeletonFit.basis === "none"` (or no composition) →
  `no recommendation for this commander`. `0 short` would be the strongest possible claim made
  from no data.
- **More than two axes collapse.** One prints itself; two print as a pair; three or more become
  `short on 3 types · creatures worst at 4`. The worst gap is what decides whether the concession
  is acceptable.
- **At zero sleevable the collection control is absent, not disabled** — the surface's standing
  rule, and the door note already explains which of the two zeroes it is (`doorNote` vs
  `doorNoteNoneFree`, both shipped).
- **When the best fill buys nothing the two fills are the same set, so the second control is
  absent** and the survivor's note says why: `matches every recommendation · nothing to buy`. Two
  controls that do the same thing are the shipped #361 defect in a new costume.
- **Neither control takes a pressed state.** A player can deselect by hand a moment later, and a lit
  button would claim a selection that no longer matches it. Pressing the other swaps the selection
  wholesale, as the shipped bulk control already does.
- **At the cap, the notes yield to `replaces your 12 selections`** — for as long as a hand-made
  selection is in the way, that is the whole of what pressing does. The figures return when the
  selection is cleared or reduced.

**The word is "recommendations".** `skeleton` is the code's word and appears nowhere a player
can see, and "the mix" needed a gloss to mean anything — *recommendations* is what this app is
already understood to be giving. If Round 0–3's surface settles on a different public noun,
**this line follows it** — one string, `bulk.gap*`.

### 4 · The phone

**The quick-add dock is already stood down and its slot already reassigned**: while the list is
open the commit bar holds it, and the top-off handoff's rule is one bottom slot, one occupant. So
the pair has no claim on it, and §5.3's question is answered by where the pair belongs rather than
by what the dock is doing.

**A bulk selection is a decision about the list, so it sits at the top of the list.** Pinning it would
put a control that changes twelve rows below the rows it changes, and would grow the bar at the one
width where the bar's height is the page's scroll budget.

**Two 44px rows, not two halves of one row.** Side by side each label gets ~175px;
`Select the 12 this deck needs` wraps to three lines there, and the notes then have nowhere to sit
but under the pair, belonging to neither button. Each note is indented to its button's edge,
directly beneath it.

**`Clear all selections` demotes to text weight** with a dashed rule and a 44px hit area, on the head's
own line. It is a reset rather than a choice and concedes nothing; boxing it would make three
equal-looking controls out of a pair and a reset.

## Component notes

No new token, no new hex, no new motion class, no modal, no tray, no toast, no confirm step.

| Component | Spec |
|---|---|
| **Pair, desktop** | Two rows, `gap 7px`, inside the selection head above its `1px --border` rule. Each row: `flex`, `gap 14px`. Button: the shipped 30px ghost — `1px --border-strong`, radius 8px, mono 11px `--fg-body` — at a **fixed 232px** width, label centred. |
| **Concession, desktop** | Mono 11px, `--fg-body`, one line, never wrapped at any reachable figure. The money figure alone takes `--warning`; its count stays `--fg-body`. |
| **Pair, phone** | Two stacked groups, `gap 5px` inside a group and `10px` between them. Button: full width, `min-height 44px`, same border and radius, mono 12px. Note: mono 11px `--fg-body`, `padding-left 2px`. |
| **`Clear all selections`** | Mono 11px `--fg-faint`, `1px dashed --border-strong` on the text, 44px hit area at phone, on the head's counts line (desktop: after a `1px --border-strong` divider; phone: its own line opposite the ordering note). |
| **Disabled** | `1px --border`, label `--fg-locked`, and **only while a commit is in flight** — the same gate every other control in the head takes. A control with nothing to do is absent instead. |
| **Absent** | The whole row goes, note included. Never a disabled ghost with an explanatory note beside it. |
| **Accessible name** | `aria-label` on each button carries label **and** concession: *"Select 12 cards from your collection — 2 creatures short of recommendations"*. The visible note is `aria-hidden`, so the figure is not spoken twice. |
| **Announcement** | The existing live region, one message per press, reusing the shipped settle debounce: `announce.ticked` / `.tickedNoBuy`, unchanged strings. |
| **Probe hooks** | `data-bulk-fill="collection" \| "best"` on the buttons, `data-bulk-concession` on each note. |

## Notes for engineering

- **Both controls run the same fill over the same open slots, differing only in the candidate
  pool** — collection = `canSeed(c)` (owned, a copy free), best = the whole legal pool. Same
  exclusions as the shipped bulk control in both cases: a declined row and a row that went illegal
  while the list was open are never selected by a bulk press.
- **The result replaces the selection wholesale** and is clamped to `openSlots`, exactly as
  `seedableIds.slice(0, tickable)` does today.
- **Both concession figures must be computed before the press and re-computed when the pool moves**
  (a quick-add, a decline, a slot taken). They are read off a plan, not off the selection: they
  describe what pressing *would* do.
- **The gap comes from the shipped `fitSkeleton`**, evaluated against the deck *plus* the
  planned rows — not against the deck as it stands. `TypeFit.delta < 0` is the gap; only negative
  deltas are reported, and `basis === "none"` or an empty `types` is the unmeasurable case.
- **The money comes from the machinery §4 names** — `buyCount` / `buyMoney` over the planned
  unowned rows, through `summarisePrices`, with `pricedCopies > 0` as the threshold for printing
  a figure. No new price path.
- **Lands are never bought** (`planFill`'s rule), so a land gap can appear in the left-hand note
  and never in the right-hand one's money. That asymmetry is correct and must not be smoothed.
- **The two plans may return the same set.** Compare by oracle id; if they match, mount the
  collection control alone with the `nothing to buy` clause.
- **The candidate pool needs the two joined flags.** `SynergyCard` carries no `facts`;
  `attachBracketFacts` already exists, is one query for the whole pool, and is **quiet on
  failure** — a degraded read draws fewer marks and never claims a card is clear. `game_changer`
  rides the card row, so a partial is clean. The tutor mark is Round 2's detection and may not be
  on the row yet; if it lands later it lands as one more entry in the same list.
- **The marks are `aria-hidden` glyphs**, per Round 1 — spoken through the row's accessible name,
  in `factsFor`'s fixed order, never counted by a probe as SVG nodes.
- **Copy** lives in `src/lib/copy/top-off.ts` as a new `bulk` block; `list.tickOwned` /
  `.tickOwnedAria` are deleted with the control they name. See `bulk-controls - copy strings.ts`.
- **Mock data on the canvas** is Tovolar at 87/99: 12 open, 41 candidates, 23 sleevable; the
  collection fill leaves creatures 2 short, the best fill buys 4 for \$18.40. Every figure drawn is
  consistent with that.

## Gap report

1. **"Recommendations" is Design's public noun for the measured composition, chosen without seeing
   the analysis tab's shipped wording.** Rounds 0–3 own that surface; if it says something else in front of players,
   this line follows it. One string.
2. **The gap is drawn as a count of card types, because that is what `fitSkeleton` measures.**
   Hugh's report is about creatures, which `CompositionTargets` covers — but `ROLE_TARGETS`
   (ramp, draw, removal, wipes) is what `planFill` actually fills against, and `fit.ts` refuses
   by name to mix the two. **A fill that closes every type gap can still leave a role gap**, and
   this note would not say so. Design's position: the type axes are the measured ones, and a note
   quoting asserted constants next to measured ones is the laundering `fit.ts` forbids. If a role
   shortfall is what players actually feel, the honest fix is a second line, not a blended one.
3. **`planFill` fills a whole deck from role targets; this pair fills N open slots from a ranked
   candidate pool.** The brief says "the real fill" and eng owns which function that is. If the
   answer is a new plan over the top-off pool, the concession figures come from the same call —
   what Design requires is only that the note and the press read one plan, never two.
4. **Two figures that move under the player's hand.** Every quick-add, decline or manual selection can
   change both notes. Drawn as live, with no transition; if the flicker is real in use, the fix is
   to settle them on the same 600ms debounce the announcement already uses — not to freeze them.
5. **Nothing tells the player the two fills are ranked differently inside their pools.** Both notes
   describe the outcome, neither describes the method, and a player may read the pair as
   "cheap vs. good" rather than "your cards vs. the deck's needs". Accepted: the outcome is what
   the choice is between, and the ranking is already stated once above the rows.
6. **The verb change touches shipped strings this brief did not scope.** Nine of them, on a
   surface that shipped three weeks ago. Design's position: one surface, one verb — but if the
   rename is not wanted outside the pair, the pair can read *select* while the head reads *tick*,
   and that is worse than either consistent choice.
7. **The card mark is an addition the brief did not ask for.** §4 says what must not be redrawn and
   the mark is not in it, but it is still scope Design proposed rather than scope that was set —
   and it carries a real data dependency (the two joined flags on the candidate payload). If the
   join is not cheap, the marks can ship in a later pass without changing anything else here.
8. **The canvas is drawn on one deck.** The eleven states are real states, but their figures are
   constructed, not read from a fixture — there is no `probe:last-slots` output in this project to
   quote.

## Files
- `The 99 - Bulk Controls.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `STATES-bulk-controls.md` — the pair's eleven states, both widths.
- `bulk-controls - copy strings.ts` — the copy block, production-shaped, with the deletions.
- `READINESS.md` — self-assessed readiness and the open items.
- `brand/` — the locked brand sheet, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
