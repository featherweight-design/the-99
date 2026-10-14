# States — post-import summary and the contested row (R2)

Two tables. **A** is the summary route; **B** is `ContestedCardRow`, identical on the summary,
`/decks/[id]/changes` and the deck page marker disclosure.

## A · `/collection/replace/summary/[uploadId]`

| # | State | Treatment |
|---|---|---|
| 1 | **All three sections populated** | Header (new total, arrived/left, "no list edited, no version cut"), then `No longer to buy · n` / `Still to buy · n` / `Still short · n`, then `Done`. **No prices and no totals anywhere on the page.** |
| 1b | **Any price on the summary** | **Never drawn.** A cleared purchase has no honest figure (booster, trade or gift are all arrivals), and a figure for what is still owed is real but not actionable on a receipt — the note points at the deck's Shopping list instead. No section has a total, so no total can be misread as the previous list's. |
| 1c | **`Still to buy`'s reason clause** | Three forms: `1 of 2 arrived` (reduced), `not in the new list` (raised), and **`name didn't match`** in `--warning` — the one reason a player can still act on, since they own that card and the CSV line failed. Parse errors take their own clause on the same rule. Dropped on a narrow card where name + deck + reason will not fit. |
| 1d | **The upload had unmatched names or parse errors** | One line under the header: the counts, the consequence for decks, and a route back to the file. Reads *you saw them before you confirmed* — the summary must not imply a fresh discovery. **The issues are never re-listed** — `IssueInspector` did that before the confirm. **Absent when the upload was clean.** |
| 2 | **Arrivals, nothing contested** | Money sections only. The lede gains one clause: *"Every arrival a committed deck was waiting for had a copy to spare, so there is nothing to decide."* **No heading with a nought beside it.** |
| 3 | **Nothing partly arrived and nothing left** | `Still to buy` absent — every arrival either cleared a deficit outright or contested. |
| 4 | **Only one of the two money sections applies** | The unused one is absent; the lede states the one direction. |
| 5 | **Contested only** | Both money sections absent — possible when every arrival lands on a contested card. |
| 6 | **Nothing to report** | One screen: header + `Nothing your decks care about moved.` + the file delta + `Done`. **Still rendered.** Also the state a broken `confirmUpload` idempotency would land on after a real import. |
| 7 | **A money section is longer than four rows** | Four rows then `Show all n`, expanding in place. **The contested section never truncates.** |
| 8 | **A card appears in a money section *and* in `Still short`** | The contested row carries the page's one cross-reference, pointing up. The two figures answer different questions (draft demand vs committed claims) and the page never sums across them. |
| 9 | **Reload / revisit** | Keyed by `uploadId`; money sections are the frozen `summary_payload`, the contested section is live. |
| 10 | **A pick is made here** | Only that row redraws. **No figure above it moves.** |
| 11 | **The last contested card resolves** | The row leaves on the next load, not under the finger. At nought the section is absent. |
| 12 | **A superseded upload** | An older `uploadId` still renders its own receipt, with contested rows reflecting **current** allocation. No out-of-date banner — the money sections are dated by the header. |
| 13 | **Re-confirm / double submit** | Returns the **stored** summary. Never a recomputed empty diff. |
| 14 | **390px** | One column. Receipt rows take the deck name as a sub-line (46px), `Partly covered` hanging its deficit move off that line. Deck options two-line (52px). No horizontal scroll, no truncated deck name. |
| 15 | **Import failed / partially applied** | Out of scope — owned by the replace flow, which never reaches this route. |

## B · `ContestedCardRow`

| # | State | Treatment |
|---|---|---|
| 20 | **Default, before any pick** | Supply line (`1 new copy · 2 decks need it`), heading `Give the new copy to`, one option per **committed** claimant in `since` order, each leading with the mark. Holder: **filled neutral**, `gets it`. The rest: **empty ring**, `buys it`. **Nothing is accent and there is no footer** — both mean *you chose this*. |
| 21 | **Several copies arrived** | `2 new copies · 3 decks need it`; heading `Give the 2 new copies to` + the cap, `2 of 2 given`. **Marks go square**, because a player really can give two decks a copy. More than one mark is filled; only a brass one is `aria-checked`. |
| 22 | **A deck wants more copies than one** | **Not drawn, deliberately.** A deck wanting three lands is one claimant taking one tick — the chooser allocates copies across decks, never within one. No quantities appear on any option. |
| 23 | **A brew also wants the card** | Not an option. Footnote: *"Muldrotha Lands wants it too, but it has no committed version — only committed decks can be given a copy."* The supply line counts **committed decks only**. |
| 24 | **After a pick** | Chosen option: **`--accent` mark**, accent border, `gets it`. Displaced deck: mark empties, `buys it`. **Footer appears** — `Tap {deck} again to undo this.` + `Back to first committed`. **Required on every surface the chooser appears on** (at 390px the sentence takes its own line above the link); it is the only non-colour carrier of authorship. **One exception:** a refusal note supersedes it — see 30. |
| 25 | **Pick cleared** | Returns to 20 exactly. **Indistinguishable from never touched.** |
| 26 | **Pick moved** | One marker only, ever. The previously chosen deck returns to its default outcome for the new allocation. |
| 27 | **Pick in flight** | No in-flight state: optimistic. Words and marker move on tap. |
| 28 | **Transport failure** | Words revert; shipped `MutationError` states it. **Not a refusal.** |
| 29 | **Refused — the deck no longer asks** | Row re-reads: that option is **gone**, counts corrected. Note names deck and card, the cause, `Nothing moved: {holder} still has the copy.`, and that the card is no longer contested. **No way forward offered.** |
| 30 | **Refused — nothing left to reserve** | Allocation redrawn. Note: `There's no copy left to give.` + who has it + **`Take it off {deck} first`** — not a retry: reservations resolve on `(created_at, deck_id)`. **The note supersedes the footer:** if the holder got the copy from an earlier pick it would otherwise carry an undo hint too, but the refusal already names the deck and the way back in one sentence, and two competing instructions on one row is worse than one. Authorship stays carried in words, which is the rule's requirement. |
| 31 | **Refused — the card is that deck's own commander** | Row redraws as 33 *and* states why. Reachable because the payload is a record of one import and the write re-reads. |
| 32 | **Refused — the deck is not this user's** | **Not drawn.** Falls back to 28's transport treatment. |
| 33 | **A commander holds the only copy** | Heading `Nothing to choose here`. Every option dashed and inert; the holder's mark is **filled but dimmed** (`#8E8269`) with the `commander` plate + `keeps it`, the other an empty ring on a dashed row. Footnote: *a commander's copy can't be moved.* |
| 34 | **Commander + list copy, folded claim** | **Row stays live.** Commander half protected, spare copies pickable. Outcome `keeps 1 · gets 1 more`; heading narrows to `Give the spare copy to`. **The guard is per copy, not per row.** |
| 35 | **Commander holder but a copy is still free** | Ordinary row. Commander option inert; the free copy is a live choice; heading is the normal one. |
| 36 | **Two commanders claim it, supply 1** | As 33 — no choosable option. |
| 37 | **Refusal, then any option tapped** | The note clears on the tap. One live-region announcement per refusal, verbatim. |
| 38 | **The card is also pullable** (`/changes`) | Decklist row keeps `Pull it`; the chooser is the panel beneath, caption `no list changes`. **Row template unchanged, row does not grow.** |
| 39 | **Contested, not pullable** | No `Pull it`; the panel alone — identical to the summary's row. |
| 40 | **`this deck` among the claimants** | Tagged `this deck`, **in commit order, never promoted.** |
| 41 | **On the deck page** | The `over`-state marker is the disclosure trigger (`short 1, also in Sidisi Graveyard`). Closed by default, one open at a time, never reflows the list. `free`/`soft`/`hard` are never triggers. **The panel uses the compact two-line option at any width** — the decklist column is 345px, within a hair of the phone option's 336px, and a one-line option's fixed content leaves the deck name 18px. ⚠ Contradicts a shipped ruling — README decision 10. |
| 42 | **One claimant left** | Not contested; the row does not exist. Reached from 29 on the next load. |
| 43 | **No shortage** | The row does not exist. Assignments are inert without contention. |
| 44 | **Compact option · 390px and the deck-page panel** | Two-line, 52px: deck name over outcome, stamp demoted to the outcome line, `this deck` a `flex:none` plate on the name line. **The deck name never truncates to fit a price, and the stamp never truncates at all.** Chosen by column width, not viewport width. |
| 45 | **Keyboard** | `role=radiogroup` labelled by the heading; arrows move; Space/Enter selects, and on the selected option clears. **`aria-checked` is the whole authorship model** — checked means *you chose this*, unchecked with a filled mark means *it holds a copy by default*. Neutral fills are `aria-hidden` and each option's outcome carries the allocation into its accessible name. Inert options are skipped and carry the tag word in their accessible name. |
| 46 | **Themes** | All six `[data-theme]` blocks, no variant. Every mark value is a token: neutral fill `--fg-body`, picked fill `--accent`, empty ring and inert fill `--fg-faint`, dot `--bg`. **Canopy and Low Sun are the two themes where hue cannot separate a pick from an outcome** — the footer sentence, which names the deck, does. |
