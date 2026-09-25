# Gap report: Fits your decks (swap tools PR 5b)

Design-review against `docs/superpowers/design-tables/swap-tools-fits.md` (the base handoff, R2–R4, plus the
staples addendum). Agent 2 verified the implementation row by row. Every state in §3 is reachable, and the
picker's own sections, §2.3–§2.11, match. The staple chip reads `staple · any commander`, italic in
`--fg-body`, with no percentage; the dashed note is drawn once; the copies line appears in every state that
knows ownership (F15); and Add and Add to buy follow the server's own count after each add (H1).

## Fixed in this PR

| # | Gap | Fix |
|---|---|---|
| 5 | The picker's title was 15px on the phone, line-height 1.25 (the chrome's default) | `titleClassName="truncate text-[16px] leading-[1.2]"` |
| 7 | When the re-read after a successful add failed, the note said `It uses your free copy, so none are left.` with no evidence that the last copy went | Without a re-read, the note names only what the add used (`addedFree` / `addedToBuy`). Tested, and the test fails with the old branch |

## Recorded, not changed: shared chrome that predates this PR

These come from components other surfaces already ship, where they were accepted. Changing them here would
move the stand-ins sheet, the receipt and every card modal on every route to fix one picker.

| # | Gap | Where it lives |
|---|---|---|
| 1 | Phone footer: no 4px gap and no `6px 16px 24px` padding; `mt-[14px]` | `card-modal.tsx`'s shipped mobile link-out row, which the door now sits in |
| 2 | Desktop footer: `mx-[32px] mb-[30px] pt-[20px]`, no 92px height | `card-modal.tsx`'s shipped Prev/Next row |
| 3 | The Mana Pool link and the pager: type size and color | The shipped `ExternalLink` and pager |
| 4 | Sheet shadow is `--modal-shadow`, not the canvas's two per-width shadows | `ModalChrome`, shared by every sheet over a card |
| 6 | Head padding: phone right 16 (canvas 6), desktop 14/18 (canvas 12/14) | `ModalChrome`'s head, the same one the stand-ins sheet (4a) and the receipt use |

## Decisions carried from the table's §5

- `allHold` drops "They’re listed above.", because the holding decks are listed below the sentence.
- `noneByColors` says "none of your commanders", per F13. With three or more colors it says "all of them"
  where the file says "both", which is only true of two.
- The failed state takes the stand-ins sheet's shape, tag and Try again (F4), with its two sentences about
  decks rather than prices, and no kept line, since a failed read changed nothing.
- Add is 32px on desktop, per README and READINESS.

VERDICT: 0 gaps open in the picker's own code. 5 shared-chrome gaps recorded above.
