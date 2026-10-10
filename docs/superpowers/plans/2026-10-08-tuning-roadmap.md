# Roadmap: Tuning (the deck-level hub)

Source: `docs/superpowers/design-briefs/2026-10-08-tuning.md`, Hugh's discussion notes
(`boards/tuning-discussion-2026-10-08.md`, 2026-10-08, continuing 2026-10-09). No handoff exists
yet — this roadmap sequences the work so the parts that need no Design round start immediately,
and the parts that do wait on the brief above without blocking everything behind them.

This is a plan, not an executed build. Nothing here is implemented. Each sub-project needs its
own readiness check before it starts (a plan-review pass per the standing workflow), and the
UI sub-project additionally needs a GREEN readiness audit on its handoff before any code.

## Order and dependencies

```
1. LLM cost labeling           (no Design — independent)
2. Roles-strip move + fix      (no Design — independent of 1 and 3-6)
3. Mana Balance tier 1 engine  (no Design — logic only, behind a switch)       ─┐
4. Proposed cuts tier 1 engine (no Design — logic only, behind a switch)       ─┤ parallel, both
                                                                                 │ depend on 2
5. Tuning hub UI               (needs Design — the brief above)  ◄─────────────┘ depends on 3, 4
6. Tier-2 model passes         (Mana Balance "Look deeper"; Proposed cuts' model pass, the
                                 main path) — depends on 5 shipping, and on the golden-deck eval
                                 existing (part of 3/4's own scope, reused here)
7. About entry + ABOUT_VERSION bump (last, once 5 and the tier-2 passes that ship are done)
8. Suggested changes, two lists  (no new Design round; independent of 5, ships before it if ready)
```

Sub-projects 1 and 2 have no dependency on anything else in this line and should start first —
they are also the two with PR boundaries named below, so they can begin the moment this doc is
approved. 3 and 4 depend only on 2 (the roles strip's "Balance mana" contextual link reads the
same mana-count the tier-1 engine produces, so the engine needs to exist before the strip can
link to it meaningfully, even though the strip itself moves in sub-project 2). 5 cannot start
until Design has drawn the hub (the brief) AND both tier-1 engines exist to mount. 6 is gated on
5 shipping, since a model pass with nowhere to render is dead code, and on the eval infrastructure
sub-projects 3/4 build. 7 is always last, per the standing About rule.

## Sub-project 1: LLM cost labeling

**No Design needed.** Pure plumbing: tag every model call with its origin and report spend by
origin and feature.

**What exists today** (confirmed by reading the code, 2026-10-08):
- `model_calls` (`src/db/schema.ts:1791`) already records every PLAYER-INITIATED call: one row
  per run, `feature` constrained to `'tuning' | 'synopsis' | 'intake'`, `status`
  (`reserved`/`spent`/`refunded`), and since migration 0057 the usage meters and
  `cost_micro_usd` (`src/lib/model/prices.ts`'s `costMicroUsd`). All three features today ARE
  player-initiated — the Overview, Suggested changes/"Look deeper," and Help me choose's own
  deeper read. There is no `origin` column because every row has had the same origin so far.
- **System calls have no comparable ledger.** Card labels (`scripts/label-cards-*.mts`,
  `scripts/lib/card-labels-pricing.mjs`) and commander prose
  (`scripts/generate-commander-prose.ts`, bounded by `PROSE_MAX_USD`/`PROSE_MAX_COMMANDERS` per
  `AGENTS.md`) price themselves through a SEPARATE module
  (`scripts/eval/lib/pricing.mts`/`card-labels-pricing.mjs`, not `src/lib/model/prices.ts`) and
  report their spend to a workflow summary or a build ledger (`catalog_builds.report`), never to
  `model_calls`. Scheduled contract checks (`check:scryfall`, `check:manapool`, `check:spellbook`)
  call no model at all — they validate upstream payload shape, so they cost nothing and need no
  tag.
- **The smallest change** that gives one spend-by-origin report without duplicating two pricing
  systems: add `origin text not null check (origin in ('system', 'player'))` to `model_calls`,
  backfill every existing row to `'player'` (true for all of them today), and widen the `feature`
  check constraint to add the system features that will start writing rows here: `'labels'`
  (card labels) and `'prose'` (commander prose). The two scripts gain one write each — a row
  inserted into `model_calls` alongside whatever they already write to their own ledger/report —
  rather than a second reporting system. A report query (`sum(cost_micro_usd) group by origin,
  feature`) then answers "spend by origin and feature" directly from one table, for any window.
- **What stays separate**: the scripts' own detailed ledgers (`card-labels-ledger.mjs`'s per-run
  JSON, `catalog_builds.report`) are not replaced — they carry per-card and per-run detail
  `model_calls` has no room for. `model_calls` becomes the one place every call's DOLLARS and
  ORIGIN are recorded, for budgeting; the ledgers stay the place for debugging one run.
