# Social R2 — the wishlist, and friends' spares

**Round 2 of 3** of the social line. The wishlist is behind `SOCIAL_WISHLIST_ENABLED` (stands alone); spare markers and a
friend's wishlist also need `SOCIAL_FRIENDS_ENABLED`. Phone and desktop.
**Brief:** `docs/superpowers/design-briefs/2026-10-15-social-screens.md`, branch `brief/social-screens` (§Rulings, §R2).
**Builds on:** `design/design_handoff_the99_social_r1/` (PR #1796). Round 1's faces, rows and pod checkbox are reused, not redrawn.

**The answer in one line (round 2).** Your wishlist is **Collection › Wishlist**, a fifth tab, drawn in the collection's
own grid of full cards; a card gets on it from **Add to wishlist** (bookmark), one more link in card details' footer, or
from the tab's search; a card you hold enough of moves to **Collected** (success ink, no stamp) until you clear it; a
friend's page shows their wishlist in the same grid, view only; and a friend's spare is **one marker glyph** on the row,
explained in the key, which opens a modal (desktop) or sheet (phone) naming who.

| File | What it is |
|---|---|
| `The 99 - Social R2 (R2).dc.html` | **Start here.** Hugh's twelve notes and the answer to each, the icon and word options, the gaps. |
| `R2 - Wishlist-Desktop.dc.html` / `R2 - Wishlist-Phone.dc.html` | Collection › Wishlist: empty, search adding, tiles, Collected and Clear collected. |
| `R2 - Details-Desktop.dc.html` / `R2 - Details-Phone.dc.html` | Card details: Add to wishlist, In your wishlist (stepper, have, Remove), collected, from Shopping. |
| `R2 - Friend-Desktop.dc.html` / `R2 - Friend-Phone.dc.html` | `/friends` rows with ›; a friend's page and wishlist; empty. |
| `R2 - Spares-Desktop.dc.html` / `R2 - Spares-Phone.dc.html` | The spare marker on Shopping and All, the key item, the modal and sheet, the cart. |
| `R1 - *.dc.html`, `The 99 - Social R2 (R1).dc.html` | Round 1 of this design, **superseded**; kept for the record. |
| `STATES-social-r2.md` · `READINESS.md` · `social-r2 · copy strings.ts` | The matrix, the verdict, every new string. |
| `art/`, `brand/`, `support.js` | Carried so the folder opens standalone. Round 2's art is full cards cut from Hugh's screenshots. |

Every round-2 board is drawn over the shipped pages Hugh sent (Collection head and grid, the 820×620 card modal and phone
sheet, the deck's Shopping view and key, `ModalChrome`). New parts carry a dashed pink outline. No About entry.

---

## Decisions (round 2)

**1. The wishlist is Collection › Wishlist**, a fifth tab after History (`CollectionPlaceHead`). Nothing is added to the
account menu. The five tabs fit the phone strip at 390. Switch off: no tab, the route is not found.

**2. Cards are cards.** The collection's own grid and tile (178px track, 63/88 full card, caption; three-up on phone),
never the face crop. The caption names the card and reads `want 2 · have 1`. The grid has no controls of its own: a tile
opens card details, where the count changes and the card is removed.

**3. Collected replaces GOT.** No stamp. A card your collection holds as many as you want moves to a **Collected** group
at the end, caption `✓ collected · have 2` in `--success`. It stays until cleared, one at a time in card details or all
at once with **Clear collected** in the group head. Word options on the main board: Collected (recommended, drawn),
Owned, Have it, Complete.

**4. Icon: bookmark** (recommended, drawn). Options on the main board: bookmark, heart, card +, target. Outlined before
the card is added, filled in the accent after.

**5. The add control is one footer link in card details**, in the shipped link style under Find a deck for it:
`Add to wishlist`, then `On your wishlist ›` (opens the tab). The first press wants one more than you hold (cap 99). Phone:
the third link at the sheet's foot; the half-height teaser is unchanged.

**6. Card details' box gains one section once the card is on the list**: `In your wishlist` with `Remove` (Edit copies'
link style), the want stepper (1 to 99) and `have N`, or `✓ collected`. No "Bought this card?" line.

**7. The tab's search is the second way in**: catalog search like the Add cards sheet, one press per result
(`Add to wishlist`; phone `Add` → `Added`).

**8. Works with no friends.** Nothing friend-related is drawn. With a friend, one quiet line: `Your friends can see this list`.

**9. A friend's wishlist is on their page, `/friends/[publicId]`.** The `/friends` row gains a › and becomes a link. The
head is Round 1's face, name and since date; **no banner** (round 1's banner was my addition and is removed). Under it,
`Colin's wishlist · 6 · view only` in the same grid: `wants 2` or `✓ collected`, never an owned count. Empty: `Peter's
wishlist is empty` and one sentence.

**10. No "not on your friends list" view.** It only covered an old link to someone who had removed you; that link gets
the app's normal not-found page.

