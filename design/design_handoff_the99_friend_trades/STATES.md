# Friend trades · states and strings

Every string is in `tradeCopy` (`src/lib/copy/trades.ts` in `scratch-gen/proposal.diff`); keys are named below.
Names are `ThirdPartyName`s drawn through `PersonText` / `PersonName`.

## The trade sheet (`TradeTab` inside `TradeSheet`), by state

| State | Band (`band.*`) | Foot | Board |
|---|---|---|---|
| draft | Propose a trade to Colin | Send offer once both sides have a card, else `needsBoth`; `answerBy` "Colin has 14 days to answer." | S2, S3, D2, D3 |
| askBack | Make it a trade with Peter | Send + `askBackFoot`; your yes card marked `agreed` with `askBackWhy` | A3 |
| theirs | Colin's offer | Yes, No, Counter (`AnswerPresses` row) + days left to the right | S5 |
| yours | Your offer (days left at the band's end) | Withdraw + `waiting` "Waiting on Colin." | T6 |
| counterDraft | Your counter | Send counter, Keep their offer, `counterFoot` | S8 |
| theirCounter | Colin's counter | Yes, No, Counter + days left; `replacesYours` "Replaces your offer of Nov 24." | T5 |
| accepted | Accepted | Mark traded + Rescind trade side by side; `acceptedFoot` | S6 |
| themMarked | Accepted | Mark traded + Rescind trade; `themMarked` | T8 |
| youMarked | Accepted | `youMarked` "You marked it traded. Waiting on Colin." | T8b |
| traded | Traded | `tradedFoot` + Propose a new trade | T9 |
| look | Needs a look | Yes held; No and Counter; `lookLine`; the gone card wears the danger ⊘ badge (`gone`) | S7 |
| lookYours | Needs a look | `lookLineYours`: counter without it, or withdraw | (as S7) |
| sent (from a deck / All shopping) | Offered card | `sheet.sentTitle`, `sheet.sentBody`, Done, Open the trade › | D4 |

Counter marks: `added` (ringed), `removed` (faded), `was` under each total. Days left are the whole trade's (D6).

## Picker

| Element | String | Notes |
|---|---|---|
| Switch | `pick.theirs` "Colin's spares", `pick.yours` "Your spares" | with counts |
| Wishlist line | `wantsListed` "2 are on Colin's wishlist, listed first." | your side only |
| Key line | `key.wants` "wants it", `key.offered` "already offered" | glyph + word |
| Add | `addPress` / `inPress`, `addAria` / `inAria` | `aria-pressed` |
| Wants chip | friend's name; sr-only `onTheirWishlist` "Colin wants it" | fact blue, half width |
| Offered chip | one name, or `offeredCount` "2 friends"; sr-only `alsoOffered` "Offered to Peter and Chris" | muted, half width, a press |
| Offered popover | `offeredPop.title` "Also in your offers to", `offeredPop.line` "Waiting · 12 days left", `offeredPop.open` "Open ›" | one row per friend |

## Spares tab

| Element | String |
|---|---|
| Trades box | `liveTitle` "Trades with Colin", `openCount`, foot `proposeAnother`; held: `capLine` |
| Wanted call-out | `callout.eyebrow`, `youWantTitle` / `youWantBody`, `theyWantTitle` / `theyWantBody` + Trade; none: `noneTitle` / `noneBody` |
| Switch | `callout.filterAll` "All", `callout.filterWant` "You want" |
| Key | `callout.keyWish` "on your wishlist", `callout.keyDeck` "a deck needs it" |
| Tile chips | count `p.spares.count` "1 spare" (gray); `chipWishlist` "Wishlist" / `chipDeck` "A deck"; ask: `chipAsked` "Asked" / `chipYours` "Agreed" (copy/social.ts) |
| Spares sheet | `sheet.press` "Trade", `sheet.how`, `capShort` "Offer waiting" |

## Trades rows (`TradeRows`: kicker · title · line · press)

| State | Kicker (`row.kind.*`) | Title | Line | Press |
|---|---|---|---|---|
| offer to you | Trade offer | `row.offer` | days left | Answer › |
| your offer | Offered | `row.offered` | `waitingLine` | Open › |
| countered | Countered | `row.countered` | `counteredLine` | See the counter › |
| accepted | Accepted | `row.accepted` / `acceptedYou` | `acceptedLine` | Mark traded |
| traded by them | Traded by Colin | `row.themMarked` | `themMarkedLine` | Mark traded |
| traded by you | Traded by you | `row.youMarked` | `youMarkedLine` | Open › |
| traded | Traded | `row.traded` | `tradedLine` | ✕ |
| declined | Declined | `row.declined` / `declinedYou` | `nothingElse` | ✕ |
| withdrawn / rescinded | Withdrawn | `row.withdrawn` / `rescinded` | `nothingElse` | ✕ |
| expired | No answer | `row.expired` | `expiredLine` | ✕ |
| needs a look | Needs a look | `row.look` | `row.lookLine` | Take a look › |

Order: waiting on you first (offer, counter, needs a look, accepted, traded by them), then the rest, newest first.
Friends › Trades shows five, then `row.moreWaiting` / `row.more`. Ended rows stay until ✕.

## Feed and Settings (D7)

| Push | Title | Line | Press |
|---|---|---|---|
| offer | `feed.offer` "Colin offers a trade" | `feed.offerLine` | See the trade |
| counter | `feed.counter` | `feed.counterLine` | See the counter |
| accept | `feed.accept` | `feed.acceptLine` | See the trade |
| decline | `feed.decline` | `feed.declineLine` | See the trade |

Settings row: `feed.settings.name` "Trades", `feed.settings.line`; on by default in app and push.

## Empty

`empty.listTitle` / `listBody` (no trades, E3), `empty.yoursTitle` / `yoursBody` / `yoursAction` (no spares to offer),
`empty.theirsTitle` / `theirsBody` (friend has none).
