# Friend trades · handoff

Approved by Hugh on 2026-11-27 after eleven rounds (R1 to R11). Brief: `docs/superpowers/design-briefs/2026-11-27-friend-trades.md`
(D1 to D7 locked). Open `Main.dc.html` (or any board) from disk; `canvas.json` lays the boards out.

Every frame is rendered from main with `scratch-gen/proposal.diff` applied: the shipped shell, components and CSS at
1300 and 390 css px. Sheets are drawn whole, cropped under the sheet. `proposal.diff` is the design's reference
implementation of every string and layout call. It is not tested code: the plan rebuilds it with data, tests and the
real handlers. R1's boards (a Trade tab, drawn on another account) are in this folder's git history only. The review
canvas with every round is https://claude.ai/artifact/C6h8vk5x8WfuP4Y5hPQsa8 (private to Hugh).

States and strings: `STATES.md`. Verdict: `READINESS.md`. Re-rendering: `scratch-gen/HOW.md`.

## Boards

| Board | Frames | What it settles |
|---|---|---|
| Spares | S0, S0w, S4, S9 | The friend's Spares tab holds trades: Trades with X box, Wanted call-out, All / You want, the two tile chips, the cap |
| Ask | S1, D1 | The spares sheet: Ask stays primary, Trade quiet beside it, "Offer waiting" |
| Propose | S2, S3, S3t, S3p | The trade sheet and its picker: Add, the Wants and Offered chips, the Offered popover |
| Answer | S5, T5, S8, S7 | Offer, counter to you, making a counter, needs a look |
| Waiting | T6, S6, T8, T8b, T9 | Your offer, accepted, marked traded by one side, traded |
| FromDeck | D2, D3, D4 | Trading from a deck or All shopping without leaving it |
| MakeTrade | A0, A1, A2, A3, H1 | Make it a trade from a Yes; days left beside Yes and No |
| Lists | L1, L2, E3, RH, N2, ST | Friends › Trades, Request history › Trades, Home lead, Settings row |

## Calls (brief § Open for Design)

1. **Where the trade lives: a sheet, on the Spares tab.** No fourth strip tab. Trades live on the friend's Spares tab
   (`friend-spares-tab.tsx`), headed by **Trades with X** (`trades-head.tsx`, a `DeckBox` of `TradeRows`, only when a
   trade is live, foot: Propose another trade). Every trade, made or read, opens in one **TradeSheet**
   (`trade-sheet.tsx`, `ModalChrome`): bottom sheet on a phone, centred at 640px on desktop. The strip's Spares figure
   takes a dot while a trade waits on you.
2. **Picking.** The sheet's box has two sides (`From Colin`, `From you`), each its cards, its own total and `N cards`,
   the store provenance once. Empty side = a card slot with +. Under it the picker: a bare `SegmentedSwitch`
   (`Colin's spares · 12` / `Your spares · 6`), the wishlist line ("2 are on Colin's wishlist, listed first."), the key
   line (two-people glyph "wants it", out-arrow "already offered"), then tiles. Each tile: the card, **Add** 10px under
   it (`✓ In the trade` once picked, ringed, `aria-pressed`), then one line of chips:
   - **Wants** (fact blue, two-people glyph, the friend's name): only on your side, only this trade's friend.
   - **Offered** (muted, out-arrow): the one friend's name, or `N friends`. On a phone, a several-friends chip drops
     its arrow so `N friends` fits whole (chip text 10.5px under 375px wide, 11px above).
   - Both chips are half width each. Absent chips are filtered out, so a lone Offered sits on the left.
   - **Offered is a press**: a popover, "Also in your offers to", lists each friend with `Waiting · N days left` and
     `Open ›` to that trade. The chip's accessible name is the full sentence ("Offered to Peter and Chris").
   Only spares on both sides (D3). A spare may sit in two offers (Q9).
3. **Counter.** The same sheet: cards new to a side ringed `ADDED`, cards taken out faded `TAKEN OUT`, `was $N` under
   each total. Reading one: Yes, No, Counter in one row, then "Replaces your offer of Nov 24." Days left run from the
   first offer and never reset (D6).
4. **States:** `STATES.md`. Lists: the Requests box's third tab, **Trades** (five rows, waiting on you first, then a
   foot naming the rest), and Request history › Trades for all of them.