**11. A friend's spare is a marker, not a chip.** One glyph after the row's marks, in `--fact` ink, so the buy column,
pips and figure never move. The Shopping key gains `a friend has a spare`. Pressing it opens `ModalChrome` at 560 on
desktop and the sheet from 52px on phone, like the stand-ins: `Spares of {card}`, a row per friend (face, name, `shares
with {pod}`, `N spares`), and one foot line. Nothing to press but ✕. Shown on missing rows in Shopping and All, on the
cart's lines (Shopping for all decks), and on Wanted tiles. Absent when none, never `0`.

**12. Friends on every board are Colin, Peter, Max and Chris.** Every board was rendered and measured, and each
artboard sized to its content, so none is cut off.

## Gaps (round 2)

| # | Gap | Who |
|---|---|---|
| G1 | Wishlist reads return oracle ids; tiles need name, full card image and price from the catalog. | Eng |
| G2 | `/friends/[publicId]` reads one friend by public id, joined to the viewer's friendship. | Eng |
| G3 | Spare markers load after the page, uncached, for cards on screen, absent on failure. If ever cached, AGENTS.md's `friendGeneration` and per-friend switch key rules apply. | Eng |
| G4 | Add to wishlist writes owned + 1, capped at 99. | Eng |
| G5 | Collected counts every copy held, deck copies included (the locked definition). | Note |
| G6 | A fifth tab fits at 390; a sixth would need the strip to scroll. | Note |
| G7 | Commander image focus (Social R3's G9) applies to every face here. | Eng |
| G8 | Every new string is in `social-r2 · copy strings.ts` for `/copy-review`. | Note |

Hugh's calls: the icon (bookmark drawn) and the word (Collected drawn).

---

## Round 1 decisions (superseded, for the record)


**1. The wishlist lives at `/wishlist`, reached from the account menu.** A row after Friends (About, Friends, Wishlist,
then Admin when shown, then the session buttons); with friends off it follows About. Not a nav item, for Round 1's reasons:
the tab bar is full, and the five daily surfaces stay five. It is a real link with no badge (nothing arrives unasked).
On `/wishlist` no rail slot or tab is current. Wishlist off: no row, the route answers not found.

**2. The page is a search, Wanted, then Got**, in the 860px column the account pages use. The head says `Wishlist` and
the count (`6 cards · 2 got`). Wanted is newest first (the read's order); Got sits under it, also newest first. A
section with no lines is absent.

**3. The page works with friends off.** Friends off, or on with no friend yet: no friends line, no spare chip, no friend
page. Once you have a friend one line joins under the head: `Your friends can see this list: the cards, how many you
want, and what you've got. Never what you own.` It is a fact, not a setting (Q7: no toggle).

**4. A line is art, name, have, a want stepper and ✕.** Art crop 76×54 (phone 58×42); the name opens card details;
`have 1 of 3` with a pip per copy (up to six), or `none yet`; a stepper `want − N +`, 1 to 99, − held at 1; ✕ clears.
Each step writes at once (`setWishlistQuantity`); a failed write puts the old count back and raises the shared
`ToastFrame`.

**5. GOT is a stamp, a green have line and a move to Got.** Worked out on every read (owned ≥ wanted). The art dims a
little and takes a `GOT` stamp across its corner; the have line reads `got · have 2 of 2` in `--success`. It stays until
you clear it (Q9). The stepper stays: raising the want past what you hold moves the line back to Wanted.

**6. Clearing is one press.** ✕ on any line, got or not, with no confirm: putting it back is one press of Want it. The row
fades and collapses (160ms; none under reduced motion). The Got head carries `Clear got`, which clears every got line and
says so in the shipped receipt strip (`Cleared 2 got cards from your wishlist.`, `role="status"`, bare ✕). It is the only
bulk action, because got lines pile up by design.

**7. One add control, in card details' footer: Want it.** Every card in the app opens card details, so search, Collection,
Discover, Commanders, a deck and its Shopping view all reach the wishlist the same way, and no row anywhere gains a
button (Hugh: minimal controls). Desktop: an outlined button with a star in the pinned footer row, after the link-out
and before Prev / Next. Phone: a full-width 46px button at the foot of the scrolling column, under the link-out and Find
a deck for it. The half-snap teaser is unchanged (G6).

**8. Want it's first press asks for one more than you own** (own 1, want 2; own 0, want 1; capped at 99), so a line is
never GOT the moment it lands. The control then becomes the line: the star fills in the accent, `Wishlist` links to the
page, `have 1`, the stepper, and ✕ takes it off. A got card's control turns `--success` with a small GOT stamp. Nothing
in the sheet says wishlist unless the card is on it.

**9. The page's own search is the second door**, for a card you haven't met in the app. It is the shipped card search
row (art, name, type, owned) with the quick-add's trailing slot: `Want`, then `✓ Wanted` in `--success`; a card already
on the list shows its want. It stays open for the next card. New lines arrive at the top of Wanted with a short pink wash.

**10. Want it never touches Shopping.** A deck's Shopping view opens the same sheet with its own parts unchanged
(Bought this card?, the stand-ins door); Want it sits beside them. The wishlist counts copies in all, outside any deck:
the deck still needs its copy, the cart and the buy tag are unchanged.

**11. A friend's wishlist is on their page, `/friends/[publicId]`.** The friend row on `/friends` becomes a link with a ›
before its … menu (only while the wishlist switch is on). The page: `‹ Friends`, a banner of their commander art under a
dark fade (a plain gradient and initials when they chose none), their face, name and `Friend since Oct 2 · <commander>`,
the row's same … menu (Remove friend, Round 1's confirm), then `Dave's wishlist · 5` with `view only` where a stepper
would be.

**12. A friend's lines show the card, wants N and GOT, never what they own.** `wants 2`, or `got · wanted 2` with the
stamp. Newest first; got lines stay in place (they are theirs to clear). No stepper, no ✕, no share toggle. A card opens
card details in your own context. Empty: `Dave's wishlist is empty` and one sentence on what will show.

**13. Not a friend reads nothing, and says only that.** A former friend, a stranger and a forged id get one card: `This
person isn't on your friends list` / `A friend's page shows only while you're friends. If you were removed, nobody was
told…` / `Go to Friends`. The read answers the same nothing for each.

**14. A friend's spare is a chip under the card's name.** One friend: their face and `Dave has 1 spare` (`2 spares`).
Two: both faces, `Dave and Priya have spares`. Three or more: up to three faces stacked, `3 friends have spares`. It sits
with the name, never in the figure, pip or buy column, so it never reads as a buy option and no figure moves. It is drawn
in neutral ink with the friends' art as its only colour: the accent means owned and the warning means buy. Desktop: inline
after the name, 24px, inside the shipped 34px row. Phone: a third line under the meta, 32px tall.

**15. Where it shows:** the deck page's missing rows (hollow dot) in both All and Shopping; Shopping for all decks' lines,
under the deck line; and your wishlist's Wanted lines. Never on an owned row or a got line. Shopping's intro gains one
sentence, `Friends have spares of 3.`, so a long list says up front that it is worth scanning.

**16. Pressing it names who.** Desktop: an anchored popover (Escape or ✕ closes; focus on ✕). Phone: the shipped bottom
sheet. Title `Spares of Rhystic Study`; a row per friend (face, name linking to their page, `2 spares`), most spares first
then by name; one foot line: `A spare is a copy none of their decks uses. View only: sort it out with them at the table.`
Nothing else to press: no Ask, no Borrow (Q11).

**17. No spares, a failed read or a grant gone: the chip is absent.** Never `0 spares`, never an error on a deck page. A
friend who unshares or unfriends mid-visit leaves on the next read, silently (Round 1: removals are silent). An open
popover keeps what it read until closed.

**18. The cart does not change.** Its lines, counts, checkout figure, deck checkboxes, I got it and the Mana Pool link
are as shipped; the chip is read for the cards listed and is the only addition.

---

## Gaps

| # | Gap | Who |
|---|---|---|
| G1 | Wishlist reads return oracle ids; the page needs each card's name and art crop joined from the catalog. | Eng |
| G2 | `/friends/[publicId]` needs one friend's name, since and commander by public id, joined to the viewer's friendship (`listFriends` filtered will do). | Eng |
| G3 | Spare chips load after the page, uncached, for the missing cards' oracle ids only (`loadFriendSpares`), and degrade to absent. A cached page that draws them owes `friendGeneration` and each friend's switches in its key (AGENTS.md, Social foundation). | Eng |
| G4 | Want it's first press writes owned + 1, capped at 99. Card details needs the line's current want and the owned count it already reads. | Eng |
| G5 | The wishlist is reached from the account menu only. A link on Shopping for all decks' head would also fit "beside Shopping"; not drawn, to keep one way in. | Hugh |
| G6 | The phone's half-snap teaser has no Want it (All details only), so the teaser stays as shipped. One more tap on a phone. | Hugh |
| G7 | Card details shows no spare line this round. The chip lives on rows, where you are short of the card; the brief listed details as a candidate. | Hugh |
| G8 | GOT counts every copy the collection holds, copies decks use included (the locked definition). A card you own in a deck counts toward got. | Note |
| G9 | The friend row's › and row-as-link appear only with the wishlist switch on; off, Round 1's row is unchanged and `/friends/[id]` is not found. | Eng |
| G10 | Commander image focus (Social R3's G9) applies to every face drawn here: chips, the popover, the banner. | Eng |
| G11 | Art is the design folder's twelve crops; names, counts and prices are placeholders. Staging holds zero wishlist rows (2026-10-15). | Note |
| G12 | Every new string is in `social-r2 · copy strings.ts` for `/copy-review`. | Note |

## Out of scope, unchanged from the brief

Borrowing, an "ask" for a spare, any cart or price change (Q11, view-only spares). Q6 full deck lists. Opponent seats and
matchups (R3). About entries 2 and 3 (batched at launch).
