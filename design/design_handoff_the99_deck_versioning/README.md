# The 99 — Deck versioning (design handoff, R2)

**#389.** Source of truth: `docs/superpowers/specs/2026-09-09-deck-versioning-design.md`.
Audit: `docs/superpowers/gap-report-deck-versioning.md` (R1.2, 🟠 Orange) — answered by this round.
`design_handoff_the99_game_log/` is the structural sibling — same deck page, same
"history of a thing" shape, same folder convention, same READINESS format.

File: `The 99 - Deck Versioning.dc.html` (canvas — pan/zoom). Read
`design_handoff_the99_richness/README.md` for the locked voice before auditing the copy,
`STATES-pending.md` for the state matrix across all five surfaces, `OVERLAPS.md` for the two
calls the spec left open, and `deck-versioning · copy strings.ts` for production-final copy.

---

## R2 — the blocker, answered

**The rows mount `CostPips`. The canvas was wrong, and it is corrected.**

R1.2 drew the **mana value** in the numeral disc — 3 for Beast Within's `{2}{G}`, 2 for Thought
Erasure's `{U}{B}`. `CostPips` renders the **generic-cost token**, and nothing when there is none.
Two different atoms, and the handoff asserted the shipped one.

It was an error, not an unstated mode: I reasoned about what a reviewer wants to compare — mana
value, which is also what the what-changed strip reports — and drew that number in a slot that
already means something else. **Every track on the canvas is now `CostPips`' output.** Beast Within
reads `2 · G`; Thought Erasure has **no disc at all**, two pips.

Three consequences, matching the gap report's three:

1. **No fifth atom.** The inventory holds at four new plus one deletion.
2. **`COST-TRACK.md` is card-rows' business start to finish.** Versioning is not connected to it,
   so the amendment now stands on its own merits — which is a weaker position honestly stated
   rather than a stronger one borrowed.
3. **The ceiling argument was wrong and the cap comes back.** See below.

Two things worth naming that follow from the disc being conditional:

- **It is not a fixed leading element**, so the track's geometry and every row's accessible name
  change with the cost.
- **Mana value now appears in exactly one place** — the what-changed strip, where it is a
  deck-level statistic. A reader reconciling a row against the strip will not find the row's
  number, because the row does not carry one. That is correct, and it is stated here so it is not
  read as a gap.

**The cap survives, and R1.2's argument for dropping it was wrong.** Colour *identity* caps at
five; a mana *cost* repeats colour symbols freely. Progenitus is a legal commander at ten symbols —
137px desktop uncapped — and `cost-pips.test.tsx:101` already asserts against that exact string.
`COST-TRACK.md` is rewritten around a wider track **and** a cap (5 desktop / 3 phone, `+n`
overflow), with the blast radius corrected from two surfaces to five.

### Both self-flagged Amber items closed by the audit

`Commit as v1` is **ruled as drawn** (option 1) and the cost track is card-rows'. Neither needs
anything further from this handoff.

---

## R1.2 — redrawn against the shipped deck page

R1 drew the deck page from the game-log handoff's canvas rather than the live product, and got the
chrome wrong. Corrected from a screenshot of `/decks/hd-tune-mutant-menace`, and **every surface
in this handoff now inherits that chrome rather than inventing a parallel one**:

| R1 drew | The product has |
|---|---|
| Pill tabs labelled `Decklist · 99` | **Text tabs with a 2px brass underline**, labelled `Your deck` / `Consider` / `Games`, count in brass beside the label |
| Brass-solid primary buttons | **A cream primary** (`#E8E4D6` fill, `#14110E` label) and a ghost secondary. Brass is for links, counts, toggles and the tab underline — **not fills** |
| No commander art | **A 230px art plate** with a `⛶ Card details` pill overlay |
| A hand-rolled counter strip | The **`RECOMMENDED MIX`** strip — five cells, `rec n` bottom-left, `consider →` bottom-right, `Why these numbers?` beneath |
| No list toolbar | `All n` / `Shopping n` pills · a mono right note · `By type` / `By role` · two view-mode buttons |
| One column of rows, a type label per row | **Two columns of rows, grouped under Cinzel type headings** with a plum rule and a count |
| No mana on rows | **A cost track on every row** |

Two things the screenshot also settled: the deck is **The Wise Mothman, Sultai** (R1 invented a
commander), and the shipped over-cap treatment is a **`2 over` pill** beside the colour squares
plus a second bar segment — not a recoloured count.

**The one-line summary:** *the draft arrives forty rows at a time.* Addendum R2 says the normal
way pending changes get populated is a paste from Deckcheck, so every surface here is drawn at
**36 changed rows first** and checked downwards at two. That single fact decides most of the
handoff: counts over names, type groups over per-card treatments, and a review page rather than a
panel.

**Where the reuse was read from.** `src/` in this design project holds only `shell/nav.tsx`, so
component geometry is traced from the handoffs that drew it: the diff row, group headers and
count chips from `design/design_handoff_the99_amendments/STATES-reimport.md` and
`deck-reimport · copy strings.ts` (`update-diff-row`, the four-group page, the facet-strip chip); the buy tag, ownership dot and availability slot from
`design_handoff_the99_card_surfaces/` and `design_handoff_the99_card_rows/`; the buy-list
arithmetic and commit-row grammar from `design_handoff_the99_top_off/`; the inline form
container, the inline confirm and the history row from `design_handoff_the99_game_log/`; tokens
from the copied `brand/`. **If the shipped components disagree with the canvas, the components
win** and the component table below is what to correct.

---

## The two open calls

