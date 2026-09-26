# Is a one-time model pass that labels card jobs and their limits worth it?

Sample and report, 2026-09-25. Commissioned by d9; spend approved by Hugh above
the normal caps for the full run, conditional on this sample. **The full run has
not been run.** Nothing here writes to any database, and nothing runs per request.

## The answer

**Yes, and on Sonnet 4.5 — about $41.09.**

The pass buys exactly one thing, and it is the thing that is broken: the LIMITS on
a job. Today's text rules score **0 on every limit** — not poorly, zero, by
construction, because they cannot express one.

Sonnet **is** markedly better on the limits that decide a match. It gets 86.4% of
gating restrictions against Haiku's 76.7%, 94.2% of triggers against 86.7%, 85.7%
of recurrences against 78.8%, and finds about one job in twelve more (recall 0.834
against 0.761). It invents 5 spurious restrictions against Haiku's 7.

**Both models get every TRIBAL restriction right**, so the Warg's Wolf clause is
solved by either; the choice turns on the wider gating set and on `trigger`. Haiku
wins the ramp kind (95.7% against 91.7%) and job precision by 1.6 points. The
one-time difference is **$28.36**.

> **This reverses the recommendation in the first draft of this report, which said
> Haiku.** That draft rested on a tribal-restriction figure of 87.5% against 90.9%
> — a 3.4-point gap — computed by an ad-hoc command that was never committed and
> that used the naive same-kind job pairing this repository had already identified
> as a defect. Recomputed through the committed scorer with reuse-free pairing, the
> gap is on gating restrictions and it is 13.2 points, to Sonnet. The first draft's
> number was wrong, and it was wrong in the direction that flattered the cheaper
> model.
>
> **Every figure in this report is emitted by a committed script and published by
> that same script into a committed artifact** — the scores, the agreement figures
> and the costs. Two earlier drafts failed that in different ways: the cost table
> lived only in a script's stdout, and the committed snapshots were then copied by
> hand, so re-running the documented commands could not regenerate the checked-in
> evidence and the two could drift silently. Each script now takes `--publish` and
> writes its own committed path; without the flag it says so and writes only `out/`.

## The two limits that caused the bug

`Bejeweled Warg` matched `Runadi` twice: on `+1/+1 counters`, where the Warg's go
on a **Wolf** and the deck was Dinosaurs; and on `ramp`, where the Warg makes a
**Treasure on combat damage** and Runadi **taps for {G}**.

| | tribal restriction | gating restriction | ramp kind | spurious invented |
|---|---|---|---|---|
| **Haiku 4.5** | 1.000 (29/29) | 0.767 (33/43) | **0.957** (22/23) | 7 |
| **Sonnet 4.5** | 1.000 (30/30) | **0.864** (38/44) | 0.917 (22/24) | **5** |
| today's text rules | **0** (0/25) | **0** (0/35) | **0** (0/21) | 0 |

**The tribal restriction — the Warg's Wolf clause — is now a tie at 1.000.** Either
model solves the half of the bug the brief leads with. The choice therefore turns on
the WIDER gating set (card types a deck may simply not play), where Sonnet leads by
9.7 points, and on `trigger`, where it leads by 7.5. Haiku keeps the ramp kind.

- **tribal** is gold restricting to a named CREATURE TYPE — Wolf, Dinosaur, Pirate
  — checked against the catalog's own creature subtypes. The Warg case exactly. An
  earlier version tested for a capital letter, which let `Vehicle` and `Commander`
  into the column while the prose called them examples of the superset; the
  denominators disagreed with the definition.
- **gating** is the superset that also holds lowercase card types (artifact, land)
  — restrictions that make a card dead in a deck that plays none of them. Both are
  reported because they do not agree about the size of the gap, and a reader shown
  only one is being steered.
- **spurious** is the opposite direction: gold records NO restriction and the model
  named a type anyway. Scoped to gold's `none`, not to every non-gating value — an
  earlier version also fired where gold said `creature`, which is the documented
  spec disagreement below rather than invention, and mixed the two silently. The
  count is unchanged at 6 and 2, so it was not load-bearing here. Both restriction columns key on GOLD's value, so they are recall-like and
  blind to over-labelling; an invented restriction refuses a good stand-in, which
  is the mirror of the bug. Haiku invents three times as many.

## Full scores against the gold set

