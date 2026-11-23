# READINESS · You have it R2

**Verdict: Green. Hugh approved R2 on 2026-11-23** (Q1: tabs split by who started it; Q2: a below-threshold spare stays
unofferable, the sheet explains and links to Settings). Every surface the brief names is drawn at both widths.

## Gaps for engineering
- **G1 · Request history reads offers.** `requestHistoryQuery` filters `initiated_by = 'asker'` today. The direction becomes
  who started it: From you = `(initiated_by = 'asker' and asker = viewer) or (initiated_by = 'holder' and holder = viewer)`;
  To you the reverse. The non-starter's side leaves out `withdrawn` (today: `holder` side for asks; for offers, the asker,
  who is the wanter). `other` is the row's other user either way. `HistoryEntry` gains `offer: boolean`. The ex-friends count
  (`hiddenCount`) takes the same two directions. Both stay in `src/lib/social/` (`check:social-reads`). The cursor is
  unchanged (`created_at`, `id`).
- **G2 · The offer answer sheet's open.** `openOfferAnswerAction(itemKey)`, the offer twin of `openAnswerAction`: resolves the
  offerer's feed item (written by `answerOffer`, `offerAnswerData`) to its `spare_requests` row with `initiated_by = 'holder'`
  and `holder = viewer`, joined to the live friendship; returns card, friend (`public_id`, `ThirdPartyName`, commander art),
  the answer, `answered_at`, `created_at` and `copies`. Refused: the press goes to `/friends/requests`. No seen column is
  needed: the item's diamond goes for the visit as the ask's does (`onSeen`). `AnswerSheetProvider` grows an offer branch or
  a sibling provider; `FeedPress` routes `item.offer && item.answer` to it.
- **G3 · Kicker.** `feed-item.tsx` draws `answerKicker` (`Your request`) for the offerer's answer item. Use
  `offerAnswerKicker` when `item.offer`. Ship with G2.
- **G4 · Below-threshold spares.** `loadHaveIt` (through `loadOwnOffered`) drops a card when `isOffered` is false. Return a
  card with `0 < spare < min` and not kept back as `{ …, under: min }` (the reader's own settings, already read in the same
  transaction). `loadSparableCounts` (the /friends chip) and the Offer write's re-check are unchanged: under-threshold
  cards are not offerable (Q2). The filter and the call-out's count read offerable cards only.
- **G5 · Copy review.** Every string in `copy strings.ts`, including the renamed history tabs and the Settings pointer.

## Checks
- Every board renders, no broken images, no clipped frame (measured with support.js stripped).
- Frames rendered from main 7563036 with the shipped components and `scratch-gen/proposal.diff` applied; render hooks (a
  tab and an open sheet chosen up front, every tile eager) are in the scratch copy only and not in the diff.
- No em dashes in the copy.
