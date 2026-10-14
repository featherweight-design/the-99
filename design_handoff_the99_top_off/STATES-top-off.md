# The top-off panel — twenty states, the ledger's fourteen, the mark's four (R3)

One strip, two shapes: **closed** (a heading, a caption, one door) and **open** (a heading, a
selection head, the ranked list, a commit row). The difference between any two states is the
content of one of those parts. **Nothing on the deck page above or below the strip moves between
states**, and the strip is only ever absent for one reason: there are no open slots.

| Part | Changes between states? |
|---|---|
| 1 · Heading (`The last {n}`) | The **number only**, and it is the open-slot count. Never rank, never colour, never an icon. |
| 2 · Caption | Slots open, and how many candidates the list holds. |
| 3 · Body | **Absent when closed.** Open: selection head, header row, ranked rows, declines. |
| 4 · Control row | Closed: one door. Open: one primary, one Cancel, the counts and the total. **One primary, one corner, always.** |

---

## Three numbered sets, and they do not share a namespace

| Set | Identifiers | Count |
|---|---|---|
| **The panel** — the strip and the list | `1`–`20` | **twenty** |
| **The ledger** — one line per pass | `a`–`j`, plus `i2` `i3` `i4` `l0` | **fourteen** |
| **The mark** — `Show these {n}` | `k`–`n` | **four** |

Deliberately separate: the panel is one component's states, the ledger is a second construct that
outlives any one fill, and the mark is a mode of the decklist below. **A canvas frame is labelled
with the identifier it draws**, from whichever set that is.

## The matrix

`n` = open slots (`99 − built`). `cand` = legal candidates EDHREC ranks: in colour, not in the
deck, singleton-legal. `owned` = the subset in the collection. `ticked` = the current selection,
capped at `n`.

| # | State | Heading + caption | Body | Control row |
|---|---|---|---|---|
| 1 | **At rest** — 68 cards, `n`=31, 38 cand, 24 owned | `The last 31` · `31 slots open · 38 candidates ranked by synergy for this commander` | absent | `Choose the last 31` + mono `24 of them are in your collection and arrive ticked. Nothing is added until you say so.` |
| 2 | **Open, untouched** | unchanged | 38 rows, **24 ticked** (every owned one), declines none | `Add 24 cards` · `Cancel` · `92 of 99 when added` |
| 3 | **Mixed selection** — 3 unowned ticked as well | unchanged | 27 ticked, 11 untouched | `Add 27 cards` · `95 of 99 when added · 3 to buy · $42.80` · mono `4 slots stay open — you can come back to them` |
| 4 | **Owned-only, deep pool** — `owned` ≥ `n` | `The last 31` · `31 slots open · 46 candidates ranked` | **31 ticked, at the cap on open** | `Add 31 cards` · `99 of 99 when added` |
| 5 | **Shallow pool** — `owned`=12, `n`=31 | unchanged | 12 ticked, 26 untouched | `Add 12 cards` · `80 of 99 when added` — **states what it will place, never the gap** |
| 6 | **At the tick cap** — `ticked` = `n`, candidates remain | unchanged | Unticked boxes **inert, not hidden**; rows keep figures and price | mono `31 of 31 slots ticked — untick one to swap another in` |
| 7 | **A decline** | unchanged | The row collapses to one line **in its own slot**: `not this one` + name + `Show it again`. No reorder, no gap, no animation out, **no question asked** | recounts only |
| 8 | **Commit in flight** | unchanged | List **stays on screen, legible, non-interactive.** No skeleton | `Sleeving 27 cards…` disabled, border `--accent-shadow`; `Cancel` disabled, **not hidden**. **No `Stop`** |
| 9 | **Settled, slots remain** — 95/99, 11 cand left | `The last 4` · `4 slots open · 11 candidates still on the list` | closed | `Choose the last 4` + mono `You own none of the 11 left. The list reopens where you left it, declines and all.` |
| 10 | **Settled at 99** | — | — | **The strip unmounts as a unit.** The provenance line and its undo stay |
| 11 | **Nothing ticked** — cleared by hand, or `owned`=0 on open | unchanged | rows as ranked, none ticked | `Add cards` **disabled, no count, and no error.** mono `nothing ticked — you own none of these 38, so every tick is one to buy` |
| 12 | **Every candidate unowned** | unchanged | 38 rows, **0 ticked on open** | as state 11. **The door is never absent because the pool is unowned** |
| 13 | **Candidates exhausted** — `cand`=0, `n`=7 | `The last 7` · caption absent | absent | **No control.** The §7.6 line prints instead: `92 of 99. The list is empty — you own what you own, EDHREC knows what it knows, and that is everything we have. Quick-add and Consider are still open.` |
| 14 | **Deck already at 99** | — | — | **Strip absent from first render.** `planLastSlots` returns an empty plan at `openSlots <= 0`; the arithmetic does it, not a flag |
| 15 | **Commit refused** | unchanged | **Every tick preserved** | Primary back to `Add 27 cards`, enabled; shipped `MutationError` beneath it |
| 16 | **Undo in flight / settled** | unchanged | closed | The pass's ledger line: `Putting 27 back…` disabled; on settle **the line leaves the ledger** and the strip recounts to `The last 31` |
| 18 | **A candidate you own, with every copy sleeved elsewhere** | unchanged | The row's availability slot draws `AvailabilityMarker` count-only (`◆ none free`) and the dot is the committed one. **Ticked on open like any owned candidate** — availability is a label, not a gate | unchanged |
| 19 | **A candidate you own with copies spare** | unchanged | The slot is **silent** — the marker returns `null` at `free`. Not the zero-occupant defect: nothing to say is not nothing to show | unchanged |
| 20 | **The bottom slot at 390px** (phone only) | unchanged | unchanged | **The commit bar takes the quick-add dock's slot** and the dock collapses to `Quick-add is back when you close the list` — collapsed, never unmounted, query and focus restored on close. **One pinned element, whichever it is.** Closed (states 1, 9, 13): the dock is exactly where it ships |
| 17 | **A ticked row goes illegal while the list is open** | unchanged | The row **unticks itself, states why** (`already in the deck` / `not in these colours`), goes untickable, and **keeps its slot** | recounts; if the count drops to 0, state 11 |