- **Not in scope for this sub-project**: a UI for the spend report (a script printing a table is
  enough to start, matching how `measure-gap-line.mts` and `db:build:staples` already print their
  own derivations for anyone disputing them); and retrofitting historical card-labels/prose spend
  into `model_calls` (those runs' costs are already recorded in their own ledgers and are not
  lost, just not merged).

**PR boundary** (one PR, ~8-10 files):
- Migration: `origin` column on `model_calls` (not null, default `'player'` for the backfill,
  then drop the default once new rows are expected to always state it explicitly), widen the
  `model_calls_feature_check` constraint to include `'labels'` and `'prose'`.
- `src/db/schema.ts`: the new column and constraint.
- `src/lib/model/allowance.ts` / wherever `model_calls` rows are written today for tuning/synopsis/
  intake: pass `origin: 'player'` explicitly (no behavior change, just no longer implicit).
- `scripts/lib/card-labels-pricing.mjs` (or its caller `label-cards-run.mts`) and
  `scripts/generate-commander-prose.ts`: write one `model_calls` row per call (or per batch, for
  labels' batched requests) with `origin: 'system'`, their own `feature`, and the cost already
  computed by their existing pricing module — no new pricing math, just a new write.
- A new `scripts/report-model-spend.mts` (or similar): prints spend by origin and feature over a
  window, read-only, no database mutation beyond what the two writers above already do.
- Tests: the constraint change, the new script's grouping logic against a fixture.

## Sub-project 2: Roles-strip move + "consider →" fix

**No Design needed.** The strip's own visuals do not change; only where it mounts and whether its
link works.

**What exists today** (confirmed by reading the code, 2026-10-08):
- `RoleCounterStrip` mounts twice in `builder-shell.tsx`: once at line 1471, gated
  `!analysisEnabled`, on "Your deck's" own spine; once at line 1611, gated on the Analysis tab
  being on, `inset`, inside `AnalysisPanel`. Round 0 (an earlier ship) moved it into the Analysis
  tab on purpose, trading the tab's vertical space for "something true on the day the tab lands."
  Hugh's 2026-10-08 ruling reverses that: one place, "Your deck," regardless of whether the
  Analysis tab (soon: Tuning) is on.
- **The fix**: render the strip unconditionally at "Your deck" (drop the `!analysisEnabled` gate)
  and delete its second mount inside the Analysis panel. This also means `inset` (the prop that
  drops the strip's own gutters when nested inside the Analysis tab's padding) becomes dead and
  should be removed from `RoleCounterStripProps`, not left as an unused option.
- **The "consider →" link**: `seeShelf` (`builder-shell.tsx:1184`) is a two-step move — switch
  `view` to `"consider"`, then scroll to the shelf once Consider is in the DOM, via a ref
  (`pendingShelf`) consumed by an effect keyed on `view`. This sub-project's engineering task is
  to actually reproduce Hugh's report (press "consider →" from the strip as it ships today) and
  find why it does nothing, rather than guess from the code alone — the two-step pattern looks
  sound on inspection, so the defect may be in a stale `shelvedRoles` set, a race between the
  strip's own render and `rolesWithShelves(suggestions)`, or something only visible by reproducing
  it. **This brief does not assert a diagnosis**; the roadmap only commits to finding and fixing
  one before this PR closes.
- **This sub-project is where "Balance mana" as a contextual link gets ITS anchor point** (the
  strip's lands cell), even though the Mana Balance tool it links to does not exist until
  sub-project 3. Land the strip move and the consider-fix now; wire the actual "Balance mana"
  href once sub-project 3's engine exists and sub-project 5 draws where it opens to. Do not add a
  dead link in this PR.

**PR boundary** (one PR, ~4-6 files):
- `builder-shell.tsx`: drop the `!analysisEnabled` gate on the first `RoleCounterStrip`; delete
  the second mount and its surrounding `inset`-specific JSX inside `AnalysisPanel`.
- `role-counter-strip.tsx`: remove the `inset` prop and its conditional classes, now dead.
- Whatever fixes the "consider →" defect (file TBD until reproduced) — likely
  `builder-shell.tsx`'s `seeShelf`/`shelvedRoles` or `role-counter-strip.tsx`'s own click wiring.
- Tests: a regression test for the consider-fix (reproduce the exact broken case first, per
  `superpowers:systematic-debugging`'s own discipline of confirming a failing case before
  fixing it), and an update to any test asserting the strip's double-mount.

## Sub-project 3: Mana Balance, tier 1 engine

**No Design needed for the engine itself** (the UI that renders its output is sub-project 5).
Behind a switch (name TBD at implementation, following the `*_ENABLED` pattern — e.g.
`MANA_BALANCE_ENABLED`).

**Scope**: a pure function (or a small module, matching `src/lib/tuning/`'s own shape) that:
- Reads the deck's cards, resolves each to its mana-producing text (basics, duals/utility lands,
  rocks, dorks, land search) against the catalog, never guessing from a card's name.
- Computes pip demand per color as plain pip counts from the deck's spell costs (Hugh, 2026-10-09,
  ruling (c) below: curve weighting is dropped, per the Deck stats plan's Ruling 10).
- Produces the counted-fact output the brief describes (short colors, by how much; rebalance,
  trade-for-ramp, and missing-staple suggestions, each with its own counted fact).
- The missing-staple check reads `format_staples` and the commander's own most-played ramp from
  `commander_support_cards`, owned-cards-first — this is a read against the already-built
  commander index (`AGENTS.md`'s "Catalog builds are made once, on staging, and copied to
  production"), not a new index.
- **The golden-deck eval harness** (shared with sub-project 4 and with tier-2 passes later):
  extends `docs/superpowers/eval/metrics-tuning.md`'s existing pattern to score Mana Balance's
  tier-1 output against Hugh's "HD - Gishath" deck
  (`904fdc61-e190-4ba5-8e34-2b18fa0584f2` on staging) and whatever other decks join the golden
  set. Since tier 1 makes no model call, "scoring" here means asserting the counted output is
  correct against a hand-checked expectation for that deck, not scoring a model's prose.

**Cost implications**: none. No model call in tier 1; the eval harness that scores it against the
golden deck set is read-only against staging and costs nothing (per the AGENTS.md convention:
measure on staging, mutate on local-dev — this sub-project only reads).

**PR boundary**: not named in this roadmap per the task's scope (only the first two sub-projects
get named PR boundaries); at implementation this likely splits into the counting engine (one PR)
and the suggestion-generation + missing-staple check (a second), each independently testable.

## Sub-project 4: Proposed cuts, tier 1 facts layer

**Amended 2026-10-09 (Hugh): Proposed cuts is model-first.** The tier-1 engine built here ranked
cuts by inclusion, role surplus, curve crowding and bracket flags. Scored against the 58 cuts Hugh
made across his five v1 to v2 decks it put 10 in its top K (17%, 1.1x chance); label roles gave 12
and weights tuned leave-one-out gave 12. So the free pass shows **no ranked list**: it keeps the
counted facts (roles over target, curve crowding, bracket flags, thin-data notes) and the model
tier (sub-project 6) is the path to a shortlist. Plan: `2026-10-09-proposed-cuts-model-tier.md`.

**No Design needed for the facts layer itself.** Behind `PROPOSED_CUTS_ENABLED`. The hub's free
state does need a redraw (see the plan's Needs Design).

**Scope**: a pure function that, for a deck over 100 cards, returns the counted facts the model is
told and the hub draws: roles over target (reusing `src/lib/decks/mix.ts`), curve crowding, bracket
flags against the declared bracket, and the thin-data notes. Commanders and locked cards are hard
exclusions. Every fact is a figure the app can show.

**The eval is the record behind the ruling**: `pnpm eval:cuts`, read-only against staging, free.

**Cost implications**: none for the facts layer.

## Sub-project 5: The Tuning hub UI

**Needs Design.** This is where the brief above is built from, once it has a GREEN readiness
verdict (the standing readiness-audit rule — never skipped, per
`feedback_readiness_audit_never_skipped`). Depends on sub-projects 3 and 4 existing (the hub needs
real engines to mount, not placeholders) and on sub-project 2 having already moved the roles strip
(the strip's "Balance mana" link needs a live destination).

**Scope** (from the brief): the hub landing and its four tiles, Suggested changes moved inside it
unchanged, Mana Balance's free-tier result and its "Look deeper" entry point (the press itself,
not yet wired to a model — see sub-project 6), Proposed cuts' shortlist UI, and History reading
`deckSuggestionRuns` (extended, if the engines need a shared run-ledger shape across three tools
rather than one table per tool — an implementation decision, not a Design one) across all three
tools. The contextual entry points (decklist's "over by N," roles strip's "Balance mana") land
here, now that both destinations exist.

**Cost implications**: none directly (no new model calls); this sub-project is where the UI for
tier 2's eventual model calls gets built, so it should leave an obvious seam for sub-project 6 to
wire into (a "Look deeper" button that is present but calls nothing yet, versus one added later —
ruling 1 settles it: the press is present from the start).

**Switch**: reuses or extends `ANALYSIS_TAB_ENABLED` (confirmed read in `builder-shell.tsx`,
`about/visible.ts`, `swaps/flag.ts`, and others per the existing pattern) — whether Tuning gets
its own switch or rides the existing one is an implementation decision once the hub's relationship
to the Analysis tab is drawn (the brief leaves "does Tuning replace, rename, or sit inside the
Analysis tab" open to Design).

## Sub-project 6: Tier-2 model passes

**Needs Design only for whatever the hub didn't already draw** (if sub-project 5's seam for "Look
deeper" is a plain "coming soon" button, this sub-project needs its own small round to draw the
real result; if sub-project 5 already drew the full tier-2 result frame, this is engineering-only).

**Scope**: Mana Balance's "Look deeper" — a model call, grounded in tier 1's counted facts
(per the accuracy-and-humility principle: tier 1's facts are what the model is told, not what it
re-derives), through the shared model client (`src/lib/model/client.ts`), spending a credit
through the existing allowance (`src/lib/model/allowance.ts`), citing its claims the way Suggested
changes' `presentation.ts` already does. Proposed cuts' model pass is built here and is the main
path (Hugh, 2026-10-09, ruling (a) as amended): the golden-deck eval found the free ranking at 17%
of his cuts, near chance. Plan: `2026-10-09-proposed-cuts-model-tier.md`.

**Resolves the open free-first/deep-by-default question** (below) as part of its implementation,
following whatever Hugh decides.

**Cost implications**: real, per-run, the first actual new model spend in this line. Each tier-2
run needs its own entry in `FEATURE_CALLS` (`src/lib/model/prices.ts`) with a measured input
ceiling (the way tuning/synopsis/intake's ceilings were each measured against staging's real
decks before being set) and its own `model_calls` row at `origin: 'player'`, `feature:
'mana_balance'` (or similar) — the cost-labeling sub-project's widened check constraint needs to
anticipate these new player-initiated feature names too, not only the system ones; revisit
sub-project 1's constraint list once these names are chosen.

## Sub-project 7: About entry + ABOUT_VERSION bump

**Last, always.** Per `AGENTS.md`'s standing rule: a multi-round feature line batches its About
entry at the end, describing the thing as it finally works. Drawn by Design on the per-entry
artboard (`design/design_handoff_the99_about/`), bumping `ABOUT_VERSION` once this whole line is
done (whichever of sub-projects 5/6 are the actual last to ship — if Proposed cuts' model pass never
ships, this sub-project does not wait for it).

## Sub-project 8: Suggested changes, two lists

**No new Design round.** The change follows Design's tuning-hub drawing (PR #1312, `Additions` and
`Cuts` lists, one rationale per card). Independent of sub-project 5: it applies to the SHIPPED
Suggested changes panel (`src/components/decks/tuning-panel.tsx` and its manifest) and can ship
before the hub exists; the hub then inherits it. Hugh's clarification, 2026-10-09.

**Scope**:
- Model contract: the prompt and the validator move from one rationale per swap to two lists,
  Additions and Cuts, each card carrying its own rationale.
- Rendering: the panel draws the two lists as the handoff does.
- **Eval re-run**: the golden-deck eval is re-run against the new contract. It is a paid run and
  needs Hugh's OK on cost before it starts.

**Cost implications**: the eval re-run is the only new spend; per-run cost of the feature itself
is expected to be unchanged, to be confirmed by that eval.

## Rulings (Hugh, 2026-10-08)

No questions remain open. The numbers are Hugh's.

1. **Free first.** The free result shows instantly, with "Look deeper" (1 credit) at the top. No
   always-deeper setting for now.
2. **Tuning sits inside Analysis**, where Suggested changes is today.
3. **History is one shared run record for every tool.** Sub-project 5 extends
   `deckSuggestionRuns` (or its successor) into a tool-generic ledger; three per-tool tables are out.
4. **Proposed cuts is offered when the total passes 100, commander(s) included**, matching the
   deck's "Over" status.
5. **Cost report: system batch jobs write ONE summary line per batch** (`origin: 'system'`); the
   per-card ledgers stay. Sub-project 1 writes one `model_calls` row per batch for card labels and
   commander prose.
6. **Thin EDHREC data: run anyway and say what is missing.** Mana Balance needs no EDHREC data;
   Proposed cuts uses roles and curve and names the missing signal. Neither engine refuses.

## Rulings (Hugh, 2026-10-09)

Made on the Tuning hub R1 readiness audit (PR #1312).

(a) **Proposed cuts' paid "Look deeper" (tier 2) was deferred to the eval; the eval answered it
    (2026-10-09).** The free ranking found 10 of Hugh's 58 cuts (17%, 1.1x chance), so Proposed cuts
    is model-first: the free pass shows counted facts and no ranked list. Design's C1 to C3 need a
    redraw; C5 to C9 stand.
(b) **Suggested changes adopts Design's two lists, Additions and Cuts, with one rationale per
    card.** A model-contract change (prompt plus validator), then an eval re-run, which needs
    Hugh's OK on cost. It applies to the shipped panel as well as the hub: sub-project 8.
(c) **Curve weighting is dropped** (Deck stats plan, Ruling 10). Mana Balance's demand is plain
    pip counts (sub-project 3).

Note: the brief's tab names "Your deck, Your games" are stale. The shipped tabs are
`Your deck · Analysis · Consider`, and the handoff correctly draws against them.
