# Change commander · half-trade addendum

A pair deck is offered a pair where one incoming half is already in the 98. Three cards move: that
half leaves the 98 for the command zone, one old commander takes its slot, and the other old
commander leaves the deck. The shipped `confirm.trade` ("The two trade places") is false here, so
the build holds the case back with `offerable()` (`lib/commander-change/pending.ts`). This addendum
draws it. **Nothing else in R3 changes.** The parent folder is untouched.

Canvas: `The 99 - Change Commander · Half-trade.dc.html`. Its children are copies of R3's frames,
each with one new state: `Change Commander Sheet` (`confirmHalfTrade`, `halfTradeFailed`, `pairHalf`),
`Deck Page 1300` and `Deck Page 390` (`afterHalfTrade`), and `Review Page` (`halfTrade`).
Repo path: `design/design_handoff_the99_change_commander/addendum-half-trade/`.

Fixture: Thrasios + Tymna lead (WUBG, 98). Ishai + Reyhan are offered, and Reyhan is in the 98.

## States

| # | Surface | State | Frame | Notes |
|---|---|---|---|---|
| 28 | List | pair with a half in the 98 | 2a | Sorts as any pair: in `Yours` when every other half is owned. The half carries the shipped `in this deck · trades places` |
| 29 | Confirm | half-trade | 1a, 1b | Out label `Leave the command zone`. A line under each card says where it goes. A `Which one stays in the 98?` radiogroup defaults to the commander-column half, with the sentence right below it |
| 30 | Confirm | half-trade, other choice | 1a, 1b (press Tymna) | Card lines and sentence follow the choice. Nothing else moves |
| 31 | Confirm | half-trade, failed | 1c | Shipped `failedPair`, below the buttons. The choice is kept |
| 32 | Confirm | half-trade on a brew | — | The shipped `brew` line replaces `landsHalfTrade`. Nothing else changes |
| 33 | Deck page | after a half-trade | 3a, 3b | Pair ⇄ line, then the trade's `+ {stays} · from the command zone` and `− {arrive} · to the command zone`. +1 / −1. The released half gets no card line |
| 34 | Review | half-trade | 4a, 4b | `was` / `now` rows as for a pair. The note is `noteHalfTrade`, and it breaks at the middot at 390. Footer counts 1 back in the pool |
| 35 | Discard | after a half-trade | — | Shipped `commanderBackPair` ("Thrasios and Tymna lead it again."). The stayed half leaves the 98 and the arrived half returns to it |

## The choice

The write gives the freed slot to `departing[0]`, which is the commander column. That order comes
from how the columns are stored and says nothing about the reader's deck, so the confirm asks.
- **Control:** a radiogroup labelled by its question, two options, defaulting to `departing[0]`.
  One tap still confirms.
- **Desktop:** 34px options.
- **390:** full width, with 44px options.
- **Selected option:** `--elevated` fill, `--fg` text, a solid accent dot.
- **Other option:** `--fg-muted` text, a hollow dot.

**For Hugh:** ask (as drawn), or a fixed rule where the commander column always stays. With the
fixed rule the choice row goes, and nothing else in the drawing changes.

## Engineering

1. `offerable()` no longer holds a pair back when a half is in the 98. That applies to the loader and to the write.
2. `changeCommander(deckId, { …, staysOracleId })`. It is required when exactly one arriving half comes
   from the body and both old halves depart. The write refuses a value that isn't a departing half, and
   gives the slot to that half.
3. `CommanderSection`: when the pair has one half leaving the deck and one arriving from the body,
   the note is `noteHalfTrade`. Otherwise it keeps its current logic.
4. Draft rows (`draft-rows.ts`): the arriving half from the body buys nothing, as a trade already
   does. The released half counts as 1 back in the pool.
5. **Still held back:** the kept-half case. For example, Thrasios + Ravos replace Thrasios + Tymna,
   with Ravos in the 98. That is a single trade under a kept half, but `confirm.trade` would name the
   pair. It is not drawn here.

## Copy (for `/copy-review`, into `lib/copy/change-commander.ts`)

```ts
confirm: {
  outHalfTrade: "Leave the command zone",
  staysQuestion: (body: number) => `Which one stays in the ${body}?`,
  cardStays: (body: number) => `into the ${body}`,
  cardReleased: "leaves the deck",
  cardFromBody: (body: number) => `from the ${body}`,
  cardFree: "free",                       // = sheet.free
  // arrive: the half leaving the body; joins: the other new half; stays / released: the old halves.
  halfTrade: (arrive: string, joins: string, stays: string, released: string, body: number) =>
    `${arrive} leaves the ${body} for the command zone, and ${joins} joins it there. ${stays} takes ${arrive}'s slot, and ${released} leaves the deck. The deck stays at ${body}.`,
  landsHalfTrade: "Lands in your pending changes, not yet a version. Discard puts all three back where they were.",
},
review: {
  noteHalfTrade: (stays: string, arrive: string, released: string) =>
    `${stays} and ${arrive} trade places · ${released} goes back in the pool when you commit`,
},
```

A card line under an in-side card that is to buy reads the shipped buy tag, not a word. The buy
line under the sentence is unchanged.
