# READINESS — Deck versioning (R2)

**Self-assessed: 🟢 Green-seeking. No open Design question, no ruling requested, no redraw pending.**

Both R1.2 Amber items are **closed by the audit**: `Commit as v1` is ruled as drawn (option 1), and
the cost track is card-rows' (Q2/R5) with Hugh's confirmation that the overlap is changing. Neither
needs anything further from this handoff.

**R1.2 redraws every frame against the shipped deck page.** R1 traced the chrome from the game-log
handoff's canvas rather than the live product and invented pill tabs, brass-solid primaries, a
single-column list and a per-row type label. All corrected from a screenshot; the correction table
is at the top of `README.md`. No decision changed as a result — the chrome did.

The audit against the spec's locked decisions is what settles this. Amber rather than green for
one reason, stated first.

## The blocker, answered

**The rows mount `CostPips`. The canvas was corrected to its real output.** R1.2 drew the *mana
value* in the numeral disc; `CostPips` renders the **generic-cost token** and nothing when there is
none. Beast Within `{2}{G}` now reads `2 · G`; Thought Erasure `{U}{B}` has **no disc at all**.

It was an error, not an unstated mode — I drew the figure a reviewer wants to compare in a slot
that already means something else. Consequences, all taken:

- **No fifth atom.** The inventory holds at four new and one deletion.
- **`COST-TRACK.md` is card-rows' business start to finish**, and now stands on its own merits
  rather than on a connection to versioning that did not exist.
- **The disc is conditional**, so it is not a fixed leading element — the track's geometry and
  every row's accessible name vary with the cost.
- **Mana value survives in exactly one place**, the what-changed strip, where it is a deck-level
  statistic. Recorded so a reader reconciling a row against the strip does not read its absence as
  a gap.

**And the cap comes back.** R1.2's "five is the ceiling" confused colour identity with symbols in a
cost. Progenitus is ten symbols, 137px desktop uncapped, and `cost-pips.test.tsx:101` already
asserts against that string. `COST-TRACK.md` is rewritten around a wider track **and** a cap
(5 desktop / 3 phone, `+n` overflow), with the blast radius corrected from two surfaces to five —
two of which are tiles.

## Closed, needing nothing

**The cost track.** Card-rows' component (Q2/R5), and Hugh has confirmed the overlap is changing
for card rows. `COST-TRACK.md` is rewritten as material for that round — corrected cap, corrected
blast radius, corrected shipped metrics. **Versioning is not connected to it**: these rows mount
`CostPips` as shipped and inherit whatever it becomes.

**`Commit as v1` on a versionless full-body deck** — ruled **option 1, as drawn**. The
brass-outline offer at `deckBodySize()` with *locks this list as v1 — nothing about the deck
changes* stands.

## The two open calls, both called

| # | Question | Called |
|---|---|---|
| 1 | Two surfaces make a purchase claim | **One list, three appearances.** Signed deltas in top-off, the deck's bare total in the banner, the list and the **only** Mana Pool link-out in the commit sheet. |
| 2 | Two diffs describe the same deck | **Different operands, one component.** Preview keeps its `Keep` toggles and gains one line; pending changes has none; **the arrival strip is suppressed** on a committed deck. |

`OVERLAPS.md` carries both in full with the rejected alternatives and eight mechanical checks.

## Nothing here asks for a change to the locked decisions

Always-draft, the offered pull, commit-emits-the-list, no-versions-before-the-first-commit,
play-time stamping, per-card seniority (R1), and paste-lands-in-the-draft (R2) are all drawn as
written. **No new column, no new action beyond the four §Modules names, no change to
`draft-diff`'s return shape, no change to the claim model.**

Two places Design put something the spec left open, both reversible:

- **The three add buckets are `draft-diff`'s partition rendered in one order** — free, sleeved,
  not owned — and Design adds no second sort. If the function's partition order differs, the
  function wins.
- **`INLINE_CHANGE_MAX = 6`** is one exported constant beside the copy, read only by the banner.

## Called, not asked — flagged for the record

1. **Removes are not drawn in the decklist.** §Surfaces 1 asks for affected rows marked; only
   adds can be marked, because a removed card is not in the draft. Seventeen strikethrough ghosts
   would be seventeen hit targets that do nothing, on the surface that most needs to stay
   scannable at 101 rows.
