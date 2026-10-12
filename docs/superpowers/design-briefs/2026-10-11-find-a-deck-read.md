# Find a deck for it, with a read

Design brief, 2026-10-11. Asks for a Design round on a model-written read inside the "Find a deck for it" picker:
on a press, the picker names the few decks a card actually serves, each with one sentence on how it supports that
deck's plan and a suggested cut. Hugh closed the direction on 2026-10-11. Nothing is built. This brief says what
the picker does today and why it does not help, what Hugh ruled, what was measured on his staging decks, what
engineering has locked, and what Design owns.

## The problem, on Hugh's decks

The picker (`FitsPicker`, `src/components/cards/fits-picker.tsx`, opened from card details at
the door `fitsDoor`, `src/components/cards/card-detail-provider.tsx:969`, rendered at `:1448`) reads `loadFits`
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

Other niche cards from his collection fare worse. These eight were picked by this brief (owned, in no deck, with an
index row under few commanders), not by Hugh; his own eval cards are in "Hugh's eval cards" below. Same measurement:

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

1. **Add a model call.**
2. **The picker becomes a view inside the card-details dialog, at both widths** (Hugh's answer to the stacking
   question, relayed 2026-10-11; he had reported that "it shouldn't stack on desktop"). `← {card}` returns to the
   details. This reverses stacked-sheets call 7 (`design/design_handoff_the99_stacked_sheets/README.md:36`) for the
   Find a deck picker ONLY. Today the picker stacks at both widths by design: a second modal over Card Details,
   560 on desktop with a `← {card}` back pill, a sheet from 96px on the phone
   (`design/design_handoff_the99_swap_tools/README.md:24`), pinned by
   `src/components/cards/fits-picker.test.tsx:286`. No other stacked sheet is affected: the stand-ins sheet shares
   the picker's `overCard` path (`design/design_handoff_the99_stacked_sheets/READINESS.md` A8) and keeps the
   stacked geometry, and a card opened from the picker still stacks over it as before. Design draws the view as
   part of this handoff.

Neither is reopened here.

## Orchestrator defaults (decided as Hugh's proxy, 2026-10-11)

Locked for this round. **Override if Hugh disagrees**: each is a default the orchestrator chose, not a ruling of
Hugh's.

