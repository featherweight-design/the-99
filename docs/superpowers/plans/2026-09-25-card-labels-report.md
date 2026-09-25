# Is a one-time model pass that labels card jobs and their limits worth it?

Sample and report, 2026-09-25. Commissioned by d9; spend approved by Hugh above
the normal caps for the full run, conditional on this sample. **The full run has
not been run.** Nothing here writes to any database, and nothing runs per request.

## The answer

**Yes, and on Haiku 4.5.**

The pass buys exactly one thing, and it is the thing that is broken: the LIMITS on
a job. Today's text rules score **0 on every limit** — not poorly, zero, by
construction, because they cannot express one. A model gets ~90% of the two limits
that caused the reported false matches.

Sonnet is **not markedly better** on those two limits. It is better at some things
and worse at others, for 3.2x the cost. Hugh's condition was Sonnet only if
markedly better, so the recommendation is Haiku.

## The two limits that caused the bug

`Bejeweled Warg` matched `Runadi` twice: on `+1/+1 counters`, where the Warg's go
on a **Wolf** and the deck was Dinosaurs; and on `ramp`, where the Warg makes a
**Treasure on combat damage** and Runadi **taps for {G}**. So the decisive
measurements are the tribal restriction and the ramp kind.

| | tribal restriction | ramp kind |
|---|---|---|
| **Haiku 4.5** | 87.5% (28/32) | **95.5% (21/22)** |
| **Sonnet 4.5** | **90.9% (30/33)** | 87.5% (21/24) |
| today's text rules | **0%** (0/32) | **0%** (0/21) |

Each model wins one. Neither is markedly better than the other; both are
transformatively better than nothing.

## Full scores against the gold set

108 hand-labelled cards, 205 jobs. JOB = did it find the right job kinds. LIMIT =
on the jobs it got right, did it get the limits right.

| | Haiku | Sonnet | text rules |
|---|---|---|---|
| JOB precision | **0.781** | 0.760 | 0.736 |
| JOB recall | 0.732 | **0.820** | 0.722 |
| rampKind | **0.955** | 0.875 | 0 |
| restrictedTo, gating only | 0.725 | **0.857** | 0 |
| trigger | **0.938** | 0.921 | 0 |
| recurrence | 0.781 | **0.853** | 0 |
| threshold | 1.000 | 1.000 | 0 |
| modal | 1.000 | 1.000 | 0 |

**The job columns are the finding nobody expected.** All three are within 6 points
of each other on finding job KINDS. A model pass bought for job discovery would be
close to a waste; the text rules already do that about as well. Every bit of the
value is in the limit rows.

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

The ongoing cost is the part that settles it: a new set costs **16 cents** on
Haiku. Whatever is chosen, keeping the labels current is free in practice, so the
only real decision is the one-time backfill — a $27.60 difference between the two.

## Agreement on the random 400

Where there is no gold label, agreement bounds the disputed fraction. It is not
accuracy: two models can agree and both be wrong.

- Same job set exactly: **53.5%**
- Same jobs and every limit: **31.0%**
- Job instances: 430 both, 113 Haiku only, 150 Sonnet only
- Limit disagreement where both found the job: restrictedTo **24.1%**, recurrence
  9.2%, trigger 5.9%, threshold 5.0%, modal 2.6%, rampKind 13.3%

`restrictedTo` is where they part company, and the gold scoring says why: it is the
hardest limit for both. On the GATING subset Haiku is 0.725 and Sonnet 0.857 — so
about a quarter of Haiku's gating restrictions are wrong. Against rules that get
none of them, that is still the difference between a feature that works and one
that does not, but it is the number to watch if false matches persist.

## Four things the sample found that were not in the brief

1. **A gap in the ramp kinds, found by hand-labelling.** Generator Servant's
   `{T}, Sacrifice this creature: Add {C}{C}` fits none of E1's three kinds: not
   `tapsForMana` (gone after one use), not `fetchesLand`, not `makesTreasure` (no
   token — the mana is added directly). `Blood Pet`, the Eldrazi Scion tokens and
   every sacrifice-for-mana land are the same shape. Forcing it into
   `makesTreasure` would have recreated the very false match the kinds exist to
   prevent, both being "one-time mana". Raised with 2b, ruled by d9: a fourth
   kind, `burstMana`. Seven gold jobs carry it, and the models get it right
   95.5% / 87.5%.

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

- **`restrictedTo` is the weak limit**, for both models. A quarter of Haiku's
  gating restrictions are wrong. If false matches survive the pass, this is why.
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
- `out/` — raw labels, scores, disagreements, blind sheet (not committed)

See `out/blind-sheet.md` for 15 telling disagreements, columns unlabelled.