1b. **The pending mark is a 2px brass left rule, and it spends no row width.** Corrected in R1
    review against `FLOOR-what-every-card-row-carries.md`: the first draft used a `pending add`
    chip, which displaced roughly 86px of name on nineteen rows at both widths and named nothing
    it displaced. The words moved to one caption above the list plus the row's accessible name.
    **Two figures corrected in R2**: the rule is **2px**, matching `unresolved-row`'s shipped
    `border-l-2` rather than inventing a third left-rule width; and `ROW_PADDING` is
    `pl-[8px] md:px-[9px]`, so the absorb is **9px → 7px desktop and 8px → 6px phone**, not the
    12px/11px R1.2 quoted — those described a row that does not exist. **The ruling survives
    unchanged: no row's grid template changes and no row grows in height.**
2. **The banner has two densities behind one constant**, and it is the handoff's direct answer to
   R2: at 36 rows it states counts, at 2 it names the cards. A single density would either be
   useless at forty or wasteful at two.
3. **Review changes is a page, not a panel or a dialog**, for the reimport reason — a diff longer
   than a modal should be, with its own URL and no focus trap.
3b. **The commit sheet no longer repeats the review page's lists.** Reversed from R1 on review: the
    sheet sat directly beneath the page that already showed the eight priced rows and the released
    names. It now carries the note, one money block with the only Mana Pool link-out, and one
    released count. R1's "last chance to reconsider a pull" argument moved to where the pull
    controls are.
3c. **Review changes' two columns are symmetrical.** Reversed from R1: the removes had a stripped
    300px rail, which cannot support judging a swap. Both sides now carry dot, name and cost track
    under the same type groups.
4. **The commit sheet's two blocks are asymmetrical on purpose.** Buy is a to-do and gets the
   prices, the reasons and the link-out; pull is a receipt and gets four names, a count and *no
   action required*. §Decisions 3 is explicit that commit does not assert the work is done.
5. **No checklist and no "mark as bought" anywhere.** The buy tag is already the outstanding
   state.
6. **Discard names the number, twice**, and names the version it lands on with its date and size.
   Two changes and thirty-six are different acts behind one word.
7. **`Keep editing` takes the brass fill in both confirms**, and on phone it is the **top** of the
   two buttons. Discard is never the primary and never the reachable-first control.
8. **v1 reads `initial` in every position** — rail, opened view, and the opened view has no
   columns at all. `+99` would claim ninety-nine decisions were taken the day the migration ran.
9. **The opened version diff carries no availability, no prices and no pull offers.** It is the
   one place the surfaces could have made a third purchase claim, and it does not.
10. **Each version says how many games it held** — a count, never a rate. §Decisions 5 refuses
    per-version win rates; the count is the honest half and needs no new figure.
11. **The pending draft has no row in history.** A phantom `v3 (draft)` is the `is_draft` column
    the data model refused, drawn.
12. **The game stamp is bare mono, not a chip and not a link.** The log's mark chips are the
    row's only chips; a second chip shape competes for the same glance.
13. **The pull guard is a link, never a disabled button.** The one-click pull is withheld by the
    server, per §Pulling a card, and the client renders whichever affordance the flag names.

## Corrections taken in R2, beyond the blocker

21. **Quantity moves are drawn.** Handoff gap 5 said a quantity change is invisible in both diffs;
    it was wrong twice. `draftDiff` files it as **one** entry carrying `from` and `to` (unlabelled,
    not absent), and #513 already prints reconciled counts by name in the update preview. Every
    diff and version row now renders `{name} {from} → {to}`, **reusing `recountedItem`**. The real
    defect is downstream: `commitDeckVersion` filters basics out of `adds` only, so cutting 3 of 12
    Islands renders a bare **Island** under *back in the pool* — **the pull list must be filtered
    exactly as the buy list is.**
22. **The availability buckets are withdrawn in prose as well as in the canvas.** README §3 and the
    `Bucket` component row were R1 residue; grouping is by type, sorting is alphabetical within a
    group, and `bucket` is a per-row treatment. The accessible statement the bucket heading used to
    carry **moves into the row's accessible name**.
23. **The mix strip is mana value plus the shipped five roles** — `ramp, draw, removal, wipes,
    land`. `body` is not a role in `computeRoleCounts`, and a creature count already sits in the
    type block beside it. **One fold, called twice**, or the two strips disagree on the same screen.
24. **"No new column, and no new query" was true of the schema and false of the reads.** `cards.cmc`
    exists but `DeckDetailCard` carries no mana value, so the strip needs `cmc` in the detail select
    *and* a `deck_version_cards → cards` join for the before-figure. A select and a join, not a
    migration — but planned, not assumed.
25. **`revalidateClaims(deckId, userId)`, not `deckSurfaces()`.** Commit, discard and pull are claim
    writes. The wrong helper would leave every other deck's availability stale after a pull.
26. **`commitDeckVersion` must return the card count** it is asked to print, or the success line
    drops it. One field.
