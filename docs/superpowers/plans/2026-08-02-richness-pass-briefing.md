# Epic Run Briefing — Visual Richness Pass, Phases 2–4 (#59, #60, #61)

Run mechanics live in the `epic-run` skill. This briefing carries only the
feature-specific facts, plus the drift amendments the eight-day-old execution
plan needs before it can be followed literally.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-07-25-richness-pass-58-61.md` — master sequencing.
   Phases 2–4 are Tasks 13–23. Follow its order exactly, subject to the
   amendments below.
2. `design/design_handoff_the99_richness/READINESS.md` — 🟡 Yellow, audited
   2026-07-24. Its seven eng-side clarifications are the decision record.
3. `design/design_handoff_the99_richness/README.md` — the pass itself; voice
   snapshot is locked verbatim.
4. `design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html` — visual
   ground truth for all three phases. Open in a browser.
5. The v1 per-surface handoffs (`collection`, `commanders`, `decks`) — the pass
   *merges into* their property tables rather than replacing them.

## Current state (verified 2026-08-02)

Phase 1 (#58) shipped as PR #66 on 2026-07-25. Verified by artifact, not by
checkbox — every checkbox in the execution plan is still unticked, including
Phase 1's, so the file is not a progress record.

Confirmed present on `origin/main` @ `65a5140`:

- `src/components/character/crab.tsx`, `kaiju.tsx`, `loader-dots.tsx`
- `src/lib/copy/shell.ts`, `src/lib/copy/color-labels.ts` (`guildLabel` and
  `colorWords` are both exported; the READINESS doc's
  `src/lib/collection/color-labels.ts` was never the real path)
- a `prefers-reduced-motion: reduce` block and a global `:focus-visible` rule,
  both in `src/app/globals.css` — grep for them rather than trusting a line
  number; this file has moved twice since the plan was written
- `src/app/not-found.tsx` and the loading screen — the two states the audit
  flagged as unreachable are now reachable

Confirmed **absent**, i.e. the actual remaining work:

- `Kaiju` is imported by nothing. Its own file comment claims it "Appears in
  exactly one place: the decks 99/99 completion reveal" — a statement that is
  currently false in both directions: it appears in no place, and the reveal it
  names does not exist. The pass's single biggest visual moment is dead code.
- `src/components/decks/completion-reveal.tsx` does not exist.
- Copy modules for the three remaining surfaces do not exist. Only
  `collection.ts` (from the filter work, unrelated), `issue-inspector.ts`,
  `shell.ts` and `color-labels.ts` are present.
- `no-results.tsx` still renders the v1 `"?"` card fan; `filtered-empty.tsx`
  still renders v1 dimmed pips. Neither hosts the crab.
- 99/99 in `builder-spine.tsx` still resolves to a green progress bar
  (`built >= 99 ? "#6FA368"`) — the v1 completion treatment.

`#58` is still open on GitHub despite having shipped: the closing keyword bound
only the first `#N` in PR #66's body. Close it during this run's bookkeeping.

### Drift since the plan was written — REQUIRED READING

The plan merged 2026-07-25 (`8e7919d`). Seven PRs have landed since, and
**every file Phases 2–4 target has changed**:

| File | Commits since plan | Phase |
|---|---|---|
| `src/app/commanders/page.tsx` | 5 | 3 |
| `src/app/collection/page.tsx` | 4 | 2 |
| `src/components/commanders/filtered-empty.tsx` | 3 | 3 |
| `src/components/decks/builder-shell.tsx` | 3 | 4 |
| `src/components/decks/builder-spine.tsx` | 3 | 4 |
| `src/lib/decks/read.ts` | 2 | 4 |
| `src/components/collection/no-results.tsx` | 1 | 2 |
| `src/components/commanders/degraded-banner.tsx` | 1 | 3 |

Treat every line number and every inline code snippet in the execution plan as
stale until re-read. Three drifts are behavioural, not cosmetic:

