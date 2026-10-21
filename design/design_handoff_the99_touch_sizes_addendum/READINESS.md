# Readiness: touch sizes and missing states addendum

**Verdict: Green.** Every item is specified, measured and drawn at both widths, and each shipped surface it names exists on
`origin/main` as described. No product call is left open for Design. Audited 2026-10-21 against the rebased tree, by lane 50.

## What was checked against the tree

`consider-toolbar.tsx`, `count-stepper.tsx` (its comment and `TOUCH_HIT` hits match the README's account), `proxy-list-view.tsx`,
`spine-mobile.tsx` (`entryLabel` / `entryAria` in `src/lib/copy/deck-import.ts`), `deck-sort-menu.tsx`, `rack/order-control.tsx`,
`rack/select.tsx`, `friends-list.tsx` ("Remove friend"), `scanner-view.tsx` (`CameraBlocked`), and the `LegalLinks` mount in
`src/app/about/page.tsx` with its "awaits Design" comment.

## Rulings (Hugh, 2026-10-21)

- **Item 1, the scanner's not-ready state: WON'T BUILD.** The state only appears on a database with no scan index, which is never
  staging or production. The addendum's redraw and its four `notReady.*` strings are kept as a record and are not built or sent to
  /copy-review. The shipped one-line `notReady` notice stays as is.

## Items to build

| # | Item | What a player sees, and where |
|---|---|---|
| 2 | About's Terms · Privacy line | Nothing changes. Delete the "Placement awaits Design" comment in `src/app/about/page.tsx`. |
| 3 | Phone deck header | On a phone narrower than 390px, the deck page's first header button reads `Update` instead of `Update from a list`, so the row holds one line at 360. New string `update.entryLabelShort` goes to /copy-review. |
| 4 | Menu rows | On a touch screen, rows in the deck ⋯ menu, the deck Sort menu, the Your commanders Order menu and the friend ⋯ menu are 44px tall with 14px labels. A mouse sees what shipped. |
| 5 | Consider sort and stepper | On a touch screen, Consider's sort select is 44px tall, and a card row's count stepper is three 44px slots (−, figure, +) so tapping the count opens the field. |
| 6 | Precons' pips | On a touch screen, the colour pips in a precon list row each sit in a 44px slot; the drawn pip stays 22px and the sort still fits at 360. |
| 7 | Proxy deck links | On a touch screen, Collection › Proxies deck links are 44px lines; a row with links grows about 16px. |

## Notes for the build (none gate it)

- Items 4 to 7 change only on `pointer: coarse`, so each probe needs a coarse-pointer context.
- Item 3's 360 fit is measured on the drawn fonts (356.5px in 328 before, 277.3 after). The build confirms it in a browser.
- This PR carries 127 files, nearly all images and exported boards, and no runtime code.
