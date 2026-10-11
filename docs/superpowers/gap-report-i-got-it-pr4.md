# Gap report: I got it PR 4 (History's deck line and the card details' way in)

Design-review run against two sections of `docs/superpowers/design-tables/i-got-it.md`: the
details link (A11, 17 rows) and the new History deck line (§D, 11 rows and 4 states). Checked against
the running app on a scratch copy of staging at 390 and 1300 (`contact-sheet` with the PR 4 rows of
`docs/superpowers/inventories/i-got-it.json`).

## Verify: 0 state gaps, 4 visual differences, all kept deliberately

| # | Element | Canvas | Built | Why kept |
|---|---|---|---|---|
| 1 | `Bought this card?` size and underline | 14px, offset 4px | 13px, offset 2px | The canvas calls it "the modal's own link style" in "the 1+2 slot": it shares `RECEIPT_LINK_CLASS` with /collection's Edit copies, so the two links in that slot cannot drift. The canvas is drawn larger than the shipped modal throughout. |
| 2 | Label line text | mono 11px, 0.14em | the shipped heading, mono 10px, 0.1em | The receipt is the shipped `In your collection` block; only its link is new. |
| 3 | Deck line position | inside the title column, 3px under the figures | its own line under the row, indented to the title column on desktop | A link cannot sit inside the entry's disclosure button. The reverted line already does exactly this. |
| 4 | History tag | boxed (1px border, 4px radius) | the shipped unboxed tag | README call 7: F1's row, unchanged. Only the kind and its `--success` ink are new. |

## States: all reachable

- D1/D3: `listColumns` resolves `shopping:<uuid>` against the entry user's own decks; a deleted
  deck returns the id with a null name. Pinned by `history.test.ts` (emitted SQL) and
  `history-list.test.tsx` (render), and seen in the browser on a renamed source id.
- D2: reverted pair keeps both links (`history-list.test.tsx`).
- A11 negatives (All tab, /collection, a card the list does not bill): the modal draws the link
  only for `door` and only the deck page registers it (`got-it-door.test.tsx`, browser cells).
- After a write the held card is re-read in place (`none` → `×1`, `got-it-door.test.tsx`).

## Deferred

- The deck name links to the deck, not to its Shopping view: the All / Shopping choice is builder
  state with no URL, and adding one is a new parameter the builder deliberately does not read.

## Confirm: 0 gaps remain