108 hand-labelled cards, 205 jobs. JOB = did it find the right job kinds. LIMIT =
on the jobs it got right, did it get the limits right.

| | Haiku | Sonnet | text rules |
|---|---|---|---|
| JOB precision | **0.8** | 0.784 | 0.762 |
| JOB recall | 0.761 | **0.834** | 0.717 |
| rampKind | **0.957** | 0.917 | 0 |
| restrictedTo, tribal | 1.000 | 1.000 | 0 |
| restrictedTo, gating | 0.767 | **0.864** | 0 |
| trigger | 0.867 | **0.942** | 0 |
| recurrence | 0.788 | **0.857** | 0 |
| threshold | 1.000 | 1.000 | 0 |
| modal | 1.000 | 1.000 | 0 |
| spurious restrictions invented | 7 | **5** | 0 |

Sonnet takes job recall, the gating restrictions, trigger, recurrence and the
spurious count. Haiku takes the ramp kind and job precision. Tribal restrictions,
thresholds and modality are ties at 1.000 — three limits that need no model choice
at all, and that today's rules still get none of.

**The job columns are the finding nobody expected — with one correction.** On
PRECISION all three sit within 4 points (0.762 to 0.8), so a pass bought to find job
KINDS more accurately would be close to a waste. On RECALL they do not: Sonnet finds
0.834 against the rules' 0.717, which is 171 true jobs against 147 — a 16% relative
gain, not a rounding difference. So the limits are where nearly
all the value is, and Sonnet additionally finds about one job in eight that the
rules miss.

**Read the limit rows as NON-DEFAULT accuracy.** Scored naively, the text rules
appear to get 93% of thresholds and 86% of modality right — while emitting no
limits at all. They score by always guessing the default, and the default is
usually right. Every limit is therefore scored on the subset where the true answer
is NOT the default, the only cases where a limit changes a match. That is the
column above, and it is 0 for the rules everywhere.

## Cost

Measured, at batch rates, over 508 cards (108 gold + 400 random):

| | sample | per card | full run (31,830) | per new set (~390) |
|---|---|---|---|---|
| Haiku 4.5 | $0.2033 | $0.000400 | **$12.73** | $0.16 |
| Sonnet 4.5 | $0.6556 | $0.001291 | **$41.09** | $0.50 |

Sample total **$0.8589** against a $5 cap (plus $0.8459 for the first, contaminated run — see below — so $1.70 of the cap is used).

The ongoing cost is the part that settles it: a new set costs **50 cents** on
Sonnet and 16 on Haiku. Either way keeping the labels current is free in practice,
so the only real decision is the one-time backfill — **$28.36** between the two.

## Agreement on the random 400

Where there is no gold label, agreement bounds the disputed fraction. It is not
accuracy: two models can agree and both be wrong.

- Same job set exactly: **52.5%** (210/400)
- Same jobs and every limit: **34.3%** (137/400)
- Job instances: 428 both, 119 Haiku only, 164 Sonnet only
- Limit disagreement where both found the job: restrictedTo **22.4%** (96/428),
  trigger 7.7%, recurrence 5.6%, modal 3.7%, threshold 1.9%, rampKind 10.7% (3/28)

> These figures were quoted from a pre-fix run in the first two drafts. The
> agreement script compared each card's job kinds as a SET, so a card with two jobs
> of one kind counted both as agreeing against one — `both` read 430 against 423
> actually pairable instances. Fixed to multiset pairing without reuse, as the
> scorer does, and every number above regenerated.

`restrictedTo` is where they part company, and the gold scoring says why: it is the
hardest limit for both, and the one that separates them. On the GATING subset Haiku
is 0.767 and Sonnet 0.864.

**Read that as recall, not precision.** The subset keys on GOLD's value, so 0.767
means about a quarter of the restrictions that GOLD records are got wrong — it says
nothing about restrictions a model invents. That direction is counted separately:
Haiku invents 6 and Sonnet 2. The two failures cost different things. A MISSED
restriction is the original bug returning (a card matched in a deck it is dead in);
an INVENTED one refuses a stand-in that would have been fine. Sonnet is better on
both.

## Six things the sample found that were not in the brief

