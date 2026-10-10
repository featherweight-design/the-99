# Proposed cuts, model tier — plan

Source: Hugh's ruling of 2026-10-09 and the tier-1 recall eval (`pnpm eval:cuts`, PR 2 of the
engine). Amends sub-projects 4 and 6 of `2026-10-08-tuning-roadmap.md`. Plan only: nothing here is
built, and no paid call is made until this plan has merged.

## The ruling this follows

Proposed cuts goes **model-first**. "Look deeper" is the main path. The free pass shows **no ranked
list**: it becomes counted facts only (roles over target, curve crowding, bracket flags, thin-data
notes), and those facts are what the model is told.

**Why.** Against the 58 cuts Hugh made across his five v1 to v2 decks, the shipped free ranking put
10 in its top K (17%), 1.1x what chance would. Label roles moved that to 12, and weights tuned on
four decks and scored on the fifth also gave 12. Net reductions, the cuts that are not a swap for a
better card, scored 0 of 14. Inclusion, roles and curve do not say which cards a deck can spare.

## What the free tier keeps

`src/lib/tuning/cuts.ts` stays behind `PROPOSED_CUTS_ENABLED` as the **facts layer**: the same
counted signals, minus the score and the order. PR boundary below. The tier-1 ranking, its weights
and `opensGap` penalty are removed, not left dormant. One thing the facts layer must add, from
Copilot's round-3 note on the engine PR: a bracket flag is a fact only against the declared
bracket, so the declaration is threaded in and a flag that bracket permits is not named.

## The model call

- **Model and settings:** Sonnet 5 at `effort: "medium"`, the combination Suggested changes
  shipped on after four blind rounds (`docs/superpowers/eval/report.md`). The same structured
  output and retry path (`src/lib/model/client.ts`).
- **Input:** the facts layer's output for the deck, the commander's EDHREC inclusion per card as a
  counted figure, the deck's overview Key cards (never cut), locks (never cut), the player's
  intent and notes through `playerText`, and the number to cut (`over`). No ranked list, so nothing
  anchors the model on the engine's order.
- **Output:** exactly `over` cuts, each with a one-line reason that cites a fact it was given. No
  adds: Proposed cuts takes cards out. The schema caps the count; fewer is legal and says so.
- **Validator** (`validate.ts` pattern): every name resolves in the deck, none is a commander, a
  locked card or a Key card, no duplicates, the count is `over` or fewer, and every cited figure
  equals the one in the input (a role count, an inclusion percent, a curve cell). A cut failing a
  rule is dropped, never repaired by a second call.
- **Citation pattern:** `presentation.ts`' rule keys, so the reason text and the validator share
  one source. No bracket claim in prose, as Suggested changes already forbids.
- **Credit:** one credit per press through `allowance.ts`; a new `FEATURE_CALLS` entry
  (`proposed_cuts`) with a measured input ceiling, and a `model_calls` row at `origin: 'player'`.
- **Prompt injection:** intent and notes go through `playerText`, with the system rule line.

## The eval, and why it can be trusted

Ground truth is Hugh's own cuts: five decks, 58 removals, each deck rebuilt at its pre-cut size
(v1 plus the cards v2 added), K = the number he cut. This is the same input the free-tier numbers
came from, so the model is scored against the 17% it replaces.

- **Leak control.** A v2 note often names the cards it cut ("Removing Kratos"). The eval strips
  notes and intent from the input. A second, labelled pass includes them, to show what a real
  player's note buys.
- **Metrics:** recall in the model's `over` against Hugh's cuts, split by swap against net
  reduction; validity (answered, kept after validation); reasons citing a figure that is true;
  and a blind read by Hugh of a sample, as the tuning prompt was judged.
- **What it cannot show:** a swap removal is partly a judgement about the replacement, so recall
  has a ceiling below 100% for a reason that is not the model's. It is reported beside the ceiling
  the net reductions give.
- **Held out:** prompt choices are made on three decks and scored on two, then rotated. Never the
  same decks.
- **Gishath** (no history) gets the figure checks and a read of its proposals against its Key cards.

## Measured cost

Basis: Suggested changes on Sonnet 5 at medium measured **$0.0489 per answer** (8 of 8 answered,
`eval/report.md`), at $2 input and $10 output per MTok (`src/lib/model/prices.ts`). A cuts answer
asks for up to 19 reasons against five swaps, so output is the term that grows. The first smoke
run replaces this estimate with a measured one before the rest is spent.

| Step | Answers | Estimate |
|---|---|---|
| Smoke: one deck, three trials, to measure tokens | 3 | $0.22 |
| Round 1: five decks, three trials, no notes | 15 | $1.10 |
| Round 2: same, with notes (the leak comparison) | 15 | $1.10 |
| Prompt iteration: two more rounds on the three training decks | 18 | $1.32 |
| Held-out confirmation, five decks, three trials | 15 | $1.10 |
| Blind-read sample, Gishath, retries | 12 | $0.88 |
| **Total** | **78** | **about $5.70** |

Each estimate is 78 answers at $0.0734 (the $0.0489 basis scaled 1.5x for the longer reply), and the app's one retry
included. **Approved ceiling: $15 (Hugh, 2026-10-09, relayed by the orchestrator), measured as it
goes** by pricing every reply's usage through `scripts/eval/lib/pricing.mts`. The harness stops
itself at $10 and asks before crossing $15. Batch pricing is half price where latency does not
matter; the eval uses real-time only for the latency read.

## PR boundaries

1. **Facts layer.** Cut the ranking out of `cuts.ts`; thread the declared bracket; keep the read
   behind the switch. About 6 files. Lands with the model tier's input builder so it has a caller.
2. **Model tier.** Evidence pack, prompt, schema, validator, `FEATURE_CALLS` entry, the run (Server
   Action in the `runTuning` shape). About 15 files, so split if it passes 20.
3. **Eval.** `scripts/eval/cuts-model.mts` and the metrics doc. Read-only on staging, paid calls
   priced as they land.
4. **UI and the About entry** (sub-project 5's frames, plus the entry named in the roadmap).

## Needs Design

Design's Tuning hub drawing (#1312, C1 to C9) shows a **free ranked shortlist** as the first thing
a reader sees, with Look deeper as an offer band over it. That inverts. The free state is now
counted facts with no list, and the press is the main path. Frames C1, C2 and C3 (ranking,
shortlist, part answered) need a redraw: what the free card shows when it cannot name a card, how
the over-by-N figure and the facts read together, and the Look deeper entry as the primary action.
C5 (thin data), C6 (refused), C7 (failed) and the running and result frames (C8, C9) stand. This
is a layout and UX change, so it goes back to Design; the engine work in PRs 1 to 3 does not wait.

## Roadmap amendments

Sub-project 4 is rewritten to the facts layer, and sub-project 6 names Proposed cuts' model pass as
guaranteed work rather than eval-contingent. Both edits land with this plan.
