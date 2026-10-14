# The 99 — Commanders as one plane: filters, search, and an honest empty (design handoff, R6)

> **R6 addendum.** Two items, and they resolved together. **(1)** The pool floor empty state blamed
> the floor for everything — "3,301 of the 3,326" left 25 unaccounted for in a state where nothing
> cleared; the populations now sum to the pool (3,114 + 212 = 3,326). **(2)** R5's cut took the pool
> keys' only trigger with it, so the floor branch always won and `pool`/`poolAlso`/`heldPool` could
> never fire. Hugh's decision supplies the discriminator — `clearsAgainstCollection`, one extra
> column in a query that already runs — so **the comparative clause is restored** and a pool
> exclusion is drawn as **the floor's sub-case**, not a fifth cause. Also folded in: **blocker 6 is
> closed by decision** — the subtitle prints the full pool, the pip row and field print rows on
> screen, the exclusion line bridges them — which is what R5 built, so nothing is redrawn.
>
> **R5 addendum.** Three readiness items, answered rather than deferred. **(1)** The free-pool card
> count stays in all four strings that print it — engineering is adding the one figure, and "this
> pool" without its size is a denominator the player cannot check. **(2)** The pool exclusion
> sentence's second clause is **cut**: asserting the row's standing in the *other* pool needs a
> second ranking pass the plane deliberately does not make, so the sentence names only the pool it
> measured and the CTA carries the invitation. **(3)** The `New` sort removes **two** populations —
> below-floor and **no tags to measure** — and R5 **names both in one clause**, keeping tier order
> and the two-clause cap: `…1,047 fall below the 30% support floor for this pool and 212 have no
> tags to measure`.
>
> **R4 addendum.** R3 re-reviewed 🟠 Orange on eight items, three sharing one root cause: **the row
> §7 repurposes is `WindowCount` ("25 shown · 3,301 more below"), not `revealBand`**. `revealBand`
> renders inside the `<ul>` and never above the first row, so R3's A4 counted a row that is not
> there on both sides — **the absolutes fall to 503px against 330px** (the +173px difference is
> unchanged, and about three rows of list are visible, not two and a half) — and the promise that
> the displaced count "keeps its words on the line beneath" was wrong twice: different figures, and
> **the bar has no line beneath that row**. Design's position is that the reveal count is already
> stated where it is acted on, inside the list; **dropping it from the bar is a deletion of shipped
> content and it is now blocker 6.** Also: the floor has **seven** call sites (§5b's collection
> empty state interpolates `NOVELTY_FLOOR` and was missing from the enumeration); **two** shipped
> strings are edited, not one (`floorNote` gains the threshold argument); `heldFloor` and
> `heldPool` are added for state 2b's other two causes; the in-field count **conflicts with a
> shipped prop** and is blocker 7; A4's denominators are flagged as a product call (**now settled in R6**)
> rather than picked; and **this handoff is no longer described as ungated** — §4.3's scope and
> floor sentences need a lookup nothing currently does (blocker 8).
>
> **R3 addendum.** R2 re-reviewed 🟠 Orange on ten items — arithmetic, two undrawn mobile states and
> four copy keys with no data behind them. Closed here: **A4's arithmetic** (its shipped column summed
> to 370 and was totalled 340, so the headline is **+173px**, not +196px), **A4 is now drawn** as a
> 343px frame with the suppressed elements struck through, **the default state is +0px** (one basis,
> stated once, applied in every table), **the floor has six call sites** (seven as of R4) and `STATES`
> §6 enumerates them, **the mobile field carries its in-field count** and **the mobile aside carries the identity
> clause** in full (88px, not 72px), and **four keys are re-cut to the payload**: `heldHeading` takes
> the full `name`, `noneBody` loses its index-total slot, `floorPool.ctaNote` is deleted, and
> `justifyEdit.distanceNear` keeps the shipped two arguments.
>
> **R2 addendum.** Audited 🟠 Orange at R1 on six items; none touched the §4 rulings or the §7
> argument that the join mode is a modifier, which holds. Closed here: the §7 measurement now covers
> the **worst reachable** phone state on one basis with gaps counted (decision 1), the 292px lateral
> shift and the phone stack (then quoted as +196px, corrected to +173px in R3) are **handed to Hugh
> as open calls** rather than decided
> (decisions 2 and 1), must-not 3 has **one answer** across README and READINESS (decision 8),
> `exclusion.scope` is **deleted** (decision 5), `exclusion.floorAlone` **prints the floor**
> (decision 5), and the mobile canvas line was restored to shipped `window.revealBand`
> (decision 4 — superseded in R4, which finds that row is `WindowCount`, not `revealBand`).
> Blockers are numbered in `READINESS.md`.

**Track 1, stage 1.** Source of truth:
`docs/superpowers/design-briefs/2026-09-06-commanders-one-plane.md` (verified against
`origin/main` at `20b8c1d`). Structural sibling: `design/design_handoff_the99_discovery/` — Green
at R1, same surface, and this handoff extends its rulings rather than reopening them. Also read
`design/design_handoff_the99_commanders/` for the page and
`design/design_handoff_the99_availability/` for the toggle this sits beside.

Committed tables this amends: `docs/superpowers/design-tables/discovery-controls.md` (the header
becomes two rows; the filter bar gains a leading slot) and
`docs/superpowers/design-tables/discovery-empties.md` (two new states, one new element).

File: `The 99 - Commanders · One Plane.dc.html` (canvas — pan/zoom). Read
`CONTROLS-six-above-one-list.md` for the §7 answer with the measured stack and the rejected
structures, `STATES-search-and-exclusions.md` for the search matrix and the five exclusion
sentences, and `design_handoff_the99_richness/README.md` for the locked voice before auditing
copy.

