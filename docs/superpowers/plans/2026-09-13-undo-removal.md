# Undo a removal — execution plan

**Issue:** none — see the spec · **Spec:** `docs/superpowers/specs/2026-09-13-undo-removal-design.md`
**Handoff:** `design/design_handoff_the99_undo_removal/` (R3, Green)

## Shape

**One PR.** Roughly seven files and well under the split threshold: one copy block, one server
action, one control, one list made optimistic, tests, and a probe. The feature has one surface and
one state, which is why R3 is this small.

## Route inventory

**Unticked on purpose.** These are ticked against the running app at close-out, not against the
diff, so they stay empty until Task 5 has run and the PR records the result.

| Route | 390px | 1300px | Shares with |
|---|---|---|---|
| `/decks/[id]/changes` — `Going out` column | ☐ | ☐ | — (the only surface) |
| `/decks/[id]` — decklist and card view | ☐ | ☐ | #185, **must not change** |

The second row is the regression check, not new work: decision 3 says `decklist-row.tsx` and
`deck-card-undo-tile.tsx` are untouched, and the probe proves the receipt still behaves.

---

## Task 1 · Copy

**Files:** `src/lib/copy/deck-versioning.ts`, `src/lib/copy/deck-versioning.test.ts`

Add a `restore` block to the existing object — same feature, same vocabulary, same file, per the
handoff's copy notes. Strings verbatim from `undo-removal - copy strings.ts`:

```ts
restore: {
  cta: "Put back",
  ctaA11y: (card: string) => `Put ${card} back in the deck`,
  announced: (card: string, cards: number, out: number) =>
    `${card} is back in the deck. ${cards} cards, ${out} going out.`,
  announcedLastOut: (card: string, cards: number) =>
    `${card} is back in the deck. ${cards} cards, nothing going out.`,
  announcedLastChange: (card: string, version: number) =>
    `${card} is back in the deck. This deck matches v${version} again.`,
},
```

**Edit `review.outNote`.** The handoff gives the replacement as
`` `all ${n} go back in the pool when you commit. Put one back and it never left.` ``

**E3 — keep the singular arm.** The shipped string branches on `n === 1` (`it goes` / `all ${n} go`)
and the replacement is written in the plural head only, which reads "all 1 go back in the pool" at
one card. Keep the branch and swap the tail:

```ts
outNote: (n: number) =>
  `${n === 1 ? "it goes" : `all ${n} go`} back in the pool when you commit. ` +
  "Put one back and it never left.",
```

Add `restore.failed` as well — the fallback when the write throws or is refused. It cannot borrow
`DECK_REMOVE_FALLBACK_MESSAGE`, which says the card is still in the deck: here the card is *out*,
and the restore is what did not happen. `addCardToDeck` can also return a refusal of its own
(`deckAddRejectionMessage`), which is passed through unchanged — it is a sentence about the card,
not about this surface.

