# READINESS — Deck versioning (R1.2)

**Self-assessed: 🟡 Amber. Two rulings requested, one spec-adjacent addition, no redraw pending.**

**R1.2 redraws every frame against the shipped deck page.** R1 traced the chrome from the game-log
handoff's canvas rather than the live product and invented pill tabs, brass-solid primaries, a
single-column list and a per-row type label. All corrected from a screenshot; the correction table
is at the top of `README.md`. No decision changed as a result — the chrome did.

The audit against the spec's locked decisions is what settles this. Amber rather than green for
one reason, stated first.

## What blocks a green

**Ruling 2 — the cost track.** Putting mana on diff and version rows mounts `CostPips` on two new
surfaces, and it shingles: the numeral is cropped by the first pip and two same-coloured pips read
as one. `COST-TRACK.md` proposes a 90px / 76px five-slot track with no overlap, paid for by the
type column that grouping deletes. **That component is card-rows' (Q2/R5), and widening it changes
`card-search-row` and `decklist-row` too**, so the ruling is theirs. Versioning does not depend on
it — the new rows inherit whatever ships. Amber because it is an open request, not because anything
here waits on it.


**The `Commit as v1` offer on a versionless full-body deck is Design's addition, not the spec's.**
§Decisions 4 says a deck with no version edits live, and the migration stamps existing full-body
decks — which leaves no route to a first version for a deck built *after* this ships. Design drew
a brass-**outline** `Commit as v1` in the spine, appearing at `deckBodySize()`, with the line
*locks this list as v1 — nothing about the deck changes*.

Three ways this could go and all three are cheap:

1. **Keep it as drawn.** The player chooses when their claims go hard.
2. **Stamp v1 automatically at a full body.** Consistent with the migration, and it makes a
   deck's claims go hard without anyone asking — the class of thing this design exists to
   prevent.
3. **Neither, and a deck gets its first version some other way.** Then this is a delete, not a
   redraw.

Design's preference is 1. **Whichever way the audit rules, nothing else in the handoff moves.**

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
1b. **The pending mark is a 3px brass left rule, and it spends no row width.** Corrected in R1
    review against `FLOOR-what-every-card-row-carries.md`: the first draft used a `pending add`
    chip, which displaced roughly 86px of name on nineteen rows at both widths and named nothing
    it displaced. The rule is absorbed by the row's existing padding — left padding 12px → 10px
    desktop, 11px → 9px phone — and the words move to one caption above the list plus the row's
    accessible name. **No row's grid template changes and no row grows in height.**
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

## Not blocking, and worth reading before estimating

14. **Four new atoms and one deletion, and that is the whole inventory**: the pending-add **left
    rule**, the `Pull it` control, the guard's `pending` tag + `Open →`, the 44px version slot in
    the log row — and the **deletion** of the per-row type label from `update-diff-row`.
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