**The one-line summary:** *there are four controls above this list, not six — and the list now
says what it took.* Join mode is an attribute of the pip row and is absent until a pip is lit;
search occupies the row the window count already had and absorbs the count into its own field;
one new element, the **exclusion line**, carries §4.4's sentence above the first row.

**Partly gated.** §0 lists the four controls, the shared bar, the discovery row and the empties as
shipped in #322 / #326 / #327, and they are. **But R1–R3 went on to say "nothing here waits on a
data source", and that is not true of everything drawn.** §4.3's excluded-match promise requires a
server-side match against the full index for rows removed by scope or the floor — those rows never
reach the client — and **nothing currently does that lookup**: `src/app/commanders/` has routes, but
none of them searches that index. **Two of the five exclusion sentences are gated on new server work**
(blocker 8). Everything else is buildable today.

---

## The calls

| § | Question | Answer |
|---|---|---|
| **7** | Can six controls coexist above one list at 375px? | **Yes, and no restructure is needed, because the count is four.** Two of the six are modifiers of controls, not controls. Default stack **288px on both sides — +0px** (a 38px field and a 38px trigger make the shipped row), **subject to blocker 7**. **Worst reachable state, drawn at 343px: 503px against 330px, +173px** — the argument survives that number, the acceptance of it is Hugh's (blocker 1). |
| 4.2 | How a two-state join modifier attaches to five pips | **Two words behind a hairline, inside the pip wrapper.** Type, never a swatch. Rendered only when ≥1 pip is lit. Mobile: its own 38px row, same condition. |
| 4.3 | Where search lives, and its empty / excluded states | **Leading edge of the filter bar**, `FIND` caption inside the field mirroring `COLORS`, match count at its trailing edge. Four field states, three list states. An excluded match names **one** control — the outermost — and offers that control's correction. |
| 4.4 | The exclusion sentence, as drawn content | **A mono line between the bar and the first row**, two clauses at most, ordered by tier — **colour or mode, then floor; there is no scope clause.** The floor clause carries **two figures**, because the sort removes two populations. `FloorEmpty` is the same sentence when nothing survives; when the *pool* is the cause it offers the other pool, not the other sort. The floor prints its percentage at all seven call sites. |
| 4.5 | The scope control that moves when you use it | **The subtitle gets its own row.** Title + scope on row 1, subtitle full-width on row 2. Zero added height, no copy shortened, no colour or type touched. |
| 5 / #343 | Disclosing the archetype overflow | **The count clause becomes the button** and the sentence grows in place. No popover, no card, no fetch. |
| 5 / #344 | The nearest-deck clause under novelty | **Kept, reframed to end on newness, shipped signature unchanged.** And there is no per-sort fork to build — the fit sort does not render this clause at all. |

## States delivered

| # | Frame | Desktop | 375px |
|---|-------|---------|-------|
| A1 | The bar at rest — five things, one row, nothing excluded | ✓ | ✓ (measured stack) |
| A2 | The tier table and the one shipped thing that shifts | ✓ | — |
| A3 | Five rejected structures | ✓ | — |
| **A4** | **Worst reachable state, measured against shipped on one basis** | — | **✓** |
| **A5** | **Where search sits — both placements, costed, undecided** | **✓** | n/a |
| B1 | Join mode — no colours lit (absent) | ✓ | ✓ |
| B2 | Join mode — `Contains` (default) | ✓ | ✓ |
| B3 | Join mode — `Exactly` + its note + chips | ✓ | ✓ |
| C1 | Search field — default, focused, narrowing, zero | ✓ | ✓ |
| C2 | No match at all — list-level | ✓ | — (reflows) |
| C3 | Excluded match, shape 1: every match excluded — list-level | ✓ | — (reflows) |
| C4 | Excluded match, shape 2: some survive — aside above a live list | ✓ | ✓ |
| D1 | The exclusion line in place, above the first row | ✓ | — (same line, 10.5px) |
| D2 | `FloorEmpty` under a scaled floor, offering the other pool | ✓ | — |
| D3 | The floor as a printed figure, both pools | ✓ | — |
| E1 | #343 — collapsed, then open, same slot | ✓ | ✓ |
| F1 | #344 — shipped, drawn, and the unchanged `distanceNone` | ✓ | — (one string) |
| G1 | §4.5 — the wrap today, both scopes | ✓ | — (unchanged) |
| G2 | §4.5 — the two-row header, both scopes | ✓ | — (unchanged) |
| H1 | All three new elements in all six shipped themes | ✓ | — |
| I1 | Token / a11y / motion contract | ✓ | ✓ |

---

## Decisions log

### 1. §7 — **the count is four, so nothing needs restructuring**

This is the brief's biggest question and it asked for a plain answer, so: **no sheet, no collapsed
summary, no new grouping.** The premise that there are six controls is what makes the problem look
structural. Two of the six are not controls in their own right.

**The join mode is an attribute of the pip row.** It has no meaning without a pip — `filter.ts`
returns every result unchanged on an empty selection, so there is nothing to join — and it changes
what the pips mean rather than adding an axis. It therefore lives *inside* the pip wrapper, behind
a hairline, and does not render until a pip is lit. In the default state it costs nothing at all.

**Search takes the row `WindowCount` occupies.** That row says **"25 shown · 3,301 more below"**
(`filter-bar.tsx:420-427`) — R3 called it `revealBand` and quoted `ranks 26–50 of 3,100`, which is a
different string in a different place. A 38px field and a 38px trigger make exactly the 44px row the
count and trigger made, so the substitution is free in height.

