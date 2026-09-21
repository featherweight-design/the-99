# Readiness — the push line and the upgrade path (Round 4 of 5)

**Self-assessment: 🟢 Green on the upgrade path, 🟡 Yellow on the push line** — one data-shape
change is required before the push line can render the sentence §6 asked for, and one contract
detail (`counts` has no `from`) needs eng's answer before a row can decide whether to draw marks.

## Called rather than asked

Five of the brief's own open items, and one it did not list.

1. **§4.1 placement — one atom, three hosts, and not the analysis tab.** The biggest call in the
   round, made on the ground that the push line is a property of the candidate: it goes where a
   candidate can be committed, and the analysis tab has no candidate. It also carries no link back
   to that tab, because the tab still reads the deck without the card.
2. **§4.2 the path reads, it does not act.** No ticks, no removes.
3. **§4.3 `blocked`** — cuttable candidates still listed, commander visible on a dashed edge,
   nearest reachable target named.
4. **§4.4 `counts`** — two clauses, count first, combo evidence as a `--fact` third line.
5. **§4.5 no persistence after the add.**
6. **Not asked: the tile density.** 168px cannot hold a sentence, so Consider gets the shape's name
   and its mark, with the sentence in the card detail modal. This is the call most likely to be
   challenged and the cheapest to change — one string table and a tile foot.

## Review pass (same day)

Five corrections from review, all taken: **the two-card-infinite mark is the lemniscate** (Turn 4's
adopted glyph, not the knot); **every fact mark is 16×16**; **the tutor mark is used** wherever
tutors are the subject, and each fact shape's label now carries its own mark; **marks sit on the
line above the name on rows and tiles**, led by the ownership dot, per the shipped card row; **the
tile drops the mana pips** (a row affordance) and the art plate drops its overlay dot. Copy: *It
also does this* → **Combo changes**, *To drop to here* → **To downgrade your deck**.

## Engineering list

| # | Item | Size |
|---|---|---|
| 1 | **`inert` union member** in `BracketDelta` — `{ kind, fact: "combo", combos, to }`, precedence after `ruleless` | one branch in a pure function |
| 2 | **`from` on `counts`**, or a guarantee that the row's profile is the delta's profile | contract |
| 3 | `CandidateFacts.completesCombos` carries oracle ids + image uris | data shape |
| 4 | The atom in three hosts (quick-add row, Consider tile, top-off row) | one component, two densities |
| 5 | The path as a disclosure on the climb's lower rung, with target chips | one component |
| 6 | Copy module(s) from `push-line · copy strings.ts` | mechanical |

## Gaps and open items

1. **The path is invisible until a rung is tapped.** A player who never taps never learns the app
   can answer *what would have to go*. Deliberate — it is the rung's answer, not a fifth block — but
   it is the first thing to want if nobody finds it. Design's position if it bites: the rung's link
   gains the count (`what would have to go — four things`), which is derivable and still one line.
2. **A batch push line is uncomputable today, and the top-off list is where a bracket really
   moves.** 27 cards commit at once and no row's sentence describes the result.
   `bracketDelta` takes one candidate against a fixed profile; a batch preview needs a profile that
   changes as the batch lands. **This is the one thing to want next**, and it is a sub-project, not a
   copy edit.
3. **`inert`'s second clause is chosen by the client** from `to` and the deck's coverage. If eng
   would rather the function decide, it costs a discriminator on the member and Design has no
   objection — the strings are already two.
4. **Ordinals.** *your 4th game changer*, *your 6th tutor* — the strings need an ordinal formatter
   and the figures come from `now`. Locale is unspecified in this project, as it is for money.
5. **The Game Changer list membership on the canvas is mock.** The blocked example uses a commander
   that must actually be on WotC's list for that state to exist; eng substitutes real membership,
   and the state is structural either way (it is the `candidates.length < removeCount` branch).
6. **Nothing tells a player the push line exists.** It appears on maybe one row in forty. Accepted:
   a legend or an empty-state explaining a slot that is usually absent is worse than the absence.
7. **The same card in two path items is listed twice** (`upgradePath` returns it under each rule).
   One foot sentence names the overlap. If review finds that insufficient, the alternative is a
   per-card annotation (*also the combo*), which Design tried and dropped: it made the count rules
   look like they had exceptions.