| # | Call | Answer |
|---|---|---|
| 1 | Two surfaces make a purchase claim (top-off + commit) | **One list, three appearances, and the grammar tells you which is which.** A `+` prefix means a contribution; a bare figure means the deck's position; the Mana Pool link-out appears **once**, on the commit sheet. |
| 2 | Two diffs describe the same deck (update preview + pending changes) | **Different operands, one component, and the transient one gives way.** Preview diffs paste-vs-draft and keeps its `Keep` toggles; pending diffs draft-vs-version. On a committed deck the update flow's **arrival strip is suppressed**. |

Both are the same shape and are drawn together in the canvas's last-but-one section:
*a surface that used to be the last word is now a step in a longer sentence.* Neither surface is
deleted; each **changes tense**, and the surface that owns the moment keeps the full treatment.
`OVERLAPS.md` carries the reasoning, the rejected alternatives and the mechanical checks.

## Frames delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| 1 | Pending state, 36 changed rows — banner, marked decklist, draft-reading counters | ✓ | ✓ |
| 1b | The same banner at 2 changes (names inline) | ✓ | — (same rule) |
| 1c | Committed and clean — the resting state | ✓ | — (same line) |
| 1d | No versions yet — brew below a full body, and brew **at** a full body | ✓ | — (same rule) |
| 2 | Review changes — what-changed strip, two equal columns, type groups, pull offer, the guard | ✓ | ✓ |
| 3 | Commit sheet — note, money block, released block, link-out | ✓ | ✓ |
| 4 | Discard — the confirm, in place | ✓ | ✓ |
| 5 | Versions — **the fourth tab**, the rail, v2 opened with type groups, **v1 with no predecessor** | ✓ | ✓ |
| 6 | The game log stamp — v2, v1 backdated, and null | ✓ | ✓ |
| 7 | **The cost track** — shipped vs proposed, the five-colour ceiling, 390px | ✓ | ✓ |
| 8 | The two overlap calls, drawn side by side | ✓ | — (no surface of its own) |
| 9 | New atoms, the card-row ledger, targets, motion, announcements | ✓ | ✓ (noted) |

---

## Decisions log

### 1. Pending state is a **banner with three buttons**, and it has two densities

It is not a toast, not dismissible, and not a badge. The deck genuinely is in this condition
until the commit, and hiding that is how somebody takes a list to a table they have not built.

**The two densities are one construct and one constant, `INLINE_CHANGE_MAX = 6`:**

| Changes | Banner body | Primary |
|---|---|---|
| 1–6 | **The names**, each with its `+`/`−` and its buy tag or release note | `Commit as v3`, with `review changes` demoted to a link |
| 7+ | **The counts** `+19 / −17`, one sentence of money, and nothing else | `Review 36 changes` |

At two changes the review page is a page you open to read two rows you have already read. At
thirty-six the names cannot fit and the counts are the honest summary. Nothing else in the banner
moves between the two, and there is no second banner.

**The banner carries the money before the review page** — `8 to buy · $254.10`. That one figure
is what decides whether the review is worth opening, and it is why the banner earns its height.

**`101 / 99` is `--warning` and blocks nothing.** Sitting over the cap while thinking is the
tinkering the feature exists for (§Surfaces 1 says 104 is a real number the page shows without
complaint). The existing over-99 treatment is reused unchanged, and commit does not validate the
body size either.

### 2. **Removes are not ghosted back into the decklist**

§Surfaces 1 asks for the affected rows marked in the decklist. Only **adds** can be: a removed
card is not in the draft, so there is no row to mark. Drawing seventeen strikethrough ghosts in
alphabetical position would invent a row that is not in the deck — seventeen of them at 101 rows,
every one a hit target that does nothing, on the surface that most needs to stay scannable at
that length. Removes live in the banner (at ≤6) and on the review page (always).

**The mark is a 3px brass left rule, not a chip — and this is a correction to R1's first draft.**
`FLOOR-what-every-card-row-carries.md` makes horizontal room the binding constraint and requires
every addition to name what it displaced. A `pending add` chip displaces roughly 86px of name on
every one of nineteen rows, at both widths, on the surface with the least room and the most
trailing controls. **The left rule displaces 2px of padding and nothing else:** left padding drops
12px → 10px desktop and 11px → 9px phone, so the name's left edge does not move, and radius,
height, gap and every slot are unchanged.

**The words are said once, above the list** — *the brass rule marks the 19 rows this draft added* —
not nineteen times inside it. Nineteen chips is one sentence repeated nineteen times at the cost of
the name column. The caption is the sighted reader's key; the row's accessible name carries
`pending add`; and the banner's `+19 / −17` is the authoritative statement either way. The row
mark is a **locator**, not the claim, which is what makes a colour-only row treatment legitimate
here where it would not be on `card-search-row`.

The shipped precedent is a row-level fact drawn as a row-level property: `unresolved-row`'s
warning left rule, and the brand sheet's status row (`3px` left border in the state colour).
`--accent` is unused as a left rule on `decklist-row` today, and it is a different hue from the
warning rule it sits beside.

**Rejected:** a signed delta in the Decklist pill (`Decklist · 101 · +19`). The pill row counts
things; the game log already rejected `Games · 2–1` for being a different kind of number in the
same clothes.
**Rejected: a ring or fourth state on the ownership dot.** That dot means *your copies of this
card*; pending-add means *this row is not in the version yet*. Overloading it is the second-voice
problem the floor names, in the one slot that can least afford it.
**Rejected: a fill tint** (`--elevated-hover` + `--accent-shadow`). That pair already means
*this row is opted out* on the re-import diff's kept row, and reusing it would collide.
**Rejected: a chip on desktop and a rule on phone.** A marker that changes shape by width is a
second information architecture — the same argument the re-import R2 ruling made about the `⋯`
menu.

