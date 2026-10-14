# READINESS — Commander discovery: one ranked list, two sorts (R1)

**Self-assessed: 🟢 Green with one ruling requested — and the ruling is a scope question the brief
did not reach, not a design gap.**

The audit against §6's eight locked rulings is what settles this; the note below is what Design
believes it is handing over.

## Not blocking — the §0 caveat does not apply

**This handoff is not gated**, and the brief says so in as many words. §0's index is populated:
3,342 commanders, 3,226 tagged, 3,341 carrying a similar-oracle list, ≈260 support cards each,
measured against the live 2,805-card collection (242 owned, 3,100 unbuilt, 8 built). Nothing on
this path fetches EDHREC. **Price and stock are #288, in flight**, and the row is drawn complete
without them — state 4 of the price matrix is a drawn state, not a fallback, so the list ships on
the day it is built.

## Needs a ruling — one item, and the redraw behind one answer is small

1. **`Score against` × discovery is not specified, and this canvas draws it available.** The free
   re-rank works today because both rankings arrive in one render over 242 commanders
   (`commanders-view.tsx`, `results` / `freeItems`). Over 3,100 candidates that is a second full
   scoring pass, and the brief's §4 lists `Score against` as simply continuing to operate.
   Two answers, both cheap to draw:
   - **It re-ranks** — the flip becomes a fetch under discovery. Nothing in the canvas changes; the
     sort control is already a menu for the same reason, and neither flip animates.
   - **It is unavailable under discovery** — then it needs the shipped disabled-segment treatment
     plus a reason string, which is one line of copy and one state on a control already drawn
     disabled elsewhere.
   Design's preference is **it re-ranks**, because a control that silently switches off when you
   change scope makes the two scopes feel like two pages, which ruling 1 spent its whole argument
   avoiding.

## Called, not asked — flagged for the record

2. **The `score /100 FIT` stack does not appear under discovery.** A 0–100 composite is what a
   blend looks like and ruling 3 forbids one, so the column prints the sort key raw with its
   denominator. If the audit wants the shipped score visible on discovery rows for continuity, that
   is a redraw of the fit column and it reopens ruling 3 — say so explicitly rather than adding it
   beside the raw figure.
3. **Tag distance is drawn as a count of unplayed tags, not a weighted distance.** Ruling 3 asks
   for one sort key, one cutoff, each nameable in a row; `4 of 5 tags` is nameable and a weighted
   score is not. If engineering implements a weighted metric, **the row's figure stops matching the
   ranking** and the fit column needs redrawing. Gap 5.
4. **Ownership reuses `RecCard`'s own diamond rather than the availability marker's colours.**
   Filled = owned, hollow = not, plus the word on the receipt line. The marker's severity hues
   describe cards in decks; sharing them with commander ownership would put two unrelated facts in
   one hue. The one place `--avail-hard-fg` still appears on the row is the shipped `N already in
   use` clause, unchanged.
5. **The `buy` tag is deliberately not reused.** It is a verb attached to an action; this is a fact
   about a row nobody has acted on, and 3,100 rows of shopping instruction is not the list ruling 2
   describes.
6. **Sort is a menu, not segments**, specifically so ruling 8's reason can be stated on the row
   that carries the option. If the audit prefers segments for symmetry with `Score against`, the
   disabled reason has to move somewhere, and the only place left is a second banner.
7. **The reveal step stays 25 at 3,100 rows.** A reading unit, not a fraction of the list. Raising
   it makes each activation a wall and still leaves thousands behind it.

## Not blocking, and worth reading before estimating

8. **The discovery list cannot ship as a second full client array.** Today's page sends `results`
   *and* `freeItems`. At 3,100 rows × (role counts, receipts preview, pool size) that payload is
   the thing to measure first. Design's expectation: fetch the active sort only, window on the
   client as today. Gap 8.
9. **The floor and the distance are server-side, and untagged is excluded by presence of `tags`,
   never by a zero.** A zero-distance commander and an untagged one are different rows, and ruling
   5 turns on the difference.
10. **The deck-tag set and the nearest-deck name are one aggregate per request**, not one query per
    row. The novelty row's partial clause names a deck, and naming it per row would be 25 lookups
    per window.
11. **`edhrec_total` gates both figures.** A commander with N and no M prints **neither** and falls
    back to the receipt line. This is the §5 correction's teeth: no denominator, no claim.
12. **`Showing {filtered.length} of {active.length}` needs `toLocaleString`.** The one shipped
    string this handoff asks to change, and it is a formatter, not copy. `WindowCount` and the
    reveal control already do it.
13. **A scope or sort flip resets `shown` to `REVEAL_STEP`**, on the same two reasons `setAvail`
    already does: different commanders occupy the revealed range, and the window belongs to the
    result set rather than the session.
14. **`RecCard` takes a `sort` prop, not a second component.** Forking it duplicates the grid, the
    stretched link, the chips and the receipt line, and guarantees they drift.

## Not blocking

- No new token, no new hex, no new motion class, no new empty-state component, no new modal, no
  tray, no toast, no virtualisation, no search field, no pagination, no derived score, no blend.
- `RecCard`'s grid (`40px 100px 1fr 236px`), padding, stretched `Link`, rank numeral, art,
  `RoleChips`, receipts preview, receipt line and its severity clause: **untouched**.
- `ScoreAgainst`, the colour pips, the active-filter chips, `Clear`, `RevealControl`,
  `EndOfRanking`, `WindowCount`, `DegradedBanner`, `GuidedBanner`, `FilteredEmpty`: untouched in
  geometry and, except for `FilteredEmpty`'s one added clause, in strings.
- `createDeck` needs nothing: it already validates legality without requiring ownership
  (`actions.ts:179-274`), so discovery's ending is live.
- Price never enters an `ORDER BY` (ruling 7), never takes a semantic colour, and its absence
  unmounts the slot **and its hairline** — nowhere in the canvas renders a `—`, a `$0.00`, a
  skeleton or a reserved gap for a missing price.
- The 99 appears nowhere as a denominator. Every figure prints its M at every width: `127 of 264`,
  `you own 127 of the 264 cards EDHREC lists for this commander`, `own 127 of 264 EDHREC lists`.
- Every figure in the canvas is consistent with §0: 3,342 indexed, 3,226 tagged (116 untagged, one
  drawn), 3,100 unbuilt, 242 owned, 8 built, 2,805 cards, floor 30% admitting 1,704; the count line
  reads 25 shown / 3,075 more below against 3,100.
