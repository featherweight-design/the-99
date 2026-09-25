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
  measured, not asserted (F10).
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
| F9 | Low | `change-commander - copy strings.ts` | **The copy goes to `/copy-review`**, as Design lists it, including `manaValueRel` | `/copy-review` |
| F10 | Medium | brief §6 (known bias); Hugh's H2 | **The figure needs an inclusion threshold.** Today's rule counts a card toward "N of M" whenever the candidate's support list holds it at all, which favors commanders with long lists. **Correction, for the build plan to resolve:** count a card only when its inclusion for that candidate is at least a threshold share. Measure the threshold on `staging` during the plan (never assert it), and take it to Hugh with its distribution. If the row's wording has to follow the new meaning, that is a copy change for `/copy-review`, with a picture, and not a Design round | eng |

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