**It is not free in content, and R4 stops claiming it is.** The displaced figures are not the same
(shown + remaining, versus matches + pool), and **the bar has no line beneath that row** to move the
old one onto. Design's position: `RevealControl` already prints "25 shown · 3,301 more below" and
its button inside the `<ul>`, at the point the player reaches the end of the window, so the bar
saying it again above an unscrolled list is the redundancy — and the drawn bar drops it.
**That is a deletion of shipped content: blocker 6.** If the count is wanted in both places, the
phone needs a fifth row and §7's default answer becomes +48px rather than +0px.

So the tiering from the discovery handoff survives with one addition:

| Tier | Control | What it decides |
|---|---|---|
| 1 | Scope | which commanders exist |
| 2 | **Search**, then colours (+ join mode) | which of them are shown |
| 3 | `Score against` | which cards count |
| 4 | Sort | the order |

**The default stack at 375px is 288px, and so is shipped's — +0px.** Five rows
(66 + 44 + 34 + 60 + 44) plus four 10px gaps between them: a 38px search field and a 38px sort
trigger make exactly the row the shipped count and trigger made, so the count moving into the field
buys the row for nothing. R1 quoted +6px, R2 +8px and R2's READINESS 250-against-242; **all three
were artefacts of counting the two sides on different bases.** The basis is now stated once in
`CONTROLS-six-above-one-list.md` — row heights include their own padding, totals count gaps
*between* rows and exclude the gap before the first list row, on both sides — and used in every
table.

**And that answers §7 for a player who has touched nothing, which is not the question §7 asks.**
Canvas A4 **draws** the phone in its **worst reachable state** at 343px — a query, two pips lit,
`Exactly`, the chips, and a report above the first row, with the two suppressed elements struck
through in place — and measures it against the same state on the shipped bar:

| | Shipped | Drawn |
|---|---|---|
| Rows, summed | 282px | 435px |
| Gaps between rows | 48px | 68px |
| **Before the first row** | **330px** | **503px** |
| As R1 drew it | 330px | 605px |

**+173px**, or about three rows of list on an 812px phone.

**The difference has been +173px since R3; both absolutes were wrong until R4.** R2 mis-totalled the
shipped column (340 against rows summing to 370, hence its +196px headline). R3 fixed that and then
counted `revealBand` as a 30px row above the first list row on both sides — it is a prop of
`RevealControl`, rendered inside the `<ul>` after the sliced items and only when more remain
(`discovery-view.tsx:316-333`), so it is never there. Removing it takes 40px off each column. The
aside is 88px rather than R2's 72px because the mobile drawing carries `excluded.joinAlso`'s
identity clause in full.

**One rule takes 102px off that stack: at 375px, at most one thing below the bar explains the
list.** The excluded-match aside outranks the exclusion line — the aside names a row
the player just typed, the line describes the pool — and **the exact note is suppressed whenever a
report already names the mode**, since otherwise the same fact prints twice about 100px apart.
Desktop renders both; it has the width and no viewport problem.

**503px is still large, and the modifier argument does not settle it.** Two ways out, and Design
does not pick between them unprompted: **(a) accept it** — every row in that state is something the
player turned on, the bar is not sticky, and one scroll puts the block away; or **(b) tier 2 gets a
phone-only disclosure** — pips, mode and chips behind one summary row, ~130px, reintroducing for one
tier on one width what §7's answer rejected for the bar. **Blocker 1, Hugh's call**, and the reason
R1 came back Orange on the item it was most confident about.

**The one-report rule is drawn, not just stated.** A4's frame shows the exact note and the exclusion
line struck through where they would have rendered, so the suppression is legible as a decision
rather than as an omission.

**Nothing new becomes sticky.** Unchanged from the discovery ruling and now load-bearing: five
stacked controls pinned at 375px would leave under half the viewport for the list, and the list is
the surface.

Five structures were rejected; they are drawn in the canvas and argued in full in
`CONTROLS-six-above-one-list.md`. The one worth naming here is **the filter sheet**, because it is
the obvious answer: it puts four of five controls behind a trigger, so the player cannot see which
control changed the list — the failure the discovery handoff already refused, and worse now that a
control can exclude *a named commander the player just typed*. Every correction §4.3 offers is a
one-tap fix on a control the sheet would make two taps away.

### 2. §7's one cost — **where search sits is Hugh's call, not a disclosure**

R1 put search at the leading edge and disclosed the 292px shift in shipped geometry. **A move in
geometry the gap report protects is not Design's to disclose away**, so R2 draws both placements
side by side in canvas A5, costs each, and picks neither. **Blocker 2.**

**Option 1 — leading edge** (`search → colours (+ mode) → score against → order`). Reading order is
*narrow → score → order*, the precise instrument leads the coarse one, and the field sits nearest
the sentence that explains it. **Cost:** the pip wrapper and `Score against` move right 292px. No
declared value changes — not a padding, not a font-size, not a colour, and nothing about
`ScoreAgainst`'s own geometry — but shipped x-positions move, and rules 1, 8 and 15 cover exactly
that region.

**Option 2 — trailing edge**, before the sort trigger. **Every shipped x-position is preserved**;
nothing in the protected region moves by a pixel at any width. **Cost:** a narrowing control lands
after the scoring control, so the bar no longer reads *narrow → score → order* — the one thing that
order is for — and the field sits furthest from the exclusion line it explains.

**Identical at 375px**, since the phone stacks one control per row either way, so the pick does not
touch decision 1's measurements. Every other state in this handoff is drawn at the leading edge; if
Hugh takes option 2, the only redraw is the desktop bar's order.