## The rules the matrix is generated from

1. **The strip is only absent at zero open slots** (states 10, 14). Every other emptiness is a
   sentence, not a disappearance — state 13 is the one place the strip outlives its own control,
   because seven visibly open slots need their explanation more than the surface needs the tidiness.
2. **A control with nothing to do is absent, not disabled** — the shipped rule, and the reason
   there is no disabled door anywhere in this matrix. The one disabled control in the whole set is
   the commit primary at zero ticks, and it is disabled rather than absent because it is the thing
   the list exists to reach.
3. **A disabled primary never carries an error.** Nothing has gone wrong at zero ticks. `--danger`
   appears in exactly one state: 15.
4. **Nothing unmounts mid-write** (state 8). The list stays, the Cancel stays in place disabled,
   and no row collapses. Hiding anything during a 27-row write moves the decklist under the cursor.
5. **Nothing leaves the ranked list.** Not at the cap (6), not on a decline (7), not when a row
   goes illegal (17). Rows go inert, marked, or collapsed **in place**; the list's length is a fact
   about the commander and it does not shrink to flatter the selection.
6. **The label states what it will place** (states 2, 3, 5) — `min(ticked, n)`, which after a
   preselection is just `ticked`. It never states the gap, because the gap is not a promise the
   pool can keep.
7. **You cannot tick past the open slots** (state 6). The cap is arithmetic, it is stated in words
   with its denominator, and it is what makes a mixed fill a trade rather than a mode.
8. **Stopping short and running out are different sentences** (states 9 and 13), and
   `cand > 0` is the test. The shipped §7.6 shortfall line is only ever printed when the list is
   genuinely empty.
9. **A refusal preserves the selection** (15). Twenty-seven choices are the work the review step
   exists to make worth doing.
10. **The availability slot never gates a tick** (states 18, 19). Ownership is a label and so is
   availability; a card sleeved in another deck is still the right card for this one, and the row
   says so before the tap rather than after two decks disagree.
