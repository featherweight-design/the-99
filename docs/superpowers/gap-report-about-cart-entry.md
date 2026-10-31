# Gap report: About, the all-decks cart entry (Small items 7, item 6)

Verified against `design/design_handoff_the99_small_items_7/About-Cart.dc.html`, README §6 and READINESS item 6.
Pass 1 enumerated the board alone, without reading the code. Pass 2 checked each row against `src/lib/copy/about-pages.ts`,
`src/lib/about/{question-landing,screen-for-path,pages-visible}.ts`, `scripts/lib/about-{locators,page-frames}.mjs`
and the committed `p-cart` and `d-cart` captures (the Eldraine pair opened and read).

**Verdict: 0 gaps.** No pin, list or frame piece is new ("No new token or piece"), so there are no visual rows to drift.

## Rows checked

| Row | Design | Build | Result |
|---|---|---|---|
| Entry | Shopping › Shopping for all decks, region root `shopping/all-decks`, `since` 16 | same | MATCH |
| Labels | five, in order: total, decks, views, ask, buy | same | MATCH |
| Label 1 | pinned on the checkout (total + Buy these at Mana Pool), second bold phrase, `legacy: ["all-decks-cart"]` | `[data-cart-checkout]`, `**Buy these at Mana Pool**`, legacy kept | MATCH |
| Label 2 | the Decks picker (phone dropdown, desktop list) | `[data-cart-decks]` | MATCH |
| Label 3 | the view switch, one bold run By card, By deck, By friend | the lead plus `**, By friend**`, which renders as one run | MATCH |
| Label 4 | Ask on the first askable friend row, friend spares switch | first `[data-ask='ask']` row, `SPARE_REQUESTS_ENABLED` | MATCH |
| Label 5 | buy on the same row, `SHOPPING_MARK_BOUGHT_ENABLED` | first `Bought …` tag, same switch | MATCH |
| Numbers close up when 4 or 5 are off | yes | labels drop by switch, so the numbering follows | MATCH |
| Retired region | `shopping/all-decks/cart` on the Decks shots | removed from the locator map | MATCH |
| ? landing | the cart lands on `shopping/all-decks` with `total` lit | `cart` screen, `ABOUT_Q_LANDINGS.cart` | MATCH |
| Captures | `p-cart` 390 and `d-cart` 1300, `/decks/shopping?view=friend`, six themes | same, 12 files plus the generated shot map | MATCH |
| In frame | total, Decks, view switch, the first friend row's Ask and buy | all five, at both widths | MATCH |
| Desktop order | Decks list, total, view switch, Friend / Owned / Sort, table head, groups | same | MATCH |
| Request states on rows | Ask, Accepted, Requested, Declined | all four are in the desktop shot | MATCH |

## Ruled differences (not gaps)

- **Sub line's way in.** The board drafts "Open it from Decks with **Shop all decks**". `/copy-review` rewrote it as "Open it from the top of Decks.", because the cell there reads differently on phone and desktop. This is copy and does not go back to Design.
- **Views label follows the switch (F2, orchestrator 2026-10-31).** The board draws label 3 ungated. With spare requests off there is no By friend tab, so the label names the two views that do exist.
- **`screens: []` plus a landing row.** The board lists the cart as a screen. A listed screen lands with nothing lit (`SCREEN_SECTIONS`), but the board lights the total, so the cart is a landing row instead. The ? behaves exactly as the board draws it.
- **Phone scroll.** The board's shot sits at scroll 0. At 390 the app's tab bar covers the first friend row there, so the frame scrolls the least it can that still brings the buy tag above the tab bar (`reveal`). The total stays in frame.
- **Data.** The deck count, the total and the friend names come from the fixture account (fictional friends, per ruling). They are not compared.