1. **The first sample was contaminated, and the whole thing was re-run.**
   `cards.oracle_text` stores BOTH FACES of a two-faced card, joined by `\n//\n`.
   The prompt sent that column whole, so the model was shown
   `Strength of the Harvest`'s land back — `{T}: Add {G} or {W}` — and asked to
   label it against gold that is front-face-only. It read the land ability as ramp
   and was marked wrong for believing the text it was given.

   **The same defect hit the baseline from the other side.** The scorer passed the
   raw column to `classifyRoles`, but `src/lib/swaps/stand-ins.ts:47` — the exact
   consumer this lane exists for — already calls it with `frontFaceOracle`. The
   comparison was therefore against a WORSE version of the text rules than the ones
   that actually run.

   It touched 10 of the 108 gold cards, which is the entire `twoFaced` class: the
   one built to test this. A patched sample where 15 cards used one prompt and 493
   used another is not interpretable, so the whole sample was re-run for $0.8589.

   **It changed conclusions, not just digits.** Both models now score 1.000 on
   tribal restrictions, where Haiku had previously missed one, and `trigger`
   FLIPPED from Haiku to
   Sonnet, 0.942 against 0.867. The prompt now uses the repository's own
   `castFaceText`, which keeps both halves of a split or adventure card because both
   are castable, and the baseline uses `frontFaceOracle` because that is what the
   consumer does. Neither is reimplemented here.

2. **The first draft of this report recommended the wrong model.** Its
   tribal-restriction figure came from an uncommitted ad-hoc command using the
   naive same-kind job pairing that `label-cards-score.mts` already documents as a
   defect, and it understated the gap between the models by half. Recorded here
   rather than quietly corrected, because the lesson generalises: **a figure the
   committed scripts cannot reproduce should not appear in a table.** Every number
   in this report is now emitted by a committed script into a committed artifact,
   and the pre-open review caught this by checking the tables against the JSON
   rather than against the prose.

3. **A gap in the ramp kinds, found by hand-labelling.** Generator Servant's
   `{T}, Sacrifice this creature: Add {C}{C}` fits none of E1's three kinds: not
   `tapsForMana` (gone after one use), not `fetchesLand`, not `makesTreasure` (no
   token — the mana is added directly). `Blood Pet`, the Eldrazi Scion tokens and
   every sacrifice-for-mana land are the same shape. Forcing it into
   `makesTreasure` would have recreated the very false match the kinds exist to
   prevent, both being "one-time mana". Raised with 2b, ruled by d9: a fourth
   kind, `burstMana`. Seven gold jobs carry it. (The rampKind row above is
   accuracy over ALL paired ramp jobs; nothing committed reports per-kind accuracy,
   so there is no separate `burstMana` figure to quote.)

4. **Caching the instructions cost more than it saved.** d9 asked for cached
   instructions. Measured: Sonnet wrote the cache 37 times and read it 6, because
   43 batch requests run in parallel and nearly every one arrives before any cache
   is warm. At 1.25x to write and 0.1x to read, that is **$0.0854 against $0.0784**
   without caching — a 9% loss on the instruction portion. For Haiku the
   `cache_control` is inert outright: the block is under its minimum cacheable
   length (~1,285 tokens by our estimate, 1,215 as billed), measured as zero writes and zero reads across two identical
   calls. **For the full run, either drop the breakpoint or batch sequentially
   enough that reads dominate.**

5. **The batch API is not reachable through this repo's proxy.** `ANTHROPIC_BASE_URL`
   points at `127.0.0.1:8787`, which forwards `/v1/messages` and answers
   `cave_route_not_found` for `/v1/messages/batches`. Batches go direct to
   `api.anthropic.com`; the key still comes from the `scripts/.env` convention.
   Without this the sample would have cost double.

6. **The two models disagree about what a two-faced card is called.** Sonnet
   returned `Soulcipher Board` and `Cipherbound Spirit` as separate entries where
   the catalog name is `Soulcipher Board // Cipherbound Spirit`; Haiku kept the
   joined name. Unreconciled, three cards read as "not returned" while the model
   had answered them. The collector now reconciles by face, against the asked
   names only. **A full run must do this or it silently loses every MDFC, adventure
   and transform card.**

## What to watch if this ships

- **`restrictedTo` is the weak limit**, for both models, and the reason for the
  recommendation. Just under a quarter of the gating restrictions gold records are
  missed by Haiku against about a seventh by Sonnet. If false matches survive the pass, this is the
  first place to look, and re-scoring the gold subset is what tells you.
