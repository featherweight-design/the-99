# The tuning panel — six states, and the note field (§10)

One container, three slots, six states. **The difference between any two states is the content of
one slot.** The heading never changes rank, the action row always holds exactly one primary in the
same corner, and only the body changes shape — downward.

| Slot | Changes between states? |
|---|---|
| 1 · Heading (Cinzel 19px) | Words in two of six. **Never rank, colour, icon or count.** |
| 2 · Body | **Yes — this is the only one.** One column, panel width, grows downward. |
| 3 · Action row (56px) | The primary's **label** and enabled-ness. Never its position. |

---

## The six states

| # | State | When | Body | Primary | Note beside it |
|---|---|---|---|---|---|
| 1 | **Below threshold** | `games < PATTERN_MIN` | What it needs, and what the games so far already lean toward, with its denominator (`cards in hand, 2 of 2`) | `Suggest changes` — **disabled, no error** | `one more game — 2 of 3` |
| 2 | **Ready** | at or above threshold, no run yet, or after a `Stop` | The strongest Fix in `--warning`, then **the four-row manifest, unchecked** (drawn as the pending dot, manifest-affordance addendum) | `Suggest changes` | `takes a few seconds · nothing changes until you say so` |
| 3 | **Generating** | run in flight | **The same four rows, ticking as each read completes** | `Reading…` non-interactive + neutral `Stop` | `3 of 4 read` |
| 4 | **Results** | run returned ≥1 usable suggestion | Manifest collapsed to one mono line, then the cards | `Suggest again` | `3 of 3 still open · these stay until you replace them` |
| 5 | **Nothing has changed** | run returned the same set, or nothing new | **The reason, three countable lines**, then what would change it | `Suggest again anyway` | `3 of 3 from Tuesday still open` |
| 6a | **Unavailable** | provider unreachable | one sentence + what survived | `Try again` | `or come back later — the button will be here` |
| 6b | **Timed out** | run exceeded its budget | one sentence + what survived | `Try again` | `stopped at 3 of 4 read` |
| 6c | **Unusable answer** | response could not be parsed | one sentence + what survived | `Try again` | `this one is on us` |
| 6d | **Nothing held up** | every candidate failed validation | one sentence naming the classes of failure + `0 of 4 suggestions survived checking` | `Try again` | `log another game and there is more to go on` |

**§6's four classes are named as Design inferred them** — the spec was not readable from this
project. The count is four and the shape is one; different labels are a copy edit and no redraw.
See `READINESS.md`.

## The rules the matrix is generated from

1. **The panel renders in all six states, in the same place, at the same width.** It never appears
   or disappears, because that moves the history under the player's cursor.
2. **A disabled primary is never accompanied by an error.** State 1 is not a failure — nothing has
   gone wrong, the player simply has not logged three games. `--danger` appears nowhere in it.
3. **Only the body carries colour**, and only `--warning` on a cited Fix axis and `--danger` on a
   failure tag. Results are brass and ink.
4. **Nothing unmounts mid-write.** During generation the manifest stays on screen and legible; on a
   re-run, the previous results stay until new ones land. A failed re-run leaves the old
   suggestions exactly where they were.
5. **A cancel is not a failure.** `Stop` returns to state 2 with the manifest unchecked (the pending dot), no error,
   no tag.
6. **Every failure states what survived.** Games, note, list, and any suggestions on screen.
7. **Retry is always a button.** No automatic retry, ever — manual-only governs the second attempt
   as much as the first.
8. **The threshold is `PATTERN_MIN`**, imported from #9. It is stated once, in the mono note, as a
   count with its denominator — never as a progress meter and never as a rule the player must
   satisfy.
9. **The manifest is one list at three densities** (unchecked / ticking / collapsed to a line; unchecked is the pending dot), so
   the results are visibly the answer to the thing the player just watched.
10. **Progress is a real count.** `3 of 4 read`, ticked on actual completion. No indeterminate bar,
    no invented staging, no percentage.

## The suggestion card's own states

