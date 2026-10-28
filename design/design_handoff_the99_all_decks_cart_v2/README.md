# The 99: Shopping for all decks v2 (design handoff, R1b)

`design/design_handoff_the99_all_decks_cart_v2/` · 2026-10-27 · account 1 · mirrors `design_handoff_the99_all_decks_cart/`

**Status: R1b, approved (LGTM, Hugh, 2026-10-27).** One feedback item: the Filters sheet's Friend pills are equal width. **Any friend** spans the row, and the friends sit two to a row. Hugh took every recommendation (D1–D5). D6, the About line, is not in this round.

**The brief** was posted by Hugh in chat on 2026-10-27 and is quoted under §Brief. It asks for a light redesign of the all-decks cart in all three views, focused on By friend. Hugh: *"Parsing the information on each row is confusing and runs together."*

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them. **No new tokens, no new motion, no new dependencies.** They are drawn over the shipped cart (`src/components/decks/cart/*`) and the shipped filter chassis (`src/components/ui/filter-chassis.tsx`), in Low Sun tokens. The fixtures are illustrative: six real deck names, the four fixture friends, and made-up prices.

| File | Holds |
|---|---|
| `Main.dc.html` | The calls, the decisions (as ruled), the gaps |
| `Row.dc.html` | 1 · The row before and after (Lightning Greaves), the row's anatomy, every Ask state (B1), +N opened (C1/C2), and the rejected alternative (A3) |
| `By-Friend.dc.html` | 2 · The long list at 1300 (open and folded) and at 390 |
| `Controls.dc.html` | 3 · The chassis: Friend menu (A1), Sort menu (A2), phone Filters sheet (B1), phone Sort sheet (B2), one filter carried across views (C1/C2), and no match (D) |
| `By-Card-Deck.dc.html` | 4 · The same row and chassis in By card and By deck |
| `Empty-One.dc.html` | 5 · A friend with one spare, no friend has a spare, and no friends yet |
| `Loading.dc.html` | 6 · By card and By friend while friends' spares are read |
| `canvas.json` | Board layout |
| `STATES-all-decks-cart-v2.md` | Every state, with its must-nots |
| `design-tables/all-decks-cart-v2.md` | **Commit to `docs/superpowers/design-tables/all-decks-cart-v2.md`.** |
| `all-decks-cart-v2 · copy strings.ts` | The additions to `src/lib/copy/all-decks-cart.ts`, as placeholders; `/copy-review` resolves the wording |
| `READINESS.md` | A self-assessed readiness report and the gaps |
| `art/`, `brand/` | The fixture faces, and the locked brand sheet |

## Brief

> A light redesign of "Shopping for all decks" (the all-decks cart), all three views, focused on the "By friend" view. Make the information easy to navigate when there are several decks, cards and friends. What's wrong today: each card row packs a needed count, a list of deck names, a spare count, "you own N" and "all N in other decks" into two wrapping gray lines; the Ask button and the buy tag sit side by side (CTA goes ABOVE the buy tag); a friend header heads a long list with no way to narrow it. Deliverables: a card row that separates its facts; sort, filter and search across all three tabs; states (long friend list, one spare, no friends with spares, loading); Requested and Accepted carried into the new row. Loading: By friend and the row markers will render immediately, friends' data loading in the background (eng, in parallel).

## The calls (approved)

1. **Three facts, three places.** The row shows the card, then **need** (the count and the decks), **spare**, and **own** (the count and where those copies are in use).
   - **Desktop (D1):** the facts are columns under one header row above the list. Each view's grid:
     - By friend: `Card · You need · for · Spare · You own · in use in · [actions]`
     - By card: the spare column is **Friends' spares**.
     - By deck: the need column is **This deck · also**.
   - **Phone:** one labelled line per fact (`NEED`, `SPARE`, `OWN`, or `DECK` in By deck), mono 9.5 uppercase faint labels in a 44px gutter. A line never wraps.
   - The count leads every fact, in mono 13 semibold `--fg`. Values are mono 11.5 `--fg-body`. The own fact is a step down (`--fg-muted`).
   - A row with nothing owned has no own line on a phone and an empty cell on desktop. A row with no friend's spare has no spare line on a phone outside By friend.
2. **Long lists: what fits, then +N (D2: opens in place).**
   - The deck names that fit on one line show first, truncated at a name boundary and never mid-name. A `+N` press follows, as a 19px pill with a 44px hit area.
   - The press opens the full list **inline** under the fact: each deck with its count, on `--surface-sunken`. The pill then reads `less` and folds the list back.
   - The own fact's deck list works the same way. By card's spare fact uses the same press for friend names.
   - No modal, no sheet.
3. **The action stack: Ask above the buy tag.** The right edge is one right-aligned column: the Ask press or its status on top, the shipped `BuyTag` under it.
   - **Sizes:** desktop Ask 28px, gap 7, tag 20. Phone Ask 36px, gap 10, tag 22.
   - **Hit areas:** they meet at the gap's midline.
   - **Statuses:** Requested, Accepted, Declined, Ask instead and Ask again take Ask's place (`RowEnd`, rule `rowAsk`, unchanged), so the tag never moves.
   - **By card and By deck:** there's no Ask (it lives in the spares modal), so the stack is just the tag.
