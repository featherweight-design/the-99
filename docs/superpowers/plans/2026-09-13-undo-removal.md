# Undo a removal — execution plan

**Issue:** #390 · **Spec:** `docs/superpowers/specs/2026-09-13-undo-removal-design.md`
**Handoff:** `design/design_handoff_the99_undo_removal/` (R3, Green)

## Shape

**One PR.** Roughly seven files and well under the split threshold: one copy block, one server
action, one control, one list made optimistic, tests, and a probe. The feature has one surface and
one state, which is why R3 is this small.

## Route inventory

Ticked against the running app at close-out, not against the diff.

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

**Tests:** the singular and plural forms of `outNote`; that no `restore` string carries a
percentage, the word "net", or an em dash (this module's existing guards); and that `cta` is not
the same word as #185's `addPanelCopy.undo.action`, because the two-vocabularies seam is
deliberate and a later "tidy-up" that unified them would be reverting a ratified decision.

---

## Task 2 · The server action

**Files:** `src/app/decks/actions.ts`, `src/app/decks/actions.test.ts`

```ts
export async function restoreRemovedCard(
  deckId: string,
  oracleId: string,
  toQuantity: number,
): Promise<DeckMutationResult>
```

**Why it is not `addCardToDeck`** (spec E1): that call adds one copy, and decision 4 restores a
quantity move whole. Write the row's quantity directly rather than looping.

Guards, in the action's existing inline style — it is a public endpoint and the signature is a
claim:

- `requireUserId()` then `requireDeck(deckId, userId)`, as every deck action does.
- `toQuantity` must be an integer from 1 to a sane ceiling. Reject anything else; do **not**
  clamp, because a bad figure is a crafted payload and not a near miss.
- The card must exist.
- **No claim check and no availability read.** Decision 1: this write cannot be refused on a claim,
  and adding one would make a restore stricter than an add.
- `validateCardForDeck` is **not** re-run. The card was in the committed list, so it already
  passed, and re-running it would let a catalogue change turn a reversal into a refusal.

The write is one upsert setting `quantity` to `toQuantity`, inside the deck-row lock the add path
already takes so a concurrent write cannot interleave. Then `revalidateClaims(deckId, userId)` —
not `deckSurfaces()`, per the handoff: a restore is a claim write and the wrong helper leaves every
other deck's availability stale.

**Tests:** restores a full cut to one copy; restores a quantity move to its `from` figure in one
write; refuses a non-integer, a zero, and a negative; refuses a deck the caller does not own;
revalidates through `revalidateClaims`. Mutation-check the quantity assertion — it is the one E1
exists for.

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

**Files:** `src/components/decks/review-changes.tsx`,
`src/components/decks/review-changes.test.tsx`

Per spec E2, this is the first optimistic write on this surface. `useOptimistic` over the `out`
rows, keyed by oracle id; the control's tap removes the row from the optimistic list and starts
the transition. On failure the optimistic value reverts by itself when the transition settles, the
row comes back, and the shipped `MutationError` states it (decision 8).

**Do not** re-render from a stale server list, and do not copy `PullControl`'s local-pending shape
— it is deliberately non-optimistic because a pull's row *stays*, and this row leaves.

**Focus** (decision 10): the group heading the row left, never the next row's control. The heading
needs a tabindex of −1 to receive it.

The `Going out` heading count comes from the optimistic list, so `Going out · 17` reads `· 16` in
the same paint the row leaves. The card count and the changes count follow the same value.

**Tests:** the row leaves on tap; the counts move with it; a failed write returns the row and shows
the error; focus lands on the group heading; `Coming in` never gains a row; no money figure moves.

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
