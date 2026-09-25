# Model and prompt evaluation: deck tuning and the deck overview

Sub-project 10 (the eval-harness lane). The plan is `docs/superpowers/plans/2026-09-23-eval-harness.md`.

Everything below was measured against Hugh's 19 staging decks, read-only:
- 4 development decks and 15 held-out decks, from a seeded split (seed 20260923), with 3 trials per deck;
- plus a synthetic overlay of games and notes on 6 held-out decks. It is never shown to Hugh as his own.

Costs are at real-time prices per answer, with the app's one retry included, unless a line says otherwise. The per-run tables are `metrics-tuning.md`, `metrics-synopsis.md` and `metrics-overview-contracts.md`.

## Recommendation

| feature | model and prompt | held-out result | $/accepted |
|---|---|---|---|
| Tuning | **Sonnet 5 at `effort: "medium"` on the strategy prompt with the rationale rules**: sonnet-low failed Hugh's blind reads in rounds 1 and 3; this passed round 4, 7–0, against S-default | 8 of 8 answered, 4.00 kept per answer, ~48s | $0.0489 per answer |
| Overview | Sonnet 5 at `effort: "low"`, the shipped v6 prompt plus the Mulligan budget's second version, with the app's repair | all four sections: 100%, 12% of Mulligan lines dropped (v6: 17%), universal staples 0, 75% specific Mulligan lines | $0.044 (S: $6.13) |

The overview contract (A+B) was Hugh's ruling. The first Mulligan budget went to the synopsis lane as #934 and was held when its pre-open pass found it dropping lines; the second version replaces it. Hugh's absolute read of the overview (round 2) is below: Yes 6, Close 8, No 1.

## Tuning

S is Sonnet 5 on the shipped prompt, sent with an 8,000 ceiling. Shipped Sonnet at 3,000 truncated
and malformed on 13% of held-out answers and 56% of overlay answers, which is why S was re-based.

- **Eligible:** only `sonnet-low@max3000`. It is cheaper, and every gate passes.
- **Haiku + `cite-rules`:** survived 100%, kept 3.78, $0.0071. It fails one gate: names outside
  the deck at 7% against S's 0% (the gate is S + 5). No Haiku blind round was run.
- **Plain Haiku:** fails both the overlay gate and the names-outside gate.

### Hugh's blind read, round 1

Sonnet-low against S on the 15 held-out decks, blind, with sides shuffled per deck and each
decklist one click away. **Hugh preferred S on 9 decks, sonnet-low on 5, and called 1 even
(Yuriko).** The pre-registered pass needs S preferred on no more than 5 of 15, and on no more than
3 more decks than the candidate. **Sonnet-low fails, so S stays for tuning**: $0.0425 per accepted
answer against $0.0169.

His notes, verbatim:

- **HD - Kratos:** "I don't know this deck as well because it's in a draft state, but I like the formatting of A better overall. Answer B has redundancies in it that are represented in the chips below."
- **HD - Avatar Aang:** "B is slightly better because the cards it recommends for removal are less important to the deck than the ones removes in A. Hermitic Herbalist is one of my best ramp cards, so I would not remove it. However, both answers have the same failure in that they target filling the removal gap. I'm only lacking one removal slot, not two. It's good to have options, but just calling out that if I accepted both, my removal would be 4 of 3."
- **HD - Gods:** "Swiftfoot Boots is a good recommendation from both, but B wins because it has a genuinely good mix of recommendations to consider."
- **HD - Wizards:** "Both are good, but I appreciate that B puts an Island removal on the table."
- **HD Tune - Counter Intelligence:** "Gives me two distinct way to address the draw gap by addressing over reliance on ramp or removal."
- **HD - Yuriko:** "This one is a bit of a wash, but is actually most telling about the model's reasoning being off with recommendations. Lotus Petal is one of my most expensive and valuable cards, it will never be removed. Ornithopter is also one of the most valuable cards in this deck, specifically because I can play it for free. It enables my commander to come in consistently and then I can replay it for free immediately afterwards.  This one is the most telling that suggestions should consider the strategy of the deck, not just if we're meeting specific category benchmarks."
- **HD - Tovolar:** "This is a great one that shows how the game notes really tuned the responses. Awesome to see."

