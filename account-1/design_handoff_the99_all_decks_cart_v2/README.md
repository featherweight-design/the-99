# The 99: Shopping for all decks v2 (R1, account 1, 2026-10-27)

**Status: R1b, approved (LGTM, Hugh, 2026-10-27)** with one change: the Filters sheet’s Friend pills are equal width (Any friend across the row, friends two to a row). Recommendations D1–D5 taken; D6 (About) not in this round.

Canvas: https://claude.ai/artifact/6HnmL4ZzLBSD1ZX6etQCBX (account 1). Account 2 can't open it, so rebuild from `scratch-gen/` (don't re-import the `.dc.html`).

A light redesign of the all-decks cart in all three views, focused on By friend. Brief: posted by Hugh in chat on 2026-10-27. The handoff will become `design/design_handoff_the99_all_decks_cart_v2/`, mirroring `design_handoff_the99_all_decks_cart/`.

| Board | Holds |
|---|---|
| `Main` | The eight calls, decisions D1–D6 for Hugh, and gaps G1–G5 for engineering |
| `Row` | 1 · The row before and after (Hugh's Lightning Greaves example), the row's parts, every Ask state, and +N opened |
| `By-Friend` | 2 · The long list at 1300 and 390, with folded panels |
| `Controls` | 3 · The shipped filter chassis: the Friend and Sort menus, the phone Filters and Sort sheets, a filtered list, and no match |
| `By-Card-Deck` | 4 · The same row and chassis in By card and By deck |
| `Empty-One` | 5 · A friend with one spare, no friend with a spare, and no friends yet |
| `Loading` | 6 · By card and By friend while friends' spares are read |

`scratch-gen/`: run `python3 build2.py local` to write `out/` with `art/` and flat previews, and `python3 render2.py <boards>` to check each board for broken images and clipping. `build2.py blob <dir>` writes the canvas files with the `/_blob` URLs. It reuses account 2's spare-requests kit (`kit.py`, `parts.py`, `sr.py`) unchanged.

## R2 (2026-10-28): four answers for engineering, approved (Hugh, 2026-10-28), handoff PR #2331

Asked by the plan's For Design section (#2321: B2, B3, B4) and the PR 8 gap report (#2330). Canvas page **R2 · four answers** on the same canvas. Generator: `scratch-gen/r2.py` (`python3 build_r2.py local`).

| Board | Answer |
|---|---|
| `R2-Main` | The four answers and the copy for /copy-review |
| `R2-Failed-Read` | By card and By deck: the shared toast with Try again, the spare column closed, Friend and the spare key hidden. By friend: a dashed block with Try again, no toast |
| `R2-Sticky` | Desktop: the header sticks as it is at rest (fill and its own rule, nothing added), pushed out by the next panel's header; the panel needs `overflow: clip`. Phone: no sticking |
| `R2-Long-Name` | Ellipsis on the first name only, +N after it; a cut name with nothing after it gets a **more** pill opening the same list |
| `R2-Chassis` | Recommended: the shipped chassis wins (mock vs shipped, every value), including the phone sort as `OrderMenu`'s dropdown (B2 sheet retired). Hugh's call |