4. **The shipped filter chassis in all three views.** It sits under the view switch and the key.
   - **Row 1:** `Search cards` · `Friend ▾` · `Owned ▾`, then a hairline, then `Sort · <current> ▾`.
   - **Row 2:** chips, or NO FILTERS ON.
   - **Row 3:** the result line, which **replaces** `ListHead`.
   - **Below 1000px:** search, the ⇅ sort button (44px) and the `Filters` button with its count badge, which opens the chassis sheet.
   - **Deck filtering** stays the existing Decks selection. There's no second deck control (settings live in one place).
   - **Price** is a sort.
5. **One filter across the three views (D4).** Search, Friend and Owned narrow the same selected lines in every view, so switching views keeps them. **Sort is per view.**
   - **By card:** Most decks (the shipped default) · Price, high first · Price, low first · Most spare · Name.
   - **By deck:** Largest first (the shipped default) · Cost, high first · Name. The lines in a deck keep the shipped order.
   - **By friend:** Most spare (the shipped default) · Most cards · Name. The lines in a panel keep the By card order.
6. **Filters (D3).**
   - **Friend:**
     - **Desktop:** an anchored panel with one radio, **Any friend** ("spare available"), then a checkbox per friend who holds a spare of a selected line. Each row shows the face and how many cards that friend holds.
     - **Phone sheet (R1b):** **Any friend** spans the row, then the friends as **equal-width pills, two to a row** (`grid-template-columns: repeat(2, minmax(0,1fr))`).
     - The trigger is absent while no friend has a spare.
   - **Owned:** Any · You own some · None. On desktop it's a trigger; on the phone sheet it's a segmented control.
7. **By friend folds and sticks (D5 by extension).**
   - Each friend panel folds from its header (chevron, 52px min height), the same shape as the shipped By deck group.
   - All panels start open, and folds are kept for the visit.
   - On desktop, the open panel's header is `position: sticky` at the top of the list box.
   - The header figure is `N cards · N spare` (singular `1 card`).
8. **Phone pinning (D5).** The switch row and all three chassis rows stay pinned while the list scrolls under them, as the shipped controls block does.
9. **Loading.** The By friend segment always shows (eng's change). While friends' spares are read:
   - Every friend-dependent cell draws the shipped skeleton bar (`--elevated`, breathing as `anim-skeleton`). The desktop spare column keeps its width.
   - The Friend trigger is dashed and reads `reading…`, and the result line adds `reading friends' spares`.
   - By friend draws skeleton panels in the panel's own shape.
   - Search, Owned, Sort, the rows, the buy tags and checkout all work from the first paint.
10. **Empty By friend.** There are two real causes, each with its own state. Both are dashed `EmptyState` blocks with the spare glyph.
    - **No friend has a spare of these:** it says what a spare is and that one will show here. There's no press.
    - **No friends yet:** it has one press, **Go to Friends**.

    A filter or search that matches nothing uses the chassis's no-match shape. It names the one fix (`Drop Max`).

## Rulings

| | Question | Ruling (Hugh, 2026-10-27) |
|---|---|---|
| D1 | Columns on desktop? | Columns (Row A2), not labelled lines at every width (Row A3, not built) |
| D2 | +N in place? | In place |
| D3 | Friend and Owned? | Yes, as drawn |
| D4 | Filters carry across views? | Yes. Sort is per view |
| D5 | Pin the whole chassis on a phone? | Yes, as drawn |
| D6 | About line? | Not this round |
| R1b | Friend pills | Equal width (Controls B1) |

## Gaps (for engineering)

- **G1 · Where owned copies are in use.** `CartLine.heldElsewhere` is a count. The own fact needs the names of the decks holding those copies, in the selections' order. If the read can't give them, the fallback is `2 · in other decks` with no `+N`.
- **G2 · Loading as a state.** `useByFriend` is null both before the read and when the read is empty. It needs three states: reading, none and groups.
  - The segment always shows, and `?view=friend` no longer falls back to By card.
  - `CartKeyRow`'s `friend` prop goes away.
- **G3 · Filter and sort state.** These are for the visit only, like the selections. Proposed: mirror `?q`, `?friend` (comma-joined public ids), `?owned` and `?sort` into the URL with `mirrorUrl`, as `?view` already is.
- **G4 · Price sort.** Sort by `lineFact`'s figure, with unpriced and sold-out lines last. By deck sorts by the roll-up's deck cents.
- **G5 · A failed spares read.** Today's behaviour stands: the shared toast, empty cells, and By friend's none state. Not drawn.
- **G6 · Truncation at a name.** Measure the cell and drop whole names until `+N` fits. CSS ellipsis alone would cut mid-name, which call 2 forbids. A `ResizeObserver` per list, not per row.