27. **The grouping UI needs extracting first.** `DecklistGroup` and `GroupToggle` live inside
    `decklist.tsx`; "mount the same grouping" is a prerequisite task, not a free reuse.
28. **The pull guard needs a server flag that does not exist**, and there is **a third guard** —
    the card is another deck's commander, which takes the same tag and **no control**, because no
    route releases it.
29. **The game log has no mono column-header row.** The `ver` slot is still drawable; the header
    R1.2 drew it under is removed from the canvas.
30. **Three traced metrics corrected** in `COST-TRACK.md`: the pip is **12px desktop / 13px phone**
    (so the phone proposal *shrinks* it); `card-search-row`'s slot is **34px and `hidden md:flex`**,
    with no phone track at all; and the freed type slot is **120px on the removes variant, 150px on
    the adds**, so "net −30px" understated the adds column.
31. **Two provenance paths fixed.** The spec is `docs/superpowers/specs/…`, and the reimport
    material is `design/design_handoff_the99_amendments/STATES-reimport.md` plus
    `deck-reimport · copy strings.ts`.
32. **`STATES-pending.md` table A re-laid.** Rows renumbered 8 → 12 in sequence, row 8's missing
    cell restored from where it had been appended to 9c.

33. **The buy tag collapses to `$` on a decklist row.** Corrected in R2 from a screenshot: the
    deck card row shows a bare `$` tile and the figure lives under `Shopping` in the split
    `buy │ $65.64` tag. R1.2's "full form everywhere in this feature" was wrong on the surface with
    the least room. **One judgement to ratify:** the review page keeps the full tag, because it is
    the Shopping-equivalent surface for a draft and the price is what `Pull it` is weighed
    against. If the collapse is meant to be universal on rows, that row loses its price and the
    money lives only in the count chips and the commit sheet.

## Not blocking, and worth reading before estimating

14. **Four new atoms and one deletion, and that is the whole inventory**: the pending-add **left
    rule**, the `Pull it` control, the guard's tag + `Open →` (in two variants — `pending` with a
    route, `commander` without), the 44px version slot in the log row — and the **deletion** of the
    per-row type label from `update-diff-row`. **`CostPips` is not among them**: it is read as
    shipped.
14b. **The chrome is all shipped**: cream primary, ghost secondary, text tabs with the brass
    underline, the Cinzel group heading, the mix cell, the count chips, the ownership dot,
    `BuyTag`, `AvailabilityMarker`, the danger button, the textarea, the inline-form container.
14c. **Two traced values want confirming**, both the shipped page's to settle: the group heading's
    plum rule (`#574463`), which is not in the brand sheet's four-step line ramp; and the black pip,
    which reads pinker in the screenshot than the brand's `#5B5566`. If the pink is deliberate, the
    brand sheet's WUBRG table is what needs correcting. Everything else is shipped geometry —
    banner from the provenance panel, chips from the facet strip, rows from `update-diff-row`,
    sheet from the game log's inline form, confirm from the shipped danger button.
15. **Two shipped strings are edited**, both in `deckImportCopy.update`: the arrival strip's
    suppression on a committed deck, and one added line above the preview's groups. Both are
    listed in `deck-versioning · copy strings.ts`. Nothing else shipped is touched.
16. **The reuse was traced from handoff canvases, not component files.** `src/` in this project
    holds only `shell/nav.tsx`. Provenance for each borrowed atom is named in `README.md`; if a
    shipped component disagrees, it wins and the component table is what to correct.
17. **A price atom still could not be located**, only its specification — the same gap deck-tuning
    and top-off both flagged. Figures are drawn in `BuyTag`'s shape and eng substitutes the real
    formatter, staleness and currency included.
18. **The money is one query rendered three times.** If R1's left join is missed, every figure in
    this handoff is wrong by the same amount and none of them disagree with each other about it.
19. **Motion:** the commit sheet's open and close, and nothing else. **No count-up on any total**
    — a buy total that animates looks like a price being calculated, and it is a sum of eight
    known numbers.
20. **Focus after each write** is named: the version line after a commit, the deck name after a
    discard, the row's own control after a pull.

## Corrections taken in R2, beyond the blocker

21. **Quantity moves are drawn.** Handoff gap 5 said a quantity change is invisible in both diffs;
    it was wrong twice. `draftDiff` files it as **one** entry carrying `from` and `to` (unlabelled,
    not absent), and #513 already prints reconciled counts by name in the update preview. Every
    diff and version row now renders `{name} {from} → {to}`, **reusing `recountedItem`**. The real
    defect is downstream: `commitDeckVersion` filters basics out of `adds` only, so cutting 3 of 12
    Islands renders a bare **Island** under *back in the pool* — **the pull list must be filtered
    exactly as the buy list is.**
