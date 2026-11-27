# Brief: Friend trades

2026-11-27. Hugh's rulings of 2026-11-27 are locked below. This brief asks Design for the screens.

## Why

Hugh's ask: requesting cards from friends becomes a true trading system, and today's spare ask stays as it is.

His example: Colin said Yes to Hugh's ask, then asked Hugh for a spare in return. That is effectively a trade, and the app could not record it. The two asks are unrelated rows, and nothing says they belong together.

## Today

- A spare ask is one-way. `spare_requests` (`src/db/schema.ts`) holds one card, one asker and one holder. Its states are `open`, `yes`, `no`, `withdrawn` and `expired`. `initiated_by` is `asker` for an ask and `holder` for an offer (You have it).
- Expiry is derived at 14 days (`SPARE_REQUEST_DAYS` in `src/lib/social/spare-request-rules.ts`). No job sweeps.
- A Yes changes nothing else. The handover happens outside the app, and no collection moves.
- Nothing links two asks. An ask each way between the same pair is two unrelated rows. The one-open index is per asker and card, so it cannot hold a pair.
- Asks and answers are written in `src/lib/social/spare-requests.ts`. Offers are in `src/lib/social/spare-offers.ts`. Spares are read through `src/lib/social/spares.ts`, which re-joins the friendship grant on every read.
- A trade match (`src/lib/social/trade-match.ts`) is only a feed item: a friend has a spare of a card on your wishlist. It is not a trade. `src/lib/social/trade-ask.ts` opens the spares sheet in place from one.
- The holder answers Yes or No from `src/components/home/answer-sheet.tsx` (Home), from `src/components/social/waiting-on-you.tsx`, or from `src/components/social/spare-answer.tsx` presses. An offer's answer sheet is `src/components/home/offer-answer-sheet.tsx`.
- The asker sees their asks in `src/components/social/your-requests.tsx`, with history in `src/components/social/request-history.tsx`.
- The feed kinds are in `src/lib/feed/kinds.ts` (`spare-request` is default on, `trade-match` is not). Push copy is `src/lib/push/message.ts`. Kind prefs are `src/lib/feed/prefs.ts`.
- The earlier social handoffs say trades come later: no borrowing, messages or trades.

## Locked decisions (7, Hugh 2026-11-27)

1. **D1. Both entry points.** "Ask back" on the answer screen after a Yes, and "Propose a trade" with cards on both sides. Plain spare asks are unchanged.
2. **D2. One counter at a time.** The other person can accept, decline or counter. A counter replaces the open offer.
3. **D3. Spares only on both sides for v1.** Hugh: "any owned card" on your side complicates pulling a card from a deck and muddies the experience. Start here, get feedback, and add it later if needed.
4. **D4. Value is advisory.** Each side's total shows at the price the app already draws. There is no enforced balance.
5. **D5. Both people mark it Traded.** No collection change in v1. "Add to my collection?" may come later.
6. **D6. 14-day expiry for the whole trade.** A card that stops being spare flags the trade "needs a look" to both people.
7. **D7. A new `trade` feed kind, on by default.** Pushes go out for offer, counter, accept and decline. The kind is mutable in settings like the others.

## Out of scope for v1

- Moving collection data in either direction.
- Cards that are not spares, on either side.
- Messaging or threads.
- An enforced value balance.

## Open for Design to call

1. Where the trade sheet lives (sheet or page), and its phone and desktop layout.
2. How each side's cards are picked: from the friend's spares, and from your own spares.
3. How a counter reads against the original offer.
4. The trade states and how each reads in a list: open, countered, accepted, traded by one side, traded by both, declined, withdrawn, expired, needs a look.
5. The feed row for each push kind: offer, counter, accept, decline.
6. The empty states: no spares on your side, no spares on theirs, no trades yet.
7. Where Ask back sits on the existing answer screen.

## Surfaces to align with

Reuse these; do not draw a second version of what they already do.

- `src/components/home/answer-sheet.tsx`: the holder's answer sheet over Home. Ask back lives here.
- `src/components/home/offer-answer-sheet.tsx`: the offer's answer sheet.
- `src/components/social/spare-answer.tsx`: the shared Yes and No presses and receipts.
- `src/components/social/waiting-on-you.tsx`: the list of what waits on you.
- `src/components/social/your-requests.tsx` and `src/components/social/request-history.tsx`: the asker's list and history.
- `src/components/social/friend-spares.tsx` and `src/components/social/friend-spares-tab.tsx`: a friend's spares and the Ask press.
- `src/components/social/trade-ask.tsx`: the in-place spares sheet.
- `src/components/feed/feed-item.tsx`: the feed row.
- `src/lib/social/spare-requests.ts`, `spare-offers.ts`, `spares.ts`, `spare-request-rules.ts` and `trade-match.ts`: the data and rules.
- `src/lib/decks/price.ts`: the price the totals use.
- `src/lib/feed/kinds.ts`, `src/lib/feed/prefs.ts`, `src/lib/push/message.ts`: the kinds, their settings and push copy.

The closest sibling handoff for structure is `design/design_handoff_the99_social_r3/`, with its `READINESS.md` (Approved).
