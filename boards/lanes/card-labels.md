# Lane: card labels — is a one-time model pass worth it?

**Owner:** the-99-4a · **Orchestrator:** the-99-d9 · Opened 2026-09-25

## The question

Swap-tools stand-ins match on coarse text-rule labels and produce FALSE
MATCHES. The question is whether a ONE-TIME model pass that labels every
Commander-legal card's jobs and the LIMITS on those jobs is worth the spend, and
on which model. Nothing runs per request, ever.

Hugh approved spend above the normal caps for the eventual full run (~32k cards),
**conditional on this sample**: Haiku 4.5 against Sonnet, taking Sonnet only if
it is markedly better.

## The false matches this exists to fix

- **Bejeweled Warg** matched **Runadi** twice over. On `+1/+1 counters`, where
  the Warg's are Wolves only and the deck is Dinosaurs. And on `ramp`, where the
  Warg makes a Treasure on combat damage while Runadi taps for `{G}` — the same
  word for a conditional one-shot and a repeatable mana ability.
- **Generator Servant**: one-shot mana, and haste for a single spell.

Both are the same shape: the JOB is right and the LIMIT is missing.

## Scope

Deliverable is a SAMPLE and a REPORT. **The full run is not in scope.**

1. Schema — per card, a list of jobs, each with a kind and its limits.
2. Gold set — ~100 cards, hand-checked against oracle text, weighted to the hard
   cases.
3. Run both models over gold plus ~400 random cards for agreement rates.
4. Score precision and recall per job and per limit, for Haiku, Sonnet and
   today's text rules.
5. Report to d9.

## Hard constraints

- **$5 total** for this sample. Batch API, cached instructions, batched cards.
  Tokens and cost printed per run.
- **No database writes of any kind.** Sample outputs are files in the worktree.
- The job vocabulary is **2b's approved one** — `src/lib/recs/themes.ts`, the
  role classifier, and the ramp kinds. Asked for, never invented.
- `ANTHROPIC_API_KEY` comes through the `scripts/.env` convention, as
  `db:build:prose` does. Never printed.
- Text-rule comparison is measured after 2b's **PR E1** if it has merged, and
  the report says which.

## Fence

```
scripts/label-cards*
scripts/lib/card-labels*
docs/superpowers/plans/2026-09-2*-card-labels*.md
boards/lanes/card-labels.md
```

## Dependencies

- **2b** — the approved job vocabulary and ramp kinds, and the E1 residue list
  (cards the text rules get wrong), which is a gold-set source. Asked.
- **E1's merge state**, for which text-rule baseline the report names.

## Outcome

**The answer: yes, on Sonnet 4.5, about $41.09** for 31,830 Commander-legal cards.
Today's text rules score 0 on every limit's non-default subset; Sonnet scores 1.000
on tribal restrictions, 0.864 on the wider gating set, 0.917 on ramp kinds.

- **#1034 MERGED** (2605e279) — the instrument, the 108-card gold set and the report,
  with three committed artifacts so every current figure is reproducible.
- **#1031 OPEN, held for Hugh** — the full-run plan. His approval is its review.
- **#1032 MERGED** (be9d2fab) — a side task: the clock-shifted suite moved off every
  PR onto a nightly, after it doubled CI (median 17 min to 35).

Measured spend: **$1.7048** of the $5 cap, across two runs — the first was
contaminated and re-run.

## What this lane found that nobody asked for

1. **A gap in the ramp kinds.** Generator Servant's mana fits none of E1's original
   three. d9 ruled a fourth, `burstMana`.
2. **Two-faced contamination.** `oracle_text` stores BOTH faces, so the prompt was
   labelling back-face abilities against front-face-only gold, and the baseline was
   measured without the `frontFaceOracle` that `stand-ins.ts:47` applies — the models
   were compared against a HANDICAPPED version of the rules. Re-run; it moved two
   conclusions.
3. **Caching cost more than it saved.** 53,277 cache-write tokens and zero reads on
   the current run; inert for Haiku outright.
4. **The batch API is unreachable through this repo's proxy.**
5. **The models disagree about two-faced card NAMES**, which would silently lose every
   MDFC, adventure and transform card from a full run.

## Carried into #1031 rather than fixed here

- an orphaned submission intent is never cleared, so `unreconciled()` reports it for
  ever — harmless here (the cap refuses another run), a requirement on the full run
- `--publish` does not prove both labels files came from one run

## The lesson worth keeping

Nine of the twelve rounds' 27 findings were **stale figures in prose contradicting the
committed artifacts**, in four different shapes. I fixed each shape as it escaped
rather than the pattern, and the mechanical verifier that finally caught them was
itself a round-4 addition that round 5 found to be a tautology. The guard covers the
shapes it has been taught and the report's claim now says only that.

## Log

- 2026-09-25 — lane opened, guard armed, worktree `.worktrees/card-labels`.
- 2026-09-26 — #1034 merged after 12 rounds; #1031 held for Hugh; lane complete.