1. **On demand: a "look deeper" read on top of the instant list.** Opening the picker stays free and instant and
   shows today's list. A press inside it starts the read. Placeholder label `Which deck needs it most?`, owed to
   /copy-review. Hugh likes this shape (relayed 2026-10-11). **The read must add information the list does not
   have, not re-order it**: Help me choose's Look deeper is the cautionary precedent. Hugh found it added no
   value because it only re-ranked the same list, and it now refunds a read that adds nothing new
   (`src/lib/intake/deeper-read.ts`, #1283). What this read adds is the one thing no free figure carries: how the
   card serves each deck's plan, in that deck's own cards. Lock 10 makes that enforceable.
2. **Candidates.** Every deck of the reader's, brews and drafts included, where the card is legal (commander-legal
   and inside the deck's color identity) and that neither holds it nor is led by it. That is `loadFits`'s `open`
   set (`fits.ts:188`: no copies held, not led by it, inside the colors) PLUS the commander-legal check, which
   `open` does not make: today only the door does (`fitsDoor` draws no door for a card that is not
   commander-legal, `card-detail-provider.tsx:969`). The read's server action checks it itself.
3. **Inputs per candidate**, all already stored (verified in `src/db/schema.ts`):
   - the card: name, type line, oracle text (`cards`, `schema.ts:45`, `typeLine` and `oracleText` at `:52-53`), its
     roles and themes (`card_labels.labels`, `schema.ts:2619`);
   - the deck's commander or pair, with their oracle text (`decks`, `schema.ts:469`, joined to `cards`);
   - the deck's plan: its stored Overview v2 (contracts 11 and 12, `src/lib/synopsis/limits.ts`; read from
     `deck_synopses.content`, `schema.ts:2389`, the `overview` prose and the primer's `strategy`,
     `src/lib/synopsis/types.ts` `CheckedSynopsis`) when present, else the commander and the deck's top themes
     (Finding 1 below widens this);
   - how often decks with that commander play the card (`commander_support_cards.inclusion`, `schema.ts:1416`;
     `commander_pair_support_cards` for a pair), when the index holds a row;
   - the deck's need in the card's role (`shapeFits`'s `need`, from the recommended mix);
   - the deck's list (`deck_cards`, `schema.ts:619`, with each card's name and type line), which the sentence and the
     cut cite, and each listed card's label kinds (`card_labels.labels`): the facts a claim about a deck card is
     checked against (lock 2). The token counts below were taken without the labels; the eval counts them.

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
   (`src/lib/tuning/refund.ts`, #1474), adapted in lock 4. The result is cached on the card plus every candidate
   deck's current inputs, so reopening is free until one of them changes (lock 6).
6. **Model by eval** (Sonnet 5.5 at effort medium against Haiku 5.5), on a corpus with Hugh's niche cards. Below.
7. **The free list stays as it is.** Clarifying the need line is out of scope unless Design needs it (Open
   question 6).
8. **Switch** `FIND_A_DECK_READ_ENABLED`, server-side, off by default. The About entry is gated on it, with no
   `ABOUT_VERSION` bump: a switched entry is seen by id (`src/lib/about/visible.ts`).

## What was measured

Staging, read-only, Hugh's account, 2026-10-11.

**Decks.** 21 decks, 23 committed versions. Every deck is full: 99 cards, or 98 under the one pair (Gods). Each
list holds 65 to 94 distinct cards, the rest stacked basics. So a suggested cut is always needed; no deck has room.

**Finding 1: most decks have no v2 plan.** The newest passing Overview per deck, on 2026-10-11 (Hugh is running
the Overview on his other decks that night, so these counts will move; re-measure them before the eval):

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

**Finding 3: "current version" means the current INPUT, not a version id.** A deck is edited as a draft, and the
draft moves without a new version (21 decks, 23 versions). And the list is not the only thing that moves:
`listFingerprint` (`src/lib/profile/fingerprint.ts:53`) hashes commander and card ids and quantities, while a
card's oracle text, its labels, the inclusion figure, the need and a new Overview all change the prompt under the
same list. So the key is a hash over the complete rendered input, per candidate, the way
`commander_support.prose_input_hash` keys a commander's sentence (lock 6).

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
| A colorless card: all 21 decks (Tangle Wire and Mind's Eye, both Hugh's eval cards) | 162 + 44,238 + 1,500 = 45,900 | $0.092 + up to $0.040: **$0.096 to $0.132** | $0.0046 + up to $0.002: **$0.005 to $0.007** |
| Ceiling: all 21 decks, every block at the measured maximum 2,691 (room for the 9 decks without an Overview to gain one) | 162 + 56,511 + 1,500 = 58,173 | $0.116 + $0.040 = **$0.156** | $0.0058 + $0.002 = **$0.008** |

These are one attempt. The ceiling is under Haiku's 100K boundary.

**The reservation is twice that.** The model client may retry once, so the spend cap prices every reservation at
two attempts (`worstCaseMicroUsd`, `prices.ts:79`, the `2 *`). At the ceiling: Sonnet 5.5 2 × (58,173 × $2/M +
4,000 × $10/M) = **$0.313**; Haiku 5.5 2 × (58,173 × $0.10/M + 4,000 × $0.50/M) = **$0.016**. A credit is a unit,
not a dollar figure, but for scale: Suggested changes' reservation (`FEATURE_CALLS.tuning`, `prices.ts:111`:
12,000 input and 8,000 output tokens on `claude-sonnet-5`) is 2 × (12,000 × $2/M + 8,000 × $10/M) = $0.208. On
Sonnet this read's ceiling is half again that; on Haiku it is under a tenth of it.

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
   key, the app drawing the name), to the commander, or to the card itself (the read's subject, which no candidate
   holds by definition). A named card outside the deck, a cut that is a commander or the card itself,
   a Key card of the deck's Overview or a never-cut card, or a sentence over its length or carrying a digit, a
   percentage or a score word, drops that deck. Dropped decks are counted; the rest move up.
2. **A claim about any named card is checked against that card's facts.** The prompt carries the card's text and
   every deck card's labels (default 3). A sentence crediting the card, or a deck card it names, with a keyword or
   a job its text, keywords and labels lack drops the deck (the Overview's `keyword_not_on_card` rule,
   `src/lib/synopsis/types.ts`, extended to label kinds). This anchors a claim to real facts; it does not prove
   the interaction, which is why the eval scores truth per deck (lock 9).