**Tests:** the singular and plural forms of `outNote`; that no `restore` string carries a
percentage, the word "net", or an em dash (this module's existing guards); that `cta` is not the
same word as #185's `addPanelCopy.undo.action`, because the two-vocabularies seam is deliberate
and a later "tidy-up" that unified them would be reverting a ratified decision; and that
`restore.failed` does not claim the card is still in the deck.

---

## Task 2 · The mutation — there isn't one

**Files:** none.

**`addCardToDeck` is the call, unwrapped, exactly as R3 said.** The spec's erratum E1 was wrong and
is retracted there; this section records why, because the reasoning is the part worth keeping.

E1 argued a wrapper was needed to restore a quantity move whole (decision 4, matrix state 64).
**A quantity move cannot appear under `Going out`.** `readDraft` filters basic lands out of both
`adds` and `removes` before either list is built (`draft-state.ts:218`) — they sit outside the
availability model, so neither list has a figure to print. And a *non*-basic can never hold more
than one copy: `addCardToDeck` increments only for `isBasicLand` (`actions.ts:614`), and the
importer forces `quantity: 1` for everything else (`import.ts:343`). Every row in that column is a
whole removal, `to === 0`, one copy.

So the restore adds one copy of a non-basic, which is precisely what `addCardToDeck` does. With it
go the quantity parameter and its bound, the version-membership guard, the stale-write guard and
the version-read-in-transaction race — all of which existed to make a bespoke write safe. The
shipped call is already safe for the reason those guards were reaching for: it runs
`validateCardForDeck`, it is idempotent for a non-basic (`onConflictDoNothing`), it takes the deck
row lock for the cap check, and it ends in `revalidateClaims(deckId, userId)`, which is the helper
the handoff asks for.

**A crafted call adds no capability.** It can add any valid card to a deck the caller owns, which
is what the Add panel offers on the next route.

**Matrix state 64 is unreachable**, and so is the `Swamp 9 → 7` figure in the handoff's frame 1.
Recorded for Design to ratify; nothing about the drawn control changes, because every row that can
exist behaves identically.

**Tests:** none new here. Task 3 and Task 4 cover the call through the control.

---

## Task 3 · The control

**Files:** `src/components/decks/put-back-control.tsx` (new),
`src/components/decks/put-back-control.test.tsx` (new)

A borderless brass link, 34px tall with a 44px square target at 390px, right-aligned at both
widths — never centred, which leaves the label inboard and the trailing column ragged. It is the
same treatment as `PullControl`'s `Open →`, so read that file before writing this one.

Props: the row, and an `onRestored` the list owns. The control does not hold the optimistic state —
the list does, because the row is what leaves.

**Announcements** go through `draftAnnouncer()`, the hoisted live region both of this page's writes
already use. The reason applies here exactly: the row is removed by its own success, so a region
rendered inside it would be unmounted before it was read. Which of the three strings fires depends
on what is left after the restore — the last `out` row, or the last change of any kind.

---

## Task 4 · The optimistic list

**Files:** `src/components/decks/review-changes.tsx`, `src/components/decks/commit-sheet.tsx`,
`src/components/decks/review-changes.test.tsx`

Per spec E2, this is the first optimistic write on this surface. `useOptimistic` over the `out`
rows, keyed by oracle id; the control's tap removes the row from the optimistic list and starts
the transition. On failure the optimistic value reverts by itself when the transition settles, the
row comes back, and the shipped `MutationError` states it (decision 8).

**Do not** re-render from a stale server list, and do not copy `PullControl`'s local-pending shape
— it is deliberately non-optimistic because a pull's row *stays*, and this row leaves.

**Focus** (decision 10): the group heading the row left, never the next row's control. The heading
needs a tabindex of −1 to receive it.

**The last row is the case that breaks that.** The `Going out` column mounts only while
`outCount > 0` (`review-changes.tsx:580`), so restoring the last cut unmounts the heading in the
same render that would receive focus, and focus falls to the document body. Restoring the last
change of *any* kind dissolves the draft entirely and the route redirects (matrix state 70), which
is its own landing. Between them sits the case that needs an answer here: the last `out` row while
`in` rows remain. Focus goes to the page's own heading, which outlives the column.

**Every figure the restore moves has to move together**, and there are more of them than the
column. All of these are server values today:

- `cardCount` and `released` in the footer (`released = releasedCopies(state)` at `:432`).
- **`CommitSheet` computes its own `released` from `state.removes`** (`commit-sheet.tsx:91`), so a
  sheet open when the last removal is restored keeps the old total and its release block. It needs
  the projection passed in rather than deriving its own.
- **The phone's segmented pair.** `segmented = inCount > 0 && outCount > 0` (`:457`) and the
  `shown` segment both read server counts. Restore the last `out` row while the reader is on the
  Out segment and the pair stays mounted with a stale `Going out · 1` selected, hiding the
  `Coming in` list behind it. Derive `segmented`, the tab labels and the column's own mount from
  the optimistic list, and move `shown` to `"in"` when `out` empties.

Project `released` and the draft card count once, from the optimistic list, and pass them to every
renderer. **The buy figures are not projected and must not be**: decision 6 says no money moves on
any restore, so a figure that moved would be a bug rather than a lag.

**Tests:** the row leaves on tap; the heading count, the card count and the released figure all
move with it; the buy figures do not; an open commit sheet's released figure moves with them; the
phone's segmented pair collapses and `shown` falls back to `in` when the last `out` row goes; a
failed write returns the row and shows `restore.failed`; focus lands on the group heading, and on
the page heading when the last `out` row goes; `Coming in` never gains a row.

---

## Task 5 · Acceptance

**Files:** `scripts/probe-undo-removal.mjs` (new)

A browser walk at 390×844 and 1300×900 — the route inventory above, and the four things only a
browser answers:

1. Every row under `Going out` carries `Put back`, and pressing one removes that row while the
   heading count drops by one.
2. The control's target is 44px square at 390px and its label right-aligns at both widths.
3. No row in the column is two-line at either width, and the page does not scroll sideways.
4. **`/decks/[id]` is unchanged** — removing a card still leaves #185's dashed receipt with its
   `Undo`, in both list and card view.

It writes its own deck, version and draft under the probe account and deletes it in a `finally`,
per the discipline in AGENTS.md. Point it at `local-dev`, never production.

---

## Gate

`pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then the probe against a local
`pnpm dev`. Every fix that ships with a test is mutation-checked before the push.