11. **Selection state survives closing the list** (9) — ticks, declines and all — and does not
    survive a reload. It is a scratch selection over a live ranked query, not a saved artefact;
    the deck is the saved artefact.

## The provenance ledger (#359, in full)

The shipped fill provenance strip becomes **a ledger: one line per pass, oldest first, never
reordered.** The seed is a line in it. Each line states what its pass placed and what it cost, and
**each line reverses on its own** — persisted, so this is true after any number of reloads.

| # | State | Ledger | The line's controls |
|---|---|---|---|
| a | **No auto cards** — every card added by hand | **absent**, as the shipped strip is | — |
| b | **Seed only** — arrived at 68 from the build | one line: `the seed · 68 cards — the roles and the mana base, 7 to buy.` | `Show these 68` · and it **names** its reversal, `the sweep reverses it` |
| c | **Seed + one top-off** | two lines, seed first | the top-off line adds `Undo these 27` |
| d | **Seed + three top-offs** | four lines, oldest first | one `Undo these {n}` per top-off line. **Any of them, in any order** |
| e | **A pass undone** | **its line leaves the ledger** — it placed nothing, so it accounts for nothing | others unchanged; **ordinals do not renumber** |
| f | **Every top-off undone** | back to (b) | — |
| g | **Undo in flight** | the line's button reads `Putting 27 back…`, disabled | others **stay enabled** — a refusal or a wait on one pass does not disable a neighbour |
| h | **Undo refused** | line unchanged, **still enabled** | shipped `MutationError` beneath the ledger |
| i | **Cards from a pass removed by hand** | the line **recounts**: `27 cards · 2 removed since` | `Undo these 25` |
| i2 | **Cards from a pass kept** — the keep control, per row or bulk | the line **recounts, naming the other exit**: `27 cards · 3 now yours`. Kept and removed are counted **separately**, because a rejection and an endorsement are not the same fact | `Undo these 24` — a kept card is **not in the pass**, so undo can never reach it |
| i3 | **A pass entirely kept** | **its line leaves the ledger**, like any empty pass — nothing was reversed, and nothing is outstanding | — |
| i4 | **`Keep all` ran** | **the whole ledger goes**, in the same act that makes the sweep absent | — |
| j | **`Clear all auto` ran** | back to (a) — the sweep removes every pass | — |
| l0 | **A deck that predates the ledger** | **no seed line.** One dashed line: *"This deck was built before we started keeping this record. Anything we place from here on is listed below."* No count is synthesised from `auto` rows or from `filled` | **none** — it enumerates nothing, so it offers nothing. The line goes for good the first time a pass lands |

**`Show these {n}` — the "before deciding" clause.**

| # | State | Effect |
|---|---|---|
| k | **Not marked** | nothing on the decklist |
| l | **Marked** | a **3px `--accent` left edge** on that pass's rows. **Nothing is dimmed, filtered, reordered, collapsed or scrolled to** — the deck stays whole. `aria-pressed`, and each marked row's accessible name gains *"from top-off 1"* |
| m | **Another line marked** | the mark **moves.** One pass marked at a time |
| n | **Tapped again, or the pass undone, or the list committed** | the mark clears |

**Ledger rules**

1. **Oldest first, never reordered.** Focus lands on the line a commit just created; that only
   works if lines hold their rank.
2. **The seed is a line, and its reversal is named rather than drawn.** `Clear all auto` is a rule
   and a row away in the toolbar; the seed line points at it and grows no button of its own.
3. **Ordinals are stable.** Undoing top-off 1 does not renumber top-off 2.
4. **A pass is a set of rows, not a transaction** (states i, i2). A row leaves its pass two ways —
   **removed** (a rejection) or **kept** (a graduation) — and the line names which, because they
   mean opposite things. Both count the undo down.
5. **Keeping is not a reversal, and the ledger does not model it as one.** Keeping clears the auto
   flag, so the card is the player's; a ledger of what the app placed stops claiming it. **Keeping
   is therefore how a player protects a card from an undo.**