### 2b. Rows are **grouped by type**, and no row carries a type label

Adopted from the deck page, which already groups under `CREATURES 30` headings with a `By type` /
`By role` toggle. Applied to **every** surface this handoff draws: pending state, both columns of
review changes, and every version diff.

This is the single change that paid for everything else on the row. The 120px per-row type column
comes **off** `update-diff-row` and never appears on a version row, which is what makes room for
the cost track. Type read once per group beats type repeated once per row at 36 rows, and it means
a reader moving between the deck page and a diff sees the same shape of list.

The group heading also carries **the per-group count of added rows** (`12 added in this draft`), so
grouping by type doubles as a map of where the draft happened.

### 2c. Every card row carries the **cost track**

Mana value is the thing you judge a swap by — *Necrotic Ooze out, Cyclonic Rift in* is unreadable
without both costs — so the track appears on diff rows, version rows and the inline banner names.
Same atom everywhere, right-aligned in a fixed slot.

**And it stops shingling.** `COST-TRACK.md` carries the proposal in full: 90px / 76px track, 3px
gaps, numeral first. A Commander deck's identity is at most five colours by the rules of the
format, so a five-slot track is the ceiling, not a common case — there is no overflow to specify.
**That is an amendment request to card-rows, not a local change**, and this handoff does not depend
on it: the new surfaces inherit whatever `CostPips` is on the day they ship.

### 3. Review changes is a **page**, and both columns carry the same row

A page for the reimport reason: the diff is longer than a modal should be, at any realistic
paste, and a modal that scrolls for thirty-six rows is a page with a trap on it. Own route,
`/decks/[id]/changes`, back-navigable.

**Two equal columns, same row anatomy on both sides.** R1 gave the removes a stripped 300px rail
on the theory that nobody acts on them. That was wrong for the job: you are judging a *swap*, and
you cannot judge one without both mana values in front of you. Corrected — dot, name, cost track,
type groups, on both sides.

**Every row opens the card**, the same click target as every other card row in the app after eng's
click unification. No chevron, no icon; hover is `--elevated-hover` with `open card →` in the meta
slot. The pull control is the row's one nested action and stops propagation.

**There are no availability buckets — corrected in R2.** R1 grouped the adds into
free → sleeved → not owned. R1.2's canvas replaced that with type groups everywhere (§2b) and this
prose was left behind; the canvas wins. Three consequences, all improvements:

- **Bucket headings are deleted**, and so is the `Bucket` header style in the component table.
- **Ordering is alphabetical inside a type group**, not `bucketAdds`' order — which sorts by
  oracle UUID and would have handed the player an arbitrary sequence.
- **`bucket` becomes a per-row treatment, not a grouping key**: the ownership dot, the holding
  deck's name, the marker and `BuyTag` carry it on the row.

All nineteen adds are still on screen at once, because the question the page answers — *what does
this cost* — is an addition across all of them, and the count chips carry the totals.

**The availability word moves into the row's accessible name.** `OwnershipDot` is `aria-hidden`
and the bucket heading used to be the accessible statement; with the heading gone that statement
needs a home, and it takes the same remedy as the pending-add rule.

**No `Keep` toggle on the removes**, unlike the update diff. There a removal is a consequence of
a paste about to be applied, and the toggle is the confirm. Here it has already happened, and the
way to reverse it is to add the card back on the deck page. A toggle would be a second, weaker
route to an edit that already has one.

**At 390px the two directions become a segmented pair.** 19 + 17 stacked is a scroll with no
landmarks. The count chips stay above the segments so the money is readable without picking a
side.

**Rejected: one in/out list sorted by name.** Reads well at four rows and fails at thirty-six —
the eye cannot separate two interleaved directions, which is precisely the hand cross-compare
this page exists to replace.

### 3b. Review changes carries a **what-changed strip**

Six cells in the deck page's own mix-cell shape with a `→` in them — mana value, removal, draw,
ramp, body — plus a type-distribution block showing before, after and delta per type. No new
construct; the cell is the shipped one.

**Mana value joins as a sixth cell** because it is the one figure the mix strip never carried and
the one a tuning pass moves most: `3.10 → 2.92` on this draft.

The strip earns its height on one fact: **removal crosses its recommendation** (`3 → 9`, rec 8) and
turns `--success`. The row lists say *what* changed; the strip says *whether it worked*, and
nothing else on the page can tell you that.

On the deck page the same movement is shown in place — while a draft exists, each mix cell's
bottom-left slot reads `was 7` instead of `rec 10`.

### 4. The pull offer is **one per card, named, neutral, and never the default**

Per §Decisions 2. `Pull it` is a 34px (44px phone) neutral control, `1px --border`, `--accent`
label — **never brass-solid**, because pulling a card out of somebody else's box is a physical
act the app must not lean on. The full buy tag sits beside it, so the two options are priced
against each other in one glance: `buy $28.40` or `Pull it`.

**The guard is four letters and a button.** Birds of Paradise is held by Kinnan Ramp, which has
pending changes of its own, so there is no one-click pull.

R1 wrote the reason out as a two-line link — `that deck has its own pending changes →` — which was
too long visually and in copy, and made the guarded row a different width from a pullable one.
Corrected: **the deck name is already on the row**, so the reason rides it as a mono `pending` tag
in the buy tag's shape, and the action is **`Open →`** in `Pull it`'s slot at the same 34px / 44px
geometry. `pending` is the word the product already uses for this condition; the full sentence
lives in the control's accessible name.