**A. #139 made deck mutations optimistic — collides with the celebration trigger.**
`useOptimistic` now paints the committed state on click and rolls back if the
server refuses. Plan Task 20 specifies `shouldCelebrate` / `celebrationKey`
against a server-derived count and predates this entirely. An optimistic add
can take the built count to 99 and then roll back on a refusal, firing the
kaiju for a deck that never completed. **The celebration must key off the
revalidated server value, never the optimistic one** — this is Defect Class 12
in the skill's list, and #139's own commit message documents the same trap
("clearing on success drops the override before the new HTML lands"). Amend
Task 20 accordingly and cover the roll-back case in its TDD step.

**B. #138 split the commanders degraded state in two.** `fitSynergy === null`
used to conflate "EDHREC is down" with "EDHREC does not index this commander";
`synergyState` now carries the difference through to the components, and each
state has its own copy. Plan Tasks 17 and 19 assume a single degraded banner
and instruct "confirm the degraded banner was not touched". That guard now
covers **two** states, both of which must stay straight — the handoff ships the
degraded case as a deliberate counter-example to show where character is *not*
allowed. Neither gets the crab.

**C. #134 moved every collection filter-row dropdown onto the shared
FilterPanel.** Phase 2's density deltas (grid gap, tile padding) were written
against the pre-FilterPanel layout. Re-measure before applying; a padding delta
applied on top of a shared primitive can regress every consumer, not just
collection.

