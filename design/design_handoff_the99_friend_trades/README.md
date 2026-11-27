# Friend trades · R1 (account 2, 2026-11-27)

Brief: `docs/superpowers/design-briefs/2026-11-27-friend-trades.md` (PR #3395), locked D1 to D7.
Canvas (Design type): https://claude.ai/artifact/An3LAJziyAdcGsTuc2oj1G — Main, AskBack, Propose, AskBackTrade, Answer,
Counter, Accepted, Look, Trades, Feed, Empty, Settings. Every frame is rendered from main with the shipped components and
the shipped CSS, with `scratch-gen/proposal.diff` applied; card art from account-2 friend_decks. Friends: Colin, Peter, Max, Chris.
Status: R1, awaiting Hugh's review. Not for main until approved (then `design/design_handoff_the99_friend_trades/`,
mirroring `design_handoff_the99_social_r3/`).

## Calls (brief § Open for Design, 1 to 7)

1. **Page, not sheet.** A friend page's fourth strip tab, **Trade** (`/friends/{id}/trade`), after Spares, always drawn.
   One live trade per friend at a time (Q2), so the tab is that trade: composed when there is none, else the live trade
   in its state. Ask back, pushes, What's new rows and Trades rows all land here.
2. **Picking.** One `DeckBox` holds both sides: two cells drawn as the To buy box's (`price-strip.tsx`): mono label
   (`From Colin`, `From you`), the cards as Spares-tab tiles (63/88, open card details), the 17px total, `N cards`, the
   `1 of 2 priced` clause when it applies. Under the cells, the store provenance line. The foot holds the presses.
   Composing or countering, a second box below is the **picker**: its band is the Requests box's `SegmentedSwitch`
   (`Colin's spares · 12`, `Your spares · 6`), its body the Spares tab's `SparesChassis` and grid. Tile press = card
   details (as everywhere); **Add** under the tile is the pick, the same press takes it out (`✓ In the trade`,
   `aria-pressed`), picked tiles ringed (`RING`). Only spares are listed on both sides (D3).
   **Send** appears only once each side has a card; until then the foot line says what it waits on.
