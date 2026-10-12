# Find a deck for it, with a read

Design brief, 2026-10-11. Asks for a Design round on a model-written read inside the "Find a deck for it" picker:
on a press, the picker names the few decks a card actually serves, each with one sentence on how it supports that
deck's plan and a suggested cut. Hugh closed the direction on 2026-10-11. Nothing is built. This brief says what
the picker does today and why it does not help, what Hugh ruled, what was measured on his staging decks, what
engineering has locked, and what Design owns.

## The problem, on Hugh's decks

The picker (`FitsPicker`, `src/components/cards/fits-picker.tsx`, opened from card details at
`src/components/cards/card-detail-provider.tsx:968` and `:1448`) reads `loadFits`
(`src/lib/swaps/fits.ts:150`, through `loadFitsAction`, `src/lib/swaps/actions.ts:72`) and orders the decks with
`shapeFits` (`fits.ts:86`): a combo the card completes, then the theme it joins with the most cards in the deck, then
the commander's synergy figure, then the name. Each row draws one reason line, `{reason} · this deck {need}`
(`src/lib/copy/swap-tools.ts`, `fits.reasonTheme`, `fits.need`), under the group head "could take it"
(`groupJoin`, `:243`) and the order note "combos first, then themes" (`orderReasons`, `:262`).

**Ajani Unrelenting**, measured by running `loadFits` itself against staging for Hugh's account, 2026-10-11. It is
mono-red, so 11 of his 21 decks can take it, 10 are ruled out by colors, none holds it. All 11 arrive with a
reason, and none of those reasons is a combo:

| Deck | Commander | Reason line | Need |
| --- | --- | --- | --- |
| HD Tune - Prismari Artistry | Rootha, Mastering the Moment | Joins 19 other token cards | draw 10 of 11 |
| HD - Avatar Aang | Avatar Aang | Joins 15 other card-draw cards | draw 13 of 10 |
| HD - Omnath | Omnath, Locus of Creation | Joins 15 other card-draw cards | draw 9 of 7 |
| HD -Thorin | Thorin Oakenshield | Joins 15 other token cards | draw 10 of 8 |
| HD - Tovolar | Tovolar, Dire Overlord | Joins 14 other pump cards | draw 4 of 5 |
| HD - Gods | Kratos + Atreus | Joins 13 other card-draw cards | draw 12 of 8 |
| HD Tune - Scrappy Survivors | Dogmeat, Ever Loyal | Joins 11 other card-draw cards | draw 9 of 8 |
| HD - Kratos | Kratos, God of War | Joins 10 other token cards | draw 2 of 5 |
| HD Tune - Counter Intelligence | Kilo, Apogee Mind | Joins 9 other card-draw cards | draw 9 of 9 |
| HD - Goblins | Krenko, Mob Boss | Joins 8 other haste cards | draw 1 of 4 |
| HD - Gishath | Gishath, Sun's Avatar | Joins 7 other token cards | draw 5 of 6 |

