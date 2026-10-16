# Gap report: card scan PR 5 (photos)

Tables: `design-tables/card-scan-photos.md` (W4, new) and `design-tables/card-scan-viewfinder.md` § CameraBlocked (D6, W6).
Verified against `photo-list.tsx`, `scanner-view.tsx`, `card-scanner.tsx` and `photo-reader.ts`. Design hex maps to the
kamigawa theme block in `globals.css`.

## Result

Every W4 row matches except the eight below, and all ten CameraBlocked rows match at both widths, the photos line, the
footer and the Choose photos press included.

| # | Gap | Disposition |
|---|---|---|
| 1 | Guess art in a photo row drew the top three's inset edge, not W4's `.gc` float (`0 6px 14px rgba(0,0,0,.4)`) | Fixed: its own span with the floating shadow |
| 2 | Photo tile fill `#2A241C` drawn as `--elevated` | Deviation: the board's warm hex has no token in any theme, and it shows only when a photo cannot be drawn |
| 3 | Each Not sure row's top three sits under that row, where W4 draws the three after every row | Deviation: W4 draws one Not sure photo, last. With several (handoff ambiguity 5), each three sits under the photo it answers |
| 4 | Fast/Normal border `rgba(38,42,53,.9)` drawn as opaque `--border-strong` | Left: PR 3's shared segment, invisible at that alpha |
| 5 | Stop's `inline-flex` and 6px gap | Left: PR 3's shared head; the press holds text only, so nothing moves |
| 6 | Sheet list head "On the list · 0" while the list is empty | Not this PR: the Add cards sheet draws its empty body there, for the webcam panel too |
| 7 | Desktop Save 40px tall, 22px sides | Not this PR: the sheet's footer, shipped |
| 8 | A Sure row's `SET · #` sub-line (`SOC · #4`) is not drawn | Ruled (orchestrator for Hugh, 2026-10-16): the index matches the card, not the printing, and Fast adds the card's first printing while Normal asks, so a matched printing would name one the list does not hold. The row names the card; the list line names the printing added |

The photo itself is drawn as taken (`object-cover`), without the board's rotate, blur and dim, which stand in for a camera
photo on the canvas. The canvas's dashed `new` outline is an annotation. A row name truncates (ambiguity 6). A Not sure
photo whose card is not in its three has no press, and nothing is added (ambiguity 4: W4 draws no None of these).

## States

Photos read, Sure, Not sure with its three, the bulk press (shown only while a sure row is not yet added), and Choose
more photos are all reachable. No path adds a photo's card without a press: the only adds are `addSure` and `pick`.
Beyond the board: a row still being read (`photo i of t`, `aria-busy`), a row already added (`On the list`), and a photo
that gave no card (`photos.noCard`).

Gap 1 was confirmed fixed by reading the row's markup after the change. The other seven are recorded rather than changed.