**D. Collection now has four filter dimensions, and the mock's heading covers
two.** `filters` carries `search`, `colors`, `types` and `setCodes` (#114, #99,
#134). The Surfaces v2 no-results heading names only the query and the colour
(`Nothing matches "counterspell" in Red.`), so a user filtered to zero by type
or set alone falls through to the generic `"Nothing matches those filters."`.
That degrades correctly rather than breaking, and inventing copy Design did not
write is out of scope for this pass — but flag it in #59's PR body so Design can
decide whether the heading should name the other two dimensions.

**Line numbers throughout the execution plan are stale.** Task 13's references
are off by one or two (`NoResults` is at `no-results.tsx:65`, not 64; `FanCard`
and `QuestionFan` at 13 and 34); other tasks will be worse. Grep for the symbol
rather than seeking to a line, in this briefing and in the plan.

### Tooling that does not exist here

`epic-run` assumes a monorepo with `apps/e2e` and a Playwright `audit:sweep`.
This repo has neither — no `apps/` directory, and no Playwright or Puppeteer in
`package.json`. Grepped, not assumed. Visual verification for this run is a
manual dev-server walkthrough recorded in each PR body. **Per Hugh's direction
(2026-08-02), a visual check that cannot be run never pauses the run** — skip it,
say so in the PR body and the run report, and continue. A follow-up issue tracks
adding screenshot tooling so the next epic has it.

## Risk shape

**Copy/IA-driven, with one event-driven component.**

Phases 2 and 3 are copy, marks and density on surfaces that already work. There
is no new data and no new route; the bugs will be redundant strings, wrong
vocabulary, and the crab appearing where the handoff forbids it. Gate 2 is
close to worthless here and Gate 6 does not fire. The Recurring Defect Classes
list — rows 8 (redundant copy), 9 (breakpoint affordance parity) and 11 — is
where the value is.

Phase 4 is different in kind. The 99/99 reveal is a one-shot event with
persisted dismissal state, layered over a mutation path that became optimistic
two hours before this briefing was written. Its bugs will be lifecycle bugs:
firing twice, firing for a rolled-back add, never firing again after a rebuild.
**Over-invest in Gate 5's repeat and reverse passes on Phase 4** and treat
Phases 2–3 as a copy review with a runtime.

## Launch gating

**Not applicable, deliberately — and this is a real determination, not an
omission.** All three surfaces (`/collection`, `/commanders`, `/decks`) are
already live and reachable by every signed-in user today. No PR in Phases 2–4
introduces a route, a nav entry, or a flag; each one re-skins a surface the user
can already reach. Nothing becomes newly reachable on merge.

The one genuinely new *state* is the 99/99 celebration, which is gated by the
user's own data (a deck reaching 99 cards) rather than by a launch flag.

`releases.ts` / changelog entries need no hold-back. Each phase is user-visible
on merge and can be announced on merge.

## Off-happy-path homes

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| Collection no-results (re-skinned) | `/collection`, in place of the grid | Filters/search match zero cards | Yes — "Clear all filters" / "Keep only search" |
| Commanders filtered-to-zero (re-skinned) | `/commanders`, in place of the list | Colour filter matches zero | Yes — "Clear colour filter" |
| Commanders EDHREC **outage** | `/commanders`, banner above list | EDHREC unreachable | Resolves itself; Retry offered |
| Commanders EDHREC **absent** | `/commanders`, per-row note | EDHREC does not index that commander | Not reversible, and correctly offers no Retry (#138) |
| Decks builder empty (re-skinned) | `/decks/<id>`, builder body | New deck, no cards | Yes — add a card |
| **99/99 celebration (new)** | `/decks/<id>`, band at top of builder | 99th card's add is confirmed by the server | Dismissible; deck stays reachable beneath |
| **Deck completed + celebration dismissed (new)** | `/decks/<id>`, normal builder | Dismiss the band, or revisit a deck completed earlier | N/A — this is the resting state |

The last two rows are the only genuinely new states, and the pair is the risk.
A user who completes a deck, dismisses the reveal, removes a card and re-adds it
must be a decided case, not an emergent one. See the constraint below.

## Dismissal keying — a named constraint

Defect Class 13: a dismissal keyed by an id that outlives the thing it describes
becomes permanent. The plan says "transition-fired with a dismissed flag" and
does not name the key.

**Decision for this run:** the dismissal key must die when the completion dies.
Key it off something that changes when the deck leaves and re-enters the 99-card
state — not off a bare `deckId`, which is immortal and would silence the
celebration forever after one dismissal. Verify empirically in Gate 5's repeat
pass: complete → dismiss → remove a card → re-add to 99 → **the reveal must
fire again**. If it does not, the key is wrong.

Use a fresh storage key name if the stored shape changes; a strict type guard
that rejects the whole store on one stale value is the documented failure.

## User journeys — walk script

### Journey 1 — Collection no-results (Phase 2)

Entry: `/collection` with a seeded collection.

1. Type a search string matching nothing → crab-hosted no-results, copy verbatim
   from Surfaces v2, no `"?"` fan anywhere.
2. Confirm the owned-count sentence reads with the real total, not a placeholder.
3. **Reverse:** "Clear all filters" → grid returns intact, scroll position sane.
4. **Repeat:** re-apply the same filter → identical state, no doubled mark.
5. **Resume:** reload while filtered to zero → state survives if it is URL-backed;
   if it is not, that is a finding.

### Journey 2 — Commanders filtered-to-zero (Phase 3)

Entry: `/commanders`.

1. Apply a colour filter matching zero → crab, new copy, dimmed pips retained
   per the v1 table.
2. Confirm **neither** EDHREC state gained a crab: force the outage banner and
   find an unindexed commander. Both stay straight. This is the handoff's own
   counter-example.
3. **Reverse:** clear the filter → list returns, ranks stable.
4. **Repeat:** re-apply → identical.

### Journey 3 — The 99/99 celebration (Phase 4) — the one that matters

Entry: `/decks/<id>` with a deck at 98 cards.

1. Add the 99th card → the reveal fires **once**, after the server confirms.
2. Throttle the network and repeat from 98: the optimistic paint must not fire
   the kaiju before the server value lands.
3. Force a refusal at 98 (off-colour or illegal card) → optimistic count touches
   99, server refuses, rolls back → **the reveal must not fire**. This is drift A.
4. Dismiss → builder beneath, focus returns sanely, no scroll lock left behind.
5. **Reverse:** remove a card → 98, no reveal, no residue.
6. **Repeat:** re-add to 99 → the reveal fires **again**. If it does not, the
   dismissal key outlives its subject.
7. **Resume:** reload while the reveal is showing → it must not re-fire on every
   load, and must not be permanently swallowed either. Decide which, state it in
   the PR body, and make the code match.
8. Reduced motion: enable it and re-run step 1 → the kaiju is present at full
   opacity and the text block is visible at opacity 1. An empty frame is a bug.
9. Mobile 375px: kaiju bleeds off the right edge, crab bottom-left, text
   unclipped, buttons stacked, no horizontal scrollbar.

Journeys 1–3 are all exercisable on local dev with seeded data. None needs staging.

## Design calls carried into the run — flag, do not re-litigate

Per Hugh, 2026-08-02: **proceed with the plan's interpretation and flag it in
design review and the PR body.** Do not open a Design addendum pre-emptively;
do not build it silently either.

1. **Band, not full-surface.** The mock captions the moment "Full-surface moment
   … then dissolves to the builder"; the plan renders a 420/380px band at the top
   of the builder. Reason: a full-surface overlay would trap focus, hide the deck
   the user just finished, and needs a scroll lock and focus trap the mock never
   specifies. This is the largest interpretive call in the pass and a reasonable
   thing for Design to reject.
2. **Dismissible-only, no auto-dismiss.** The mock says "~4s or dismissible". The
   plan implements dismissible-only, on the grounds that a 4s timer racing a
   reader is worse than a button, and "Back to the deck" is already the mock's own
   dismiss affordance.
3. **Derived mobile portrait composition.** `kaiju.svg` is a 480×380 landscape
   viewBox and does not fold to portrait; the plan derives a composition rather
   than escalating. If design review rejects it, open a light Design addendum for
   **that one frame only** and do not block the rest of #61.

State all three in #61's PR body under a "Design calls to ratify" heading.

## Hard pause points

- Any change that would re-open the locked layer — palette hues, Cinzel/IBM Plex,
  brass accent, crown motif, or the Kitchen Table voice. Contrast lifts move
  between existing tokens only; no new hex enters the codebase.
- Any use of the kaiju outside the 99/99 reveal. It is reserved for rare wins and
  reuse is explicitly out of scope.
- Any crab or wink copy on a destructive or data-loss surface, or on the working
  surfaces that stay tight: import review, issue inspector, in-place editing.
- No production database migration is expected in this epic. If one appears, stop.

## Notify-and-proceed

- **Design-call ratification** (the three above): flag in the PR body and design
  review, then continue. Do not wait on Design.
- **Skipped visual checks:** where a check needs tooling this repo lacks, record
  what was skipped and why in the PR body and the run report, then continue.
- **Plan amendments from drift:** amend in-run and record each delta in the PR
  body. No separate approval, per Hugh 2026-08-02.

## Done means

- Tasks 13–23 complete; #59, #60, #61 each merged at the full Copilot bar.
- Three copy modules exist under `src/lib/copy/` with strings lifted verbatim
  from the Surfaces v2 mock.
- `Kaiju` has exactly one importer: `completion-reveal.tsx`.
- Journey 3 walked forward, reverse, repeat and resume, with the roll-back case
  (step 3) and the re-fire case (step 6) both evidenced.
- Per-surface property tables updated with the v2 deltas.
- `docs/superpowers/design-pipeline-status.md`: the #51 richness row moves from
  🟢 to ✅ Shipped, in the same PR as the final merge.
- `#58` closed manually; `#59`–`#61` closed.
- Follow-up issue open for Playwright screenshot tooling.
- Final report produced via the `feature-run-report` skill.
