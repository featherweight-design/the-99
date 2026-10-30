# Addendum R3: four defects from the closeout walk

`design/design_handoff_the99_all_decks_cart_v2/addendum-r3/` · 2026-10-29 · account 1

**Status: for Hugh's audit.** These are four defects found when the build on `feat/cart-v2-closeout` was walked in screenshots (`docs/superpowers/close-out-all-decks-cart-v2.md`). Everything else in v2 and R2 stays as drawn. Where this addendum and v2 or R2 disagree, the addendum wins. A lane builds it as a follow-up to cart PR 10.

The boards are plain HTML that open on their own (no `support.js`). They are drawn over the shipped cart in Low Sun, and each one shows the defect as built (**Now**) beside the call (**R3**), at phone and desktop width. There are no new tokens, motion, controls or dependencies.

| Board | Holds |
|---|---|
| `R3-Main.html` | All four boards, plus the index |
| `R3-Sheet-Toast.html` | 1 · The failed-read toast over the open Filters sheet: 390 now, 390 R3, after Try again, sheet closed afterwards, 1300 |
| `R3-Header-Width.html` | 2 · The badge cutting the search placeholder: 390 now, then R3 at 390, 360, 320, 320 with a query, and 1300 |
| `R3-List-Fade.html` | 3 · The bottom fade over the dashed blocks: no match (now and R3), By friend with no friends (now and R3), a long list mid-scroll and at its end, and 390 |
| `R3-No-Friends.html` | 4 · By card and By deck for a player with no friends: 390 now, 390 R3 By card and By deck, 1300 now and R3 |

## 1 · Phone, Filters sheet: the failed-read toast

**Decision:** while the Filters sheet is open, a failed read is said inside the sheet, never on top of it.

1. The Friend group keeps its head (`Friend · has a spare`) and draws, in place of its pills, a dashed line holding `result.failedByFriend` ("Friends' spares didn't load") and `failedRead.retry` (**Try again**). The toast is not drawn while the sheet is open.
2. The failure is said once (R2 ruling 1). If it was said in the sheet, closing the sheet raises no toast. If a read fails while the sheet is shut, the toast shows as shipped.
3. If the toast is already up when the sheet opens, the toast is dismissed and the sheet opens with the failed line in place.
4. Try again re-runs the read. The group shows the dashed **reading…** pill (`filters.friendReading`, Loading A) until the read lands, then the friend pills come back.
5. Desktop has no sheet. The Owned panel is anchored at the top and the toast at the foot, so they never meet, and R2 stands as drawn.

## 2 · Phone, cart header: field and badge at 320 to 390px, and the chips row

**Decision:** below 1000px (the compact chassis), the field's visible placeholder is **Search**. From 1000px it stays **Search cards**.

1. The row keeps its order and its sizes: the field takes what is left (`flex: 1; min-width: 0`), then the Filters pill with its badge, then the 44px ⇅. Nothing in the row wraps or hides.
2. At 320px with a badge, the field is about 104px wide. The icon and "Search" at 14px fit in that.
3. The field's accessible name stays `filters.search` ("Search cards") at every width. Only the visible placeholder gets shorter.
4. A typed query shows as text with the shipped ✕. A long query ends in an ellipsis, the way typed text does today.
5. **Chips spacing (added 2026-10-29 on Hugh's note):** in the compact form, the chips row sits 16px under the controls row instead of the chassis's shared 10px row gap. The chips to result line gap stays 10px. Desktop (the wide form) is unchanged. This lives in the shared `FilterChassis`, so it also reaches /decks, /collection and the other compact chassis pages, which keeps them consistent. If it should be cart-only, the cart passes it in instead.

## 3 · Desktop, cart list: the bottom fade

**Decision:** the fade shows only while the list has more below it.

1. The list box's 36px bottom fade draws only while `scrollHeight − scrollTop − clientHeight > 1`. This is checked on scroll and on resize, with one `ResizeObserver` on the box.
2. So the fade is never drawn over the no-match block, R2's failed block, Empty-One B or C, a short list, or a By deck list with every group folded. At the end of a long list it goes, so the last row reads at full strength.
3. It appears and goes with no transition, so there is no new motion.
4. The dashed blocks keep their shipped padding. The phone has no fade (the page scrolls, not a box), so it is unchanged.

## 4 · By card and By deck: a player with no friends

**Decision:** when the reader has no friends, the cart says nothing about spares outside By friend.

1. **When it applies:** `hasFriends` is false, which is known at first paint. The spares read is then not made, so it can't be reading and it can't fail.
2. **By card and By deck:** no spare key item, no Friend trigger (desktop), no Friend group in the phone sheet, no `Friends' spares` column (the grid closes up the way it does after a failed read), no reading clause and no failed toast.
3. **Result line:** By card shows `48 cards` (`result.byCardNoSpare`), or with a filter `31 of 48 cards` (`result.filtered`). By deck shows `6 decks · 59 copies` (`result.byDeck`).
4. **By friend:** unchanged. It is Empty-One C (`No friends yet`, **Go to Friends**), the one place the cart talks about friends to this reader.
5. A friend added mid-visit takes effect on the next load, like the friend count does today.

## Copy for /copy-review

Only one new string. Everything else on these boards is already shipped in `src/lib/copy/all-decks-cart.ts`.

| Key | String | Where |
|---|---|---|
| `filters.searchCompact` (new) | `Search` | The cart's search placeholder below 1000px (board 2) |

The shipped strings reused here are `filters.search`, `filters.friendHead`, `filters.friendReading`, `result.failedByFriend`, `failedRead.retry`, `result.byCardNoSpare`, `result.filtered`, `result.byDeck`, `noMatch.*`, and Empty-One C's `noFriendsBody` and `toFriends`.
