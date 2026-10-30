# Pending, commit, discard, history, stamp — states matrix

Five surfaces, and the states that matter are not "empty" and "full". They are **how many
changes there are** (nought, two, thirty-six), **whether the deck has ever committed**, and
**what the other decks are doing** with the cards this draft wants.

The deck throughout is HD Tune — Mutant Menace. `v` is the newest committed version.

---

## A · The deck page

| # | State | Banner | Decklist | What the player sees |
|---|---|---|---|---|
| 1 | **Brew, below a full body** | absent | unchanged | Nothing about versioning exists — **not even the Versions tab**. §Decisions 4, drawn literally. |
| 2 | **Brew, at a full body** | absent | unchanged | One brass-**outline** `Commit as v1` in the spine, with `locks this list as v1 — nothing about the deck changes`. Design's call — see gap 6. |
| 3 | **Committed, clean** | absent | unchanged | `Versions · 2` in the tab row, and nothing else. No banner, no Commit, no Discard, no empty diff panel, no "no pending changes" reassurance. |
| 4 | **Committed, 1–6 changes** | **names** | adds marked | Each change on its own 32px line with `+`/`−`, its buy tag or `back in the pool on commit`, and `or pull from {deck}` where it applies. `Commit as v3` is the primary; `review changes` is a mono link. |
| 5 | **Committed, 7+ changes** | **counts** | adds marked | `+19 / −17`, `36 changes since v2`, one sentence of money, and `Review 36 changes` as the primary. The names are not shown at all. |
| 6 | **Committed, over the cap** | counts | adds marked | `101 / 99 · 2 over` in `--warning`, beside the deck name, in the shipped over-99 treatment. **Nothing is blocked** and the banner says nothing extra about it. |
| 7 | **Committed, under the cap** | counts | adds marked | `94 / 99` in `--warning` as shipped. Commit is not disabled: a deck below 99 is a deck being built, and the version records what was true. |
| 8 | **Adds only** | `+19` | adds ruled | The `−` figure and the `/` are **absent**, not `−0`. Same in reverse for removes only. |
| 9 | **Draft with no type changed** | counts | adds ruled | The what-changed strip's type block renders only the types whose count moved. A row of zeroes is a table explaining it has nothing in it. |
| 10 | **Draft that moves no mix figure** | counts | adds ruled | The mix cells keep `rec n` in their bottom-left slot instead of `was n`. `was 7` on a figure that is still 7 is a delta claiming to be one. |
| 11 | **A quantity changed only** | `+1 / −1` | the row is ruled | `draftDiff` files it as **one** entry carrying `from` and `to`. The row reads `Swamp 9 → 7` in `recountedItem`'s shape — never a bare name, which would assert the card left the deck. |
| 12 | **Draft equals the version again** | absent | unchanged | Cutting a card you had added returns the deck to state 3 with no announcement. The banner is derived, so it simply is not there. |

## B · Review changes (`/decks/[id]/changes`)

| # | State | What the player sees |
|---|---|---|
| 13 | **Every availability present** | The drawn case. 11 free · 5 sleeved · 3 unowned, spread across the type groups they fall in, four count chips, 17 out. **Availability is per-row, not a grouping** — there are no bucket headings. |
| 14 | **Only free adds** | Nothing announces it. No markers, no prices, no to-buy chip, no money anywhere on the page — which is the whole answer to "what does this cost". |
| 15 | **Only unowned adds** | Every add row carries `BuyTag`; the to-buy chip carries the full count and total. |
| 16 | **No adds** | `Coming in` is absent entirely and the removes column takes the full width, **keeping its row anatomy unchanged** — same dot, name and cost track. |
| 17 | **No removes** | `Going out` absent; adds take the full width. Nothing about the row changes. |
| 18 | **A type group is empty on one side** | The heading is absent on that side only. The two columns do **not** align their groups — each column groups its own rows, and a spacer to line them up would be a table pretending to be a diff. |
| 19 | **A pull is available** | `Pull it` in the action slot, the holding deck named beside the name, the price beside that. One per card. |
| 20 | **A pull is guarded — the deck has pending changes** | No `Pull it`. The deck name gains a mono `pending` tag and the action slot holds `Open →` at the same geometry. The price stays — buying is still the other option. The full sentence is the control's accessible name. **Needs a server flag that does not exist yet.** |
| 21 | **A pull is guarded — the card is that deck's commander** | The same tag, reading `commander`, and **no control at all**: there is no route that releases it, so an `Open →` would lead somewhere that cannot help. The price stays. |
| 22 | **A pull in flight** | The row's control reads `Pulling…`, disabled, **in place**. The row does not move and nothing unmounts. |
| 23 | **A pull succeeded** | The row's dot goes to free, the marker and price leave it, the pullable chip and the to-buy chip and total re-print. **The row does not move** — it is already in its type group. Announced once, no animation on the figures. |
| 24 | **A pull was refused** | Shipped `MutationError` beneath the row's control; the row stays pullable. A failed pull must not look like a taken one. |
| 25 | **Reached by a stale link** (draft already committed) | The route redirects to the deck page. There are no changes to review, and an empty review page is a page explaining it has nothing on it. |