3. **Counter.** The same box redraws: a card new to a side is ringed with `ADDED`; one taken out stays, at 45%, with
   `TAKEN OUT`; under each total, `was $16.99` (that side's total in the offer replaced). Foot: Send counter, Keep their
   offer, "Your counter replaces Colin's offer. The days left stay as they are." Reading one: Yes/No/Counter plus
   "Replaces your offer of Nov 24." Days left run from the first offer (D6).
4. **States**, see the table below. List = the Requests box's third tab, **Trades**.
5. **Feed** kind `trade` (D7), kicker `Trade`, one row per push kind; the push sends the same title and line.
6. **Empty states**: the Requests box's `PanelEmpty` with `HandoverMark`.
7. **Ask back** on the holder's **Yes receipt** (Waiting on you row's action line, Home lead's filled press, What's new
   row's text press), never on an offer's receipt. Opens the asker's Trade tab, picker on their spares, the yes card on
   your side marked `ALREADY A YES`. The yes stands whatever they answer.

## States

| State | Trade tab (band · foot) | Trades row (kicker · title · line · action) | Board |
|---|---|---|---|
| draft | Propose a trade to Colin · Send offer (both sides filled) + "Colin has 14 days to answer." | none | T1, T1b |
| ask back | Ask Peter back · Send + "Your yes on Lathliss stands either way." | none | T2 |
| open, to you | Colin's offer · Yes, No, days left, Counter | TRADE OFFER · Colin offers Ghalta and Sai for your Lathliss · 13 days left · Answer › | T3 |
| open, yours | Your offer, days left · Withdraw + "Waiting on Max." | OFFERED · You offered Zimone to Max for … · Waiting on Max · 12 days left · Open › | T6 |
| countered (making) | Your counter · Send counter, Keep their offer | none | T4 |
| countered (to you) | Peter's counter · Yes, No, Counter + "Replaces your offer of Nov 24." | COUNTERED · Peter countered your trade · Now Miku for your Dina and Zada · 9 days left · See the counter › | T5 |
| accepted | Accepted · Mark traded, "Hand them over when you meet…", Call it off | ACCEPTED · Chris accepted your trade · Hand them over, then mark it traded. · Mark traded | T7 |
| traded by them | Accepted · Mark traded + "Colin marked it traded…" | TRADED BY COLIN · Colin marked the trade done · Mark it too… · Mark traded | T8 |
| traded by you | Accepted · "You marked it traded. Waiting on Colin." | TRADED BY YOU · … · Waiting on Peter to mark it too. · Open › | T8b |
| traded by both | Traded (success wash) · "Traded Nov 27. Your collection stays as it is until you change it." + Propose a new trade | TRADED · You and Peter traded · Miku for Dina and Zada · Nov 24… · ✕ | T9 |
| declined | tab composes again | DECLINED · Max declined your trade · Nothing else changes. · ✕ | L1 |
| withdrawn | tab composes again | WITHDRAWN · Chris withdrew the trade · Nothing else changes. · ✕ | L1 |
| expired | tab composes again | NO ANSWER · Colin didn't answer your trade · Offered 14 days ago. · ✕ | L1 |
| needs a look | Needs a look · reason line, Counter, Withdraw, days left; gone card `NO LONGER SPARE` (--warning) | NEEDS A LOOK (--warning) · Giada is no longer spare · Max's trade can't go ahead as it is · 6 days left · Take a look › | T10 |

Trades list order: waiting on you first (offer, counter, needs a look, accepted, traded by them), then the rest, newest
first. Ended rows stay until ✕ (as Your requests). The tab label takes `--accent-text` while one waits on you.
Row picture (`TradePicture`): the friend's first card with their face, your first card fanned behind (-9°).

## Feed rows (one per push kind)

| Push | Title | Line | Press |
|---|---|---|---|
| offer | Colin offers a trade | Ghalta and Sai for your Lathliss. | See the trade › |
| counter | Peter countered your trade | Now Miku for your Dina and Zada. | See the counter › |
| accept | Chris accepted your trade | Hand them over, then mark it traded. | See the trade › |
| decline | Max declined your trade | Nothing else changes. | See the trade › |

Offer and counter wait on the reader: `WAITING_KINDS` and `LEAD_PRIORITY` (after `spare-request`). Settings row:
`Trades` / "A friend offers, counters, accepts or declines a trade with you." `DEFAULT_ON_KINDS` (in app and push).

## Totals (D4)

Each side's own figure (`summarisePrices` over that side's cards at the price the app already draws), the store's
provenance line once under both. No difference, no comparison, no verdict colour or copy anywhere. A counter's `was`
line is that side's own earlier figure, not a comparison between sides.

## Questions for Hugh

- Q1 The brief names `answer-sheet.tsx` for Ask back; that sheet is the asker's view of an answer. Drawn on the
  holder's Yes receipt instead (recommended).
- Q2 One live trade per friend at a time (recommended).
- Q3 One copy per card per trade in v1 (recommended).
- Q4 Call it off after an accept, either side; the other sees Withdrawn (recommended).

## Gaps for engineering

- G1 `friend_trades` + lines tables; one-live-per-pair unique index; `initiated_by` and `ask_back_of` (the spare request).
- G2 Needs a look derived on read (a line's card no longer in the holder's spares), as expiry is derived.
- G3 `AnswerPresses` needs a `trade` flag for its aria labels (as `offer`).
- G4 Feed kind `trade`: `FEED_KINDS`, `STORED_KINDS`, `PUSH_OUTBOX_KINDS` (append, migration), push copy in `push.ts`.
- G5 Ended trades in Request history: later round.
- G6 Copy review on every string in `scratch-gen/trades.ts`.

## Files

`*.dc.html` + `canvas.json` (the canvas as exported), `art/` (frames, webp, 2x), `scratch-gen/`: `trade-tab.tsx`,
`trade-rows.tsx`, `trades.ts` (the proposal as code), `proposal.diff` (all source changes: friend strip tab, Requests box
third tab, Ask back on receipts, feed kind, copy), `render.tsx` + `fx.tsx` (frames), `boards.py` (boards).
SSR recipe (friends_link): copy main, drop `@fwd-stack/*`, `npm install --ignore-scripts`, `tsconfig.scratch.json` +
`stubs/`, apply the diff, `node css.mjs`, `DATABASE_URL=postgres://x:y@localhost/z npx tsx --tsconfig tsconfig.scratch.json dz/render.tsx`,
`FULL=1 node dz/shoot.cjs`. Render-only switches (not in the diff): `HydratedImg` draws src on the server; `__TAB`,
`__RECEIPTS`, `__ANSWERED`, `__DEVICE` set initial client state.