Each note checked against the data:

1. **Game notes help** (Tovolar). Only one held-out deck has real logged games (Tovolar, 2 games).
   He picked S there, and both answers cited them. With one deck the data can neither confirm nor
   refute this. On the automatics, the synthetic evidence did not raise kept counts. The overlay
   was never shown to him.
2. **Cuts blind to the strategy** (Yuriko, Avatar Aang). Confirmed. Both Yuriko answers cut
   Lotus Petal, and sonnet-low also cut Ornithopter. The tuning prompt carries no statement of the
   deck's strategy, and no staging deck has a stated intent.
3. **More suggestions read better.** Strongly confirmed. On the 14 decided decks, the side he
   picked showed more kept suggestions on 10, fewer on 1, and the same number on 3. S showed 41
   suggestions across the round against sonnet-low's 36.
4. **Suggestions beyond the role thresholds read better.** Each shown suggestion was tagged by
   its citations: only a role count against its target is "threshold"; a decklist, game or note
   citation is "other". Sonnet-low wrote far more "other" suggestions (16 of 36, against 6 of 41).
   On 4 of its 5 wins, its side carried the higher "other" share. Overall the effect is weaker
   than volume: 5 decided decks go with it, 4 against, 5 tied.

Also, from the Avatar Aang note: 7 of the 30 shown answers fill a one-slot gap twice (S 4,
sonnet-low 3).

**For the tuning lane** (their change, not made here):
- give the prompt the deck's strategy, from the stored overview or the player's intent, and name
  the cards it depends on as not to be cut;
- size each suggestion group to its gap;
- prefer suggestions grounded in the decklist over pure role-count swaps.

Sonnet-low on such a prompt, asked for 4 to 5 suggestions, is the untested path to S's quality at
40% of its cost.

### The strategy variant, re-tested (round 3)

