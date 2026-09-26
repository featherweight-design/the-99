# Is a one-time model pass that labels card jobs and their limits worth it?

Sample and report, 2026-09-25. Commissioned by d9; spend approved by Hugh above
the normal caps for the full run, conditional on this sample. **The full run has
not been run.** Nothing here writes to any database, and nothing runs per request.

## The answer

**Yes, and on Sonnet 4.5 — about $40.30.**

The pass buys exactly one thing, and it is the thing that is broken: the LIMITS on
a job. Today's text rules score **0 on every limit** — not poorly, zero, by
construction, because they cannot express one.

Sonnet **is** markedly better on the limit family that caused the false matches.
It gets 85.7% of gating restrictions against Haiku's 72.5% — half the error rate —
96.9% of tribal restrictions against 90.3%, and invents 2 spurious restrictions
against Haiku's 6. Haiku wins the ramp kind (95.5% against 87.5%) and nothing else
that decides a match. The one-time difference is **$27.60**.

> **This reverses the recommendation in the first draft of this report, which said
> Haiku.** That draft rested on a tribal-restriction figure of 87.5% against 90.9%
> — a 3.4-point gap — computed by an ad-hoc command that was never committed and
> that used the naive same-kind job pairing this repository had already identified
> as a defect. Recomputed through the committed scorer with reuse-free pairing, the
> gap is 6.6 points on tribal and 13.2 on gating, both to Sonnet. The first draft's
> number was wrong, and it was wrong in the direction that flattered the cheaper
> model. Every figure below is now emitted by a committed script into a committed
> JSON artifact.

## The two limits that caused the bug

`Bejeweled Warg` matched `Runadi` twice: on `+1/+1 counters`, where the Warg's go
on a **Wolf** and the deck was Dinosaurs; and on `ramp`, where the Warg makes a
**Treasure on combat damage** and Runadi **taps for {G}**.

| | tribal restriction | gating restriction | ramp kind | spurious invented |
|---|---|---|---|---|
| **Haiku 4.5** | 0.903 (28/31) | 0.725 (29/40) | **0.955** (21/22) | 6 |
| **Sonnet 4.5** | **0.969** (31/32) | **0.857** (36/42) | 0.875 (21/24) | **2** |
| today's text rules | **0** (0/27) | **0** (0/35) | **0** (0/21) | 0 |

**Restrictions are the larger half of the bug and Sonnet wins them; the ramp kind
is the smaller half and Haiku wins it.** Both are far above nothing.

- **tribal** is gold restricting to a NAMED type, capitalised as printed — Wolf,
  Dinosaur, Pirate. The Warg case exactly.
- **gating** is the superset that also holds lowercase card types (artifact, land)
  — restrictions that make a card dead in a deck that plays none of them. Both are
  reported because they do not agree about the size of the gap, and a reader shown
  only one is being steered.
- **spurious** is the opposite direction: the model named a type where gold has
  none. Both restriction columns key on GOLD's value, so they are recall-like and
  blind to over-labelling; an invented restriction refuses a good stand-in, which
  is the mirror of the bug. Haiku invents three times as many.

## Full scores against the gold set

108 hand-labelled cards, 205 jobs. JOB = did it find the right job kinds. LIMIT =
on the jobs it got right, did it get the limits right.

| | Haiku | Sonnet | text rules |
|---|---|---|---|
| JOB precision | **0.781** | 0.760 | 0.736 |
| JOB recall | 0.732 | **0.820** | 0.722 |
| rampKind | **0.955** | 0.875 | 0 |
| restrictedTo, tribal | 0.903 | **0.969** | 0 |
| restrictedTo, gating | 0.725 | **0.857** | 0 |
| trigger | **0.938** | 0.921 | 0 |
| recurrence | 0.781 | **0.853** | 0 |
| threshold | 1.000 | 1.000 | 0 |
| modal | 1.000 | 1.000 | 0 |
| spurious restrictions invented | 6 | **2** | 0 |

Sonnet takes job recall, both restriction columns, recurrence and the spurious
count. Haiku takes the ramp kind, and precision and trigger by margins inside the
noise of a 108-card set.

**The job columns are the finding nobody expected — with one correction.** On
PRECISION all three sit within 4.5 points (0.736 to 0.781), so a pass bought to
find job KINDS more accurately would be close to a waste. On RECALL they do not:
Sonnet finds 0.820 against the rules' 0.722, which is 168 true jobs against 148 —
a 13.5% relative gain, not a rounding difference. So the limits are where nearly
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
| Haiku 4.5 | $0.2027 | $0.000399 | **$12.70** | $0.16 |
| Sonnet 4.5 | $0.6432 | $0.001266 | **$40.30** | $0.49 |

Sample total **$0.8459** against a $5 cap.

The ongoing cost is the part that settles it: a new set costs **49 cents** on
Sonnet and 16 on Haiku. Either way keeping the labels current is free in practice,
so the only real decision is the one-time backfill — **$27.60** between the two,
for half the error rate on the limit family that caused the bug.

## Agreement on the random 400

Where there is no gold label, agreement bounds the disputed fraction. It is not
accuracy: two models can agree and both be wrong.

- Same job set exactly: **53.5%**
- Same jobs and every limit: **31.0%**
- Job instances: 430 both, 113 Haiku only, 150 Sonnet only
- Limit disagreement where both found the job: restrictedTo **24.1%**, recurrence
  9.2%, trigger 5.9%, threshold 5.0%, modal 2.6%, rampKind 13.3%

`restrictedTo` is where they part company, and the gold scoring says why: it is the
hardest limit for both, and the one that separates them. On the GATING subset Haiku
is 0.725 and Sonnet 0.857.