6. **The ledger is present exactly when the sweep is** — `sweep absent ⟺ 0 auto rows ⟺ every pass
   empty ⟺ ledger absent` — so the seed line's stated reversal can never be orphaned (states a, i4).
7. **The ledger never prints a deck-wide kept total.** That figure is the toolbar's kept note, which
   is about the deck; a line's `now yours` count is about a pass. Two facts, not two reports.
5. **No time window, and now that is true** — the promise is a table row, not page state.
6. **One `--danger` state in the whole ledger:** a refused undo (h).
7. **The row keeps its floor.** `AutoTag` unchanged, no ordinal, no second tag, no new atom.

## Copy, per state

| Where | String |
|---|---|
| Heading | `The last {n}` — **unchanged**, `lastSlots.heading` |
| Caption | `{n} slots open · {c} candidates ranked by synergy for this commander` |
| Caption, phone | `{n} slots open · {c} candidates ranked` |
| Door | `Choose the last {n}` |
| Door note | `{owned} of them are in your collection and arrive ticked. Nothing is added until you say so.` |
| Door note, reopening | `You own none of the {c} left. The list reopens where you left it, declines and all.` |
| Selection head | `{t} of {n} slots ticked · {c} candidates, {u} untouched` |
| Tick all | `Tick the {owned} I own` · `Clear all ticks` |
| Cap | `{n} of {n} slots ticked — untick one to swap another in` |
| Commit | `Add {t} cards` / at zero, `Add cards` disabled |
| Commit consequence | `{total} of 99 when added` · `{b} to buy · {money}` · `{n} slots stay open — you can come back to them` |
| In flight | `Sleeving {t} cards…` — the shipped `fill.fillingRows` |
| Refused | `We couldn't add those. The deck is unchanged.` — the shipped `lastSlots.topUpFailed` |
| Decline | `not this one` · `Show it again` |
| Illegal | `already in the deck` / `not in these colours` · `untickable` |
| Availability | **unchanged** — `BuyTag`'s `buy {price}` and the shipped count-only marker (`none free`) |
| Exhausted | `{total} of 99. The list is empty — you own what you own, EDHREC knows what it knows, and that is everything we have. Quick-add and Consider are still open.` |
| Ledger header | `Where these {total} cards came from` · `{passes} passes · {b} to buy` |
| Seed line | `the seed` · `{n} cards — the roles and the mana base, {b} to buy.` · `the sweep reverses it` |
| Top-off line | `top-off {i}` · `{n} cards you chose from the last {slots}, {b} to buy.` |
| Line controls | `Show these {n}` · `Undo these {n}` · `Undo this 1` · `Putting {n} back…` |
| Recounted line | `{n} cards · {removed} removed since` · `{n} cards · {kept} now yours` · `{n} cards · {kept} now yours, {removed} removed since` · `all {n} now yours` |
| Legacy line | `This deck was built before we started keeping this record. Anything we place from here on is listed below.` |
| The kept note, `Keep`, `Keep all` | **unchanged and unmoved** — R3 adds no string to that cluster |
| Quick-add, retired | `Quick-add is back when you close the list` |

Every string is in `top-off · copy strings.ts`.

## Announcements

One live-region message per settle, on the existing region — **never one per tick**.

| Event | Message |
|---|---|
| List opens | `38 candidates for 31 slots. 24 already ticked.` |
| Ticking settles (debounced) | `27 of 31 ticked, 3 to buy.` |
| Cap reached | `31 of 31 slots ticked.` |
| Commit settles, slots remain | `27 cards added. 95 of 99, 3 to buy.` |
| Commit settles at 99 | `27 cards added. 99 of 99.` |
| Commit refused | the refusal sentence, once |
| Undo settles | `27 cards put back. 68 of 99.` |
| A pass marked | `27 cards from top-off 1 marked in the deck.` |
| A mark cleared | `Mark cleared.` |
| A card kept | **unchanged** — the shipped keep announcement. The ledger recount is not announced separately |
| The list opens, phone | `Quick-add hidden while the list is open.` |
| Decline | `Cyclonic Rift set aside. 26 of 31 ticked.` |
| Sweep | **unchanged** — `auto.sweptAnnounce` |