### 3. §4.2 — **the modifier is two words, and it is never a swatch**

The pip row's vocabulary is hue: five circles, each one a colour. A sixth circle would have to mean
*logic* in a row where everything means *colour* — §4.2 forbids it by name, and it fails the same
way a `C` pip for colourless would. Type behind a 1px `--border-strong` hairline is unmistakably a
different kind of thing.

- **`Contains` / `Exactly`**, mono 10px uppercase, `letter-spacing .08em`, 20px segments in a 6px
  container on `--bg` — a smaller container inside the sunken wrapper, so the geometry says
  subordinate.
- **The active word is always printed.** §4.2 asks for legibility at a glance rather than only on
  hover; the answer is that there is no hidden state at all. Selected takes the shipped selection
  pairing (`--accent` fill, `--bg` label, 600) so the bar has one idiom for "this is chosen".
- **`Exactly` carries a note**, in `freeNoteLong`'s slot and register: mono 11px `--fg-faint`
  under the row, present only in the non-default mode. One idiom, two controls.

**Wording.** `Contains` and `Exactly` describe the *match*, not the operator — `AND` / `ONLY`
would put boolean vocabulary on a surface whose voice is Kitchen Table, and `AND` is the exact word
the reported confusion is about. The note says `exact identity` in words for the same reason.

**At 375px the modifier cannot ride inside the wrapper** — that row is already `COLORS`, five pips
and the count. It becomes a peer row at the shipped 38px halves with the mobile `Score against`
label register. A 20px control is not a touch target, so on the phone the tiering is carried by
conditional presence rather than by size.

**No OR mode**, per must-not 4. Not drawn, not stubbed, not left room for.

### 4. §4.3 — **search narrows in place, and an excluded match names one control**

The field: `--surface-sunken` on `1px --border-strong`, radius 8px, 30px desktop / 38px mobile,
`FIND` caption mono 10px `--fg-faint` inside the field at the leading edge — mirroring `COLORS`
inside the pip wrapper — then the value at 12.5px `--fg`, then the match count and a dismiss. No
icon: the caption does the work a magnifier would, in the register the bar already speaks.

**Three list states, and the split between them is whether a list still exists.**

1. **No match anywhere.** A list-level state on `EndOfRanking`'s hairline-and-diamond furniture.
   Names the pool, and its action is `Clear the search`. **No red border, no shake, no inline
   error** — a zero count is a fact about the pool, and the sentence explaining it belongs where
   the rows were.
2. **Every match excluded.** Same furniture. Names the commander, names **one** control, and its
   single action is that control's correction. This is §4.3's whole point: a player typing a name
   knows it exists, so a bare "no results" tells them the app is broken.
3. **Some matches survive.** The list is the answer, so the list stays and the excluded row is
   reported *above* it as an aside in `NoDecksBanner`'s furniture (`--surface`,
   `border-left 2px --accent`). The correction is a trailing button, not a primary one — the
   primary action is still reading the rows.

**One control is named, never a list of them.** Precedence is outermost-first: **scope → colour /
join → sort's floor → `Score against`**. A row excluded by three controls is reported against the
one whose correction is most likely what the player wants, and naming all three would turn a
one-tap fix into a diagnosis. The five sentences and the precedence table are in
`STATES-search-and-exclusions.md`.

**One aside, never a stack.** If separate controls each excluded matches, the outermost is named
and the sentence pluralises to a count (`2 more matches are excluded by the colour filter`).

**The displaced row is `WindowCount`, and it is not relocated.** The row search takes on mobile
says "25 shown · 3,301 more below" (`filter-bar.tsx:420-427`) — **not** `revealBand`, which is a
prop of `RevealControl` rendered inside the `<ul>` after the sliced items
(`discovery-view.tsx:316-333`). R1–R3 confused the two, and R3's promise that the count "keeps its
words on the line beneath" was wrong twice: the figures differ, and **the bar has no line beneath
that row**.

`revealBand` is untouched by this handoff and keeps both clauses. Design's position on
`WindowCount` is that `RevealControl` already states the same fact inside the list, where the player
acts on it, so the bar need not say it twice — **but that is a deletion of shipped content, and it
is blocker 6.** The match figure appears once; **where** it appears is blocker 7.

**Search does not navigate and does not open a surface**, per §4.3. It also does not search
outside the plane: the escape offer in state 1 is spelling help, not a jump to a global index,
because a global search is a different feature and the plane's premise is that this list answers
the question.

### 5. §4.4 — **the exclusion line, and a floor that prints itself**

§1 asks that the list "say what it did when it removes things", and §4.4 gives the sentence. It
needs a home that is neither a row nor an empty state, because the case it covers is *the list
worked and still removed 1,047 things.*

**The exclusion line**, between the bar and the first row: mono 11.5px `--fg-faint`, figures
`--fg-body`, a leading 6px `--border-strong` diamond. `EndOfRanking`'s furniture, at the other end
of the list.

- **Two clauses at most**, joined by `·`, ordered by **tier, never magnitude** — colour or mode,
  then floor. A third clause makes it a paragraph, and a paragraph above a list reads as an error.
- **The floor clause carries two figures, because the sort removes two populations.** Rows measured
  and found below the floor, and rows with **no tag data to measure at all** — R4 counted only the
  first, so `printed total − excluded` did not equal the rows on screen and the second group was
  named nowhere. Both are the sort's own doing, so they share **one** clause
  (`…1,047 fall below the 30% support floor for this pool and 212 have no tags to measure`), which
  keeps tier order and the cap intact. Rejected: a denominator that pre-excludes the unmeasurable
  (hides a population the player *can* act on — Best fit ranks those rows, since fit needs no tag
  history), and dropping the arithmetic relationship (makes every printed denominator on the
  surface unverifiable).