5. **Feed** kind `trade` (D7), kicker `Trade`, one row per push (offer, counter, accept, decline), on by default in app
   and push; Settings row `Trades`.
6. **Empty states:** the Requests box's `PanelEmpty` (No trades yet); a side with no spares gets its own line
   (`tradeCopy.empty`).
7. **Ask back = Make it a trade**, on the holder's Yes receipt ("You're giving Lathliss to Peter"), on Friends' Waiting
   on you, the Home lead and What's new. It opens the trade sheet with your yes on your side (`YOUR YES`). The yes
   stands whatever they answer.

## Calls beyond the brief (Hugh's rounds)

- **Asking stays first.** The spares sheet keeps Ask as the primary press; Trade is quiet (outline) beside it, with
  "Ask and they give it to you. Trade to offer one of your spares for it." A friend with your unanswered offer shows
  `Offer waiting` instead of Trade.
- **Trade from a deck or All shopping** opens the trade sheet over the list, the pressed card already on the friend's
  side. Sent: `Done` stays, `Open the trade ›` goes to the friend's Spares tab with a back link named for where you
  came from (‹ All shopping, ‹ the deck).
- **One unanswered offer per friend (Q10).** Accepted trades don't count, counters are never held. Propose another
  trade is held, with "Resolve your open trade before proposing another."
- **The Spares tab reuses the Wishlist tab's You have it parts:** the `Wanted` call-out of `TodoRow`s ("Colin has 4
  cards you want", bookmark; "Colin wants 2 of your spares", two-people glyph in fact blue via the new
  `TodoRow markTone="fact"`, with a Trade press), the compact radio switch `All 12 / You want 4`, the key line, then the
  shipped search, Filters and Sort.
- **Spares tiles: two half-width chips at most.** A gray count with no icon (`1 spare`, Collection's quantity ink,
  tabular figures), and why you want it: `Wishlist` (bookmark, plus a dashed dot if a deck also needs it) or `A deck`
  (dashed dot, muted). With Keep my shopping on my wishlist on, a deck's card is a wishlist card, so one reason is the
  rule. While your ask is open, or after a yes, the count chip reads `Asked` (accent dot) or `Agreed` (success tick).
- **Friends list:** a `you want` chip (bookmark, accent) beside the shipped `they want` chip, linking to
  `/friends/{id}/spares?wanted=wishlist,deck`; words on desktop, key line on a phone.
- **Days left sit right of Yes and No** on every request row and in the sheet, so rows don't grow.
- **Gone card:** a danger-tint ⊘ badge on the card ("No longer available"), not a line of text.
- **Ending a trade:** `Withdraw` your own unanswered offer; `Rescind trade` after an accept (beside Mark traded).
- **Numbers always carry a word:** `2 friends`, `1 spare`, `4 cards`.

## Files the plan touches (from `proposal.diff`)

New: `src/components/social/{trade-sheet,trade-tab,trade-rows,trades-head}.tsx`, `src/lib/copy/trades.ts`.
Changed: `friend-spares-tab`, `friend-spares`, `friend-strip`, `friend-head`, `friends-list`, `friends-view`,
`requests-box`, `request-history`, `waiting-on-you`, `spare-answer`, `spare-key-item` (social);
`decks/todo-card` (`markTone`), `feed/feed-item`, `home/lead-story`, `settings/news-section`, `place/place-strip`;
`lib/copy/{social,feed}.ts`, `lib/feed/kinds.ts`.