Still a link and not a disabled button: a greyed `Pull it` with a tooltip would be a dead control
where a live one is needed, and it would hide the only way forward.

**Accepting a pull re-prints the arithmetic**: buy list 8 → 7, total `$254.10` → `$225.70`, and
the source deck gains a version. Announced once. No animation on the figure.

### 5. Commit is a **sheet**, not a button — one surface, two entry points

It carries a note field, an eight-row priced buy list and a seventeen-name pull list. That is not
a button's worth of consequence. It expands in place at the foot of the review page (the game
log's inline-form pattern), and `Commit as v3` on the banner navigates to the review page with
the sheet already open. **One commit surface**, so there is one place where the buy list is
printed and one place where the note is offered.

**The sheet does not repeat the lists — corrected in R1.2.** R1 drew the eight priced buy rows and
six pull names inside the sheet, which sat directly beneath the review page that already showed
them: the same two lists on screen twice inside one scroll. *A confirmation step that re-lists what
you just read is not a confirmation, it is a second copy.*

What the sheet keeps is what only it can say — each a fact about **committing** rather than about
the diff:

- **The note.**
- **One money block**: `8 · $254.10`, the breakdown `3 not owned · 5 still sleeved elsewhere`, and
  the **only Mana Pool link-out in the feature**.
- **One released block**: `17`, and *no action required*.

R1's argument for the rows was *the last chance to reconsider a pull*. That argument survives, but
it belongs where the pull controls are — the review page — so the money block links back up, and
the word is **still**: five pulls are on the table and you have not taken them.

The two blocks stay asymmetrical, per §Decisions 3: buy is `--warning` on a hairline with the
link-out, released is quiet. Same asymmetry as R1, a fifth of the height.

**No checklist, no tick boxes, no "mark as bought."** The buy tag *is* the outstanding state and
is already the app's answer to *what do I still need*. A second place to say it is done is a
second place to be wrong.

**The note warns that it is now or never**, per §Surfaces 3, is optional, and is **not
pre-filled**. A generated note ("19 in, 17 out") is the diff again, and the diff is already
stored.

### 6. Discard **names the number**, and names what you land on

Unrecoverable, so it confirms first — the bar #476's bulk keep took. Two things separate it from
every other confirm in the product:

- It says **`Discard 36 changes?`**, on the question and on the destructive button. Discarding
  two changes and discarding thirty-six are different acts behind one word, and the size of the
  loss is the whole decision.
- It says **what you land on**: *v2 as committed on 14 Mar — 99 cards.* A confirm that only asks
  "are you sure" makes you remember what the version was.

**Inline, in the banner's own box** — the product owns no confirm dialog (the game log confirms
in its row, the bulk keep in place, the update flow on a page). `Keep editing` takes the brass
fill in both widths; `Discard` is the shipped danger button, unchanged. **At 390px the safe
action is on top**, because the thumb reaches the bottom row first and the bottom row is the
unrecoverable one.

**Rejected:** a type-the-deck-name confirm (that is for deleting a deck); an undo window after
discard (needs a toast the product does not have, and the draft genuinely is not stored — an undo
would have to become storage, which is versioning the draft, which §Data model refused).

### 7. History is the **fourth tab**, and **v1 reads `initial`**

**`Versions · 3` sits in the tab row beside Games** and routes to `/decks/[id]/versions`. R1 hid
history behind a mono line under the deck name, which nobody would find — this is the deck page's
own navigation, and it already holds the other "history of a thing". Count rules as shipped: the
count is absent at zero, the tab never is.

**On a deck with no version the tab is absent entirely**, not empty. §Decisions 4 — a brew has no
history, and a tab explaining that is a tab advertising its own emptiness.

A rail of versions with number, date, note, mana value and `+n / −n`; opening one shows it against
its predecessor in two columns, **grouped by type and carrying the cost track**, like every other
card list in the app. Each version also carries its mana value in the rail, and the opened diff
shows the shift (`3.34 → 3.10`) — the one comparison stat that is free from the snapshot, and what
makes a two-year-old version legible at a glance.

- **v1 reads `initial`, never `+99`** — in the rail *and* in the opened view, which has no
  columns at all, just the sentence and a route into the list. `+99` would claim ninety-nine
  decisions were taken on the day the migration stamped a list that was already there.
- **The opened diff carries no ownership dot, no prices and no pull offers.** It is a record of
  what the deck *was*, so the version row is the lightest of the three row types: name and cost
  track. A buy tag on a 2024 version would price a decision nobody is making, and it is the one
  place these surfaces could accidentally make a third purchase claim.
- **Each version says how many games it held** — a count, no rate, no comparison. §Decisions 5
  refuses per-version win rates; the count is the honest half, and it is the join the game-log
  stamp makes possible.
- **A missing note prints `no note`** in italic `--fg-faint`. The note was offered once and
  declined; history does not nag.
- **The pending draft is not in the rail.** Only committed versions are listed. A phantom
  `v3 (draft)` row is the `is_draft` column the data model refused, drawn.
- **No restore, no revert, no rollback.** Out of scope, and it would be a new mutation with an
  unspecified claim consequence.

### 8. The game stamp is **one 44px slot of bare mono**

Between the meta and the marks. Mono 10.5px `--fg-faint`; em dash in `--fg-locked` when null.
**Not a chip** — the log's mark chips are the row's only chips and they carry meaning; a second
chip shape in the same row competes for the same glance. **Not a link** — it would make a 44px
target out of a label in a row that already has a delete button, and history is one tap from the
deck page.

The canvas draws all three cases: `v2` on recent games, **`v1` on a game played 11 Mar and
logged the following week** (the stamp follows the play date, per §Decisions 5), and `—` on a
2024 game from before the feature shipped.

