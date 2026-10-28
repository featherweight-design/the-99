# Addendum R2: four answers for engineering

`design/design_handoff_the99_all_decks_cart_v2/addendum-r2/` · 2026-10-28 · account 1

**Status: approved (Hugh, 2026-10-28: "I agree with your rulings on everything.")** These are answers to the plan's For Design section (`docs/superpowers/plans/2026-10-28-all-decks-cart-v2.md`, #2321: B2, B3, B4) and to the chassis question raised by the PR 8 gap report (`docs/superpowers/gap-report-all-decks-cart-v2-pr8.md`, #2330). Where this addendum and the v2 handoff disagree, the addendum wins.

Open the boards with `support.js` beside them. No new tokens, no new motion, no new dependencies.

| Board | Holds |
|---|---|
| `R2-Main.dc.html` | The four rulings and the copy for /copy-review |
| `R2-Failed-Read.dc.html` | 1 · A failed spares read: A and B (By card), C and D (By friend) |
| `R2-Sticky.dc.html` | 2 · The sticky panel header: A (stuck), B (pushed out), C (phone), plus the spec |
| `R2-Long-Name.dc.html` | 3 · A first deck name wider than its cell: A (1300), B (390), plus the rule |
| `R2-Chassis.dc.html` | 4 · Which chassis wins: the value table, side by side (A1/A2, B1/B2, C1/C2), and the cart with the shipped parts (D1, D2) |

## 1 · A failed spares read (B2, G5)

**By card and By deck** follow engineering's recommendation:
- The shared toast (`SocialToast` over `ToastFrame`) with its **Try again** action, at the shipped place: desktop bottom 24, phone above the tab bar plus 16.
- Try again re-runs the read and goes back to the reading state (v2 Loading A).
- The spare column closes, and comes back once a retry lands.
- The Friend trigger and the spare key item are hidden.
- The result line drops its "with a friend's spare" clause.

**By friend** is the one change:
- It draws the dashed empty-state block with **Try again** in its list place, and no toast.
- Its list holds only friend data, so once the toast faded it would be blank.
- The By friend segment still shows.
- One failure is said once: switching views doesn't repeat the toast.

The read must report a failure as a failure, not as "none". Today `fetchSpares` swallows it, which is what draws v2 Empty-One B's false sentence.

## 2 · The sticky By friend panel header (B3, calls 7 and 8)

**Desktop:**
- The header is `position: sticky; top: 0` inside the list box. The column header row sits above the box and never scrolls.
- Stuck, the header looks exactly as it does at rest: its opaque `--elevated` fill and its own 1px `--border-strong` bottom rule.
- Nothing is added: no shadow and no second edge. A `--border` line would sit right beside the existing rule.
- The panel's rounded top scrolls away, so the stuck header is square.
- Stickiness is scoped to each panel, so the next friend's header pushes the stuck one up and out. Only one is ever stuck.

**Build note:** the panel clips its corners with `overflow: hidden`, which makes it a scroll container and stops sticky working. Use `overflow: clip`.

**Phone:** headers don't stick. Only the controls block pins, as call 8 says.

## 3 · A first deck name wider than its cell (B4, G6)

1. Fit whole names with room for the pill. Drop whole names from the end until they fit (G6).
2. If the first name alone doesn't fit beside its pill, cut that one name with an ellipsis. It's the only name ever cut.
3. The pill shows whenever anything is hidden: **+N** for names left out, or **more** when the only thing hidden is the end of a cut name with no other deck after it. Without `more`, a cut lone name could never be read in full on a phone, where the cell is about 180px.
4. The pill opens the same inline list, and `less` folds it. The opened list never truncates; long names wrap there.
5. The own fact and By card's friend names follow the same rule.
6. The accessible name always carries the full names.

## 4 · The shipped chassis wins (#2330)

The cart uses the shipped `FilterChassis`, `OrderMenu`, `FilterPanel` trigger and `DeckSearchField` as they are. The v2 mock's chassis values are void. No shared part changes, so /decks, /collection, the commanders rack and the precon list are untouched.

| Part | Ruling |
|---|---|
| Frame | The chassis's own band (`--surface-sunken`, 1px `--border` bottom, padding 12/10 with 22 wide and 16 compact, row gap 10). The cart's pinned wrapper draws no second frame: on the phone it holds the view row, then the chassis band. |
| Desktop list gap | 12 |
| Hairline | 20px, `--border`, both forms |
| Search | `DeckSearchField`: column 34 / radius 8, sheet 44 / radius 10. The shipped ✕ button. The accent edge with a query on (#2330 already added `active`). |
| Friend and Owned triggers | `FilterPanel`'s desktop trigger: sans 13 medium, `--elevated`, radius 8, chevron. A single pick reads `Friend: Chris`. |
| Sort | `OrderMenu`: 32px sans 12.5 trigger, no caret, and its 186px dropdown with no header or radios. Below 1000px, the 44px ⇅ glyph opens the **same dropdown**. |
| Phone Filters button | The compact 36px pill, as `/collection` draws it |
| Chips row | "No filters on" (mono 11, sentence case), the chip ×, and Clear all as shipped |

**This retires the cart's phone sort sheet** (#2330 items 21 to 27): the phone uses `OrderMenu`'s dropdown, as /decks does. The cart's Filters sheet (plan A6) stays.

## For /copy-review

- The failed-read toast: "We couldn't read your friends' spares." with **Try again** (`spareCopy.request.failed` is for writes and doesn't fit a read).
- By friend's failed block: title "Couldn't read your friends' spares", body "Your cards and prices are here. Friends' spares didn't load.", press **Try again**.
- The result line while failed, in By friend: "Friends' spares didn't load".
- The pill for a cut name with nothing after it: **more**.
- The panel figure is inflected: "41 cards · 130 spares", "1 card · 1 spare".