## C · The commit sheet

| # | State | Commit | What the player sees |
|---|---|---|---|
| 21 | **Opened** | enabled | Note empty and not pre-filled; one money block (`8 · $254.10`, `3 not owned · 5 still sleeved elsewhere`, the link-out) and one released block (`17`, *no action required*). **No card rows** — they are on the review page. |
| 22 | **Nothing to buy** | enabled | The whole money block is **absent**, link-out included. The released block takes the full width. A commit that costs nothing should not have a priced panel with nothing in it. |
| 23 | **Nothing released** | enabled | The released block is absent. |
| 24 | **Note typed** | enabled | Nothing changes. The note is never validated, never counted, never required. |
| 25 | **Committing** | in flight | Button reads `Committing…`, disabled; Cancel disabled; both lists stay in place and stay legible. |
| 26 | **Committed** | — | The route returns to the deck page. Banner gone, version line reads `v3 · committed 10 Sep`, focus on that line. Announced: `Committed v3. 101 cards, 8 to buy.` **No toast** — the deck page is the receipt. |
| 27 | **Refused** | enabled | Shipped `MutationError` under the button. **The note is preserved.** A rejected write must not cost the player the one thing they typed here. |
| 28 | **Cancelled** | — | The sheet collapses. The note is discarded with **no confirm** — it was never saved and a confirm on cancel trains people to ignore confirms. |
| 29 | **Reopened after cancel** | enabled | The note is **empty again**. The sheet does not remember: a note carried over from an abandoned commit is a sentence about a different list. |

## D · Discard

| # | State | What the player sees |
|---|---|---|
| 30 | **At rest** | A neutral ghost `Discard` in the banner, third of three controls. |
| 31 | **Confirming** | The banner's body is replaced: `Discard 36 changes?` in `--danger`, the consequence naming **v2, its date and its card count**, then `Discard 36 changes` (danger) and `Keep editing` (brass solid). Phone: `Keep editing` **on top**. |
| 32 | **Confirming, from the review page** | The same two lines and the same two buttons, in the apply bar. No second wording. |
| 33 | **Discarding** | `Discarding…`, both controls disabled, the banner in place. |
| 34 | **Discarded** | Deck page in state 3. Announced: `36 changes discarded. Back to v2.` **No undo offer** — there is nothing to undo with. |
| 35 | **Refused** | `MutationError` in the banner; the draft is untouched and the confirm stays open. |

## E · Version history and the stamp

| # | State | What the player sees |
|---|---|---|
| 36 | **One version** | A rail of one row, reading `initial`. No diff view is reachable; opening it gives the `Initial` panel and a route into the 99 cards. |
| 37 | **Many versions** | The rail. Newest first, current marked `current`, each row carrying date, card count and mana value. Plain list, no filter, no search. |
| 37b | **No versions at all** | **The Versions tab does not render.** Not an empty tab, not a disabled one. |
| 38 | **A version with no note** | `no note` in italic `--fg-faint`. Not an empty line, not a prompt. |
| 39 | **v1 opened** | **No columns.** `Initial` + one sentence + `Browse the 99 cards →`. Never `+99`. |
| 40 | **A later version opened** | Two equal columns, **grouped by type with the cost track**, like every other card list in the app. No dot, no price, no marker, no action — this is what the deck *was*, not what it needs. |
| 40b | **A version diff with a quantity change** | The row reads `{name} {from} → {to}`, same as the draft diff. A version that changed 12 Islands to 9 did not lose Islands. |
| 41 | **A version that changed commander** | The right-hand block names both: `The Mimeoplasm → Muldrotha`. A commander change is a version boundary like any other and needs no special construct. |
| 42 | **Game stamped** | `v2` in the 44px slot, bare mono `--fg-faint`. |
| 43 | **Game stamped with an older version** | `v1` on a game **played** 11 Mar and logged the following week. The stamp follows the play date. |
| 44 | **Game with no version** | `—` in `--fg-locked`. Games from before the feature shipped, and games on a deck that has never committed. Absence, not a gap. |
| 45 | **A version is deleted** (not in this UI) | Its games' stamps become `—`. `on delete set null`, per §Data model, and the row is unaffected otherwise. |

---

## The rules the matrix is generated from

1. **A count of nought is never drawn.** No `−0`, no empty bucket heading, no empty column, no
   "no pending changes" panel. A thing with nothing to say is absent — the shipped convention.
2. **The banner is derived, so it cannot be stale.** It appears and disappears as a consequence of
   the rows, never as a flag, per §Data model's refusal of `is_draft`.
3. **Nothing in this feature blocks a commit.** Not the cap, not the note, not an unresolved row,
   not an unbought card. Commit records what is true; the buy tags carry what is outstanding.
