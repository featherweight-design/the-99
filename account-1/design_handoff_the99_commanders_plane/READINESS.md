# Readiness — Commanders as one plane (R6)

Self-assessed against the brief's §4 locks, §5 items, §6 must-nots and §7 open question.
**Partly gated.** §0's dependencies all shipped in #322 / #326 / #327, and R1–R3 read that as
"nothing waits on a data source". **Two of §4.3's five exclusion sentences do** — see blocker 8.

## The §4 locks, and where each is drawn

| Lock | Where it is honoured |
|---|---|
| **4.1** one plane, no unified score across scopes | Nothing new prints a rating. The exclusion line counts rows against a threshold; search narrows without re-sorting (`filterByColors`'s `Never re-sorts`, extended to the query); `Exactly` is a tighter match and never a better one. Decision 9. |
| **4.2** contains-all default + "exactly these", no OR | Section B. `Contains` is the default and the shipped semantics; `Exactly` is a modifier inside the pip wrapper; no OR mode is drawn, stubbed or left room for. Decision 3. |
| **4.3** search narrows in place, names the excluding control | Section C, and `STATES-search-and-exclusions.md` §2–§3. Five sentences, one precedence order, one control named per state. Decision 4. |
| **4.4** the floor scales with its pool, the list names what it excluded | Section D. The exclusion line, the pool-variant `FloorEmpty`, and the floor printed as a figure at all seven call sites. Decisions 5 and the copy module's `floorNote`. |
| **4.5** the header wrap is Design's call | Section G. Two-row header; the wrap is superseded, not reverted. Decision 8. |

## The §5 items

| Item | Answer |
|---|---|
| **#343** archetype overflow | The count clause becomes the trigger; the sentence grows in place. Section E, decision 6. |
| **#344** nearest-deck clause | Reframed to end on newness; one string, shipped signature, no fork. Section F, decision 7 — **and the finding that the fit sort does not render this clause at all.** |

## The §6 must-nots

| # | Must-not | Held because |
|---|---|---|
| 1 | No unified 0–100 score | Nothing drawn produces or displays a score. Every new figure carries a denominator. |
| 2 | No second filter bar | One bar, gaining one leading slot and one in-wrapper modifier. No discovery-only bar; the shared bar is ratified and unchanged in kind. |
| 3 | No restyling the shipped header, its colours, or `Score against` | **Two declared values change, both on the header row, and both are gap-report rows.** `align-items: flex-end → center` and `flex-wrap: wrap` dropped — see decision 8 and gap-report gaps 1–2. Design’s reading is that must-not 3 forbids *restyling* (type, colour, padding, size, copy), and that a layout-axis change to the row §4.5 explicitly hands to Design is the ruling §4.5 asks for rather than a restyle: no type, colour, padding, size or string changes, zero added height, and `gap: 24px` survives. **If the audit reads must-not 3 as covering any declared value on that row, §4.5 cannot be answered at all and the ruling needs re-scoping — flagged as blocker 3, not asserted away.** Separately: `ScoreAgainst`’s own declared values (padding, font-size, weight, `justify-content`, heights) are untouched, and its **lateral position** is now Hugh’s call — blocker 2. |
| 4 | No OR colour mode | Not drawn. |
| 5 | Do not solve #335 by shortening the subtitle | The subtitle is byte-identical and now has a whole row, so it may grow. The availability clause is untouched under both scopes. |

## The §7 answer

**Six can coexist, no restructure is needed, and the count is four — and R2 measures the price.** Two of the six are modifiers
of controls rather than controls: the join mode belongs to the pip row and is absent until a pip is
lit; search occupies the row the window count already had and absorbs the count into its own field.
**Default state: the same height as shipped.** 288px before the first row on both sides — five
rows (66 + 44 + 34 + 60 + 44) plus four 10px gaps between them. A 38px search field and a 38px sort
trigger make exactly the row the shipped count and trigger made, so the count moving into the field
buys the row for nothing. **R1's +6px, R2's +8px and R2's 250-against-242 were all artefacts of
counting the two sides on different bases**; the basis is stated once in
`CONTROLS-six-above-one-list.md` and applied in every table.

**R1 answered for the default state only.** R2 draws the phone in its worst reachable state — query
present, pips lit, modifier row shown, a report above the first row — and measures it against the
same state shipped, **drawn as a 343px frame** rather than only tabulated: **503px against 330px,
+173px**, or about three rows of list on an 812px phone. As R1 drew it, that stack reached 605px;
the **one-report rule** (the aside outranks the exclusion line at 375px, and the exact note is
suppressed when a report already names the mode) takes 102px off it.

**Both absolutes were wrong until R4; the difference has been +173px since R3.** R2 mis-totalled the
shipped column (340 against rows summing to 370, hence +196px). R3 fixed that and counted
`revealBand` as a row above the first list row on both sides — it renders inside the `<ul>`
(`discovery-view.tsx:316-333`) and is never there, so each column was 40px high. The number
blocker 1 asks Hugh to accept is **+173px**.

**The modifier argument survives that measurement. Whether +173px is acceptable does not follow
from it**, and Design does not decide it — blocker 1.

Five structures rejected with reasons in `CONTROLS-six-above-one-list.md`, the filter sheet first
and at length, because it is the obvious answer and it breaks §4.3's corrections.

The brief asked for plainness over hedging: **if the audit disagrees, the disagreement is with the
claim that the join mode is a modifier.** Everything else follows from it.

## Closed in R6 — the two readiness items, plus one decision folded in

1. **The pool floor empty state accounts for every commander.** R5 fixed this on the exclusion line
   and left the same fault in `floorPool.body`: "3,301 of the 3,326 fall below it" left **25
   unaccounted for**, which reads as 25 rows that cleared, in a state whose premise is that none
   did. Now **3,114 below the bar + 212 with no tags to measure = 3,326**, checkable against the
   heading. The nearest-miss percentage is dropped in favour of the comparative figure below.
2. **The pool keys have a discriminator, so they can fire.** R5's cut removed the comparative clause
   and with it the only thing distinguishing a pool exclusion from a floor one — and since
   precedence puts the floor above `Score against`, the floor branch won every time and
   `pool`/`poolAlso`/`heldPool` were unreachable. **Hugh's decision supplies
   `clearsAgainstCollection` from one extra column in a query that already runs**, so:
   *floor is the cause **and** the row would clear against the collection* → `excluded.pool`;
   *floor is the cause* → `excluded.floor`. **A pool exclusion is the floor's sub-case, not a fifth
   tier**, so the four-tier precedence order is untouched. The comparative clause is restored on
   that basis — the rule that justified R5's cut is unchanged, the cost is what moved.
3. **Blocker 6 is closed by decision, with no redraw.** Each surface prints the population that
   answers its own question: the **subtitle** the full pool (sort-independent), the **pip row and
   in-field count** the rows on screen, the **exclusion line** bridging the two and naming both
   departing groups. That is what R5 drew — and it is why the line must name the unmeasurable group,
   since `total − excluded = rows` is the relationship being kept checkable.

## Closed in R5 — the three readiness items

1. **The free-pool card count.** Kept in all four strings (`floorPool.body`, `excluded.pool`,
   `.poolAlso`, `.heldPool`); engineering is adding the figure to the payload. Naming the pool the
   figures were read against is §4.4's premise, and "this pool" without its size is a denominator
   the player cannot verify — the one thing every figure on this surface is required to do.
2. **The second ranking pass: cut.** `excluded.pool` no longer claims the row clears the floor
   against the whole collection. It names only the pool it measured; `poolCta` — "Score against
   everything I own" — carries the invitation to go and look. **The clause was worth less than a
   full second ranking on every request**, and the CTA already offers the answer at the cost of one
   tap.
3. **The unmeasurable group: named, in one clause.** Under `New`, rows below the floor and rows
   with **no tag data to measure** both leave the list; R4 counted only the first. Both are the
   sort's doing, so they share a single clause with two figures
   (`exclusion.floorWithUnmeasured`), which keeps tier order and the two-clause cap intact and
   restores `printed total − excluded = rows on screen`. Rejected: a pre-filtered denominator
   (hides a population the player can act on — Best fit ranks those rows, since fit needs no tag
   history) and dropping the arithmetic (makes every printed denominator unverifiable).

## What blocks a green

1. **Whether +173px above the list at 375px is acceptable** (R1 audit item 1). R1 answered §7 for the
   default state only. A4 now **draws** the worst reachable phone state at 343px — query, pips lit,
   modifier row, one report above the first row, the two suppressed elements struck through — and
   measures it against the same state shipped: **503px against 330px**, gaps between rows counted on
   both sides, or about three rows of list on an 812px phone.
   Two ways out: **accept it** (every row in that state is something the player turned on, and
   scrolling puts the block away at once), or **give tier 2 a phone-only disclosure** at ~130px —
   which reintroduces, for one tier on one width, what §7’s answer rejected for the bar.
   **Hugh’s call.** The modifier argument itself survives the measurement.
2. **Where search sits on desktop** (audit item 2). Both placements drawn and costed in A5: the
   leading edge reads *narrow → score → order* and moves shipped x-positions 292px; the trailing
   edge preserves every shipped position and breaks that order. **Hugh’s call** — R1 decided it and
   disclosed the shift, which is the wrong shape for a move in protected geometry. Identical at
   375px, so the pick redraws only the desktop bar.
3. **Must-not 3’s scope, on the header row** (audit item 3). Two declared values change:
   `align-items: flex-end → center` and `flex-wrap: wrap` dropped, both gap-report rows. Design’s
   reading is that must-not 3 forbids *restyling* — type, colour, padding, size, copy — and that a
   layout-axis change to the one row §4.5 hands to Design is the ruling §4.5 asks for. **If it
   reads as covering any declared value on that row, §4.5 cannot be answered at all** and decision
   8 needs re-scoping. A ruling on the must-not’s scope, not a redraw.
4. **The floor’s scaling function** (gap 1). §4.4 rules that the floor scales; nothing says how,
   and the number it returns is the number **all seven call sites** print — enumerated in the copy
   module's header and in `STATES-search-and-exclusions.md` §6. Design's contract is only that
   the value is printed wherever the floor is claimed, from one source. A ruling, not a redraw —
   but the drawn figures are illustrative until it exists.
5. **Two shipped strings are edited, not one** (R3 audit item 6). `justify.floorNote` and
   `.floorNoteShort` take `(pct)` today and must take `(floorPct, pct)` for the threshold to print
   (`discovery-row.tsx:401`, `:542`). R1–R3 claimed one edit, and **must-not 3 and the gap report
   are audited against that count**, so the second is declared here rather than discovered at
   review. It is a signature change to a shipped string, not a rewording. (The round-trip question
   that was blocker 5 in R3 is now blocker 8, where the missing lookup makes it concrete.)
6. **Dropping `WindowCount` from the bar** (R3 audit item 2). §7's row substitution displaces
   "25 shown · 3,301 more below", and **the bar has no line beneath that row** to move it onto —
   R3 promised one. Design's position is that `RevealControl` already states it inside the `<ul>`
   where the player acts on it, so the bar need not say it twice. **That is a deletion of shipped
   content, so it is a ruling, not a drawing detail.** If the count is wanted in both places the
   phone needs a fifth row and §7's default answer becomes **+48px instead of +0px**.
7. **The in-field count conflicts with a shipped prop** (R3 audit item 4). `FilterBar` renders
   `{filteredTotal}/{activeTotal}` from `filtered.length`, and search narrows that same array — so
   with a query the pip row already reads `3/3,326` and the field would print it again. **Two
   exits, neither picked:** drop the field count (A4 draws this; search loses its own feedback), or
   re-scope the prop to pre-query `colourFiltered.length` so the figures differ (`61/3,326` and
   `3/3,326`; canvas §C and `STATES` §1 draw this, and it changes a shipped prop's meaning).
8. **Two exclusion sentences are gated on a lookup nothing currently does** (R3 audit item 7). A row
   removed by **scope** or **the floor** never reaches the client, so naming it requires a
   server-side match against the full index. `src/app/commanders/` has routes, but **none of them
   searches that index** — the accurate statement, correcting R4's claim that there were no routes
   at all. Colour and join exclusions are answerable in the browser today and are not affected. If the round-trip is refused, states 2b and 2c collapse to the no-match state
   for those two causes and both need redrawing.
9. **The two-row header amends a committed table.** `discovery-controls.md` describes one header
   row and gap 2 fixed `flex-wrap: wrap` into the implementation to match it. This ruling supersedes
   that value rather than reverting it, and the table needs the amendment before the branch lands or
   the next verify pass will refile it.
## What does not block a green

- **Gap 3** (#344 has one sort in it) is a finding, not a hole: the drawn answer is complete for the
  sort that renders the clause.
- **Gaps 4–8** are consequences of drawn decisions, argued in the README, and none of them changes a
  drawn pixel: the exclusion line's two-clause cap (unchanged by R5 — the paired floor clause fits
  two figures into one clause, not three clauses into two), `Exactly`'s missing zero-result clause,
  search matching names only, the aside's pluralisation, and `?join=exact` being inert without
  `?c=`.
- **State 2b's four causes now all have strings.** R3 defined `heldColors`, `heldJoin` and
  `heldScope` for a state §3 says any of four controls can cause; `heldFloor` and `heldPool` are
  added in the same "It matches, but…" shape.
- **The mobile exclusion line uses the same strings as desktop.** R3's README called it the "same
  line at 10.5px" while A4 drew a shortened variant with no key behind it; the drawing now wraps
  the full string, so there is no mobile-only variant and no extra key.
- **The aside's correction is a `button` everywhere.** R3 had it as a button in the README and a
  link on the canvas; the canvas markup is now a real `button`.
- **`page.tsx:68-71` is no longer cited for the no-unified-score rule.** Those lines are the perf
  comment about discovery not calling `getRankedList`. The rule stands on §4.1 and on
  `DiscoveryItem` having no `score` field.
- **The four keys with no data path are closed in R3.** `heldHeading` takes the full `name` and its
  body opens "It matches" (`DiscoveryItem` has no short name); `noneBody` loses its index-total
  slot and the clause that used it; `floorPool.ctaNote` is **deleted** rather than fed by a second
  query the README rules out; and `justifyEdit.distanceNear` keeps the shipped **two** arguments,
  dropping a residue that subtracted disjoint sets — the row already prints "7 of 7 tags" beside it.
- **Audit items 4, 5 and 6 are closed in R2, not deferred.** `exclusion.scope` is deleted (it had no
  state and would have printed on every load); `exclusion.floorAlone` now takes `floorPct` and prints
  it, so the floor is claimed nowhere without being printed; and the mobile canvas line is shipped
  `window.revealBand`, both clauses intact — **superseded in R4**, which finds the row search takes
  is `WindowCount`, not `revealBand` (blocker 6), and that this handoff edits **two** shipped
  strings, not one (blocker 5).
- **The theme question.** Section H draws the six themes named in §3 — the six in `globals.css`.
  `design_handoff_the99_theme_replacement` R6 retires Innistrad and Duskmourn for Ixalan and
  Eldraine; if it lands, two cards swap accent hue and nothing else on this surface changes, because
  no geometry here is keyed to a hue.

## Precedent

The last two handoffs on this surface went Green at R1
(`design_handoff_the99_discovery`, `design_handoff_the99_commanders_windowing`). This one keeps
their idioms deliberately: `EndOfRanking`'s furniture for the exclusion line, `NoDecksBanner`'s for
the aside, `FloorEmpty`'s for both list-level search states, `freeNoteLong`'s slot for the exact
note, and the shipped mobile `ScoreAgainst` geometry for the modifier's phone row. **Nothing here
is a new component.**