Every line is true and none answers the question. The card makes a token on every loyalty activation, and its
minus two draws a card per creature: that is a reason for Goblins (Krenko's token count) and Kratos (draw 2 of 5) to
want it, and the list puts them tenth and eighth, behind decks that already run more draw than their target. The
theme count measures how much of a theme the deck HAS, not whether this card helps it.

The niche cards in his collection, which are what Hugh asked about, fare worse. Same measurement:

| Card | Decks listed | Reason lines |
| --- | --- | --- |
| Kavaron Skywarden (R) | 11 | 11 × the same theme, `counters` |
| Goldfury Strider (R) | 11 | 10 × `pump`, 1 × none |
| Lavamancer's Skill (R) | 11 | 11 × none |
| Cephalid Sage (U) | 10 | 10 × `draw` |
| Daru Stinger (W) | 10 | 1 × `Soldier`, 9 × `counters` |
| Cryotheory Adept (U) | 10 | 2 × `Wizard`, 2 × `Human`, 6 × none |
| Airtight Alibi (G) | 8 | 8 × `protection` |
| Mind Swords (B) | 6 | 6 × none |

When ten rows carry the same reason, the order between them is the synergy figure, which is never drawn (Q2) and,
for these cards, is null: `commander_support_cards` holds no row for Ajani Unrelenting under any of the eleven
commanders (it has 36 rows, all for commanders Hugh does not play).

## Ruling 2026-10-11 (Hugh, closed)

> "I want to know specifically how a given card can support a deck's plan/theme. This would be incredibly helpful
> information, especially for some of my niche cards."

Add a model call. Not reopened here.

## Orchestrator defaults (decided as Hugh's proxy, 2026-10-11)

Locked for this round. **Override if Hugh disagrees**: each is a default the orchestrator chose, not a ruling of
Hugh's.

1. **On demand.** Opening the picker stays free and instant and shows today's list. A press inside it starts the
   read. Placeholder label `Which deck needs it most?`, owed to /copy-review.
2. **Candidates.** Every deck of the reader's, brews and drafts included, where the card is legal (commander-legal
   and inside the deck's color identity) and that neither holds it nor is led by it: exactly `loadFits`'s `open`
   set (`fits.ts`, the `open` filter after the deck read).
3. **Inputs per candidate**, all already stored (verified in `src/db/schema.ts`):
   - the card: name, type line, oracle text (`cards`, `schema.ts:45`, `typeLine` and `oracleText` at `:52-53`), its
     roles and themes (`card_labels.labels`, `schema.ts:2619`);
   - the deck's commander or pair, with their oracle text (`decks`, `schema.ts:469`, joined to `cards`);
   - the deck's plan: its stored Overview (`deck_synopses.content`, `schema.ts:2389`, the `overview` prose and the
     primer's `strategy`, `src/lib/synopsis/types.ts` `CheckedSynopsis`), else the commander and the deck's top
     themes (see Finding 1 below on how often each applies);
   - how often decks with that commander play the card (`commander_support_cards.inclusion`, `schema.ts:1416`;
     `commander_pair_support_cards` for a pair), when the index holds a row;
   - the deck's need in the card's role (`shapeFits`'s `need`, from the recommended mix);
   - the deck's list (`deck_cards`, `schema.ts:619`, with each card's name and type line), which the sentence and the
     cut cite.

   **No player-typed text reaches this prompt**, so `playerText` is not needed: every input above is catalog data,
   index data or model output the app already validated. A deck's NAME is player-typed, so the prompt never carries
   it; decks go in as keys (`D1`, `D2`...), Help me choose's rule (F5, `src/lib/intake/the-read.ts`), and the app
   draws the names. Deck notes and Suggested changes' intent are not inputs. Adding either later puts the read
   under the `playerText` rule.
4. **Output.** The top three to five decks, each with ONE sentence on specifically how the card serves that deck's
   plan or theme, naming the deck's own cards or plan, plus a suggested cut from that deck. A deck where the card
   does not fit is not listed. When none fits, the read says so plainly.
5. **Cost.** One model call per press (a second step only if the eval shows a need). It spends one credit, like
   Suggested changes, and refunds on a failure or on a valid but empty result, the refund-floor precedent
   (`src/lib/tuning/refund.ts`, #1474). The result is cached on the card plus each candidate deck's current list,
   so reopening is free until a deck changes.
6. **Model by eval** (Sonnet 5.5 at effort medium against Haiku 5.5), on a corpus with Hugh's niche cards. Below.
7. **The free list stays as it is.** Clarifying the need line is out of scope unless Design needs it (Open
   question 6).
8. **Switch** `FIND_A_DECK_READ_ENABLED`, server-side, off by default. The About entry is gated on it, with no
   `ABOUT_VERSION` bump: a switched entry is seen by id (`src/lib/about/visible.ts`).

## What was measured

Staging, read-only, Hugh's account, 2026-10-11.

**Decks.** 21 decks, 23 committed versions. Every deck is full: 99 cards, or 98 under the one pair (Gods). Each
list holds 65 to 94 distinct cards, the rest stacked basics. So a suggested cut is always needed; no deck has room.

**Finding 1: most decks have no v2 plan.** The newest passing Overview per deck:

| Overview | Decks | Of Ajani's 11 candidates |
| --- | --- | --- |
| Contract 12 (v2 with benchmarks) | 4: Avatar Aang, Gishath, Soldiers, Wizards | 2 |
| Contract 7 (the older method) | 8 | 6 |
| None written | 9 | 3 |

A plan read only from contracts 11 and 12 reaches 4 of 21 decks. Engineering's default therefore reads the newest
passing Overview of ANY contract as the plan text, and falls back to the commander and top themes only for the 9
with none. **Override if Hugh disagrees.** This is a widening of default 3, which named contracts 11 and 12.

**Finding 2: the inclusion figure is mostly absent for exactly the cards this is for.** Ajani Unrelenting has no
`commander_support_cards` row under any of the 11 candidates' commanders. A niche card is, by definition, one the
index rarely records. The input stays (it is free and true when present), but the read cannot lean on it: the
sentence has to come from the card's text against the deck's plan and list.

**Finding 3: "current version" means the current LIST.** A deck is edited as a draft, and the draft moves without
a new version (21 decks, 23 versions). The cache key is each candidate's `listFingerprint`
(`src/lib/profile/fingerprint.ts:53`), the key the Overview already reuses on, plus the card's oracle id and the
id of the Overview the plan was read from.

**Token counts.** Each candidate deck rendered as a prompt block (commander and its text, the plan or a themes line,
the inclusion and need lines, and the list as `C1 Name (Type line)`), counted with the Messages API's token count
on `claude-sonnet-5-5` and `claude-haiku-5-5` (identical counts on both):

- The card block (Ajani Unrelenting with its roles): **162** tokens.
- A deck block: **1,523 to 2,691**, mean **2,107** over all 21. The list is most of it.
- Ajani's 11 candidates: **25,069** together. All 21 decks: **44,238**.
- The system prompt and output schema do not exist yet, so they are an ALLOWANCE, not a measurement: **1,500**
  tokens. At 3,000 it would move the Sonnet figure by $0.003. The eval replaces it with the counted prompt.
- Output: five decks at about 80 tokens each (keys, one sentence, a cut) is about **400**; effort medium may think
  first, so the reservation is priced at a **4,000** ceiling.

**Cost per press**, from `src/lib/model/prices.ts` `RATES` (dollars per million tokens: Sonnet 5.5 $2 in / $10
out; Haiku 5.5 $0.10 / $0.50 up to 100K prompt tokens):

| Case | Input tokens | Sonnet 5.5 | Haiku 5.5 |
| --- | --- | --- | --- |
| Ajani, 11 candidates | 162 + 25,069 + 1,500 = 26,731 | 26,731 × $2/M = $0.053, + 400 to 4,000 out × $10/M = $0.004 to $0.040: **$0.057 to $0.093** | 26,731 × $0.10/M = $0.0027, + $0.0002 to $0.002: **$0.003 to $0.005** |
| Worst case: a colorless card, all 21 decks, every block at the measured maximum 2,691 | 162 + 56,511 + 1,500 = 58,173 | $0.116 + $0.040 = **$0.156** | $0.0058 + $0.002 = **$0.008** |

The worst case is under Haiku's 100K boundary. Either model fits one credit: Suggested changes' own reservation is
priced at a 12,000-token input ceiling on `claude-sonnet-5` (`FEATURE_CALLS.tuning`, `prices.ts:100`).

## Prior art in the app

- **Suggested changes and Proposed cuts: citations validated, never trusted.** `src/lib/tuning/validate.ts` runs
  six rules on every line and drops one that fails, with a named reason: the card exists, a CUT is in the deck and
  is not a commander, a Key card of its Overview or a staple cut without cause, an ADD is legal, evidence exists,
  and the presentation rules. `src/lib/tuning/cuts-validate.ts` is the cut half alone (`cardExists`, `notInDeck`,
  `keyCard`, `duplicate`, `citeMismatch`). The cut this read suggests passes the same rules, and honors the
  never-cut convention.
- **Help me choose: two calls, one credit, decks by key.** `src/lib/intake/the-read.ts`: a cheap shortlist
  (`READ_SHORTLIST_MODEL`, Haiku 5.5) then a judgement (`READ_JUDGE_MODEL`, Sonnet 5.5), one reservation priced by
  `steps`; decks shown as `D1`, `D2`, a token kept only for a deck the call was shown; a reason REFUSED, never cut,
  when over its length or carrying a digit or a score word; a read with no valid pick left finds nothing and
  refunds. Its UI is `src/components/intake/choose-results.tsx` and `read-as-bar.tsx`.
- **Refund floor.** `refundsCredit` (`src/lib/tuning/refund.ts`): the credit comes back when too few lines held up,
  and the panel says so.
- **The credit line.** `src/lib/copy/credits.ts`: one line beside every control that spends a credit, naming when
  the next credit returns.
- **Eval precedent.** `scripts/eval/cuts-model.mts` (dry by default, token counts free, a dollar cap, its own
  ledger) and `scripts/eval/cuts-blind.mts` (blind scoring).

## What engineering has locked

1. **Nothing the model returns is trusted.** A deck counts only as a key the call was shown, and only if it is a
   candidate. Every card the sentence names, and the cut, must resolve to a card IN that deck's list (by its `C`
   key, the app drawing the name), or to the commander. A named card outside the deck, a cut that is a commander,
   a Key card of the deck's Overview or a never-cut card, or a sentence over its length or carrying a digit, a
   percentage or a score word, drops that deck. Dropped decks are counted; the rest move up.
2. **A claim about the card is checked against its text.** A sentence crediting the card with a keyword its text
   and keywords lack drops the deck (the Overview's `keyword_not_on_card` rule, `src/lib/synopsis/types.ts`).
3. **Quotes are true quotes.** A phrase quoted from the deck's plan must occur in the stored Overview the call was
   shown (`quotesPlayerText`'s whole-word rule, `src/lib/tuning/quote-match.ts`).
4. **One credit, refunded on failure or an empty valid result.** A new `ModelFeature`
   (`src/lib/model/allowance-rule.ts:52`), its `FEATURE_CALLS` entry priced from the measured ceilings above, and
   the `model_calls_feature_check` constraint (`schema.ts:2112`) widened by migration.
5. **One run in flight per reader and card.** A double press gets the run in flight, never a second charge.
6. **Cached per card and per deck list** (Finding 3). A result is shown again for free while every listed deck's
   `listFingerprint` matches. When one deck has moved, the stored result is NOT shown as current; whether it is
   shown marked out of date or not at all is Design's (Open question 4).
7. **The free list is unchanged.** Opening the picker reads `loadFits` as today and spends nothing. The read is
   additive, behind `FIND_A_DECK_READ_ENABLED`; off, the picker is exactly today's.
8. **Fewer than five candidates still runs**; a single candidate still runs. No candidates (every deck holds it,
   or none can play it) draws no press: the picker's existing `allHold` and `noneByColors` states stand.
9. **Model chosen by eval** before the build is merged: Sonnet 5.5 at effort medium against Haiku 5.5, on a corpus
   of Ajani Unrelenting, the eight niche cards measured above, and **Hugh's 5 to 8 named niche cards (slot: Hugh
   to name them)**. Candidates from his staging collection, owned, in no deck, with an index row under few
   commanders: Kavaron Skywarden, Goldfury Strider, Lavamancer's Skill, Cryotheory Adept, Daru Stinger, Airtight
   Alibi, Infernal Caretaker, Emissary of Soulfire. Scored blind, per deck, on: names a real interaction with the
   deck's own cards or plan; every citation valid; leaves out the decks where it does not fit; the cut is
   defensible. A second step is added only if the one call fails on this corpus.

## What Design owns

1. **Where the press lives** in the picker, and what it says while the free list is on screen. The picker is
   being changed by a separate bug fix: on desktop it currently stacks a second modal over card details; the fix
   makes it swap in place inside card details. Draw for that, not the stack.
2. **The credit line** beside the press, from `src/lib/copy/credits.ts`, and the state where the reader has no
   credit left.
3. **The loading state.** A call over ~27K input tokens takes seconds, not a moment. What the reader sees, and
   whether the free list stays visible under it.
4. **The result rows.** Three to five decks, each with its name, the one sentence (with the deck's cards in it as
   card-open marks, as the Overview draws them), and the suggested cut. Whether the row keeps today's Add and Add
   to buy, and whether Add here becomes "swap in, cut X" (`takeStandInAction`, `src/lib/swaps/actions.ts:29`, is
   the swap that already exists).
5. **How the read sits against the free list**: replacing it, above it, or a second view of it.
6. **No fit.** The plain statement that none of the candidate decks is a real fit, with the credit refunded.
7. **Failure.** The read did not come back; the credit is refunded; the free list is still there.
8. **Fewer than asked**: two or one decks that held up, and the refund floor's "the credit came back" note when it
   applies.
9. **A stored read reopened**, and a stored read where a deck has changed since (lock 6).
10. **Phone at 390 and desktop at 900**, in the same round.
11. **The About entry**, on the per-entry artboard (`design/design_handoff_the99_about/`), gated on the switch.
    The shipped entry `fits-your-decks` (`src/lib/copy/about.ts:825`) describes the free list and stays.

## Open questions for Design

1. Does the read replace the free list, or sit above it with the free list one press away?
2. Is the press always visible, or only once the free list is long (Ajani lists 11; a card listing 2 may not need a
   read)?
3. Does a result row carry an action (Add, or swap in with the suggested cut), or is the read advice only and the
   action stays on the free rows?
4. A stored read where one deck has changed: shown with that deck marked out of date, or not shown until pressed
   again?
5. The suggested cut: a card-open mark inside the sentence, or its own line?
6. Does the read make the free row's need line (`draw 13 of 10`) worth clarifying, or removing? Out of scope unless
   Design needs it.

## Fixtures

Hugh's staging account (`user_3GkZrrTwOJBdqUpq6GambP0BC8w`; project `misty-rain-01681654`, branch
`br-polished-pond-a6e63y0b`), measured 2026-10-11:

- **Ajani Unrelenting** (R, Legendary Planeswalker), 11 candidates, every reason a theme, the table above. Its
  likely real fits are Goblins (Krenko, Mob Boss) and Kratos (draw 2 of 5).
- **Lavamancer's Skill** (R, Aura) and **Mind Swords** (B): 11 and 6 candidates, no reason on any row. The read's
  clearest win and its likeliest "none fits" result.
- **Kavaron Skywarden** (R): 11 candidates, the same theme on all 11.
- **Cryotheory Adept** (U, Human Wizard): 10 candidates, two of them `Wizard`, the plain right answer being HD -
  Wizards.
- **A deck with a v2 plan** (Avatar Aang, Gishath, Soldiers, Wizards), **one with an older Overview** (Omnath,
  Tovolar), and **one with none** (Prismari Artistry, Counter Intelligence), so each plan source is drawn.
