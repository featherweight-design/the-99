# Readiness audit: Change commander (sub-project 7), R3

**Audited:** 2026-09-25, against `origin/main` at `674bb815`. Every file:line below was read on that commit.
**Brief:** `docs/superpowers/design-briefs/2026-09-24-alternate-commander.md` (§2 locked, §3 states, §4 open,
§6 engineering's), plus Hugh's ruling of 2026-09-25 that each candidate shows its mana value relative to the
current commander.
**Package:** this folder, committed as delivered. R3 (top of the canvas) is the approved state; R2 and §1–§5 are
the record, and §2–§5 render the approved components (`README.md`). Design's own `READINESS.md` is answered in §5.

## Hugh's rulings (2026-09-25)

Hugh approved this audit on 2026-09-25.

- **H1: kept.** A half-owned pair sits with the pairs to buy, ranked by fit within that group, and its buy tag
  names the half to buy.
- **H2: corrected now.** The fit figure must not favor popular commanders on breadth alone. A card counts toward
  "N of M" only when it appears in at least a set share of that candidate's decks, so a commander with thousands
  of decks does not match more of the 99 just because more cards were ever played with it. The threshold is
  measured, not asserted (F10). **Superseded the same day, below.**
- **H2 revisited (Hugh, 2026-09-25): minimum sample only.** Measured on staging, a share threshold did not move
  the figure's lean toward popular commanders (r 0.286 → 0.313 from no threshold to 30) and let more tiny-sample
  commanders into the top ten. The ranking is the plain "N of M" count, with candidates under a minimum indexed
  deck count hidden. N is measured, and the curve is recorded in `docs/superpowers/plans/2026-09-25-change-commander.md`
  (N = 20). Cancelling the popularity lean is a possible follow-up if the staging walk reads as "the usual
  suspects". No seam is built for it.
- **The mana value is accepted as drawn:** cost pips plus the relative phrase.
- **About:** batched with the analysis line at launch. The sub-project 7 plan must name the batched About task.

## Verdict: Green

Build it, with the engineering corrections below. Every §2 ruling holds, §4's calls are answered, every §3
state is in `STATES-change-commander.md`, and the 2026-09-25 mana value ruling is drawn in the row and in the
confirm at 1300 and 390. Nothing goes back to Design. Two of Design's open points go to Hugh (§4). Neither holds
the verdict.

---

## 1 · Against the brief

### §2 rulings

| Ruling | Held | Where |
|---|---|---|
| 1: an action, not an audit | Yes. A door, a list, a confirm, and a draft change | README; STATES 13–22 |
| 2: exact color identity only | Yes. The none states say so (*No other pair shares these four colors.*) | copy `none`, `nonePair` |
| 3: like for like | Yes. A single deck sees singles, a pair deck sees pairs, and the body stays whole | 2c, 4c |
| 4: the figure orders, owned first, free / held / buy | Yes. *Yours* (free or held), then *To buy*, each ordered by the figure. `free` is a word on owned rows | README; STATES 3, 5, 10 |
| 5: universal staples and basics do not count | Not visible in a drawing, which is correct. It is the denominator's rule (F4) | copy `figure` |
| 6: a draft change after a confirm | Yes. The confirm replaces the list in the sheet; the banner and the review page gain a commander entry | 4a–4d, 5a–5d |
| 7: the door is on the deck page's commander | Yes. One joined plate on the commander art, `⛶ Card details │ ⇄ Change commander`. The action row is unchanged | R3-E |

### §4, Design's calls

| § | Call | Answer |
|---|---|---|
| 4.1 | The door | R3-E: joined with the card-details trigger on the art. A fourth button and an *Edit deck* menu were tried and dropped |
| 4.2 | The container | `ModalChrome` at 700, which exists (`src/components/decks/receipt-modal.tsx:120`, `:212-214`) |
| 4.3 | How long the list runs | 8 at a time with *Show N more*, and no search (Design's READINESS 3) |
| 4.4 | How a row opens its counted cards | The figure itself opens them inline, one row at a time (2b) |
| 4.5 | How a pair reads | Two names, two cost runs joined by `+`, `their decks` (2c) |
| 4.6 | Where the change sits on the review page | A *Commander* section first (5c, 5d) |
| 4.7 | A pair with one half owned | It is a purchase, so it sorts in *To buy*. A held half still counts as owned (§4 H1) |

### The mana value (Hugh, 2026-09-25)

Drawn as ruled: the cost as `CostPips`, then `(n less than Gishath)`, `(same as …)` or `(n more than …)`. A pair
draws both halves' costs joined by `+` and compares their total with the current pair's. It is a fact beside
the figure. The list stays ordered by the figure, with no sort or filter added (R3-A: *a fact, never a sort*).
- **The row:** R3-A at 1300 and 390 (`several`). The pair row renders through 2c.
- **The confirm:** R3-B at 1300 and 390 (`confirm`). The pair confirm renders through 4c.

Hugh's example wrote the number (*5 · 2 less than Gisa*), and Design draws the cost as pips, as every other
surface does. The comparison phrase is the same. Design records the pips as settled in review (`READINESS.md`,
*Settled in review*).

### The switch

`CHANGE_COMMANDER_ENABLED` (brief §7, #938). The package does not mention it, which is correct for a drawing.
What it gates is F6.

### About entry

Batched with the analysis line at launch (brief §7). No plan for sub-project 7 exists yet in
`docs/superpowers/plans/`. **The plan must name the batched About task.**

---

## 2 · Against the code

| Named | Exists | Where |
|---|---|---|
| `FullCardTrigger` | Yes | `src/components/commanders/full-card-trigger.tsx:99` |
| `CostPips` | Yes | `src/components/ui/cost-pips.tsx:115` |
| `ModalChrome` at 700 | Yes | `receipt-modal.tsx:120`, `:212-214` |
| `shortName` | Yes | `src/lib/cards/short-name.ts:15` |
| `changeCount`, `hasChanges`, `releasedCopies` | Yes, over `deck_cards` rows only | `src/lib/decks/draft-shape.ts:120`, `:133`, `:141` |
| `NameLine`, the banner's densities | Yes | `src/components/decks/pending-banner.tsx:126-136`, `:174` |
| `DECK_MIX_KEY` | Yes, keyed on the deck and the index generation | `src/app/decks/[id]/changes/page.tsx:36`, `:148` |
| `cards.cmc` | Yes | `src/db/schema.ts:38` |

---

## 3 · Findings

All findings are engineering's. There are no Design findings.

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F1 | Medium | `draft-shape.ts:26-45`, `:120-143`; brief §6 | **The draft does not know commanders.** `DraftState` holds `adds` and `removes` from `deck_cards`, so `changeCount` and `hasChanges` read zero on a swap alone, and the banner, the review page and Discard all miss it. **Correction:** a commander entry in the draft state, counted as one change (Design's eng 3), rendered in both banner densities and first on the review page, and restored by Discard from the version's commander columns | eng |
| F2 | Medium | brief §6 | **The commander write is new.** No application code changes the commander columns after insert. **Correction:** one transaction for the columns, the trade of places when the new commander was in the 99 (three entries: the change plus two `deck_cards` rows, eng 4), and `touchDeck` | eng |
| F3 | Medium | `draft-shape.ts:133` | **The old commander's copy is not released.** `releasedCopies` sums `removes` alone. **Correction:** add one copy per commander that leaves the deck, so the commit sheet's *back in the pool* figure is right (eng 5) | eng |
| F4 | Low | brief §2 ruling 5 | **The denominator excludes universal staples and basics.** It reads the shared staple set (`loadUniversalStaples`, `src/lib/staples/universal.ts:40`) and keeps no list of its own | eng |
| F5 | Low | `changes/page.tsx:36`, `:148` | **The deck mix's cache key assumes a fixed commander.** It is keyed on the deck and the index generation, so after a swap the review page would serve the old commander's targets. **Correction:** add the commander ids to the key (eng 7) | eng |
| F6 | Medium | brief §7 | **`CHANGE_COMMANDER_ENABLED` gates the door.** With the switch off, the plate is today's `FullCardTrigger` alone, with no ⇄ half and no divider. The plate must not change the shipped trigger's size or place when off | eng |
| F7 | Low | `schema.ts:38`; the sheet's `mvOf` | **Mana value comes from `cards.cmc`, never from parsing the cost.** The drawing's own arithmetic counts `{X}` as 1 and a hybrid `{2/W}` as 1, where the mana value counts X as 0 and `{2/W}` as 2. **Correction:** compare the catalog's `cmc`, summed for a pair; draw the pips from the cost as `CostPips` does | eng |
| F8 | Low | Design's eng 6 | **Candidate availability excludes this deck.** A candidate already in the 99 bypasses the read, since the trade keeps its copy | eng |
| F9 | Low | `change-commander - copy strings.ts` | **The copy goes to `/copy-review`**, as Design lists it, including `manaValueRel`. It also needs a pair form of the discard line: `commanderBack` has only the singular, so a pair would read *Thrasios & Tymna leads it again* | `/copy-review` |
| F10 | Medium | brief §6 (known bias); Hugh's H2, as revisited | **Candidates under a minimum sample are hidden.** Per H2 revisited, the figure stays the plain count, and a candidate (or pair) with fewer indexed decks than `MIN_CANDIDATE_DECKS` is dropped before ranking. N = 20, measured on staging, with the curve in the plan. An inclusion threshold is not used | eng |

---

## 4 · For Hugh

- **H1 (Design's call on §4.7, ruled above).** A pair where one half is owned and the other must be bought sorts with the
  pairs to buy, below every pair you own, even when its figure is higher than theirs. A half another deck holds
  still counts as owned.
  OK?
- **H2 (the brief's known bias, §6, ruled above).** A commander with many indexed decks has a longer support list, so it can
  reach a higher figure than a rarely built one. The brief accepts that as the cost of a plain count and leaves
  it for you to overrule. Design repeats it as an open item. Keep it as is?

## 5 · Design's READINESS, answered

| Item | Answer |
|---|---|
| Hugh 1 (mixed pair in To buy) | H1 |
| Hugh 2 (`free` as a word) | Consistent with ruling 4 ("marked free"). No question needed |
| Hugh 3 (no search) | Design's call under §4.3. Accepted |
| Hugh 4 (known bias) | H2 |
| Eng 1 (joined plate) | Accepted, with F6 for the switch |
| Eng 2 (`ModalChrome` 700) | Accepted; the width exists |
| Eng 3–4 (draft entry, trade) | F1, F2 |
| Eng 5 (back in the pool) | F3 |
| Eng 6 (availability) | F8 |
| Eng 7 (`DECK_MIX_KEY`) | F5 |
| Eng 8 (mana value) | F7 |
| Eng 9 (Show more, pair names, pair price) | Accepted |

---

# Addendum: the half-trade (2026-09-25)

**Audited:** 2026-09-25, against `origin/main` at `402faef3`. Every file:line below was read on that commit.
**Package:** `addendum-half-trade/`, committed as delivered and added to this folder. Nothing in R3 changed. The
four frame files are R3's copies with the new states added: the sheet gains three (`confirmHalfTrade`,
`halfTradeFailed`, `pairHalf`), and the two deck pages and the review page one each. `support.js` is
byte-identical to R3's.
**The case:** a partner pair where one incoming half is already in the 98 and both old halves leave. Three cards
move: that half leaves the 98 for the command zone, one old commander takes its slot, and the other leaves the
deck. The build holds it back today, in the loader and in the write (`offerable`,
`src/lib/commander-change/pending.ts:71`, called at `candidates.ts:225` and `write.ts:90`), because
`confirm.trade` ("The two trade places") would be false for it.

## Hugh's rulings (2026-09-25)

Hugh approved this audit on 2026-09-25, through the-99-d9.

- **A-H1: ask, as drawn.** The confirm asks "Which one stays in the 98?", defaulting to the first commander.
  The sentence rewrites when the choice flips.
- **Copy (`/copy-review`): one tightening.** `landsHalfTrade` becomes "Lands in your pending changes, not yet a
  version. Discard undoes the whole swap." Every other half-trade string ships as drawn.

## Verdict: Green

Build it, with the engineering corrections below. Every state the case reaches is drawn or is a shipped string in
a shipped slot, at 390 and 1300. The outcome it draws is the one the shipped draft model already produces, apart
from the one choice the write has to learn (A2). There is one question for Hugh (A-H1), and it does not hold the
verdict: both answers are drawn.

## 1 · Drawn, and what it draws

Rendered from the canvas and read at both widths.

| # | State | 1300 | 390 | Reading |
|---|---|---|---|---|
| 28 | List: the pair offered | 2a | shipped row | The row is the shipped pair row. The half carries the shipped `in this deck · trades places`. It sorts into `Yours` by the shipped `isYours` (every half owned or in the 99). No new structure, so 390 is the shipped row |
| 29 | Confirm | 1a | 1b | The out label is `Leave the command zone`. Each card has a fate line (`into the 98`, `leaves the deck`, `free`, `from the 98`). An incoming card still to buy shows the shipped buy tag there instead of a word (README, Copy). Then `Which one stays in the 98?`, a radiogroup defaulting to the commander column, then the sentence and `landsHalfTrade`. At 390 the options are full width, 44px tall |
| 30 | Confirm, other choice | 1a / 1b | 1a / 1b | Pressing Tymna swaps the two fate lines and the sentence. Nothing else moves |
| 31 | Confirm, failed | shipped placement | 1c | The shipped `failedPair`, below the buttons. The choice is kept |
| 32 | Confirm on a brew | shipped | shipped | The shipped `brew` line replaces `landsHalfTrade` (`change-commander-sheet.tsx`, the `lands` ternary) |
| 33 | Deck page after | 3a | 3b | The pair's ⇄ line, then `+ Thrasios · from the command zone` and `− Reyhan · to the command zone`. That is +1 / −1 at 98 / 98. Tymna gets no card line |
| 34 | Review | 4a | 4b | `was` / `now` rows, the note `noteHalfTrade`, breaking at the middot at 390. The heading reads 3 changes: the commander plus the two card lines. The footer reads 1 back in the pool |
| 35 | Discard | shipped | shipped | The shipped `commanderBackPair` in the shipped slot |

## 2 · Against the code

What already holds, with no change needed:

| Drawn | Shipped | Where |
|---|---|---|
| The trade's two card lines and their hints | `commanderZoneHint`: an added old commander reads `from`, and a removed new one reads `to` | `change-commander-banner.tsx:93-98` |
| No card line for the released half | It is never a `deck_cards` row, so neither diff draws it | `draft-state.ts` (the diff is over the body alone) |
| 1 back in the pool | `releasedCopies`: the cut (Reyhan, 1) plus a departing commander not added back (Tymna, 1), minus a new half arriving from the body (Reyhan, 1) = 1 | `draft-shape.ts:152-165` |
| The arriving half buys nothing | `heldIds` counts a new half the version's 99 holds as held | `draft-rows.ts` |
| Discard puts all three back | The discard restores the version's body and its commander columns | `versions.ts` (discard) |
| The heading's 3 | `changeCount`: 1 for the commander, plus the adds and removes | `draft-shape.ts` |

## 3 · Findings

All findings are engineering's. There are no Design findings.

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| A1 | Medium | `pending.ts:71`; `candidates.ts:225`; `write.ts:90` | **`offerable` cannot tell this case from the one still held back.** It sees only the candidate's ids, so it cannot tell a half-trade (both old halves depart) from the kept-half case (README eng 5, not drawn: one new half is a current half). **Correction:** the rule reads the current pair too. A single is always offered. A pair is offered when no arriving half is in the body, or when exactly one is and both old halves depart. Held back: an arriving half from the body next to a kept half, and two arriving halves from the body. Both the loader and the write apply the one rule. The three comments that state the old hold-back as fact change with it: `offerable`'s docstring (`pending.ts:64-70`), the write's (`write.ts:88`), and the copy file's note that a pair never trades (`change-commander.ts:89-90`) | eng |
| A2 | Medium | `write.ts:97-108` | **The write gives the freed slot to `departing[0]`.** That is the commander column, whatever the reader chose. **Correction:** `changeCommander(deckId, to, staysOracleId?)`, validated as a uuid at the action (`actions.ts`, like the pair ids). The write requires it exactly in the half-trade, refuses a value that is not a departing half, and gives the slot to it. Anywhere else, a value is refused rather than ignored, so a stale sheet cannot write a choice nobody made | eng |
| A3 | Medium | `change-commander-sheet.tsx:38-40`, the confirm's `trade` branch | **The confirm has no half-trade branch.** `isTrade` is true for any half in the deck, so this pair would take `confirm.trade`, the false sentence. **Correction:** a half-trade branch with its own out label (`outHalfTrade`). It keeps the pair's `→` and `Lead the deck` (`inPair`), not the trade's `⇄` and `tradeIn`, which `change-commander-sheet.tsx:605-614` picks on `trade`. Then the fate lines, with the shipped buy tag for an incoming card still to buy, the radiogroup (a real `radiogroup` labelled by its question, arrow keys, the handoff's 34px and 44px options) and `halfTrade`, and `landsHalfTrade` or `brew` below it. The choice is held with the chosen candidate, so Back and Choose again keep it | eng |
| A4 | Low | `change-commander-review.tsx:51-59` | **The review note's trade test picks `noteTrade`** for any add that was a commander. **Correction:** `noteHalfTrade` when both hold: a new half arrives from the body AND an old half is released (departs and is not added back). An ordinary pair swap, where both old halves are released and nothing comes from the body, keeps `notePoolPair`. It breaks at the middot at 390, so the two clauses are two spans, not one string with a line break | eng |
| A5 | Low | `candidates.test.ts` (`offerable`); `probe-change-commander-write.ts` (the pair section) | **The held-back tests become the half-trade's tests.** The write probe's `pair refused: a half from the 98` becomes a half-trade accepted with each choice (the slot goes to the chosen half, and the other leaves). It gains the two cases still refused, and a refused stray `staysOracleId`. The browser probe presses the choice at both widths and reads the write back | eng |
| A6 | Low | the canvas | **Four states have a frame at one width or none** (28 at 390, 31 at 1300, 32, 35). Each is a shipped structure or a shipped string in a shipped slot, so the build draws them from R3, and the contact sheet photographs them. Not a Design round-trip | eng |
| A7 | Low | the addendum's copy block | **The copy goes to `/copy-review`:** `outHalfTrade`, `staysQuestion`, `cardStays`, `cardReleased`, `cardFromBody`, `halfTrade`, `landsHalfTrade` and `noteHalfTrade`. `cardFree` reuses `sheet.free` rather than adding a key | `/copy-review` |

## 4 · For Hugh

- **A-H1: ask which one stays, or rule it?** When a pair swaps in a card from your 98 and both of your current
  commanders leave the command zone, one of them takes that card's slot in the 98 and the other leaves the deck.
  Design drew a question on the confirm, "Which one stays in the 98?", defaulting to your first commander.
  The alternative is a fixed rule: your first commander always stays, and the question is not shown. Both are
  drawn. Design recommends asking, because a reader is unlikely to know which one the app would keep. Staging
  indexes one usable pair today, so the case is rare either way.

## 5 · Design's README, answered

| Item | Answer |
|---|---|
| Eng 1 (`offerable`) | A1 |
| Eng 2 (`staysOracleId`) | A2 |
| Eng 3 (`noteHalfTrade`) | A4 |
| Eng 4 (draft rows: buys nothing, 1 back in the pool) | Holds on `main` (§2). No change needed |
| Eng 5 (the kept-half case, still held back) | Kept held back in A1's rule, and tested (A5) |
| For Hugh (ask or rule) | A-H1 |
| Copy | A7 |