- **Job recall is ~0.73–0.82**, so roughly a fifth of jobs are missed by every
  labeller including the models. The pass improves limits, not coverage.
- **A second pass costs the same as the first.** At 16 cents a set there is no
  reason to treat the labels as immutable; re-running a set after a rule change is
  free in practice.

## Method, and what would make it wrong

- **Gold set**: 108 cards, hand-labelled against oracle text with reasoning
  recorded per row, in `scripts/lib/card-labels-gold.mjs`. Weighted to 2b's list of
  what the text rules get wrong — restricted counters, tribal statics, conditional
  mana, thresholds, modal cards, two-faced cards, lands, land fetches — plus an
  `easy` tail so over-labelling is visible, and **4 hard negatives** where the
  correct answer is no jobs at all (a Saga's lore counter, an artifact's charge
  counter). Without those the set cannot measure over-labelling, which is the
  failure that produced the bug.
- **The vocabulary is 2b's**, asserted against `src/lib/recs/roles.ts` and
  `src/lib/recs/themes.ts` by a test rather than copied. A drifted copy would give
  a score that reads fine while a dropped theme is never measured.
- **The text rules run through the real `classifyRoles` and `cardThemes`**, never a
  reimplementation, or the drift would read as rule error.
- **Both models got an identical, temperature-0 prompt**, so the comparison is
  between models and not between prompts.
- **What would make this wrong:** the gold set is one person's reading, and the
  `restrictedTo` spec is genuinely ambiguous. On the FIRST scored run, before the
  pairing fix, 54% of the raw disagreements there were gold `creature` against a
  model's `none` — a disagreement about the spec rather than about the card. That
  figure is quoted as it was measured then and is not regenerated, because it came
  from the uncommitted disagreement list; the point it supports is why the gating
  subset is reported separately at all. That is why the gating subset is reported
  separately and the gold labels were left alone rather than relabelled to suit the
  result. A second labeller disagreeing with 10% of the gold set would move the
  headline numbers by a few points; it would not move 0 to 90.

## Files

- `scripts/lib/card-labels-schema.mjs` — the schema, and the four ramp kinds
- `scripts/lib/card-labels-schema.test.mts` — vocabulary drift guard, 14 tests
- `scripts/lib/card-labels-gold.mjs` — the 108-card gold set with reasoning
- `scripts/lib/card-labels-prompt.mts` — the shared instruction block
- `scripts/label-cards-select.mjs` — hard-class candidate selection
- `scripts/label-cards-run.mts` — batch submission, with the spend cap
- `scripts/label-cards-collect.mjs` — collection, measured cost, face reconciliation
- `scripts/label-cards-score.mts` — precision, recall, the non-default split
- `scripts/lib/card-labels-pairing.mjs` — which prediction answers which gold job when a card has two of a kind, with its own tests (6)
- `scripts/label-cards-agree.mjs` — Haiku against Sonnet on the random 400
- `scripts/label-cards-blindsheet.mjs` — the blind sheet below
### Committed evidence

Regenerate and republish with:

```
pnpm tsx scripts/label-cards-score.mts --publish
pnpm node scripts/label-cards-agree.mjs --publish
pnpm node scripts/label-cards-blindsheet.mjs --publish
```

`--publish` is opt-in so a run against a scratch database, or a half-collected
batch, cannot quietly overwrite the evidence a merged report rests on.


- `docs/superpowers/plans/2026-09-25-card-labels-blind-sheet.md` — **15 telling
  disagreements, columns unlabelled**, gold in a key beneath them
- `docs/superpowers/benchmarks/2026-09-25-card-labels-score.json` — every accuracy
  figure in the tables above, per model, per job kind and per limit
- `docs/superpowers/benchmarks/2026-09-25-card-labels-agreement.json` — the
  Haiku-against-Sonnet figures on the random 400
- `docs/superpowers/benchmarks/2026-09-25-card-labels-cost.json` — measured tokens,
  cost per model, and the full-run and per-set projections with their basis

The raw labels (296KB across both models) and the 711-row disagreement list stay in
`out/` and are NOT committed: they are reproducible from the committed scripts for
about 85 cents, and the figures derived from them are committed above. Re-run
`label-cards-run` then `-collect`, `-score`, `-agree` to regenerate.
