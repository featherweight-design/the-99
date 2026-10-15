# READINESS — Social R2 (the wishlist, and friends' spares)

**🟡 R1, for Hugh's audit.** Every R2 state is drawn at both widths, empty states first, over the shipped pages. Not green
until Hugh approves and engineering confirms G1 to G4, G9 and G10 are in the plan. Hugh's calls: G5, G6, G7.

## Locks held

| Lock | How R1 holds it |
|---|---|
| Card level, any printing | Lines name the card; no set or printing anywhere; one line per card. |
| Wanted = copies in all | The stepper is the total; `have N of M` reads against it. |
| GOT derived, stays until cleared | Drawn from owned ≥ wanted on each read; got lines move to Got and wait for ✕ or Clear got. |
| Works with no friends | Its own switch, menu row and page; friends line, chips and friend pages simply absent (W1, A2). |
| A friend's wishlist always visible, no toggle | The friends line states it; no switch drawn anywhere. |
| A friend sees card, wanted, got; never owned | Friend lines read `wants N` / `got · wanted N`; no have line. |
| Spares view-only, per pod, naming the friend | A chip and a list of names and counts; nothing to press but a name; set up only by Round 1's pod checkbox. |
| A spare excludes drafts | The chip quotes `loadFriendSpares`' count only; the foot line says "none of their decks uses". |
| No borrowing, no cart change | The cart, the buy tag, the figure, I got it and Mana Pool are drawn unchanged (S5, A6). |
| No model calls | Nothing typed here reaches a prompt (the search queries the catalog). |
| Round 1 not redrawn | Faces, rows, … menus, pods reused; the only change to Round 1 is the row's › (G9). |
| No About entry | None drawn; entries 2 and 3 are batched at launch. |
| Hit targets, keyboard, screen reader | 44px on phone (stepper 40px within a 44px row; chip 32px); stepper buttons labelled; chip `aria-haspopup="dialog"`; popover focus on ✕, Escape closes; receipts `role="status"`, failures `role="alert"`; the GOT stamp is in the button's label. |

## What engineering needs

- **G1** card name and art for wishlist lines (catalog join).
- **G2** one friend by public id, joined to the viewer's friendship, for `/friends/[id]`.
- **G3** spare chips loaded after the page, uncached, for the cards on screen; absent on failure; cache keys per AGENTS.md if ever cached.
- **G4** Want it writes owned + 1; card details reads the line's want.
- **G9** the friend row becomes a link only with the wishlist switch on.
- **G10** commander image focus applies to every face here.

## Audit first

1. The chip's place and ink (S2): does it read as "a friend has one" and never as "buy"?
2. One add control in card details (A3, A4), and no button on rows.
3. GOT moving to its own group (W4) versus staying in place.