**Read that as recall, not precision.** The subset keys on GOLD's value, so 0.725
means a quarter of the restrictions that GOLD records are got wrong — it says
nothing about restrictions a model invents. That direction is counted separately:
Haiku invents 6 and Sonnet 2. The two failures cost different things. A MISSED
restriction is the original bug returning (a card matched in a deck it is dead in);
an INVENTED one refuses a stand-in that would have been fine. Sonnet is better on
both.

## Four things the sample found that were not in the brief

0. **The first draft of this report recommended the wrong model.** Its
   tribal-restriction figure came from an uncommitted ad-hoc command using the
   naive same-kind job pairing that `label-cards-score.mts` already documents as a
   defect, and it understated the gap between the models by half. Recorded here
   rather than quietly corrected, because the lesson generalises: **a figure the
   committed scripts cannot reproduce should not appear in a table.** Every number
   in this report is now emitted by a committed script into a committed artifact,
   and the pre-open review caught this by checking the tables against the JSON
   rather than against the prose.

1. **A gap in the ramp kinds, found by hand-labelling.** Generator Servant's
   `{T}, Sacrifice this creature: Add {C}{C}` fits none of E1's three kinds: not
   `tapsForMana` (gone after one use), not `fetchesLand`, not `makesTreasure` (no
   token — the mana is added directly). `Blood Pet`, the Eldrazi Scion tokens and
   every sacrifice-for-mana land are the same shape. Forcing it into
   `makesTreasure` would have recreated the very false match the kinds exist to
   prevent, both being "one-time mana". Raised with 2b, ruled by d9: a fourth
   kind, `burstMana`. Seven gold jobs carry it. (The 0.955 / 0.875 above is
   accuracy over ALL 22 and 24 paired ramp jobs; nothing committed reports
   per-kind accuracy, so there is no separate `burstMana` figure to quote.)

2. **Caching the instructions cost more than it saved.** d9 asked for cached
   instructions. Measured: Sonnet wrote the cache 37 times and read it 6, because
   43 batch requests run in parallel and nearly every one arrives before any cache
   is warm. At 1.25x to write and 0.1x to read, that is **$0.0854 against $0.0784**
   without caching — a 9% loss on the instruction portion. For Haiku the
   `cache_control` is inert outright: the ~1,280-token block is under its minimum
   cacheable length, measured as zero writes and zero reads across two identical
   calls. **For the full run, either drop the breakpoint or batch sequentially
   enough that reads dominate.**

3. **The batch API is not reachable through this repo's proxy.** `ANTHROPIC_BASE_URL`
   points at `127.0.0.1:8787`, which forwards `/v1/messages` and answers
   `cave_route_not_found` for `/v1/messages/batches`. Batches go direct to
   `api.anthropic.com`; the key still comes from the `scripts/.env` convention.
   Without this the sample would have cost double.

4. **The two models disagree about what a two-faced card is called.** Sonnet
   returned `Soulcipher Board` and `Cipherbound Spirit` as separate entries where
   the catalog name is `Soulcipher Board // Cipherbound Spirit`; Haiku kept the
   joined name. Unreconciled, three cards read as "not returned" while the model
   had answered them. The collector now reconciles by face, against the asked
   names only. **A full run must do this or it silently loses every MDFC, adventure
   and transform card.**

## What to watch if this ships

- **`restrictedTo` is the weak limit**, for both models, and the reason for the
  recommendation. A quarter of the gating restrictions gold records are missed by
  Haiku against a seventh by Sonnet. If false matches survive the pass, this is the
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
  `restrictedTo` spec is genuinely ambiguous — 54% of the raw disagreements there
  were gold `creature` against a model's `none`, which is a disagreement about the
  spec rather than about the card. That is why the gating subset is reported
  separately and the gold labels were left alone rather than relabelled to suit the
  result. A second labeller disagreeing with 10% of the gold set would move the
  headline numbers by a few points; it would not move 0 to 90.

## Files

- `scripts/lib/card-labels-schema.mjs` — the schema, and the four ramp kinds
- `scripts/lib/card-labels-schema.test.mts` — vocabulary drift guard, 14 tests
- `scripts/lib/card-labels-gold.mjs` — the 108-card gold set with reasoning
- `scripts/lib/card-labels-prompt.mjs` — the shared instruction block
- `scripts/label-cards-select.mjs` — hard-class candidate selection
- `scripts/label-cards-run.mjs` — batch submission, with the spend cap
- `scripts/label-cards-collect.mjs` — collection, measured cost, face reconciliation
- `scripts/label-cards-score.mts` — precision, recall, the non-default split
- `scripts/label-cards-agree.mjs` — Haiku against Sonnet on the random 400
- `scripts/label-cards-blindsheet.mjs` — the blind sheet below
### Committed evidence

- `docs/superpowers/plans/2026-09-25-card-labels-blind-sheet.md` — **15 telling
  disagreements, columns unlabelled**, gold in a key beneath them
- `docs/superpowers/benchmarks/2026-09-25-card-labels-score.json` — every figure in
  the tables above, per model, per job kind and per limit
- `docs/superpowers/benchmarks/2026-09-25-card-labels-agreement.json` — the
  Haiku-against-Sonnet figures on the random 400

The raw labels (296KB across both models) and the 711-row disagreement list stay in
`out/` and are NOT committed: they are reproducible from the committed scripts for
about 85 cents, and the figures derived from them are committed above. Re-run
`label-cards-run` then `-collect`, `-score`, `-agree` to regenerate.