4. **Nothing unmounts mid-write.** Pulls, commits and discards disable in place.
5. **A refusal preserves the note.** It is the only thing in the feature the player typed.
6. **The pull is offered, never taken for them** — and where it cannot be one click, the offer
   becomes a route, never a disabled control. Where there is **no** route that helps (the card is
   another deck's commander) the control is absent rather than dead.
7. **Removes are never drawn in the decklist.** They are not in the deck.
8. **Nothing this feature adds to a card row takes width from the name.** The pending mark is a
   border, the pull control reuses `Keep`'s slot, and the cost track is paid for by the type slot
   the type grouping deletes. Per the card-rows mobile ledger, an addition that cannot name what
   it displaced does not ship.
8b. **Availability is a row treatment, never a grouping.** Rows group by type and sort
   alphabetically within a group, on every surface this handoff draws.
8c. **A quantity move is one row carrying `from → to`**, never a bare name on either side.
9. **Money appears three times at most and only one of them is a commitment.** See `OVERLAPS.md`.

## Copy, per state

| State | String |
|---|---|
| Banner label | `Pending changes — not yet a version` |
| Banner counts | `+{adds} / −{removes}` · `{n} changes since v{v}` |
| Banner money | `{n} of the {adds} have no free copy, so this commit will ask for {n} to buy · {total}.` |
| Banner money, with pulls | `… {n} of those are sleeved in other decks and can be pulled instead.` |
| Banner primary | `Review {n} changes` / `Commit as v{n}` at ≤6 |
| Commit as first version | `Commit as v1` · `locks this list as v1 — nothing about the deck changes` |
| Version line | `v{n} · committed {date}` |
| Add mark | a 3px `--accent` left rule on the row; `pending add` in the accessible name only |
| Add-list caption | `the brass rule marks the {n} rows this draft added` |
| Group heading note | `{n} added in this draft` |
| Toolbar note, pending | `{n} of these are not in v2 yet` |
| Mix cell, pending | `was {n}` replaces `rec {n}` |
| Guard tag | `pending` · `commander` |
| Guard action | `Open →` (absent on the commander variant) |
| Quantity move | `{name} {from} → {to}` — `recountedItem`, shared with the update preview |
| Buy breakdown | `{n} not owned · {n} still sleeved elsewhere` |
| Buy tag, decklist row | `$` — the collapsed tile, no figure |
| Buy tag, Shopping + review page | `buy │ {price}` — the split tag |
| Review lede | `Nothing here is a decision except the pulls. The list on the deck page is already this list — this page exists to show you what it costs before you lock it in as v{n}.` |
| Buckets | `Free in your collection · {n}` · `Sleeved in another deck · {n}` · `Not owned · {n}` |
| Bucket notes | `nothing to do — these are in the box already` · `buy, or pull it deliberately` |
| Pull | `Pull it` → `Pulling…` |
| Pull guard | `that deck has its own pending changes →` |
| Removes note | `all {n} go back in the pool when you commit. No per-row toggle: putting one back is adding it to the deck, and the deck page already does that.` |
| Commit heading | `Commit this list as v{n}` |
| Commit lede | `v{n} becomes the deck's list immediately. The {n} cards with no free copy keep their buy tags until you actually buy them, and the {n} you cut are back in the pool the moment you commit.` |
| Note label | `Why this version exists — optional` |
| Note warning | `you cannot add this later — the version is not editable once committed` |
| Buy heading | `To buy · {n}` |
| Buy reasons | `not owned` · `sleeved in {deck}` |
| Link-out | `Open in Mana Pool` |
| Pull heading | `Back in the pool · {n}` |
| Pull note | `No action required — committing is what releases them. Take them out of the box whenever you next open it.` |
| Commit button | `Commit v{n}` → `Committing…` |
| Discard question | `Discard {n} changes?` |
| Discard consequence | `The deck goes back to v{v} as committed on {date} — {n} cards. The {adds} you added and the {removes} you cut are not stored anywhere, so this cannot be undone.` |
| Discard buttons | `Discard {n} changes` · `Keep editing` |
| History heading | `{n} versions` |
| Version, initial | `initial` |
| No note | `no note` |
| Games held | `held {n} games` |
| v1 opened | `Initial — the list as it stood when versioning arrived. There is nothing before it to compare against, so there is no diff to show.` · `Browse the {n} cards →` |
| Version diff note | `no availability, no prices, no pull offers — this is what the deck was, not what it needs` |
| Stamp, absent | `—` |

## Announcements

One live-region message per settle, on the existing region. The banner itself is **not** a live
region — it is there when the page loads.

| Event | Message |
|---|---|
| Pull taken | `Cyclonic Rift pulled from Kess Storm. 7 to buy, $225.70.` |
| Pull refused | the refusal string, once |
| Committed | `Committed v3. 101 cards, 8 to buy.` |
| Discarded | `36 changes discarded. Back to v2.` |
| Commit refused | `We couldn't commit that version. Your changes are still here.` |