- **There is no scope clause, and R2 deletes the `exclusion.scope` key R1 declared for it.** It had
  no state in the matrix, and it could not have had one: under the discovery scope every built
  commander is excluded by scope on every load, so the clause would print on every load — against
  the "absent when nothing was excluded" rule below — and it would report the plane's own definition
  as a loss. The subtitle already states the population. Scope still names itself in the
  *excluded-match* sentence, where a specific row the player searched for went missing.
- **No accent.** The line is a receipt, not a control and not a ranking. Brass is reserved for the
  sort key by decision 1 of the discovery handoff.
- **Absent when nothing was excluded.** No "0 excluded", no reserved height. Missing data is
  omitted, never zeroed — and an absence of exclusions is missing data.
- **Not a live region.** Static content read on demand; the page's existing live region already
  announces the re-rank, and announcing the exclusions too would say one event twice.

**`FloorEmpty` is the same sentence when nothing survives** — the idiom the discovery handoff set
with `NoDecksBanner` above a full list versus `FloorEmpty` replacing it. One addition: when the
*pool* is the cause, the state offers **the other pool**, not the other sort, because that is the
control that took the rows. Still **never a looser floor** — two doors out, both honest.

**The comparative figure is back, and it is now the CTA's evidence.** R2's `1,704 clear it there`
and R4's "clears the floor against everything you own" were both cut for the same reason: knowing a
row's standing in the pool the player is *not* in meant ranking the collection a second time.
**Hugh's decision supplies it from one extra column in a query that already runs**, so the empty
state ends on `1,679 of them would clear it against everything you own` and `excluded.pool` says
`would clear the floor against everything you own — but not against the 214 free cards in this
pool`. The rule that produced the cuts is unchanged; the cost was.

**The populations sum to the pool.** R5 fixed the exclusion line and left this state saying
"3,301 of the 3,326 fall below it" — 25 unaccounted for, which reads as 25 rows that cleared in a
state whose premise is that none did. It is 3,114 below the bar and 212 with no tags to measure,
which is the candidate count exactly. The nearest-miss percentage is dropped here: with a
comparative figure available it is the weaker fact, and two figures plus a threshold is the state's
limit.

**The free-pool card count stays in all four strings that print it** (`floorPool.body`,
`excluded.pool`, `.poolAlso`, `.heldPool`). The list payload carries the collection's size, not the
pool's; engineering is adding the one figure. Naming the pool the figures were read against is
§4.4's premise, and "this pool" without its size is a denominator the player cannot check.

**The floor prints its percentage in both forms of the line** — the two-clause one and the
floor-only sentence with its nearest miss. R1's `floorAlone` took a nearest-miss figure and no
floor, which made it the one call site claiming the floor without printing it; it now takes
`floorPct` like every other site.

**Seven call sites, and `STATES-search-and-exclusions.md` §6 is the enumeration engineering builds
against:** the row note at each width (`floorNote.long`, `.short`), both forms of the exclusion line
(`exclusion.floor`, `.floorAlone`), the pool empty state (`floorPool.body`/`.emphasis`), the
excluded-match sentence (`excluded.floor`/`.floorAlso`), **and the collection-variant `FloorEmpty`**
— `emptyCopy.floorBody`/`.floorEmphasis`, which interpolates
`Math.round(NOVELTY_FLOOR * 100)` at `discovery-view.tsx:243-248`. R2 gave the count as three, five
and six in different files; R3 settled on six and missed the seventh, which would have kept the
constant while the others scaled. **One source, seven sites, and they must agree.**

**Naming.** `floorPct` here means **the threshold**; `novelty.ts:15-18` uses the same name for **a
row's own support percentage**. In every drawn string the threshold is `floorPct` and the row's
figure is `pct`. One of the two needs renaming — Design's preference is `supportPct` for the row's,
since that is what `novelty.ts` computes per item.

**The floor is a figure now, so it prints.** §4.4 makes the threshold a function of the pool, which
turns `NOVELTY_FLOOR` from a constant into a value. Every figure prints its denominator, so the
row's `clears the floor — you own 41% of its support list` becomes `clears the 30% floor — …`, and
the exclusion line and the empty state must print the same number the ranking applied. **One source,
seven call sites** — enumerated in `STATES-search-and-exclusions.md` §6 — drawn identically in all
seven.

**Design does not set the scaling function.** It sets the contract: whatever the function returns
is printed wherever the floor is claimed, and every drawn string carries a slot for it. The
function is a §4.4 engineering call — gap 1.

### 6. §5 / #343 — **the count becomes the button**

`item.unplayedLabels` already carries the full array to the client
(`discovery-row.tsx:105-117`), so this is presentation over data the row holds: no query, no field,
no loading state.

The count clause is already the only text in that sentence standing for hidden content, so it
becomes the trigger: `and 4 more` → `show fewer`, 1px dotted `--fg-faint` underline, `--fg-body`
label. **No new control, no new glyph, no chevron.**

**The trigger is not brass**, even sitting inside the accented run — brass is the sort key and a
disclosure is not evidence. The names it reveals *are* brass, because they are the same kind of
thing as the first three.

**Scan rhythm survives because nothing about the row's composition changes.** The row grows by the
lines the names need — one at seven tags, two at the observed maximum — and every other element
keeps its position. `discovery-rows.md` draws the row as a single dense sentence; it stays a single
dense sentence that wraps.