3. **Quotes are true quotes.** A phrase quoted from the deck's plan must occur in the stored Overview the call was
   shown (`quotesPlayerText`'s whole-word rule, `src/lib/tuning/quote-match.ts`).
4. **One credit, refunded on failure, on no fit, and on a thin read.** Thin is the refund-floor rule adapted to
   this read's size: every deck the model returned dropped, or fewer than a third of them held up
   (`REFUND_BELOW_SHARE`, `src/lib/tuning/refund.ts`). Its `REFUND_BELOW_KEPT` floor of three does NOT apply: a
   card with one or two true fits (Molten Collapse has one candidate) is a complete answer, not a thin one. A
   refunded read still shows what held up, and says the credit came back (Design item 8). A new `ModelFeature`
   (`src/lib/model/allowance-rule.ts:52`), its `FEATURE_CALLS` entry priced from the measured ceilings above, and
   the `model_calls_feature_check` constraint (`schema.ts:2112`) widened by migration.
5. **One run in flight per reader and card.** A double press gets the run in flight, never a second charge.
6. **Cached per card and per candidate set** (Finding 3). A result is stored with the set of candidate deck ids it
   was run over and each candidate's input hash, and it is shown again for free only while the CURRENT candidate
   set is the same set with the same hashes. Every candidate counts, not only the decks the read listed: an
   omitted deck whose list changed may now fit, and a new or deleted eligible deck changes the set. Otherwise the
   stored result is NOT shown as current; whether it is shown marked out of date or not at all is Design's (Open
   question 4).
7. **The free list is unchanged.** Opening the picker reads `loadFits` as today and spends nothing. The read is
   additive, behind `FIND_A_DECK_READ_ENABLED`; off, the picker is exactly today's.
8. **Fewer than five candidates still runs**; a single candidate still runs. No candidates (every deck holds it,
   or none can play it) draws no press: the picker's existing `allHold` and `noneByColors` states stand.
9. **Model chosen by eval** before the build is merged: Sonnet 5.5 at effort medium against Haiku 5.5, on Hugh's
   eval cards (below, all eleven) and the eight niche
   cards measured above. Scored blind, per deck, on: names a real interaction with the deck's own cards or plan;
   every citation valid; leaves out the decks where it does not fit; the cut is defensible; and it says something
   the free row does not (lock 10). A second step is added only if the one call fails on this corpus. The eval
   follows `scripts/eval/cuts-model.mts`: dry by default, token counts free, a dollar cap and its own ledger.
10. **The read adds, never only re-ranks** (default 1). Every deck the read lists carries its sentence, and the
   sentence must cite at least one card in that deck (by key) or quote the deck's stored plan; a sentence citing
   neither drops the deck. A read whose every deck drops finds nothing and refunds. A read never returns an order
   alone.

## Hugh's eval cards (named 2026-10-11)

Checked on staging, read-only, against `cards.name` and his collection; he owns every one. Two were named by a
printing rather than the card: **"Future Insight" is Future Sight** (Hugh, 2026-10-11; he owns a Secret Lair
printing), and **"Feral Felix" is Barrowgoyf**, under the Secret Lair flavor name `Feral Felix` (`printings`,
set `sld`, `flavor_name`; verified on staging).

The "before" fixture is the current picker on his decks (`loadFits`, his account, 2026-10-11): its counts and its
first three rows as the reason line draws them.

| Card | Owned | Can take it | Holds / ruled out | Reasons across the list | First three rows today |
| --- | --- | --- | --- | --- | --- |
| Ajani Unrelenting (R planeswalker) | 1 | 11 | 0 / 10 | 5 × card-draw, 4 × token, 1 × pump, 1 × haste | Prismari Artistry: Joins 19 other token cards · this deck draw 10 of 11; Avatar Aang: Joins 15 other card-draw cards · draw 13 of 10; Omnath: Joins 15 other card-draw cards · draw 9 of 7 |
| Maddening Cacophony (U sorcery) | 1 | 10 | 0 / 11 | 1 × combo, 5 × mill, 4 × none | Mutant Menace: Completes a combo with Fraying Sanity; Sultai Arisen: Joins 8 other mill cards; Wizards: Joins 2 other mill cards |
| Maddening Hex (R curse) | 1 | 11 | 0 / 10 | 11 × none | Avatar Aang, Gishath, Goblins: no reason line at all |
| Mind's Eye (colorless artifact) | 1 | 21 | 0 / 0 | 21 × card-draw | Wizards: Joins 24 other card-draw cards · draw 19 of 12; Eldrazi: Joins 16 other card-draw cards · draw 3 of 10; Avatar Aang: Joins 15 other card-draw cards · draw 13 of 10 |
| Molten Collapse (BR sorcery) | 1 | 1 | 0 / 20 | 1 × none | Avatar Aang: no reason · this deck removal 2 of 3 |
| Throes of Chaos (R sorcery) | 2 | 10 | 1 / 10 | 10 × none | Avatar Aang, Gishath, Goblins: no reason line |
| Time Stretch (U sorcery) | 1 | 10 | 0 / 11 | 10 × none | Yuriko, Avatar Aang, Brago: no reason line |
| Tangle Wire (colorless artifact) | 1 | 21 | 0 / 0 | 21 × none | Avatar Aang, Brago, Eldrazi: no reason line (alphabetical) |
| Kwia Vigorbloom (GW creature) | 1 | 4 | 0 / 17 | 3 × token, 1 × protection | Omnath: Joins 15 other token cards · ramp 20 of 9; Scrappy Survivors: Joins 10 other protection cards · ramp 5 of 6; Gishath: Joins 7 other token cards · ramp 11 of 9 |
| Future Sight (U enchantment; named as "Future Insight") | 1 | 10 | 0 / 11 | 10 × none | Avatar Aang, Brago, Gods: no reason line |
| Barrowgoyf (B creature; Secret Lair "Feral Felix") | 1 | 6 | 0 / 15 | 3 × mill, 3 × none | Mutant Menace: Joins 11 other mill cards; Sultai Arisen: Joins 8 other mill cards; Yuriko: Joins 1 other mill card |