**The aggregate panel does not read the stamp.** No per-version buckets, no "since v2" filter,
no split summaries. §Decisions 5 and §Out of scope both refuse it; this handoff draws exactly the
groundwork and no more.

### 9. "No versions yet" has **two** sub-states, and the second one needed a call

§Decisions 4 says a deck with no version edits live, exactly as today. Drawn literally that is a
brew with **nothing added at all** — no version line, no commit, no history link. That is the
first sub-state and it is correct.

But it leaves a hole the spec does not close: the migration stamps existing full-body decks, and
a *newly built* deck at 99 would then never get a v1. So the second sub-state:
**at a full body (`deckBodySize()` — the same line the migration drew), a versionless deck is
offered `Commit as v1`**, brass **outline**, with the mono line *locks this list as v1 — nothing
about the deck changes*. Outline and not solid because committing v1 makes this deck's claims
hard, which is a real consequence and not the app's goal for you.

If eng would rather stamp v1 automatically at a full body, that is a spec change, not a redraw —
but it would make a deck's claims go hard without anyone asking, which is the class of thing this
design exists to prevent.

---

## Component notes

Hexes live only in `globals.css`. **Three new atoms. No new token, no new hex, no new motion
class, no modal, no toast, no tray, no confirm dialog.**

| Component | Spec |
|---|---|
| **Pending banner** | The shipped provenance panel's box: `--surface-rail` on `1px --border-strong`, `border-left 3px --accent`, radius 10px, padding `14px 16px`. Mono 10px uppercase `--accent` label; counts mono 13px (`--success` / `--warning`, `/` in `--border-strong`); one 13px `--fg-body` sentence carrying the money; three controls. Not dismissible, not a live region. |
| **Banner controls** | `Review {n} changes` brass solid 13.5px `10px 18px` radius 8px · `Commit as v{n}` brass outline · `Discard` neutral ghost. Phone: primary 44px full width, the other two on a 44px row, Discard fixed 96px. At ≤6 changes Commit takes the solid and Review becomes a mono link. |
| **Pending-add rule** | **New, and it is not a slot occupant.** `border-left: 2px solid --accent` — matching `unresolved-row`'s shipped `border-l-2` rather than inventing a third width. Against `ROW_PADDING`'s real `pl-[8px] md:px-[9px]`, left padding absorbs to **7px desktop / 6px phone**, so the dot does not move. Radius, height, gap and every slot unchanged. Decoration: the accessible name carries `pending add`. |
| **Pending-list caption** | **New.** One mono 10px `--fg-faint` line above the decklist: `the brass rule marks the {n} rows this draft added`. Replaces nineteen chips with one sentence. |
| **Change-name line** (≤6 banner) | 32px row: mono 12px `+`/`−` in `--success`/`--warning` (13px fixed gutter), name 13.5px `--fg`, then either the shipped `BuyTag` + `or pull from {deck}` in `--fg-faint`, or `back in the pool on commit` in `--fg-locked`. |
| **Review page** | Own route. `max-width 1180px` desktop, padding `24px 26px`; phone `14px` with a route dock. **Two equal columns** (`flex:1` each), gap 22px. Phone: a segmented in/out pair. |
| **Count chips** | The facet strip's construct verbatim: radius 999px, `--surface` on `1px --border-strong`, figure mono 13px, label mono 11px `--fg-body`. In `--success`, out/to-buy `--warning`, pullable `--accent`. The to-buy chip carries the total as a second mono 11px `--warning` figure. |
| **Direction header** | Mono 11px uppercase `letter-spacing .16em`, `--success` / `--warning`, `border-bottom 1px --border`, `padding-bottom 10px`, with a mono 10px `--fg-locked` right slot. One per column. |
| **Type group heading** | The deck page's own: Cinzel 700 14px (13px in a version diff) `letter-spacing .04em` uppercase, a mono 11px `--fg-faint` count, and the plum rule beneath. Carries `{n} added in this draft` on the pending decklist. **There is no bucket header** — R1's availability buckets are withdrawn. |
| **Diff row** | `update-diff-row` geometry: 40px min-height (44px when it carries a pull control), `--surface` on `1px --border`, radius 7px, `padding 0 9px`, gap 9px. Slots: `OwnershipDot` 7px · name 13px ellipsed (with `{from} → {to}` in mono 11.5px `--fg-faint` when a quantity moved) · holding deck + markers · **`CostPips`** · action. **No type slot** — the type group heading carries it. Phone 44–52px, the meta line yields first. |
| **Ownership dot** | The shared `OwnershipDot`, three states as shipped: filled `--success` free, filled `--avail-hard-fg` (drawn `--accent`) sleeved elsewhere, `1px dashed --fg-locked` unowned. `aria-hidden`; the bucket heading is the accessible statement. |
| **`Pull it`** | **New.** 34px tall desktop / **44px phone**, radius 7px, `1px --border`, label 12px 600 `--accent`, `padding 0 12px`. Never solid, never the row default. In flight: `Pulling…`, disabled, in place, nothing unmounts. |
| **Pull guard** | **Two variants, both in `Pull it`'s slot.** *Pending:* a mono 9.5px uppercase `pending` tag in `BuyTag`'s shape beside the deck name, then `Open →` — neutral label, 34px / 44px, same width class as a pullable row. *Commander:* the same tag reading `commander` and **no control**, because no route releases it. Full sentences in the accessible name. Needs a server flag that does not exist yet. |
| **Buy tag** | The shipped `BuyTag`, in **both** its shipped forms. **Collapsed** on a decklist row in the `All` view — a 22px `$` tile, `--warning` glyph on `rgba(warning,.13)` and `1px --accent-shadow`, radius 6px, **no figure**. **Full** under `Shopping` and on the review page — the split `buy │ $65.64` tag. Never the R1.2 single-segment `buy $58.20`, which is not a shipped shape. |
| **Availability marker** | The shipped `AvailabilityMarker`, count-only — `◆ none free`. On a sleeved-elsewhere add it pairs with the price: the floor's **ratified legitimate pair** (you own it, and buying another is still a move), not a hand-rolled second occupant. On the decklist it collapses to the bare `◆` glyph, as shipped. |
| **`CostPips`** | **Read, not forked, and not amended here.** The shipped component: the disc is the **generic-cost token** and is **absent** when the cost has none; one pip per coloured symbol; `cap` respected. Mounted unchanged on diff rows, version rows and the ≤6 banner names. Whatever card-rows rules on `COST-TRACK.md` lands here automatically. |
| **Commit sheet** | `--surface` on `1px --border-strong`, radius 12px, padding 20px — the game log's inline form container. Cinzel 21px heading (19px phone), 13.5px `--fg-body` lede, note block, two lists, apply bar. Opens with the shipped panel transition. |
| **Note field** | The shipped textarea: `--base` on `1px --border-strong`, radius 8px, `11px 13px`, min-height 70px (76px phone), 13.5px `--fg`. No placeholder copy beyond the label; mono 10px `--fg-locked` warning beneath. |
| **Money block** | `--base` on `1px --accent-shadow`, radius 10px, `14px 16px`. Mono 10px uppercase `--warning` label, then `{n}` at 24px and the total at 17px, both `--warning`; a mono 10.5px breakdown (`3 not owned · 5 still sleeved elsewhere`) linking back to the review page; then the link-out. **No card rows** — they are one screen up. |
| **Released block** | Same box on `1px --border`. Mono 10px uppercase `--success` label, `{n}` at 24px, and one mono 10.5px sentence carrying *No action required*. **No names.** |
| **Mana Pool link-out** | The shipped link-out control, `1px --border` ghost, `--accent` label 12.5px. **Exactly one instance in this feature.** Phone 44px full width. |
| **Discard confirm** | The banner's box with `border-left 3px --danger`; mono 10px uppercase `--danger` question; 13px `--fg-body` consequence naming the version, its date and its size; shipped danger button (`--danger` ink, `1px #4A2F28`) + brass-solid `Keep editing`. **Phone: `Keep editing` on top.** |
| **Version rail row** | 48px desktop / 64px phone (three lines), `--surface` on `1px --border`, radius 9px, `12px 14px`. Current version: `--surface-rail` on `1px --border-strong` + `border-left 3px --accent` + a `current` marker in the pending-add marker's shape. Number mono 13px in a fixed 34px slot; note 13.5px `--fg`; mono 10px `--fg-faint` date · size; `+n / −n` mono 12px, or `initial` in mono 12px `--fg-faint`. |
| **Opened version diff** | `--surface-rail` panel, radius 12px, padding 18px. Cinzel 18px `v2 · 14 Mar 2026`, note beneath, mono 10px right block (`{n} cards · {commander}` / `held {n} games`). Two equal columns, 38px name-only rows. **No dot, no price, no marker, no action.** Phone: segmented In/Out, 44px rows. |
| **v1 opened** | No columns. The shipped provenance shape (`--surface-sunken`, `border-left 3px --accent`, 20px `i` disc) carrying `Initial` + one sentence + `Browse the 99 cards →`. |
| **Game version slot** | **New.** Fixed 44px between meta and marks, bare mono 10.5px `--fg-faint`; `—` in `--fg-locked` when null. Phone: on the meta line, right of the date. Column header `ver` in the log's existing mono 9.5px header row. |