| # | State | Card | What the player sees |
|---|---|---|---|
| 1 | **Open** | `1px --border` | Four rows: the cut → add pair on one line with ownership and price at its end, the rationale, then actions with the citation chips at the row's end. **The consequence prints in mono before the tap.** On phone the pair breaks over two lines and the actions become two 44px halves. |
| 2 | **Applying** | unchanged | Button reads `Applying…`, non-interactive; dismiss disabled; **nothing unmounts**. |
| 3 | **Applied** | `1px --success` | Add column relabelled `Added`, `--success` arrow and thumbnail border, `applied` stamp, **the deck's post-swap verdict**, the shopping clause, and `Put it back`. |
| 4 | **Apply refused** | back to state 1 | Shipped `MutationError` **under this card's action row**, not the panel's. Nothing else on the panel changes. |
| 5 | **Dismissed** | one line, same slot | `not this one` + the pair in `--fg-faint` + `Show it again`. **No gap, no reorder, no animation out**, and no question asked. |
| 6 | **Restored** | state 1 | Identical to open. Dismissing is not a decision the app makes the player defend. |

Applied and dismissed **persist across reload** and last until the next run replaces the set. The
panel footer counts them with denominators: `1 of 3 applied · 1 dismissed`.

## The note field's states (surface 1)

| # | State | Field | Counter | Save |
|---|---|---|---|---|
| 1 | **Untouched** | rest, placeholder-free label above | **absent** | enabled by the result alone, as shipped |
| 2 | **Focused, empty** | `1px --accent` | `0 / 140` | unchanged |
| 3 | **Typing** | `1px --accent` | `78 / 140` `--fg-locked` | unchanged |
| 4 | **Near the cap** | `1px --accent` | `133 / 140` **`--warning`** | unchanged |
| 5 | **At the cap** | stops accepting input | `140 / 140` `--warning` | unchanged. **No error, no red field** — a cap you cannot exceed does not need one |
| 6 | **Saving** | non-interactive, in place | frozen | `Saving…` |
| 7 | **Refused** | **value preserved** | preserved | shipped `MutationError`; nothing is cleared |
| 8 | **Reopened** | empty | absent | The form never pre-fills from history — #9's rule, unchanged |

**The note never enables Save and never blocks it.** It is not required on a loss, it is not
prompted for, and it is never parsed for axis marks.

## Copy, per state

| Where | String |
|---|---|
| Heading, all six | `Suggested changes` |
| Below threshold | `This needs three games. You have two, and they already lean the same way — cards in hand, 2 of 2. One more and we can point at a card instead of a pattern.` |
| Ready | `Nine games in, and cards in hand has been marked against you in 7 of 9. We will read four things and propose three swaps — each one a card out, a card in, and the reason.` |
| Generating | `Reading your deck. This takes a few seconds — the list below is what we are looking at, and it stays on screen when the suggestions arrive.` |
| Results | `Three swaps, all aimed at the same thing. Each is a card out and a card in — the count stays at 99 and nothing moves until you apply it.` |
| Nothing changed | `Same three swaps as last time. Nothing has changed since Tuesday — the same axis is still your weakest, and you have not logged a game since we last looked. We would only be repeating ourselves.` |
| Note label | `Note` · `optional — one line, in your words` |
| Optional line | `marks and the note are optional — a result on its own is a game` |

Failure copy, the manifest rows and the announcements are in
`deck-tuning · copy strings.ts`.

## Announcements

One live-region message per settle, on the existing region.

| Event | Message |
|---|---|
| Generation starts | `Reading your deck` |
| Results land | `Three suggestions ready` |
| Nothing changed | `No new suggestions. Nothing has changed since the last run.` |
| Failure | the failure's own sentence, once |
| Swap applied | `Midnight Reaper swapped in. 99 of 99, complete.` |
| Swap reversed | `Cemetery Reaper put back. 99 of 99, complete.` |
| Dismissed | `Suggestion dismissed. 2 of 3 still open.` |
| Intent saved | `Deck intent saved.` |

**Never one per manifest line.** Four fast ticks is silence; the manifest is visible and the
`aria-busy` on the panel already says a wait is in progress.