What it shows: six of the eleven draw no reason on any row (Future Sight, Maddening Hex, Molten Collapse, Throes of Chaos, Time
Stretch, Tangle Wire), and Mind's Eye draws the same reason on all 21. Tangle Wire and Mind's Eye are colorless,
so they are the 21-deck cost case measured above. Molten Collapse (one candidate) and Kwia Vigorbloom (four) test
the read's short end, and Maddening Cacophony is the one card where today's list already has a combo to beat.

## What Design owns

1. **The picker as a view inside card details** (ruling 2), at 900 and 390: how the details give way to it, the
   `← {card}` return, and the free list in it. Then where the press lives in that view, and what it says while
   the free list is on screen. The read draws inside this view.
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
8. **Fewer than asked**: two or one decks that held up. A short read that is complete (a card with one or two
   real fits) spends the credit; a thin one (lock 4) shows what held up with the "the credit came back" note.
9. **A stored read reopened**, and a stored read where a deck has changed since (lock 6).
10. **Phone at 390 and desktop at 900**, in the same round.
11. **The About entry**, on the per-entry artboard (`design/design_handoff_the99_about/`), gated on the switch.
    The shipped entry `fits-your-decks` (`src/lib/copy/about.ts:825`) describes the free list and stays.
12. **A result row whose deck has no Overview, or only an old one** (Open question 8). Hugh asked for this to go
   to Design (2026-10-11): on his decks today, only 4 of 21 have a v2 Overview, 8 an older one and 9 none
   (Finding 1). For those decks the read leans on the commander and the deck's top themes, not the deck's own plan.
   Draw such a row, and draw the answer to Open question 8.

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
7. *(Closed 2026-10-11: whether the picker stacks on desktop. Hugh chose a view inside card details at both
   widths; see ruling 2.)*
8. **A deck with no Overview, or only an old one.** How does its result row read, given the sentence comes from
   the commander and themes rather than a written plan: the same as a row with a v2 Overview, or saying what it
   was based on? And does the picker offer a way to run the Overview for that deck (a credit of its own, today run from
   the deck page, `src/components/decks/synopsis-overview.tsx`), or only point there?

## Fixtures

Hugh's staging account (`user_3GkZrrTwOJBdqUpq6GambP0BC8w`; project `misty-rain-01681654`, branch
`br-polished-pond-a6e63y0b`), measured 2026-10-11:

- **Ajani Unrelenting** (R, Legendary Planeswalker), 11 candidates, every reason a theme, the table above. Its
  likely real fits are Goblins (Krenko, Mob Boss) and Kratos (draw 2 of 5).
- **Tangle Wire** and **Maddening Hex**: 21 and 11 candidates, no reason on any row. The read's clearest win, and
  its likeliest "none fits" result.
- **Mind's Eye**: 21 candidates, the same reason on all 21; the longest list Design has to draw the press over.
- **Molten Collapse**: one candidate. **Kwia Vigorbloom**: four. The short end.
- **Maddening Cacophony**: the one list with a combo row today.
- **A deck with a v2 plan** (Avatar Aang, Gishath, Soldiers, Wizards), **one with an older Overview** (Omnath,
  Tovolar), and **one with none** (Prismari Artistry, Counter Intelligence), so each plan source is drawn.
