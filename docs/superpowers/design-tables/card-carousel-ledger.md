# Card carousel: ledger close-out and the stacked carousel (PR 4)

Source: `design/design_handoff_the99_card_carousel/README.md` "Ledger" and call #9, and plan
`docs/superpowers/plans/2026-10-02-card-carousel.md` §PR 4. The plan numbers the ledger items
differently from the README; both numbers are given.

## Stacked carousel (call #9)

| Property | Rule | Built | |
|---|---|---|---|
| Top layer | a card opened from a sheet over a held card pages its own list, with its own counter and neighbors | the top `CardModal` takes the live list's `onPrev`/`onNext`, peeks and plates | ✅ `card-carousel-stacked.test.tsx` |
| Top layer read-ahead | the same both-ways read-ahead as any paged card | `nextId`/`prevId` read the live list, which under a sheet is the top card's; the `!held` gate that stopped this is gone | ✅ fails with the gate restored |
| Held card | draws nothing to page with | `onPrev`/`onNext` null, no peeks, no plates; it keeps the counter it wore live, so the sheet going hands it back unchanged | ✅ |
| Geometry | R2's, not superseded frame P7's | the same `CardModal` at `phoneTop` 96 / 140 | ✅ see below |

## Stacked phone sheets at 96 and 140 (README ledger, plan item 4)

The card band runs the same sizing as the full-height sheet, against a shorter dialog:
`card width = min(320, (dialog height - teaser - 85) x 0.7159)`, where the teaser is 280 plus
the door strip and the Take footer each as MEASURED. Below a 120px card the teaser is not offered:
the sheet opens full, with no grip, and Escape closes (card-carousel-phone.md note 3).

| Viewport | `phoneTop` | Dialog | Card width with teaser 280 + extras E | Teaser offered while |
|---|---|---|---|---|
| 390x844 | 52 (Shopping row, door strip) | 792 | (427 - E) x 0.7159, capped 320 | E ≤ 259 |
| 390x844 | 96 (stand-in over the sheet) | 748 | (383 - E) x 0.7159 | E ≤ 215 |
| 390x844 | 140 (card over sheet over card) | 704 | (339 - E) x 0.7159 | E ≤ 171 |
| 360x640 | 52 | 588 | (223 - E) x 0.7159 | E ≤ 55 |
| 360x640 | 96 | 544 | (179 - E) x 0.7159 | E ≤ 11 |
| 360x640 | 140 | 500 | (135 - E) x 0.7159 | never |

So on a short phone every stacked sheet opens full, which is the rule working rather than a gap:
the card is still drawn above the sheet's 64px top, and the details are what the reader came for.

## Ledger

| README | Plan | Item | Outcome |
|---|---|---|---|
| 1 | 1 | Peek contrast: desktop names in `--fg-muted` on the dimmed backdrop, "measure it in build" | Measured at 1300x900 on `/collection`, every pixel behind both names with the text hidden, six themes. `--fg-muted`: median 3.83 to 4.85:1, 39% to 78% of pixels under 4.5:1, min 3.15 (eldraine). `--fg-body`: median 5.39 to 6.69, min 4.43 (eldraine, 2% of one name's pixels), all else at or over 4.5. **The names now use `--fg-body`.** The phone peeks carry no visible name. |
| 2 | 3 | The 1252px threshold is arithmetic on the 820 dialog | `NEIGHBOR_MIN_WIDTH` is computed from `DIALOG_HALF_WIDTH`, and `card-modal-geometry.test.ts` pins the dialog's `md:w-[…]` literal to it, so a width change moves the threshold or fails the test. |
| 3 | n/a | Swipe constants are starting values | Unchanged; tuning on a device is the owner's. |
| n/a | 7 | Reduced motion: a swap, never a slide | Already true at both widths: `.anim-carousel-prev/next`, `.anim-phone-card-enter`, `.sheet-snap`, `.band-dim` are in the reduced-motion block, and the band's spring-back jumps. |

## About

`card-detail`'s caption gains one sentence on paging (an ordinary edit, Hugh 2026-10-03): no new
entry and no `ABOUT_VERSION` bump; the content hash is re-pinned.

VERDICT: 0 visual gaps, 0 state gaps.
