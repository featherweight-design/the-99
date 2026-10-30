# Card search — readiness

**Verdict: ready to build (R2, approved by Hugh 2026-10-16).** R1 answered all eight open items and drew every state
the brief lists; R2 takes Hugh's two notes (empty-state graphic A, the rail's plain slot R-A) and he approved the rest
as drawn. Build from `R2 - Sheet-Phone`, `R2 - Rail-Desktop`, `R2 - Deck-Page`, and `R1 - Header-Phone`, `R1 - Rows`
and the About entry, which R2 did not change. One call left for build time: where the About entry ships.

## Against the locks

| Lock | Met | Where |
|---|---|---|
| 1 Search opens card details, unchanged | Yes. Unstacked handover keeps Find a deck with no change to card details. | Sheet H1–H3, Rail D7–D8 |
| 2 Name only | Yes. One field; its only control is ✕. | All |
| 3 Art, name, owned N / in deck X / on your wishlist | Yes. | Rows |
| 4 Placement A | Yes. A plain rail slot + ⌘K (R2); header icon + full-screen sheet. | Rail, Header, Sheet |
| 5 Quick return on every phone screen | Yes. Not sticky at the top, back on 12px up. | Header Q1–Q5 |
| 6 Two labels | Yes. The deck field already begins "Add a card". | Deck DP1–DP4, DD1–DD2 |
| 7 No collision | Yes. 582px apart; suspended while typing. | Deck DP2, DP3 |
| 8 Reader's own data only | Yes. Every signal and recent card is the account's own. | All |

## What engineering needs (gaps)

G1 switch · G2 card details in the shell + close callback · G3 match ordering · G4 reader vs app scroll · G6 deck
names and wishlist flag per row, read by oracle id for recents · G7 recent cards storage. G5 is Hugh's. Details in
README §Gaps.

## Checks done

- Every board rendered in Chromium with IBM Plex Sans, IBM Plex Mono, Chakra Petch and Cinzel: no broken image, no
  phone or desktop frame overflowing its box.
- The header's room measured in that render, not estimated: 268px cluster, 21px air at 390, 6px at 375, 0 at 360.
- Fixture names, types and the Secret Lair flavor (Miku → Trostani) checked against the card images in `art/`.
- Copy reused from shipped strings is marked REUSED in the copy file; everything else is new and owed to /copy-review.