## Notes for engineering

- **Two new routes, one new sheet, three new atoms.** `/decks/[id]/changes` and
  `/decks/[id]/versions`; the commit sheet lives inside the changes route. Everything else
  composes shipped boxes.
- **`INLINE_CHANGE_MAX = 6` is one exported constant** beside the copy, read only by the banner.
  Do not inline `6`.
- **The banner renders from the diff, which is derived** — `deck_cards` against the newest
  version's `deck_version_cards`, via `draft-diff.ts`. There is no flag to read and none to
  keep in step, per §Data model.
- **Grouping is by type; `bucket` is a per-row field.** `draft-diff`'s partition is still the
  source of each row's availability treatment, but it is **not** the grouping key and `bucketAdds`'
  oracle-UUID order is not the render order. Rows sort **alphabetically within a type group**, the
  same as the deck page.
- **Quantity changes render `from → to`, and the pull list filters basics.** `draftDiff` already
  files a quantity move as one entry carrying `from` and `to` — it is unlabelled, not absent, so
  handoff gap 5 was wrong twice. Every diff and version row renders `{name} {from} → {to}` when
  `from > 0 && to > 0`, **reusing `deck-import.ts`'s `recountedItem`** rather than authoring a
  second phrasing for the same fact (#513 ships it). And `commitDeckVersion` filters basics out of
  `adds` only — `pull: diff.removes` — so cutting 3 of 12 Islands currently renders a bare
  **Island** under *back in the pool*, asserting the card left the deck. **The pull list must be
  filtered exactly as the buy list is.**
- **The mix strip is mana value plus the shipped five roles**, not "body". `ROLE_ORDER` is
  `ramp, draw, removal, wipes, land` (`computeRoleCounts`), and a creature count already sits in
  the type-distribution block beside it. The binding rule is one fold called twice.
- **The strip needs a select and a join, which no shipped query makes.** `cards.cmc` exists, but
  `DeckDetailCard` carries `typeLine` and `role` and **no mana value**, so `cmc` joins the detail
  select *and* the before-figure needs `deck_version_cards → cards`. Not a migration — but it must
  be planned, not assumed. R1.2's "no new column, and no new query" was true of the schema and
  false of the reads.
- **`revalidateClaims(deckId, userId)`, not `deckSurfaces()`.** Commit, discard and pull are claim
  writes; `claimSurfaces()` is what reaches `/collection`, `/commanders` and `/discover`. Naming
  `deckSurfaces()` would leave every other deck's availability stale after a pull.
- **`commitDeckVersion` returns no card count**, which contradicts "the client prints them and does
  not compute them". Either it returns the version's card count or the success line drops it —
  returning it is one field.
- **The grouping UI is deck-page-local.** `grouping.ts` exports the pure helpers, but
  `DecklistGroup` and `GroupToggle` live inside `decklist.tsx`. "Mount the same grouping" needs an
  extraction task before any of the three new surfaces can mount it.
- **The pull guard needs a server flag that does not exist.** Every guard today is a post-hoc
  refusal string inside the transaction. The per-holding-deck "has pending changes" read must be
  added to the availability payload as its own task — the client renders whichever affordance the
  flag names and must not infer it.
- **There is a third guard: the card is another deck's commander.** Commander claims are in the
  availability model, so `Pull it` would otherwise be offered on a row where it can only ever
  fail. It takes state 16's shape with the word `commander` and **no `Open →`** — no route
  releases it.
- **The game log has no mono column-header row**, so `ver` cannot join one. The 44px slot is still
  drawable; the header R1.2 drew it under does not exist and is removed from the canvas.
- **The money figures are `loadDeckBuyRows`', not the client's.** The banner's `8 to buy ·
  $254.10`, the review chip and the sheet's list are one query rendered three times. R1's left
  join is what makes draft adds appear in it at all; if that join is missed, every figure in this
  handoff is wrong by the same amount.
- **A price atom still could not be located in this project** — only its specification. Figures
  are drawn in `BuyTag`'s shape; eng substitutes the real formatter, including staleness and
  currency. (The same gap the deck-tuning and top-off handoffs flagged; it has not closed.)
- **`Pull it` is `pullFromDeck`, one mutation**, and it commits a version on the *source* deck
  per §Pulling a card. The guard (source has its own pending changes) is a **server** condition;
  the client renders whichever of the two affordances the server's flag says, and must not infer
  it.
- **One mutation per commit.** `commitVersion` returns the new version number, the deck's card
  count and the buy/pull sets; the client prints them and does not compute them.
- **Revalidation goes through `deckSurfaces()`** for commit, discard and pull — a pull moves two
  decks, the deck list, the home page and the shopping list.
- **No row's grid template changes and no row grows in height.** The pending rule is a border and
  a padding adjustment; `Pull it` occupies the slot `Keep` occupies on the update diff, and review
  changes has no `Keep`, so the row's slot count is unchanged. The floor's mobile ledger for both
  rows is drawn on the canvas's Contract section.
- **Grouping is the deck page's own grouping.** The `By type` / `By role` toggle and the Cinzel
  group heading are shipped; the diff and version surfaces mount the same grouping rather than a
  local one. The per-group `n added in this draft` note is the only new string on the heading.
- **`CostPips` is read, not forked.** The diff and version rows mount the shipped component. The
  widening in `COST-TRACK.md` is a change to that component and therefore to `card-search-row` and
  `decklist-row` too — **card-rows Q2/R5 own the ruling**. If it is declined, these rows shingle
  like the others and nothing else in this handoff moves.
- **Mana value, the type histogram and the mix deltas are derived, not stored.** `draft-diff` has
  the two card sets; the strip is a pure fold over them plus the version's cards. **No new column,
  and no new query** — and it must be the same fold the deck page's mix strip already uses, or the
  two will disagree on the same screen.
- **`deckBodySize()` is read once**, by the `Commit as v1` offer on a versionless deck. It is
  the only place this UI knows the number 99.
- **Copy** lives in `src/lib/copy/deck-versioning.ts` as a new `deckVersioningCopy` block — see
  `deck-versioning · copy strings.ts`. **Two shipped strings are edited**, both in
  `deckImportCopy.update` and both listed in that file: the arrival strip's suppression on a
  committed deck, and the one added line above the preview's groups.
- **Mock data** is HD Tune — Mutant Menace, the deck the spec was written for: v2 committed
  14 Mar 2026, a draft of +19 / −17 on top of it (11 free / 5 sleeved / 3 unowned), 8 to buy at
  `$254.10` (`$132.80` unowned + `$121.30` sleeved), 5 games of which one is stamped v1 and one
  nothing. Every figure on the canvas is arithmetically consistent with that.

### The buy tag collapses on a decklist row

Corrected in R2, from a screenshot: the deck card row shows a bare **`$`** tile and the figure
lives under `Shopping`, where the split `buy │ $65.64` tag and the Mana Pool total already are.
R1.2 drew the full form on the decklist and stated "full form everywhere in this feature", which
was wrong on the one surface with the least room — the same mistake the pending-add chip made, and
caught the same way.

**The review page keeps the full tag, deliberately.** It is the Shopping-equivalent surface for a
draft: a per-card list whose whole job is what the commit costs, where the price is the figure
`Pull it` is weighed against. A `$` there would hide the comparison the page exists to offer.
Flagged for ratification rather than assumed — if the collapse is meant to be universal on rows,
the review row loses its price and the money lives only in the chips and the commit sheet.

**The banner's inline names at ≤6 changes keep the price too.** That is a statement, not a card
row, and it has no Shopping view behind it.

## Card-row compatibility

Read against `design_handoff_the99_card_rows/` — the parity floor, the canonical metrics and the
mobile ledger are treated as binding.

| Floor obligation | How this feature stands |
|---|---|
| Name + **one** availability slot, every row with an oracle id | Held. The unowned bucket draws `BuyTag`; the sleeved bucket draws the count-only marker **plus** a price, which is the floor's one ratified pair; free adds are silent, which is the marker's `null` at `free` doing its job. |
| Two occupants outside that pair is a defect | Held. The pending rule is a row border, not a slot occupant, so it cannot make a pair into three. |
| Canonical metrics (44/34px, radius 7, gap 9/10, padding 8–4 / 9) | Unchanged on every row. The 2px rule is absorbed by the real 9px/8px padding. |
| Every addition names what it displaced | Ledger drawn on the canvas. `decklist-row`: the pending rule takes 3px of padding. `update-diff-row`: **gains a 90px cost track and loses a 120px type column — net −30px**, and the name is wider than before; `Pull it` takes `Keep`'s slot. Version row: new, and the lightest of the three — nothing to displace. |
| No row's grid template changes, no row grows | Held, both widths. |
| Neither mana affordance generalises | **Re-opened, deliberately, at the reviewer's request.** Cost pips now appear on diff and version rows, because mana value is what a swap is judged by. Identity pips stay on `/collection` — that call is untouched. The un-shingling proposal is `COST-TRACK.md` and it is **card-rows' ruling to make**; versioning does not depend on it. |
| Words, never colour alone | The caption above the list and the row's accessible name carry the word; the banner carries the count. The rule is a locator, not the claim. |

## Gap report

1. **`INLINE_CHANGE_MAX = 6` is a judgement, not a measurement.** It is the point where names
   stop fitting in a banner at 390px, measured on this canvas and nowhere else. One constant, and
   the sort of number that wants tuning against real pastes.
2. **The review page has no windowing.** A 400-line paste against a 91-card deck produces 300+
   adds and the page renders all of them — the same hole `commanders-windowing` accepted at 214
   rows and the reimport diff accepted at 300. It is a plain list of divs; it will be slow before
   it is unreadable.
3. **Nothing joins a version to the shopping list.** Commit emits a buy list and the shopping
   list is its own surface with its own removals. If a card in v3's buy list is deleted from the
   shopping list, nothing tells the deck. Correct per §Decisions 3, and the same unjoined seam
   top-off's gap 7 flagged.
4. **The commit sheet's money can be stale by the time it is read.** The buy list is computed on
   render; a pull taken in another tab, or a CSV re-import, moves it. There is no revalidation on
   the sheet and no "prices as of" line. At this scale that is acceptable; at a shared account it
   is not.
5. **A quantity change is invisible in both diffs.** Basics are the only cards with quantity > 1,
   and 12 Islands becoming 9 lands in neither `+n` nor `−n`. Inherited from the reimport diff's
   gap 2 rather than introduced here, but versioning makes it permanent: the version stores the
   quantity and the diff will not mention it.
6. **The `Commit as v1` offer is Design's call, not the spec's** (decision 9). It fills a real
   hole — a newly built deck would otherwise never get a first version — but it is the one place
   this handoff adds an affordance the spec does not ask for. If the audit prefers an automatic
   stamp at a full body, say so; it is a delete, not a redraw.
7. **Nothing explains why a card the deck "already had" now carries a buy tag.** R1's per-card
   `since` makes the ordering correct, but on the deck page the result is a row that was silent
   last month and is now asking for money, with no sentence anywhere saying *another deck
   committed it first*. The review page names the holding deck; the decklist does not.
8. **The what-changed strip is the first place the app does arithmetic on a hypothetical.** Mana
   value and the type histogram are computed over a list that is not the deck's committed list.
   The figures are honest and derived, but nothing validates them against the deck page's own mix
   fold, and if the two ever diverge they diverge **on the same screen**, one scroll apart.
9. **The strip has no per-role breakdown and no curve.** A mana-value average hides shape: cutting
   a 6-drop and adding two 1-drops moves the same number as trimming three 3-drops. A curve
   histogram is the obvious next thing and it is not drawn, because at 36 changed rows the strip is
   already the tallest thing above the lists.
10. **The cost track is a cross-handoff dependency this handoff created.** Versioning asked for
   mana on its rows, which put `CostPips` on two new surfaces and surfaced a shingling bug that was
   already shipping. The amendment is written up and scoped, but it now blocks *nothing* and
   improves *three* surfaces — which is exactly the sort of thing that sits un-ruled for a quarter.
11. **The pending rule is one more meaning for a left rule.** `unresolved-row` already uses a
   warning rule for *we cannot name this*, and the brand sheet's status row uses the pattern
   generically. Brass for *pending add* is a third use of the same device, distinguished only by
   hue. It is cheap and it is precedented, but a fourth use would make the left rule a colour code
   nobody has a key for.
12. **The version note is the only prose in the feature and it is unsearchable.** Three versions
   is a rail; thirty is a list with no filter and no search over notes, which is where "what did I
   change before the losing streak" actually lives. The first thing to want at v10.

## Files
- `The 99 - Deck Versioning.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `STATES-pending.md` — the state matrix for all five surfaces, including the refusals.
- `COST-TRACK.md` — the un-shingled cost track: proposal, arithmetic, blast radius. **An amendment
  request to card-rows, not a decision taken here.**
- `OVERLAPS.md` — the two open calls in full, with the rejected alternatives and the checks.
- `deck-versioning · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