Rejected: a hover tooltip (dead on touch, and 3,300 rows of floating layer), a popover (a second
surface for seven words), a link to the detail page (leaves the list to read a list).

### 7. §5 / #344 — **reframed, and there is no fork to build**

Under a sort whose claim is *this is new to you*, the shipped clause ends on the one thing that is
not: `Closest is your Kaalia list, which shares counters.` It reads as a caveat the product
attached to its own recommendation.

**Drawn:** `Your closest build, Kaalia, plays counters — the rest are new.` Same two facts, same
clause, same length band, and **the shipped signature is genuinely unchanged** — the same two
arguments `tagSentence` already passes, so `discovery-row.tsx` needs no edit at all. The deck moves
to the front as the *yardstick* and the sentence ends on newness rather than on the overlap.

**No count in the clause, on purpose.** R2 drew "the other 6 are new" on a third argument computed
as `unplayedCount - sharedLabels.length` — **unplayed archetypes and the nearest deck's shared
archetypes are disjoint sets, so that subtraction was meaningless.** The figure the row needs is
already printed beside the sentence (`figureUnitNew`: "7 of 7 tags"), so the clause says "the rest".
`extraShared` counts shared labels, which is the opposite of what this clause is about. Nothing is hidden: a player who plays counters still learns that
they do. `distanceNone` is already a reason *for* and is left alone.

**The finding.** §5 frames this as per-sort because the clause "is genuinely useful under the fit
sort". **The fit sort does not render it.** `discovery-row.tsx` computes
`const tags = fit ? null : tagSentence(item)`, and `tagSentence` is the only producer of
`distanceNear`; under Best fit the justification slot holds the overlap sentence and its bar, and
the tags, the count and the deck clause are absent at both widths. So the clause exists in exactly
one place — the sort the brief says it contradicts — and **one string changes with nothing
branching.** Adding it to the fit sort is a separate question this handoff does not answer (gap 3).

### 8. §4.5 — **the subtitle gets its own row**

The wrap is conformant: gaps 1 and 2 of the gap report put `gap: 24px` and `flex-wrap: wrap` on
that row *to match the table*. The implementation is right and the drawing has the defect, which is
why #335 was refiled from bug to design.

The real fault is **motion on use**: the subtitle's length changes when you click scope, so the
control you just clicked lands on the row below where you clicked it.

**Drawn: two rows.** Row 1 is the `h1` and the scope control, `space-between`,
`align-items: center` (was `flex-end`, which existed only to baseline the control against the
subtitle), `gap: 24px` kept, `flex-wrap` no longer needed — a 30px title and a 32px control cannot
collide at any width. Row 2 is the subtitle, full width, `margin-top: 4px`, byte-identical type,
colour and copy.

**Zero added height** — the subtitle already occupied its own line and now occupies its own row.

**Must-not 3, stated once and the same way in `READINESS.md`: two declared values change on that
row.** `align-items: flex-end → center` (it existed only to baseline the control against the
subtitle, which is no longer beside it) and `flex-wrap: wrap` dropped. **Both are gap-report rows,
fixed into the implementation to match the table.** Design's reading is that must-not 3 forbids
*restyling* — type, colour, padding, size, copy — and that a layout-axis change to the one row §4.5
explicitly hands to Design is the ruling §4.5 asks for: no type, colour, padding, size or string
changes, zero added height, `gap: 24px` surviving. **If the must-not reads as covering any declared
value on that row, then §4.5 cannot be answered at all and this ruling needs re-scoping** —
blocker 3, and not something to assert away. Must-not 5 holds unchanged: the availability clause is
untouched and the subtitle may now grow without consequence.

**Mobile is unchanged.** The stacked column already put the subtitle above a full-width control, so
375px has always had this layout. Desktop is being brought into line with the phone.

**Rejected: preventing the wrap.** `nowrap` plus a min-width on the text block fixes one breakpoint
and one string. The control's position stays a function of a sentence's length, so the next copy
change reopens #335 — and must-not 5 guarantees that sentence keeps growing.

### 9. §4.1 — **no unified score, and nothing here goes near one**

Recorded because it constrains what the new elements may say. `DiscoveryItem` carries no `score`
field, and the brief's §4.1 quotes the code that forbids one, so:

(R1–R3 cited `page.tsx:68-71` here; those lines are the perf comment about discovery not calling
`getRankedList`, which is a different point. The rule stands on §4.1 and on the absent field.)

- **The exclusion line counts rows, it does not rate them.** `1,047 fall below the 30% support
  floor` is a threshold and a population, not a score.
- **Search does not rank.** It narrows the active ranking and never reorders it — the same rule
  `filterByColors` follows (`Never re-sorts`).
- **`Exactly` does not score either.** A tighter colour match is not a better match.

Every figure the new elements print carries its denominator, which is the surface's premise and the
reason none of them can drift into a rating.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new modal, no
new component.** One new *element*: the exclusion line.

