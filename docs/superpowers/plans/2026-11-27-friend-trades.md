# Friend trades: plan

Handoff: `design/design_handoff_the99_friend_trades/` (approved by Hugh 2026-11-27 after R11; README "Calls" 1 to 7 and "Calls beyond the brief", `STATES.md`, `READINESS.md` Yellow, Q9 and Q10 decided). Brief: `docs/superpowers/design-briefs/2026-11-27-friend-trades.md` (#3395, D1 to D7 locked). Lane 02, orchestrator `the-99-orchestrator`. No model call, no spend, no About entry (About is image pages), no new route, no new strip tab.

## What ships

A friend's Spares tab holds trades. Either friend proposes a trade: cards from the friend's spares and cards from their own, one copy each (D3). The other answers Yes, No or Counter (D2). A counter replaces the open offer and keeps the trade's 14-day clock (D6). After a Yes, both mark it Traded (D5). Nothing in either collection moves. Totals are advisory (D4). A card that stops being spare flags the trade as Needs a look for both. A new `trade` feed kind is on by default and pushes offer, counter, accept and decline (D7). Make it a trade, on the holder's Yes, opens the sheet with that yes on their side (D1). Plain spare asks are unchanged.

## Rulings this plan relies on

- **Q9 (handoff).** A spare may be in two live offers. The picker tags it Offered, with the friends it is offered to, and it stays pickable.
- **Q10 (handoff).** At most one unanswered offer per friend that the reader made. The rule:
  - An offer is unanswered when the trade is `open`, unexpired, and the current round is the reader's. A counter the reader sent therefore holds their slot with that friend as a first offer does, and "Resolve your open trade" is how they free it. Pinned in `trade-rules.test.ts`.
  - Accepted trades don't count.
  - The cap holds back only a new trade. A counter is never held, even when the reader has another unanswered offer to that friend.
  - It is enforced in the write, by a statement issued inside the proposing transaction after the pair's advisory lock, never in the read before it. It is not an index, because counters are allowed past it. Every write that changes whose turn it is (propose, counter, revise, accept, decline, withdraw) takes the same pair lock, so none races a propose.
- **Expiry (plan call, from D6).** Only the unanswered phase expires: an `open` trade whose `created_at` is 14 or more days ago reads as `expired` everywhere and cannot be answered. Expiry is derived on read and no job sweeps, as with `SPARE_REQUEST_DAYS`. An accepted trade does not expire. It waits on both marks or a Rescind, because the boards draw no days left on an accepted row. Decided by the orchestrator, 2026-11-27.
- **Unfriend (decided, orchestrator 2026-11-27).** Trades are not ended by an unfriend, as asks are not: every read and write joins the live friendship, so they vanish while the two are not friends, and an open one still within its 14 days reappears on re-friending and counts toward the cap.
- **Bounds (decided, orchestrator 2026-11-27).** At most 30 cards on a side (`TRADE_SIDE_MAX`) and 20 rounds in a trade (`TRADE_ROUND_MAX`; past it the answers are Yes and No). Propose and counter take a new rate bucket, `trade-offer`, 30 a day per reader, through `enforceHit` as the friend-request actions do. None is on the boards: they bound what one account can write and push. The over-limit refusals go through `/copy-review` in PR 4.
- **Needs a look (D6, READINESS).** It is derived on read for an `open` trade, never stored. A card in the current offer is gone when its owner no longer offers it:
  - Each side is tested as the person receiving it sees it: `loadFriendSpares(receiver, ids)`, filtered to the holder. For the friend's cards the receiver is the reader; for the reader's own cards it is the friend, so a card the friend cannot see (no pod grant) is refused at the send rather than born gone.
  - A revoked pod grant also reads as gone.
  - Waiting on the reader, the trade reads `look`: Yes is held, No and Counter stay.
  - Waiting on the friend, it reads `lookYours`: the reader may revise their own offer (a new round by the same author, clock kept) or Withdraw.
  - Accept re-checks every card in its transaction's read-before-write and refuses `gone`.
  - An accepted trade is never flagged, because its cards are promised.
- **No feature switch.** Social is always on, and a new switch needs Hugh first. Exposure is controlled by PR order instead:
  - PRs 1 to 4 add data, a feed kind nothing writes yet, and actions that have no caller.
  - PR 5 is the first user-visible PR. It ships the whole loop: propose, answer, counter, accept, mark, withdraw, rescind, with the feed row, push and Settings row already in place from PR 2.
  - Later PRs add surfaces to that loop.
  - Decided by the orchestrator, 2026-11-27, matching Cart and social. Should Hugh want one later, it gates PR 5's mounts, and no schema changes.
- **The Friends nav badge is unchanged (decided, orchestrator 2026-11-27).** Trades do not count toward it; the boards do not draw that.
- **Wishlist wants come through the union.** Lane 58's Cart PR 2 moves wishlist reads onto `src/lib/wishlist/lines.ts`. Two things read the friend's wishlist: "N are on Colin's wishlist" and the Wants chip. Both read it through the union (`loadHaveIt` and spare-offers' `want`), never `wishlist_items` directly. No shared social or wishlist export changes without telling the orchestrator first.

## Storage (PR 1, migration `0276_friend_trades.sql`)

| Object | Shape | Notes |
| --- | --- | --- |
| `trades` | `id` uuid pk; `proposer_user_id`, `recipient_user_id` text (Clerk ids, no FK, as `spare_requests`); `status` text default `'open'`; `offered_by_user_id` text (author of the current offer); `round` int default 1; `created_at` (the clock, D6); `answered_at`; `ended_at`; `ended_by_user_id`; `proposer_marked_at`, `recipient_marked_at`; `proposer_cleared_at`, `recipient_cleared_at` (a row's ✕, never a delete); `from_request_id` uuid FK `spare_requests` on delete set null (Make it a trade) | Checks: status in (`open`, `accepted`, `traded`, `declined`, `withdrawn`, `rescinded`, `expired`); proposer ≠ recipient; `offered_by_user_id` is the proposer on odd rounds and the recipient on even ones (rounds alternate; a revise rewrites its own round in place); `ended_by_user_id` null or a party; `ended_at` and `ended_by_user_id` set exactly on `declined`, `withdrawn`, `rescinded`; `round >= 1`; `status = 'traded'` ⇔ both marks set; marks only on `accepted`, `traded` or `rescinded`; an answer time on `accepted`, `traded`, `declined`. A partial unique index on `from_request_id`: one Yes seeds at most one trade. Indexes: (proposer, status), (recipient, status). No stamp trigger: nothing here is in a cached payload (as `spare_requests`). |
| `trade_rounds` | `trade_id` FK `trades` on delete cascade; `round` int; `offered_at`; PK (trade, round) | Every round is kept, with when it was sent: "Replaces your offer of Nov 24" and the counter marks read the round before. Its author follows from the round's parity, so it is not stored. The trade's current round is inserted in the same transaction as the trade row (a circular FK would need a deferred constraint). |
| `trade_cards` | (`trade_id`, `round`) FK `trade_rounds` on delete cascade; `side` text in (`proposer`, `recipient`) (whose spare, as a party, never a third account); `oracle_id` uuid FK `cards`; PK (trade, round, side, oracle) | One copy of each card (D3), so a row is a card and no count is stored. A counter reads against the round it replaces: ADDED, TAKEN OUT, and `was $N`. The picker's Offered lookup (Q9) reads the viewer's open trades by the party indexes, then their cards by the primary key. |

Guards in the same PR:
- The three tables join `SOCIAL_BINDINGS` and `RAW` in `scripts/lib/social-reads.mjs`. `trades` is matched only where SQL names a table, as `pods` is, since deck tuning says "trades" in copy.
- `trades` joins `SOCIAL_PURGED` in `purge.ts`, and the purge coverage test's account columns gain `proposer_user_id`, `recipient_user_id`, `offered_by_user_id` and `ended_by_user_id`. Rounds and cards name no account and go by cascade. The purge deletes the account's trades in both directions before its spare requests.
- The snapshot and journal are written as 0274 did.

**Pure rules (`src/lib/social/trade-rules.ts`).** These functions are pure:
- `sheetState` and `rowState` (viewer, now, gone) return the sheet's stored states and the row's twelve (`look` covers both sides' Needs a look). Draft, askBack, counterDraft and sent are presses, never stored.
- `tradeDaysLeft` and `tradeStatus` (expiry derived). They are trades' own, not `spare-request-rules`' helpers, which read `SPARE_REQUEST_DAYS`.
- `offerHeld` (Q10).
- `cleanSides`: distinct uuids, both sides at least one card, neither past the cap.
- `roundDiff(current, previous)` gives the added, removed and `was` figures.
- `canAct(trade, viewer, action, now, gone)` covers `counter`, `accept`, `decline`, `withdraw`, `rescind`, `mark`, `clear` and `revise`.
- The row order: waiting on you first (offer, counter, needs a look, accepted, traded by them), then the rest by newest.

Every state and transition is pinned in `trade-rules.test.ts`.

## The feed kind (PR 2)

The kind lands before any writer, so the first trade written already reaches the feed and a push:
- `trade` joins `FEED_KINDS`, `STORED_KINDS`, `PUSH_OUTBOX_KINDS`, `DEFAULT_ON_KINDS` and `LEAD_PRIORITY`, with migration `0277_trade_feed_kind` rebuilding `feed_items_kind_check` and `push_outbox_kind_check`.
- Every exhaustive use of `FeedKind` takes it: `flag.ts` `feedKindAvailable`, `copy/feed.ts`, `to-push-item.ts` (no card required), `home.ts`, `feed-item.tsx` (the feed row) and `whats-new.tsx`.
- Waiting is per event, not per kind: only `offer` and `counter` items wait. `waits()` in `kinds.ts` reads `data.event` for `trade`, so an accept or decline item never sorts first or leads Home.
- `feedItemProblem` gains a `trade` branch: `friendUserId` and a uuid `data.trade`, no `oracleId`.
- The standing check is `standing()` in `src/lib/social/feed-items.ts`, used by `storedFeedBranch` and the push resolver `storedItemsByKeyQuery`. Its `trade` branch reads `(data->>'trade')::uuid` under a `case when` guard. An `offer` or `counter` item stands while its trade is still open on that round; an `accept` stands while the trade is accepted or traded; a `decline` stands for its 14 days.
- `push/message.ts` gains a `trade` variant and collapses it per key, as `spare-request`, so two friends' offers never fold into one push. Copy in `src/lib/copy/push.ts`. The push lands on `/friends/<publicId>/spares?trade=<id>`; until PR 5 mounts the sheet that page simply opens the friend's Spares tab.
- The Settings row `Trades` (`news-section`), so a reader can turn the kind off from its first push.
- The item's shape: `kind='trade'`, `friend_user_id` the other party, no `oracle_id`, `dedupe_key='<tradeId>:<round>:<event>'`, `data={trade, round, event}` with `event` one of `offer`, `counter`, `accept`, `decline`. Card lists are not stored: a revise rewrites a round's cards in place, so `src/lib/social/trade-feed.ts` reads them live from `trade_cards` for the round the item names, joined to the friendship on the viewer.

## Writes (PR 3, `src/lib/social/trades.ts`)

Each write follows `spare-requests.ts`:
- Read before the write, outside the transaction: `resolveFriend`, and every card on each side through `loadFriendSpares(receiver, ids)` filtered to the holder (the receiver is whoever the card goes to).
- Then in one transaction:
  - the pair's advisory lock (`trade:<lower>:<higher>`);
  - `lockFriendshipQuery` (both rows FOR SHARE, in the purge's order);
  - the cap, for a propose, as a statement after the lock;
  - one conditional statement, aliased and qualified, that names the viewer's party and role, the live friendship, `status = 'open'`, the unexpired floor, and the round the viewer saw: every answer, counter, revise and withdraw carries `round`, so a Yes never accepts cards the viewer did not see;
  - `recordFeedItem` for the other person, in the same transaction, which queues the push.

| Write | Who | Statement and refusals |
| --- | --- | --- |
| `proposeTrade(viewer, friendPublicId, sides, fromRequestId?)` | anyone | `cleanSides`. Every card must be spare now, as its receiver sees it. The cap (Q10, `held`). `fromRequestId` is stored only for a request with status `yes`, `initiated_by = 'asker'`, the viewer its holder and the friend its asker, and its card is forced onto the viewer's side; a second trade from it is refused by the unique index. Inserts the trade, round 1 and its cards. Feed `offer`. |
| `counterTrade(viewer, id, seenRound, sides)` | the non-author of an open, unexpired trade, below the round cap | `round + 1`, `offered_by = viewer`, the new round and its cards. Never held by the cap. Feed `counter`. |
| `reviseTrade(viewer, id, seenRound, sides)` | the author, only while `lookYours` | Rewrites the current round's cards and `offered_at` in place, keeping the round, with no feed item: the other side was never answered. |
| `answerTrade(viewer, id, seenRound, yes/no)` | the non-author | Yes re-checks every card (`gone`) and writes `accepted`. No writes `declined`. Feed `accept` or `decline` to the author. |
| `withdrawTrade` | the author of an open trade | `withdrawn`. Nobody is told, as an ask's withdraw. |
| `rescindTrade` | either side of an accepted trade | `rescinded` and `ended_by`. Nobody is pushed. The row reads Withdrawn / `rescinded`. |
| `markTraded` | either side of an accepted trade | One UPDATE sets the viewer's mark and, when the other mark is set, `traded`. No push. |
| `clearTrade` | either side of an ended trade, a derived-expired `open` one included | Sets the viewer's `*_cleared_at`. |

A withdrawn offer leaves the recipient's lists at once: their row and feed item drop (the item's standing fails), as a withdrawn ask does.

Feed items: `dedupeKey` is `<id>:<round>:<event>`, and `data` is `{ trade, round, event }`. `withAnswerDetails` and spare-request reads are untouched.

## Reads and actions (PR 4)

The reads, in `src/lib/social/trades.ts`:
- `loadTrade(viewer, id)`: the sheet's whole view. It carries:
  - both sides' cards with name and art (`TradeCard`), and the previous round for `was` and its marks;
  - the derived state and `gone` per card;
  - days left, `offeredAt` and the friend as `OtherSide` (`named()`, `public_id`).
- `loadTradesWith(viewer, friendPublicId)`: the Trades with X box, the cap flag, and the strip's waiting dot.
- `loadTradeRows(viewer, {limit?})`: the Requests box tab and Request history, with the friend's face.
- `loadOfferedTo(viewer, oracleIds)`: Q9, per card, the other friends and each offer's days left.
- `tradesWaitingWith(viewer)`: per friend, whether a trade waits on the reader, for the strip's Spares dot (PR 6).

Every read joins the live friendship in the same statement. Prices come from `loadPrices` with the reader's store, as the Spares page does. A failed price read draws bare totals, never an error.

The Spares tab's own reads (PR 6's call-out, chips and the Friends list `you want` count) land with PR 6, each in `src/lib/social/` with its friendship join.

The actions are in `src/app/friends/trade-actions.ts`: `proposeTradeAction`, `counterTradeAction`, `reviseTradeAction`, `answerTradeAction`, `withdrawTradeAction`, `rescindTradeAction`, `markTradedAction`, `clearTradeAction` and `openTradeAction`. Each gets its reader from `requireUserId()`, checks every id with `isUuid` and the sides with `cleanSides` before any read, takes `enforceHit("trade-offer")` on propose and counter, and does `after(() => revalidatePath("/friends"))` on success, as `spare-actions.ts` does.

`src/lib/copy/trades.ts` (every string in `STATES.md`) lands here through `/copy-review`, so PR 5 on is all drawing. A test pins that nothing under `src/app` or `src/components` imports the actions before PR 5.

## UI (PRs 5 to 8)

The UI follows the boards and `scratch-gen/proposal.diff`. That diff is rebuilt with data, never copied from `design/`.
- **PR 5, the trade sheet and the Spares tab's Trades box** (Spares S0/S0w/S9 box and cap only, Ask, Propose, Answer, Waiting):
  - Every component:
    - `trade-tab.tsx`, covering all twelve states and the picker;
    - `trade-sheet.tsx` (`ModalChrome`, a bottom sheet on a phone and 640px centred on desktop);
    - `trade-rows.tsx`;
    - `trades-head.tsx`'s Trades with X box, with its cap line.
  - The Offered popover: focus in, Escape closes, focus returns to the chip.
  - The spares sheet's quiet Trade press beside Ask, the `how` line and `Offer waiting`.
  - `?trade=<id>` opens the sheet on landing, stripped through `mirrorUrl`.
  - Loading, failed send and empty sides follow the spare-request patterns, recorded as 🔸 rows.
- **PR 6, the Spares tab's You have it parts and the strip dot** (Spares S0, S4; Lists ST):
  - the strip's Spares dot (`friend-strip`, `place-strip`);
  - the Wanted call-out: `TodoRow`s, with the new `markTone="fact"` on `todo-card`, and the Trade press;
  - `All / You want` and its key line;
  - the tile chips (`1 spare`, `Wishlist`, `A deck`, `Asked`, `Agreed`), in `friend-spares-tab` and `spare-key-item`;
  - the Friends list `you want` chip linking `?wanted=wishlist,deck` (`friends-list`, `friends-view`).
- **PR 7, lists and Make it a trade** (Lists L1/L2/E3/RH/N2, MakeTrade A0 to A3 and H1):
  - the Requests box's Trades tab, with its `PanelEmpty`;
  - Request history › Trades;
  - Waiting on you's trade rows, with days left beside Yes and No;
  - Home's lead story;
  - Make it a trade on the Yes receipt (`spare-answer`), Waiting on you, the lead and What's new (`askBack`, `fromRequestId`).
  - `loadIncomingOffers` takes the executor `q`, as `loadIncomingAsks` does (orchestrator, Hugh accepted), since Waiting on you is the first trades PR to touch incoming offers.
- **PR 8, trading from a deck or All shopping** (FromDeck D2 to D4):
  - the spares sheet's friend row Trade pushes the trade body inside the same sheet, with the pressed card on the friend's side;
  - the sent receipt: Done, and Open the trade ›;
  - the friend head's back link named for the origin (`friend-head`).

Every UI PR carries:
- a `## Design review` table;
- a contact sheet at 390 and 1300 over every touched route, taken on a scratch branch seeded with trades in each state (`scratch-friend-trades`, made from local-dev, 0.25 CU, deleted at PR end);
- a `ui-probe` where a PR claims behaviour (picker Add, popover focus, cap held);
- feature-acceptance at the PR and again at line close.

## PR boundaries

There are no stacked PRs. Each PR branches from a fresh `origin/main` after the previous one merges. Each stays under 20 files and about 800 runtime lines.

| PR | Contents | Risk path |
| --- | --- | --- |
| 1 | This plan; migration 0276 and its snapshot; `schema.ts`; `trade-rules.ts` and tests; the social-reads and purge lists | Risky (migration, social): `/code-review medium` plus checklist |
| 2 | Feed kind `trade`: migration 0277, `kinds.ts` and every exhaustive use, `feedItemProblem`, `standing()`, push variant and copy, feed row, Settings row | Risky (migration, push) |
| 3 | `trades.ts` writes and tests | Risky (social writes) |
| 4 | `trades.ts` reads and tests; `trade-actions.ts` and tests; the `trade-offer` rate bucket; `copy/trades.ts` (copy-review) | Risky (cross-user reads, actions) |
| 5 | Trade sheet, picker, popover, Trades box, spares-sheet Trade press, `?trade` open | Risky (first exposure); design-review, contact sheet, probes |
| 6 | Spares tab call-out, switch, chips and their reads; Friends list chip; strip dot | UI review |
| 7 | Requests box Trades tab, Request history, Waiting on you, Home lead, Make it a trade | UI review |
| 8 | From a deck / All shopping, back link | UI review |

Production proof at line end: the domain serves the new deployment, `GET /api/health` reads 200, and a database-backed trades read answers.

## Risk and review

These are the risks the review watches:
- **The cap (Q10).** It is a read under the pair lock, not an index, so two concurrent proposals serialize on the lock. A test pins the lock order: advisory lock, then friendship rows, then the cap.
- **A stale answer.** Every answering statement carries the round the viewer saw.
- **Abuse.** The side and round caps, the rate bucket, and one trade per Yes.
- **Expiry.** It is derived, and every answering statement carries `created_at > openFloor`.
- **Correlated subqueries.** They alias and qualify, pinned with `.toSQL()` tests.
- **Names.** They are minted only through `named()`.
- **The purge.** It covers both tables.
- **Spare-request code.** The push copy and `storedFeedBranch` are additive. No spare-request statement changes.

## Review log

Plan review by a general-purpose subagent, 2026-11-27. Each claim was checked against the code before it was taken.

| # | Finding | Outcome |
| --- | --- | --- |
| 1 | The kind checks come from `kinds.ts`, so rebuilding them in PR 1 drags every exhaustive `FeedKind` use with it | Fixed: PR 1 is the tables only; the kind is PR 2 with its own migration 0277 |
| 2 | One `offered_at` loses the replaced round's date | Fixed: `trade_rounds` |
| 3 | An answer could accept a round the viewer never saw | Fixed: every answering write carries the round |
| 4 | Own-side spare check ignored the friend's grant | Fixed: each side checked as its receiver sees it |
| 5 | No bounds on cards, rounds or rate | Fixed: 30 a side, 20 rounds, `trade-offer` bucket |
| 6 | `waits()` is per kind; the standing check is `standing()` in `feed-items.ts`; push collapse; copy in `copy/push.ts` | Fixed in PR 2's list |
| 7 | PR 4 was over size | Fixed: split into PRs 5 and 6, the feed row and Settings row moved to PR 2 |
| 8 | Q10 for a counter the reader sent; cap statement inside the transaction | Fixed: stated and pinned |
| 9 | Marks unconstrained; clearing a derived-expired trade; withdrawn visibility; `lookYours` row | Fixed: marks check, clear rule, withdraw line, `look` row covers both |
| 10 | One Yes could seed many trades | Fixed: unique index and the request conditions |
| 11 | Unfriend | Stated: as asks, nothing ended; reads hide them |
| 12 | Spares tab reads unplanned | Fixed: they land with PR 6 |
| 13 | Unreferenced actions | Fixed: a test pins no import before PR 5 |
| 14 | 0276 assumes Cart takes 0275 | Confirmed: 0276 and 0277 are this line's; 0275 stays reserved for Cart and unused for now, which leaves the numbers in order either way |
| 9 (part) | Reuse `spare-request-rules` `daysLeft` | Declined: it reads `SPARE_REQUEST_DAYS`; trades keep their own clock |