Hugh approved a re-test on a prompt built from his round 1 notes (the `strategy` variant, a
harness-side transform of the real builder's output). The model is given the deck's own stored
overview (its strategy steps, and its Key cards to be left in), and is told:
- make 4 to 5 suggestions, sized to each gap;
- prefer swaps grounded in the decklist over pure role-count swaps;
- never cut a universal staple just to fix a count.

It cost $1.41. The held-out run used one trial per deck rather than three, because at 4 to 5
suggestions S costs more per answer and three trials would have passed Hugh's "about $2".

Held-out, trial 0, over the suggestions that survived checking (`pnpm eval:tuning-strategy`). A
role count is read from each suggestion's own `mix` citations, whether or not they are written
with a colon (`draw 4 of 10` or `draw: 4 of 10`):

| cell / prompt | kept per answer | answers filling a one-slot gap twice | threshold-only share | Key-card cuts | universal-staple cuts | $/answer |
|---|---|---|---|---|---|---|
| S / base | 2.73 | 4 | 85% | 0 | 0 | $0.051 |
| S / strategy | 3.07 | 1 | 41% | 0 | 0 | $0.083 |
| sonnet-low / base | 2.40 | 3 | 56% | 0 | 0 | $0.016 |
| sonnet-low / strategy | 3.20 | 5 | 63% | 0 | 0 | $0.020 |

- **S on the new prompt** moves clearly toward Hugh's notes. It is more grounded, keeps more
  suggestions and fills a one-slot gap twice on 1 answer instead of 4, and it costs about 60% more
  per answer.
- **Sonnet-low** keeps the most suggestions, but it follows neither the grounding rule nor the
  gap-sizing rule: it double-fills a one-slot gap on 5 answers, up from 3.

**The Key-card gate passes against the wrong list.** Both setups still cut Lotus Petal from
Yuriko on the new prompt. The deck's own overview names Yuriko, Sol Ring, Dimir Signet, the
ninjas, Snuff Out and Kaito as its Key cards. It never names Lotus Petal or Ornithopter, the two
cards Hugh called load-bearing. The base prompt scored 0 on the same definition, so no run could
have caught this. What a player knows is load-bearing has to come from the player, as a stated
intent or a "never cut" mark on a card. The model's own overview cannot supply it.

### Hugh's blind read, round 3

S against sonnet-low again, both on the `strategy` prompt, on the same 15 held-out decks.
**Hugh preferred S on 8, sonnet-low on 4, and called 1 even (Mutant Menace).** Two decks went
unanswered, Sultai Arisen and Scrappy Survivors: S's side was empty on both, because its answer
came back malformed after two attempts, with about 6,000 thinking tokens against the 8,000 ceiling.
The pre-registered rule fails on its first clause either way (8 is more than 5), even with both
empty decks scored for sonnet-low (8 against 6). **Sonnet-low fails again, so S stays for tuning.**

His notes, verbatim (A is the left side, B the right):

- **HD - Kratos** (sonnet-low): "I like that A has more options, but several of the justifications are redundant: "Ramp remains far above", "Ramp is still above", "Ramp sits far above". This looks bad/unpolished."
- **HD - Avatar Aang** (S): "Again, I prefer more options in A, but the text is repetitive "Removal remains under", "With removal at 2 or 3", "Removal sits at 2 of 3""
- **HD - Gods** (S): "Much more thorough and helpful analysis here. This is the best one I've read so far."
- **HD Tune - Counter Intelligence** (S): "Both of these are strong, but A is slightly better."
- **HD - Soldiers** (S): "B is better, but I will say that some of these responses are a bit too verbose"
- **HD - Tovolar** (sonnet-low): "Mostly the same, but a slight preference towards B"
- **HD Tune - Mutant Menace** (even): "Quality of response in A is better, but number of suggestions in B is better."
- **HD Tune - Prismari Artistry** (sonnet-low): "Both similar, but slight preference towards A"
- No note on Wizards, Yuriko, Zombies or Elves (S), or on Eldrazi (sonnet-low).

What the notes add to round 1's:

1. **More options still read better** (Kratos, Avatar Aang, Mutant Menace). Unchanged from round 1.
2. **Repeated openings read as unpolished.** Each swap that restates the same role count ("Ramp
   remains far above", "Ramp is still above") was named on an S side and on a sonnet-low side, so it
   is the prompt's to fix rather than the model's: the tuning lane can ask that no two rationales
   open on the same count.
3. **The strategy prompt is his best-rated answer yet** (Gods, S). With round 3's automatic
   metrics above, it moves S toward his round 1 notes.

**Recommendation for tuning (as of round 3; round 4 below supersedes it):** S on the `strategy` prompt, plus the repeated-opening rule. The
tuning lane should also look at the two malformed answers before it ships, since a player would see
each as a failed run. The cost is under Allowances.

### Hugh's ruling on round 3, and the rationale rules (round 4)

Hugh ruled to ship the `strategy` prompt on S, with two rules from his notes: never open two
rationales on the same role count, and never restate a figure the card already shows as a
citation chip ("mix removal: 5 of 6"), saying "one short on removal" instead and spending the words
on the card. Both were measured on the 4 development decks, one trial each. This is not a blind
read.

| S, 8,000 ceiling | malformed | kept per answer | chip restatements | repeated openings | output tokens per answer | $/answer |
|---|---|---|---|---|---|---|
| strategy prompt | 1 of 4 | 2.50 | 5 of 10 | 2 | 7,584 | $0.088 |
| + rationale rules, first wording | 1 of 4 | 1.75 | 0 of 7 | 0 | 8,313 | $0.096 |
| + rationale rules, notes exempt, default effort | 1 of 4 | 2.50 | 0 of 10 | 1 | 13,404 | $0.152 |
| + rationale rules, notes exempt, `effort: "medium"` | **0 of 4** | **3.50** | **0 of 14** | **0** | 2,545 | **$0.036** |

- **The rules work.** Chip restatements fall from half of all kept rationales to none, and the
  rationales talk about the card instead ("Rogue's Passage lets Gishath attack unblocked so its
  cascade off combat damage actually happens").
- **The first wording cost a deck.** It listed "a note's date" among the chips, so the model
  paraphrased a game note the contract requires it to quote, and every suggestion on that deck was
  dropped for its citation. The second wording exempts a note by name.
- **S's malformed answers are its thinking, not the prompt.** On the plain strategy prompt the same
  deck failed on both attempts with all 8,000 output tokens spent thinking, and which deck fails
  moves from run to run. At default effort three of the last run's four first attempts reached the
  8,000 ceiling and the fourth stopped at 7,991.
- **That is also a latency problem the batch hides.** At about 80 output tokens a second, 8,000
  tokens is about 100s, against the app's 110s model timeout and the page's 120s limit, so an
  answer that needs its retry cannot finish in the app. Medium effort ran 19 to 49s.
- A 16,000 ceiling was ruled out for the same reason: about 200s.

Medium effort differs from the setting Hugh rated in round 3, so it is his call.

### Hugh's blind read, round 4 (8 decks)

**Registered before any answer was generated.** S at `effort: "medium"` on the strategy prompt with
the rationale rules (notes exempt), against round 3's STORED S answers on the plain strategy prompt
at default effort: the answers Hugh already preferred over sonnet-low. The page tab is "Suggested
swaps, round 4 (8 decks)".

- **Decks:** 8 of the 15 held-out decks, picked by a seeded shuffle (seed 20260923 + 4000) and fixed
  before any output: Kratos, Avatar Aang, Wizards, Yuriko, Soldiers, Scrappy Survivors, Mutant
  Menace, Eldrazi. On Scrappy Survivors the stored S answer was malformed, so medium's answer stands
  against the app's failed state, which is what a player would have seen.
- **Pass rule**, the round 1 rule scaled from 15 decks to 8: S-default preferred on no more than 3
  of 8, and on no more than 2 more decks than medium.
- **The confound, stated:** the candidate changes two things at once, the prompt (the rationale
  rules) and the effort. A pass says the pair is at least as good as what won round 3; it cannot
  say which change carried it. The prompt change is the one Hugh asked for, so the effort is the
  part this round actually tests.

**Result: medium passes, 7 to 0.** Hugh preferred S-medium with the rationale rules on all 7 decks
he rated; Scrappy Survivors went unrated, as designed, since its other side was the failed state.
Both clauses pass, and would still pass if the unrated deck were scored for S. His one note:

- **HD - Avatar Aang** (medium): "I like that the first cut is aware of the second cut, this is really interesting and helps me to feel like the recommendations are holistic versus siloed"

Per deck, with the time estimated at 80 output tokens a second, retries included:

| deck | preferred | S-default kept / time / $ | S-medium kept / time / $ |
|---|---|---|---|
| Kratos | medium | 4 / ~96s / $0.086 | 4 / ~17s / $0.023 |
| Avatar Aang | medium | 1 / ~87s / $0.078 | 2 / ~32s / $0.034 |
| Wizards | medium | 5 / ~25s / $0.030 | 4 / ~18s / $0.024 |
| Yuriko | medium | 4 / ~36s / $0.039 | 5 / ~46s / $0.047 |
| Soldiers | medium | 4 / ~66s / $0.062 | 4 / ~32s / $0.036 |
| Scrappy Survivors | (unrated) | failed / ~181s / $0.164 | 4 / ~57s / $0.055 |
| Mutant Menace | medium | 1 / ~81s / $0.074 | 4 / ~70s / $0.065 |
| Eldrazi | medium | 1, on its retry / ~196s / $0.175 | 5, on its retry / ~111s / $0.107 |
| **mean** | | **2.50 / ~96s / $0.0885** | **4.00 / ~48s / $0.0489** |

Medium keeps more suggestions, at about half the time and cost. One latency caveat for the build:
an answer that needs its retry can still pass the app's 110s model timeout (Eldrazi, ~111s), so
how that timeout applies across the retry is the tuning build's to check.

## Overview

S truncates or malforms a third of its answers. Its median attempt hits the 8,000 ceiling: 69 of
131 attempts stopped there, and 125 ran past 3,000. Its p50 latency is 72 s. Under the shipped contract S renders all four sections
on 2% of held-out answers, at $6.13 per accepted answer. **S failed on viability, not on
quality.** So the overview blind read departs from the pre-registered rule: it becomes Hugh's
absolute read of sonnet-low under A+B, the contract he picked: "would you show this to your pod".

The refusals are shaped by the contract, not the model. Two what-ifs were measured, both on
contract v2 (after #913):

| contract | all four | $/accepted |
|---|---|---|
| shipped | 18% | $0.186 |
| (A) drop the line, not the section | 58% | $0.057 |
| (B) one repair call | 62% | $0.101 |
| (A+B) | 96% | $0.051 |

A+B is derived from the same repair run and leans slightly in its own favour, as stated in
`metrics-overview-contracts.md`. B adds a second sequential call, about 18 s p50, only on the
answers that need one.

**The `uncomputed_figure` gap, #913.** Stored answers were re-validated against facts rebuilt with
the fixed `factsFor`, with no model calls. On held-out, mulligan lines naming an uncomputed figure
fell from 73 to 10, and primer refusals for that reason fell from 21 to 4.

### Hugh's absolute read, round 2

Fifteen held-out overviews, one per deck (trial 0), shown exactly as a player would see them under
A+B. Failing lines were dropped, repaired sections sat in place, and anything still refused showed
in the app's own words. Nothing said which model wrote them, what they cost, or whether a repair
happened. All four sections rendered on every deck: 54 sections came from the first write and 6
from a repair. Asked "Would you show this to your pod?", **Hugh answered Yes 6, Close 8, No 1.**

His two summary notes, verbatim: "Sol Ring is in every commander deck and shouldn't be considered
among 'Key Cards'." and "The Mulligan section was the most hit or miss. A few had good suggestions,
but most had redundant or unhelpful suggestions."

His per-deck notes, verbatim:

- **HD - Kratos** (Close): "The overview is good. The mulligan steps aren't great. They all recommend basically "keep lands" and "Don't keep no lands". Not very helpful. Key Cards shouldn't include Sol Ring. This is a staple in every deck and not helpful. Weaknesses are good."
- **HD - Avatar Aang** (Yes): "Strong overview, core strategy, and weaknesses. Mulligan is unhelpful again."
- **HD - Gods** (Close): "Mulligan is a little better, but two of the send back items are effectively the same. Also, a general note on language: If the category is "Send back" we don't need to say "Send back..." with every line item."
- **HD Tune - Sultai Arisen** (Yes): "Strongest one yet, IMO. Mulligan is genuinely useful. All sections are strong. Also, small note that we should use the Magic term for color combinations not the mana abbreviation (e.g. Gruul over RG)."
- **HD Tune - Counter Intelligence** (Close): "This one is close, but misses some core pieces of the strategy in the deck, specifically cards that enable Kilo to be tapped and untapped. It also misses an infinite turn mechanic in the deck. Mulligan is still meh."
- **HD - Yuriko** (Yes): "Overview could be slightly better noting that there are large CMC cards in this deck for big reveal hits with Yuriko, plus top deck manipulation. But, overall, this is good."
- **HD - Tovolar** (Close): "Mulligan is meh, everything else is pretty good."
- **HD - Zombies** (No): "Big flaw with this line, as this is the commander and would not be in my opening hand: "Keep hands with Ghoulcaller Gisa or another recursive threat and lands.""
- **HD Tune - Scrappy Survivors** (Yes): "One of the better overviews I've seen so far. Uses "Naya" instead of mana abbreviation. Mulligan is genuinely informative. All other segments are strong. Minor callout is that Sol Ring should never be in "Key Cards"."
- **HD Tune - Mutant Menace** (Close): "Mulligan is unhelpful. Everything else is decent."
- **HD - Eldrazi** (Close): "Mulligan is not super helpful. Everything else is pretty solid."

Each checked against the data:

1. **Staples as Key cards.** Sol Ring is a Key card in 14 of 15 overviews. Against each deck's own
   `format_staples` condition, 12 of 15 overviews name a staple: 24 of 113 Key cards, 12 of them Sol
   Ring. Two decks' conditions carry no staple rows. Filtering every format staple would also remove
   Torbran from a Kratos deck, Blood Artist from Zombies and Laboratory Maniac from Wizards, which
   really do carry their strategies. The **universal** staples are the ones that answer Hugh's note.
   Five cards are staples in at least 12 of the 16 conditions: Sol Ring, Arcane Signet, Swiftfoot
   Boots, Reliquary Tower and Rogue's Passage.
2. **Mulligan is hit or miss.** Confirmed. All 82 mulligan lines were tagged:
   - 46 (56%) are redundant: they restate the land range or another line;
   - 19 are generic;
   - 17 (21%) are specific: they name a card, a curve point or a line of play.

   The specific share tracks his picks: 26% on the decks he said Yes to, 16% on Close. 31 of 42
   send-back lines open with "Send back" under a heading that already says it. The one No (Zombies)
   is a keep line asking for the commander in the opening hand.
3. **Colour names.** 6 of 15 overviews state the identity as a mana abbreviation. One uses a guild
   or shard name, and he praised it.
4. **Strategy coverage.** The Counter Intelligence overview misses Kilo's untap pieces and the
   infinite-turn line. The Yuriko overview misses the big reveal cards and top-deck manipulation.
   No contract check can see these. It is the same "strategy awareness" gap round 1 found in tuning.

**For the synopsis lane** (their change, not made here):
- keep the universal staples off the Key-card candidates, in `factsFor`, backed by a validator check;
- render the land range once from facts, and require every mulligan line to name a card or a play
  pattern, one or two per side;
- no "Keep"/"Send back" prefix on the lines;
- never treat the commander as a card in hand;
- give facts the identity's name.

**Trim** (reminder text stripped from the facts) saves about 3% per answer and loses on A (31%
against 44%). Not worth it.

### The overview after Hugh's fixes (contract v6) and the Mulligan budget

Hugh approved every overview fix from round 2, and the synopsis lane shipped them:
- universal staples kept off the Key cards (#926);
- the identity by name (#926);
- the land range as a fixed line (#930);
- 1 to 2 specific Mulligan lines per side (#930);
- refusals for a restated land count, the commander in hand, and a heading prefix (#930).

The app also makes its own repair call now. So from here the figures are the app's own verdicts:
the first write, then the write plus its repair, judged by `validateSynopsis` and merged by
`mergeRetry`.

Held-out, 3 trials, sonnet-low:

| | v2 (A+B) | v6 as shipped | v6 + Mulligan budget |
|---|---|---|---|
| all four sections, after the repair | 96% (43 of 45) | 89% (40 of 45) | **98% (44 of 45)** |
| first write alone, all four | 18% | 33% | 53% |
| answers needing the repair | 37 | 30 | 21 |
| $ per accepted answer | $0.051 | $0.063 | $0.051 |
| universal staples as Key cards | 12 of 15 overviews | 0 of 333 | 0 of 328 |
| specific Mulligan lines | 21% (round 2, tagged by hand) | 76% | 82% |

After the repair, v6 as shipped rendered each section as follows: overview 96%, primer 93%, Key
cards 100%, weaknesses 100%. With the Mulligan budget: overview 98%, primer 100%, Key cards 100%,
weaknesses 100%. The v2 per-section figures are approximate.

**Why v6 lost points: the Mulligan lines.** A specific line names cards and runs long. In the v6
first writes the lines ran a median 75 characters against their 80, and 58 of 180 were over. The
shipped prompt already said "aim for about 55", so the fix states the budget in other forms:
- a word target, 8 to 12 words;
- one card or one curve point per line, never neither;
- the fixed land line does not count toward any line;
- two worked lines, both naming a card or a curve point.

The first version, whose second example named nothing, held the budget on the dev decks but let
the specific share fall from 73% to 65% on the dev first writes. The version after it (`primer-budget-b`) is the one measured
on held-out here, and it went to the synopsis lane as a patch, #934. It is verified byte for byte: with it, the app's own
builder reproduces all 15 held-out first-write prompts and all 21 repair prompts the measurement
sent.

**The patch dropped lines no verdict showed.** The synopsis lane's pre-open pass on #934 noticed
that its worked lines carry number words, and the figures rule reads "three" inside "three-drop".
Under contract A a mulligan line that fails is DROPPED, and the section still passes while its
minimum survives, so the all-four verdict never saw it: 21 held-out mulligan lines naming a figure
the deck lacks were dropped, against none under v6. An earlier draft of this section said no run
hit an `uncomputed_figure` refusal, which was true of sections and false of lines. From here every
overview row reports DROPPED LINES per section, read with the validator's own reasons (the lane's
line checks now restate all of v6's, and `eval:rescore-lines` holds them to `validateSynopsis` on
every stored answer).

Counted that way, the patch did not raise the drop rate. v6 as shipped already drops 17% of the
mulligan lines in rendered sections, nearly all for running over budget; the patch drops 15%, most
for a figure. It changed why lines drop, not how many. #934 was held while a second version was
measured.

**The second version (`primer-budget-c`)** keeps the budget and fixes the wording:
- its worked lines carry no number ("[[Sol Ring]] with nothing to cast after it stalls out.");
- it names "a line of play" again, as the shipped prompt does, instead of narrowing a line to a card
  or a curve point;
- its one length target is the app's own, read from `CHAR_BUDGETS`, where the first version said
  50 beside the prompt's 55.

The bar was set before the run: all four at 95% or better, dropped Mulligan lines at v6's level or
below, and a specific share above 60%. Held-out, 3 trials, sonnet-low:

| | v6 as shipped | first patch | second version |
|---|---|---|---|
| all four sections, after the repair | 89% (40 of 45) | 98% (44 of 45) | **100% (45 of 45)** |
| first write alone, all four | 33% | 53% | 69% |
| answers needing the repair | 30 | 21 | 14 |
| $ per accepted answer | $0.063 | $0.051 | **$0.044** |
| Mulligan lines dropped, rendered sections | 17% (28 of 168) | 15% (27 of 179) | 12% (22 of 178) |
| ... of which for a figure the deck lacks | 0 | 21 | 0 |
| specific Mulligan lines, as drawn | 76% | 82% | 75% |
| Key-card lines dropped | 6% | 8% | 8% |
| tips / weaknesses dropped | 4% / 4% | 2% / 5% | 0% / 6% |
| universal staples as Key cards | 0 of 333 | 0 of 328 | 0 of 330 |

The specific share is `mulliganSpecific` in `line-rule.mts`: a line naming a card, or a curve point
or line of play by its words, including a mana figure in any form ("four-mana", "10-mana", "3 mana").
Review of #946 found the first version recognised only one- to three-mana, which understated every
share by 4 to 5 points; the figures here are the corrected rule's, and round 2's 21% is Hugh's read
tagged by hand, not this rule.

**It passes on all three**, and it is the cheapest of the three, because fewer answers need the
repair. The dev check before it ($0.19) read the same way: 13% of Mulligan lines dropped, against
38% on v6 and 23% on the first patch. It went to the synopsis lane to replace #934's text. The
held-out run and its repair cost $0.98.

## Allowances

**Ruling (Hugh):** keep today's daily allowance: the owner 10 units and each friend 3, with the
$20 hard stop and the $10 alarm unchanged.

**What that means at full use.** The worst case is every unit of every player used on every day
of a 30-day month. It is priced at the overview's A+B cost PER ANSWER, $0.049, not the $0.051 per ACCEPTED answer
quoted above: a unit is spent on every answer, accepted or not, and 96% are accepted. That is the
higher of the two features:

| | per full day | per 30 days |
|---|---|---|
| everyone (owner 10 + 6 friends × 3) | $1.36 | $40.94 |
| the owner alone | $0.49 | $14.62 |

The owner's line is capped separately by the owner's $5 share: at full use the owner reaches it
around day 10 ($0.49 a day), before the shared stop.

At that pace the $10 alarm fires on day 8 and the **$20 hard stop is reached on day 15. It pauses
everyone for the rest of that month.** At tuning's cost alone, on S as ruled ($0.0415 per
answer), the same use comes to $34.86 a month. Hugh accepted this knowing there is no real usage yet: staging's `model_calls`
holds 0 rows, so every figure here is a worst case, not a forecast.

**Revisit when** `model_calls` shows real monthly spend passing $10.

**Tuning on the strategy prompt, at default effort, doubles its line.** Round 3's recommendation, S on the
`strategy` prompt, costs $0.0828 per answer ($0.0956 per accepted answer, 13 of 15), against
$0.0415 on the base prompt:

| tuning, full use | per full day | per 30 days | $10 alarm | $20 stop |
|---|---|---|---|---|
| S, base prompt | $1.16 | $34.86 | day 9 | day 18 |
| S, strategy prompt | $2.32 | $69.55 | day 5 | day 9 |
| the owner alone, S, strategy prompt | $0.83 | $24.84 | | owner's $5 share on day 7 |

Round 4's winner, S at medium effort with the rationale rules, costs $0.0489 per answer on its 8
held-out decks: $1.37 a full day, $41.08 over 30 days, the $10 alarm on day 8 and the $20 stop on
day 15; the owner alone reaches his $5 share on day 11.

Still a worst case with no usage behind it; it is here so the allowance ruling is made knowing
it.

The overview's cost under v6 with the Mulligan budget's second version, as shipped in #934, is
$0.0437 per answer and per accepted answer (45 of 45 accepted), against the $0.049 these figures
use. That is half a cent lower, and it moves no
whole allowance.

For reference, these are the largest whole allowances the pre-registered rule
(30 × (6F + H) × c within the cap, and H's share within $5) would have given:

| contract | c | $10 cap | $20 cap |
|---|---|---|---|
| shipped or A | $0.033 | friends 1 / Hugh 4 | friends 3 / Hugh 2, or Hugh 5 / friends 2 |
| A+B | $0.049 | friends 1 / Hugh 0, or Hugh 3 / friends 0 | friends 2 / Hugh 1, or Hugh 3 / friends 1 |

## Proposals for the owning lanes (not made here)

1. **`effort`.** The overview now sends `effort: "low"` (#918). Tuning stays on S, which sends
   none, so Sonnet 5 thinks adaptively, billed as output. That is what won Hugh's blind read, so it
   is not a change to make on cost alone. The estimates below are output tokens minus the visible
   reply at four characters a token:
   - Tuning under S: about 2,540 thinking tokens per answer, roughly 61% of the cost.
   - Tuning at `effort: "low"`: about 390, roughly 24%.
   - The overview at S: about 5,650 per attempt.
   - The overview at low: about 590.
2. **A 3,000 output ceiling for sonnet-low.** The observed maxima are 2,240 output tokens on the
   overview (176 answers) and 1,502 on tuning (88). A 3,000 ceiling truncates nothing observed and
   cuts each reservation's worst case. The owning lanes set it after Hugh's model ruling.
3. **Prompt diffs.** `budgets-plus` for the overview. `cite-rules` for tuning, but only if Haiku is
   ever reconsidered.
4. **Caching.** Not worth the change today.
   - Tuning's 1,545-token system prompt does cache across decks. A read saves about $0.003 per call.
   - A miss that caches only the system block costs about $0.001, so break-even needs a call from
     any player in the previous 5 minutes on roughly 1 call in 4.
   - Caching the deck too pays only on the retry, which ran at about 2%.
   - The overview's system prompt is about 725 tokens, under Sonnet's 1,024 minimum.

## Method notes

- Every piece of the app the harness touches is imported, never restated.
  `request.test.mts` pins the batch request to what `callModel` sends.
- **The resume incident.** A batch status poll hit a connection timeout and the process died while
  the batch kept running, with its worst case held in the ledger. A one-off `--resume` collected it.
  A later trim batch sat at 0 of 90 for 70 minutes; cancelling it made 88 of the 90 process, and
  those are billed. They were collected the same way. The status poll now retries a transient
  failure, which is what stops a run dying that way. `--resume` itself was removed in PR 2, after
  review found it drawing findings two rounds running; a stranded batch is collected by hand from
  its id in the ledger.
- A ledger entry is written at the worst case before any send and settled at the real cost after, so
  a crash cannot hide spend.
- The overview blind departure, and why: see Overview.

## Spend

**$23.72 of $25**, from `ledger.jsonl`: 100 entries, none left pending. Neither the $15 stop-and-ask nor the cap was reached before the plan was past half done.

| stage | $ | running total |
|---|---|---|
| the plan's rounds, through tuning round 1 and overview round 2 | $16.94 | $16.94 |
| tuning round 3 re-test (the `strategy` prompt) | $1.41 | $18.35 |
| overview under contract v6, and the first Mulligan budget | $2.94 | $21.30 |
| overview, the Mulligan budget's second version (dev, held-out, repair) | $1.18 | $22.47 |
| tuning round 4, the rationale rules and effort (3 dev checks) | $0.74 | $23.22 |
| tuning round 4, the blind round (8 held-out decks, medium) | $0.20 | $23.41 |
| tuning v2, the real-time latency measurement that sets the retry floor | $0.31 | $23.72 |

Each stage is its ledger entries summed and then rounded, so the rounded stages need not sum to the
running total.