| Component | Spec |
|---|---|
| **Search field** | Filter bar, leading edge (placement is blocker 2; the in-field count is blocker 7). `--surface-sunken` on `1px --border-strong`, radius 8px, height 30px desktop / 38px mobile, padding `0 10px`, gap 8px (7px mobile). Caption `FIND` mono 10px `--fg-faint` `letter-spacing .12em`, `aria-hidden`, inside the field. Value 12.5px `--fg` (13px mobile); placeholder `Commander name` at `--fg-locked`. Width 280px desktop; `flex: 1; min-width: 0` mobile. Focus: brand focus-visible ring from `globals.css`. |
| **— in-field count** | Mono 10px `--fg-faint` at the trailing edge, `{matches}/{pool}`, both figures locale-formatted, `aria-hidden`. Renders only with a query. |
| **— dismiss** | `✕` 11px `--fg-faint`, the chip-dismiss glyph. Renders only with a query. `aria-label` `Clear the search`. |
| **Join modifier** | Inside the pip wrapper, after a `1px × 16px --border-strong` hairline with 2px margins. Container `--bg` on `1px --border-strong`, radius 6px, 2px pad, 2px gap. Segment height 20px, padding `0 8px`, radius 4px, mono 10px uppercase `letter-spacing .08em`. Selected: `--accent` fill, `--bg` label, 600. Unselected: `--fg-locked`. Radiogroup, roving tab stop, `aria-label` `Colour match`. Labels `Contains` / `Exactly`. **Absent when no pip is lit.** |
| **— mobile** | Own row under the pip wrapper, `margin-top: 10px`. Label `Colour match` mono 9px uppercase `letter-spacing .16em` `--fg-faint`, `margin-bottom: 6px`. Segments `flex: 1`, height 38px, 13px — the shipped mobile `ScoreAgainst` geometry exactly. Same absent condition. |
| **— exact note** | `freeNoteLong`'s slot: mono 11px `--fg-faint` under the row (10.5px, `line-height 1.5` mobile). Present only under `Exactly`. Figures `--fg-body`. |
| **Exclusion line** | Between the bar and the first row, at the list's padding (`0 34px` / `0 14px`). Leading 6px `rotate(45deg)` `--border-strong` diamond, gap 10px. Mono 11.5px `--fg-faint` (10.5px mobile), `line-height 1.6`, figures `--fg-body`. Two clauses max, joined ` · `, tier order. No accent. Unmounts when nothing was excluded. **Same strings at both widths** — the mobile line wraps rather than shortening, so there is no mobile-only variant and no extra key. (R3 drew a shortened version in A4 with nothing behind it; corrected.) |
| **Excluded-match aside** | `NoDecksBanner`'s furniture minus the heading: `--surface` on `1px --border-strong`, `border-left 2px --accent`, radius 8px, padding `11px 14px`. Body 12.5px `--fg-muted`, names in `--fg` 600. Correction: mono 11.5px `--accent` button at the trailing edge (own line on mobile). `role="status"`. |
| **Excluded-match, list-level** | `FloorEmpty`'s geometry verbatim — centred, hairline + 6px diamond, heading Cinzel 600 18px, body 13.5px `--fg-body` max 470px, ghost CTA 40px `1px --accent`, mono 11.5px `--fg-faint` aside. |
| **No-match, list-level** | Same geometry. Body max 430px. CTA `Clear the search`, no aside. |
| **Floor empty, pool variant** | Shipped `FloorEmpty` with the pool named in the body and the CTA switched to `Score against everything I own`; aside prints the count that clears there. |
| **Overflow disclosure** | The count clause as a `button`: `--fg-body`, `border-bottom: 1px dotted --fg-faint`, inherits the sentence's 13.5px / 12.5px. `padding: 6px 2px; margin: -6px -2px` for a 44px target. `aria-expanded`; label `Show all {M} archetypes for {name}`. Open label `show fewer`. |
| **Page header** | Two rows. Row 1: `h1` + `ScopeControl`, `space-between`, `align-items: center`, `gap: 24px`, no `flex-wrap`. Row 2: subtitle, full width, `margin-top: 4px`. Every declared type, colour, padding and string value unchanged from shipped. Mobile subtree unchanged. |
| **Floor figure** | **Seven call sites**, enumerated in `STATES` §6: row note at both widths, both forms of the exclusion line, the pool empty state, the excluded-match sentence, and the collection-variant `FloorEmpty` (which interpolates `NOVELTY_FLOOR` today). All seven take the threshold and print it, from one source. Row: `clears the {floor}% floor — you own {pct}% of its support list`. |

## The four keys re-cut to the payload (R3)

R2 declared four keys with no data behind them. None of them needed new data; each needed a smaller
claim.

| Key | R2 asked for | R3 |
|---|---|---|
| `search.heldHeading` | a short name | **The full `name`** — `DiscoveryItem` carries only that. The body opens "It matches, but…" so the name is said once. |
| `search.noneBody` | an index total (3,342) | **One argument.** The "the index carries N commanders" clause is gone; "Check the spelling." carries the state alone. |
| `floorPool.ctaNote` | the other pool's clearing count | **Deleted.** That figure lives in the pool the player is not in, and the README rules out a second query. The CTA stands alone. |
| `justifyEdit.distanceNear` | a residue over disjoint sets | **Two arguments, shipped signature, no figure.** "…plays counters — the rest are new." |

**None of these is a gap.** Each was a drawn sentence that promised a number the surface cannot
know, and the fix in every case was to stop promising it — the same rule the handoff already applies
to prices and absent tag data: missing data is omitted, never invented.

## Notes for engineering

- **Two more pieces of URL-mirrored state**, through the existing `history.replaceState` effect:
  `?join=exact` and `?q=`. Non-defaults only, so a player who touches neither keeps today's URL —
  the rule `?avail`, `?scope` and `?sort` already follow.
- **`filterByColors` gains a mode, not a sibling.** The docblock's stated semantics become the
  `contains` branch and `exactly` is `selected.length === r.colorIdentity.length && selected.every(…)`.
  `Never re-sorts` still holds for both, and an empty selection still returns results unchanged in
  either mode — which is why the modifier does not render there.
