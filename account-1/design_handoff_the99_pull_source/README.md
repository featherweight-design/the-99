# Pull it · choosing the source deck (addendum R1)

On `/decks/[id]/changes`, Pull it on a card held by **two or more** decks that can give it up opens a
short list of those decks, and the player picks one. Today `pullCandidate()` picks silently. With a
single source nothing changes.

Canvas: `The 99 - Pull it · Source.dc.html`. Frames: `Changes Pull Frame.dc.html` (props `w`, `s`, `sel`; live).
Read at `main`: `components/decks/{pull-control,contested-card-row,review-changes}.tsx`,
`lib/decks/{availability,pull-release}.ts`, `lib/copy/{deck-versioning,locked-cards,card-assignments}.ts`.
Repo path: `design/design_handoff_the99_pull_source/`.

Fixture: Kykar, Wind's Fury (v4 → v5). Fabled Passage is held by HD - Avatar Aang (v7 · 2 Aug, today's
pick), Prismari Artistry (v3 · 19 Sep, already has a draft) and Atraxa Counters (locked).
Arcane Signet has one source.

## Design calls

1. **Popover at ≥ md, bottom sheet below.** The popover is 372px wide and hangs right-aligned under the row,
   so the card stays in view. A sheet at 1300 would cover both columns for a list of two to four decks.
2. **Each source shows** the deck name, `v7 · 2 Aug` (the shipped `contested.stamp`), and what the pull does to it: `→ 98 cards`
   plus `new draft` or `joins its draft`. **Copies held is not shown.** Only basics hold more than one copy, and
   basics never reach a pull, so it would always read 1.
3. **Default: today's pick (`pullCandidate`) is preselected**, filled in accent, and named on the confirm button.
   Rows are in commit order (`since`), the same order as the contested-card row.
4. **Locked: shown and disabled with its reason.** It gets a dashed border, a hollow dimmed mark, the shipped `locked` tag,
   and a reason line. A commander claim is drawn the same way, with the `commander` tag. Neither can be focused.
5. **One source: no list and no confirm.** One tap pulls, as shipped (3a/3b), and the shipped Undo covers a mistake
   (Hugh, 2026-10-04). Only sources that can be chosen count: one free source plus one locked is one.
6. **The confirm is `Pull from {deck}`**, an outline accent button (Pull it is never solid), with Cancel to its left.
   One sentence above the buttons says what happens to the source and how to undo it.
7. **After the pull:** the buy tag and the control go, and the held-by slot reads `pulled from {deck}`, linked to that deck.
   The chips and the column note drop by one.

**Not listed:** draft-only decks (`mature: false`, which can't be a source) and junior decks (`senior: false`: a pull
frees nothing). The list is `claims.filter(c => c.mature && (c.senior || c.locked || c.commander))`,
in `since` order. **Flag for Hugh:** a junior holder exists but isn't offered. That is the existing rule, and it stays.

## States

| # | Surface | State | Frame | Notes |
|---|---|---|---|---|
| 1 | Row | 2+ sources, closed | 3a (Fabled) | Held-by reads `in {n} decks`, where n counts sources that can be chosen. `Pull it` + `▾`, `aria-haspopup="dialog"`, `aria-expanded` |
| 2 | Row | 1 source | 3a, 3b (Signet) | Shipped row and one-tap pull, unchanged |
| 3 | Row | only guarded holders | — | Shipped guard tag, no control. Unchanged |
| 4 | List | open, default | 1a, 1b | Today's pick checked. Focus goes to the checked radio. Arrows rove and skip disabled rows |
| 5 | List | other pick | 2a | The confirm label and sentence follow the pick |
| 6 | List | locked source | 1a, 1b | Dashed, `aria-disabled`, out of the roving order. Its reason is in the visible line |
| 7 | List | commander source | — | As 6, with the `commander` tag and reason `its commander` |
| 8 | List | pulling | 2b | Shipped `Pulling…`. Radios and Cancel are disabled. Esc and scrim do nothing |
| 9 | List | refused | 2c | Server `result.message`, or the shipped fallback on a throw, in `MutationError` under the buttons. The list stays open with the pick kept. If the source is now locked, the fresh read redraws it disabled and moves the pick to the next source that can be chosen |
| 10 | List | dismissed | — | Cancel, Esc, a click outside (desktop) or the scrim (390). Focus goes back to Pull it |
| 11 | Row | after the pull | 4a, 4b | Focus moves to the row's card trigger, as shipped. The announcement is the shipped `pullAnnounced(card, deck, …)` with the chosen deck |
| 12 | Row | after; source draft discarded | — | The release clears. The row returns to state 1 or 2 on revalidate |

## Engineering

1. `PullControl` takes `claims: DeckClaim[]` (ordered) and `defaultId` (today's `pullCandidate().id`), not one `claim`.
   One source that can be chosen keeps the current path. Two or more open the list.
2. Popover: anchored right, under the row, `role="dialog"` labelled by its title, with the `radiogroup` inside.
   The row's plate-wide handler already ignores clicks inside buttons. The popover's root needs the same exemption.
3. `→ {n} cards` is the source's current draft count minus one. `joins its draft` is `claim.pending`.
4. The after-pull row reads the `pull_releases` row for this asking deck and card (`sourceDeckId`) to name the source.
   Without a release row it draws as it does today.
5. The confirm calls the shipped `pullCardFromDeck(chosenId, oracleId, deckId)`. No new server work.

## About

This is a refinement of the existing Pull it entry: an ordinary edit with no version bump. Proposed addition to `about.ts` (review-and-commit, key 3):
"When more than one deck could give it up, Pull it asks which; a locked copy is listed but can't be chosen."

Copy: `pull-source · copy strings.ts` (placeholders, owed to `/copy-review`).