22. **The availability buckets are withdrawn in prose as well as in the canvas.** README §3 and the
    `Bucket` component row were R1 residue; grouping is by type, sorting is alphabetical within a
    group, and `bucket` is a per-row treatment. The accessible statement the bucket heading used to
    carry **moves into the row's accessible name**.
23. **The mix strip is mana value plus the shipped five roles** — `ramp, draw, removal, wipes,
    land`. `body` is not a role in `computeRoleCounts`, and a creature count already sits in the
    type block beside it. **One fold, called twice**, or the two strips disagree on the same screen.
24. **"No new column, and no new query" was true of the schema and false of the reads.** `cards.cmc`
    exists but `DeckDetailCard` carries no mana value, so the strip needs `cmc` in the detail select
    *and* a `deck_version_cards → cards` join for the before-figure. A select and a join, not a
    migration — but planned, not assumed.
25. **`revalidateClaims(deckId, userId)`, not `deckSurfaces()`.** Commit, discard and pull are claim
    writes. The wrong helper would leave every other deck's availability stale after a pull.
26. **`commitDeckVersion` must return the card count** it is asked to print, or the success line
    drops it. One field.
27. **The grouping UI needs extracting first.** `DecklistGroup` and `GroupToggle` live inside
    `decklist.tsx`; "mount the same grouping" is a prerequisite task, not a free reuse.
28. **The pull guard needs a server flag that does not exist**, and there is **a third guard** —
    the card is another deck's commander, which takes the same tag and **no control**, because no
    route releases it.
29. **The game log has no mono column-header row.** The `ver` slot is still drawable; the header
    R1.2 drew it under is removed from the canvas.
30. **Three traced metrics corrected** in `COST-TRACK.md`: the pip is **12px desktop / 13px phone**
    (so the phone proposal *shrinks* it); `card-search-row`'s slot is **34px and `hidden md:flex`**,
    with no phone track at all; and the freed type slot is **120px on the removes variant, 150px on
    the adds**, so "net −30px" understated the adds column.
31. **Two provenance paths fixed.** The spec is `docs/superpowers/specs/…`, and the reimport
    material is `design/design_handoff_the99_amendments/STATES-reimport.md` plus
    `deck-reimport · copy strings.ts`.
32. **`STATES-pending.md` table A re-laid.** Rows renumbered 8 → 12 in sequence, row 8's missing
    cell restored from where it had been appended to 9c.

33. **The buy tag collapses to `$` on a decklist row.** Corrected in R2 from a screenshot: the
    deck card row shows a bare `$` tile and the figure lives under `Shopping` in the split
    `buy │ $65.64` tag. R1.2's "full form everywhere in this feature" was wrong on the surface with
    the least room. **One judgement to ratify:** the review page keeps the full tag, because it is
    the Shopping-equivalent surface for a draft and the price is what `Pull it` is weighed
    against. If the collapse is meant to be universal on rows, that row loses its price and the
    money lives only in the count chips and the commit sheet.

## Not blocking

- No new token, no new hex, no new motion class, no modal, no toast, no tray, no confirm dialog,
  no tooltip, no virtualisation, no pagination.
- Nothing in this feature blocks a commit — not the cap, not the note, not an unbought card. The
  version records what is true.
- Nothing over 99 is refused, dimmed or warned about beyond the shipped over-99 count.
- No count of nought is ever drawn: no `−0`, no empty bucket heading, no empty column, no
  "no pending changes" panel.
- Every figure is full-opacity ink. `--danger` appears only on Discard; losing a card is not an
  error and a removal is never red. The only dimmed element on the canvas is the struck-through
  arrival strip, which is labelled as **rejected**.
- **Card-row parity holds without exception.** Name + one availability slot on every row with an
  oracle id; the sleeved bucket's marker-plus-price is the floor's own ratified pair, not a second
  occupant; canonical metrics untouched; the mobile ledger for both affected row types is drawn on
  the canvas. **Neither mana affordance is touched** — this feature draws on `decklist-row` and
  `update-diff-row`, neither of which has a pip track, so the desktop shingling is neither
  inherited nor worsened, and a pip redesign has no dependency on this handoff.
- Targets: 44px minimum for every banner and apply-bar control at 390px (48px for the two
  primaries); `Pull it` and the guard link both 44px on phone; diff rows 40–46px desktop,
  46–52px phone; version rail rows 64px on phone.
- Every figure on the canvas is arithmetically consistent with the mock deck: +19 / −17 = 36
  changes, 99 − 17 + 19 = 101 cards, 11 + 5 + 3 = 19 adds, 8 with no free copy,
  `$132.80 + $121.30 = $254.10`, and `$254.10 − $28.40 = $225.70` after the drawn pull.