- **Search is client-side over the active window's source array**, matched against `name` only —
  not oracle text, not archetype names. A player typing `counters` is not asking for a tag filter
  (#159 is a different feature), and matching tags would make the field's results unexplainable
  against the sentence beneath it.
- **The excluded-match report needs the pre-filter candidate set**, which the client already has
  for colour filtering. The floor and scope cases do not: a commander removed by the floor or by
  scope is not in the payload at all. **Design's expectation:** the query is matched server-side
  against the full index when the client finds zero, and the response says which stage removed it.
  One request per settled query, not per keystroke. `src/app/commanders/` has routes, but **none of
  them searches that index** — blocker 9.
- **`clearsAgainstCollection` is one extra column on a query that already runs**, per Hugh's
  decision: a boolean per candidate row saying it would clear the floor against the full collection.
  It feeds two things — the discriminator that selects `excluded.pool` over `excluded.floor`, and
  the comparative count in `floorPool.body`. **No second ranking pass**, which is what made the
  same clause unaffordable in R4.
- **The exclusion counts are computed where the exclusions are.** Colour and join are client-side
  and countable from the arrays in hand; the floor count and the nearest miss come back with the
  discovery payload, as `FloorEmpty` already needs them. No new query.
- **The floor's scaling function is unspecified here** and is the one open engineering call —
  Design's contract is only that its value is printed wherever the floor is claimed, from one
  source, identically in the row, the exclusion line and the empty state.
- **`unplayedLabels` is already fully serialised**, so the disclosure is local state on the row and
  nothing about the payload changes. It does not reset on a window reveal, and it does not persist
  across a sort flip.
- **A query or a join flip resets `shown` to `REVEAL_STEP`**, exactly as `setAvail` does. The
  disclosure does not.
- **One live region, unchanged in count.** The search match count joins the existing scope / sort /
  reveal messages on the region the page already owns, debounced to one per settle.
- **`PageHeader` stays one subtree with responsive classes.** The two-row change is a wrapper split
  inside it, not a mobile branch beside a desktop one — the scope radiogroup must still appear once
  in the accessibility tree (ratification item 2).
- **Copy** lives in `src/lib/copy/` — see `commanders-plane · copy strings.ts`. It adds a `planeCopy`
  block and **edits two shipped strings**, not one: `discoveryCopy.justify.distanceNear` (decision 7)
  and `justify.floorNote` / `floorNoteShort`, which take `(pct)` today and must take
  `(floorPct, pct)` for the threshold to print — `discovery-row.tsx:401` and `:542`. R1–R3 claimed
  one edit; must-not 3 and the gap report are audited against that claim, so the second is stated
  here and in the copy module's header. Nothing else in `commander-discovery.ts` or
  `availability.ts` is touched.

## Gap report

**Closed in R2, not deferred:** `exclusion.scope` deleted (no state, and it would have printed on
every load); `exclusion.floorAlone` now prints the floor; the mobile line is shipped
`window.revealBand` with the match figure appearing once — **superseded in R4**, which finds that
row renders `WindowCount`, not `revealBand`. Gap 5 below is narrowed accordingly.

1. **The floor's scaling function is not specified.** §4.4 rules that the floor scales with the
   pool; neither the brief nor this handoff says how. 30% of a 214-card free pool is not 30% of a
   2,805-card collection, and the choice of function changes how many rows survive — which is the
   number the exclusion line prints. **A ruling, not a redraw**, and the audit will find it.
2. **The excluded-match report may need a server round-trip.** Colour and join exclusions are
   answerable from data in the browser. Scope and floor exclusions are not: those rows never
   reached the client. Drawn as though the answer is available; §4.3's promise is what requires it.
3. **The nearest-deck clause does not exist under the fit sort**, so #344's "per-sort decision" has
   one sort in it. Whether the fit row should gain the clause is unanswered here — decision 1 of
   the discovery handoff reserves that slot for one justification, and a second sentence in it needs
   its own ruling.
4. **The exclusion line can only carry two clauses, and four controls can exclude.** With scope,
   colour, floor and pool all active, two exclusions go unstated. Tier order means the two most
   structural are named, but the line is not a complete account and does not claim to be. (R5's
   paired floor clause does not change this: it fits two figures into one clause rather than adding
   a third.)
5. **`Exactly` has no zero-result state of its own.** An exact identity with no unbuilt commanders
   falls into the shipped `FilteredEmpty`, whose body says "those colours together leave nothing" —
   true under `Contains`, and under `Exactly` it omits that the *mode* is the cause. One clause
   short, and the shipped string is the one that would change.
6. **Search matches names only, and players will type archetypes.** `counters`, `aristocrats` and
   `landfall` are all things a player would try in a field on this page. They return nothing, and
   the no-match state says the index has no commander by that name — which is true and unhelpful.
   #159's tag filter is the real answer and it is not in this brief.
7. **Two rows of the same commander can be excluded by different controls**, and the aside names
   one. With a query matching four commanders across three exclusion reasons the sentence
   pluralises to a count and the specificity §4.3 asked for is lost at exactly the moment there is
   most to explain.
8. **The join mode's URL parameter is meaningless without `?c=`.** `?join=exact` alone is a valid
   URL that changes nothing and shows no control. Harmless, and worth a normalising pass on read so
   a shared link never carries a mode with no colours.

## Files
- `The 99 - Commanders · One Plane.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `CONTROLS-six-above-one-list.md` — the §7 answer: the measured stack, the tier argument, the five
  rejected structures.
- `STATES-search-and-exclusions.md` — the search matrix, the five exclusion sentences and their
  precedence, the two floor states.
- `commanders-plane · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
