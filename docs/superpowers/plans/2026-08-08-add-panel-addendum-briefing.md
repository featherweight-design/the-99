# Epic Run Briefing — Add panel addendum (#183 · #177 · #179 · #185 · #184 · #176)

Feature-specific facts for `epic-run`. Run mechanics live in the skill; repo conventions live in
`AGENTS.md`. Neither is restated here.

This is the second run against the same surface. The first (#158, briefed at
`2026-08-04-add-panel-briefing.md`) shipped seven PRs and closed on 2026-08-05. **Read that
briefing too** — its "Hard pause points" and its owned-pool premise still bind, and this file
records only what changed.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-08-08-add-panel-addendum-plan.md` — the execution plan. Six PRs,
   task-level. **Follow its order exactly.** It doubles as the eng spec; there is no separate spec
   document, matching #158 and the printings epic.
2. `design/design_handoff_the99_add_panel/ADDENDUM-README.md` — decisions log and component spec,
   R3. `ADDENDUM-READINESS.md` carries the verdict and the #176 ruling. The `.dc.html` is the
   canvas. `add-panel addendum · copy strings.ts` is keyed and ready to paste.
3. The six issues: [#183](https://github.com/HartiganHM/the-99/issues/183) ·
   [#177](https://github.com/HartiganHM/the-99/issues/177) ·
   [#179](https://github.com/HartiganHM/the-99/issues/179) ·
   [#185](https://github.com/HartiganHM/the-99/issues/185) ·
   [#184](https://github.com/HartiganHM/the-99/issues/184) ·
   [#176](https://github.com/HartiganHM/the-99/issues/176).
4. `design/design_handoff_the99_add_panel/README.md` and `add-panel · copy strings.ts` — the R2
   handoff. **Locked.** Propose against them; never edit them. The addendum's nine `REPLACES`
   entries are Design's own edits to that locked block and are the only sanctioned changes to it.
5. `docs/superpowers/plans/2026-08-04-add-panel-overhaul-plan.md` — the #158 plan, for why the
   current code looks the way it does.

**The canvas beats the README's prose wherever they disagree.** Re-derived three times during the
#158 run.

## Current state (verified 2026-08-08 against `e14463e`)

**No environment variables, no external services, no infrastructure, no migration.** This epic adds
no cron, no worker, no bucket, no queue, no secret, and no column. Nothing in it is
dormant-until-configured. The infra table in the final report reads "none" — say so explicitly
rather than omitting the section.

Baselines to compare against, taken on `main` at `e14463e`: **lint 118 warnings / 0 errors**,
**917 tests across 82 files**. This repo has no CI checks, no `apps/e2e`, no `releases.ts` and no
`progress.md` — the pre-push gate in `AGENTS.md` is the only gate that runs, and it runs locally.

| Claim | Where | State |
|---|---|---|
| `/decks/new` Create button is inside the mobile footer | `create-picker.tsx:479` | **Already there.** `md:hidden fixed bottom-0 left-0 right-0 z-20`, with the mini-summary and name input. See plan correction 1 |
| The shell tab bar occludes it | `nav.tsx:215` | `md:hidden fixed inset-x-0 bottom-0 z-40`. Same edge, higher z. This is the whole of #177 |
| The builder's empty `<section>` is `flex-1` | `builder-shell.tsx:338` | **False.** It carries `py-[40px] md:py-[60px]` and no `flex-1`. The `flex-1` is the scroll region at `:248`, which has no `padding-bottom` at all. See plan correction 2 |
| `RECOMMENDED_MIX.land`'s singular becomes dead data | `mix.ts` | **False.** One `label` field, live at `role-counter-strip.tsx:87`, `builder-shell.tsx:144`, `unresolved-group.tsx:122`, plus six test assertions. Delete only the comment at `:74-75`. See plan correction 3 |
| The lift string lives in `src/lib/copy/` | `suggestion-tile.tsx:109` | **False.** Hardcoded inline as `` `+${Math.round(lift * 100)} pts vs. average` ``. `tile.lift` is a new key *and* a de-hardcoding |
| Unowned staples already reach Consider | `actions.ts:105-170` | Present since #25. `.slice(0, 5)` at `:152`, merged at `:173`, carrying `owned: false`. They signal themselves today only by the absence of a dot |
| Remove ✕ is desktop-only | `decklist-row.tsx:109-120` | `hidden md:block`. A phone deck can be filled and never emptied — this is #179 |
| One live region exists | `builder-shell.tsx:244-246` | `sr-only aria-live="polite" aria-atomic="true"`, written only by `announceAdd` (`:131-152`). Removal and undo write to **the same** region |
| `scrollToShelf` moves focus | `builder-shell.tsx:5-6` | **No.** `scrollIntoView({ block: "start" })` only. Shelf headings have `id="shelf-${role}"` (`consider-panel.tsx:91,106`) but no `tabIndex={-1}` |
| Re-add is available for undo | `actions.ts:185` | `addCardToDeck(deckId, oracleId): Promise<DeckMutationResult>`. Undo is a re-add, not a rollback — no new server action |

**Re-verify at kickoff.** Every row above was read directly, not inferred. But #199 merged on
2026-08-08 and nothing has touched `src/` since; if that has changed, re-read before trusting the
table.

## Risk shape — layout and keyed state

Two clusters, and they fail differently.

**Layout (PR 2).** The bottom-of-viewport rule is arithmetic applied on two routes. It cannot be
proven in jsdom — an occlusion bug is two `position: fixed` elements agreeing on `bottom: 0` and
disagreeing on `z-index`, which no unit test sees. **Gate 2's runtime pass is the only thing that
catches it**, and it must run at a phone viewport on both routes with content long enough to scroll.

**Keyed state (PR 3).** The undo row is the first thing in this app that outlives the component
that created it. Its lifetime is deliberately long — it survives a tab switch — so every question
Gate 5's repeat pass asks applies: what key holds it, and does that key die when the card does?
The #70 precedent (a nudge keyed by `eventId` instead of `userEventId`, silenced forever by one
dismissal) is the exact failure shape.

Gate 6 (side-effect provenance) does **not** fire — nothing here creates records in response to
events.

## Launch gating — nothing becomes newly reachable

**No flag, no runbook step, no dark period, and no decision to make.** Every one of these six
tickets is a fix to a surface that shipped in #158 and is live at `/decks/[id]` and `/decks/new`
today. There is no PR whose merge turns a vertical on, which is what this question exists to catch
(#794 made a private-beta app publicly browsable the moment its last PR merged).

Each PR is independently shippable and independently valuable. A run that stops after PR 3 leaves
production strictly better than it found it. **There is no ordering constraint for correctness** —
the order in the plan is chosen to keep four PRs off the copy file, which is the epic's only real
merge-conflict surface, not because a later PR depends on an earlier one.

Safe because the product is in private beta with a single user.

## Off-happy-path homes

Two genuinely new states. Both have a drawn home, and neither is a place a user can get stranded.

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| **Undo row** (a spent decklist slot) | In place, in the decklist, in the slot the card occupied | Removing the last copy of a card | Yes — Undo re-adds it. Cleared by exactly three things: Undo, the next removal, or leaving the route. **Never a timer** |
| **Unowned suggestion** | Trailing shelf in Consider, under the existing `Top picks for {commander}` heading with `not in your collection` | Automatic when `getDeckSuggestions` appends staples the collection lacks | Yes — Add works; the card lands in the deck already carrying its shipped `buy` tag, which is where the app already handles unowned cards |
| Failed undo | `MutationError` inside the undo row | Server refusal on the re-add | Yes — retry, or add the card again by name |
| Strip with no short cells | The strip renders as five figures, no controls, no `consider →` | A deck at or over target on every role | N/A — a met cell is a figure by design. **But confirm the strip does not look broken with zero controls** |
| Strip rationale open | One disclosure panel below the strip | `Why these numbers?` | Yes — `Hide` |

The one row worth staring at is **"strip with no short cells"**: PR 4 removes the per-cell
disclosure, so a fully-met strip loses every interactive element it had. That is correct — there is
nothing to send anyone to — but it is the state most likely to read as a regression.

## User journeys — walk script

Walked mid-run at Gate 5, and by Hugh after. **Every journey is exercisable on local dev.** This
epic needs no staging-only data and no infrastructure, so Gate 5 never blocks on a deploy. The same
journeys are walked once more on the deployed URL before the epic is called done — local dev is
sufficient to build against, the deploy is required to accept.

### Journey A — Remove and undo (PR 3)

Entry: `/decks/[id]`, **phone viewport**, a deck with cards including at least one stack of basics.

1. Find a single-copy card's row. → The ✕ is **visible on phone**, and its hit box is 44×44 while
   the glyph stays 13px.
2. Tap it. → The row is replaced **in place** by an undo row: same min-height, `--surface-sunken`,
   dashed border, no strikethrough. The group count above it and the 99 count **both decrement
   immediately**. The live region reads `<name> removed · <n> of 99 · undo available`.
3. Tap `Undo`. → The card returns via `addCardToDeck` with an optimistic add. Counts restore. The
   region reads `<name> back in the deck · <n> of 99`.
4. Find the basics stack. Tap its ✕. → It **decrements**; no undo row. The aria said
   `Remove one copy of <name>, <q> in deck` before the tap.

- **Reverse:** every step above is its own reverse. The pass that matters is the *absence* of a
  timer — leave the undo row on screen for two minutes and confirm it is still there.
- **Repeat:** remove → undo → remove the same card again. The second removal must behave
  identically. Then remove card A, then remove card B without undoing A — A's row settles, B's
  appears, and there is exactly one undo row.
- **Resume:** remove a card, switch to `Consider`, switch back. **The undo row is still there** —
  it is decklist state, not row state. Then reload the page: it is gone, which is correct, because
  the removal committed.
- **Throttle the network before step 2 and step 3.** The optimistic path is inherited; if either
  action waits on the server before the UI moves, that is the "I'm going!" bug.

### Journey B — Bottom of the viewport (PR 2)

Entry: **phone viewport only.** Desktop has no tab bar and cannot show this.

1. Open a brand-new deck at `/decks/[id]`. → The empty-state caption and illustration are fully
   visible, centred **inside** the reserve, not through it. Nothing sits under the tab bar.
2. Scroll a long deck to the bottom. → The last row clears both the quick-add dock and the tab bar.
3. Go to `/decks/new`. Scroll to the bottom of the commander list. → The last row is reachable and
   the Create footer sits **above** the tab bar, not under it.
4. Pick a commander. → The summary line reads `{commander} · {identity}`; before picking, `Pick a
   commander to start`.

- **Reverse / repeat:** not meaningful here. **Resume** is: rotate the device, or resize the
  viewport across the `md` breakpoint in both directions, and confirm the reserve appears and
  disappears cleanly.

### Journey C — Strip to shelf (PR 4)

1. On a partially-built deck, find an under-target cell. → The **whole cell** is the control, with
   `consider →` as a caption inside it and `Ramp, 4 of 10. See ramp cards to consider.` as its
   accessible name. No anchor beneath it.
2. Activate it **with the keyboard**. → The view switches to Consider, scrolls to the shelf, **and
   focus lands on the shelf heading.** Focus staying behind on the strip is the bug this step
   exists to find.
3. Find a met cell. → Not focusable, no caption, prints `—`.
4. Press `Why these numbers?`. → One panel, five rationales, below the strip. `Hide` closes it.
5. Read the strip hint. → `A cell under target opens its shelf below`, and **only** that. If the
   old hint's `Click a cell for rationale ·` clause survives anywhere, two live values shipped.
6. Force a deck where every role is met. → Five figures, no controls. Confirm it reads as
   information rather than as something broken.

- **Repeat:** activate a cell, go back to the deck tab, activate the same cell again. Focus must
  move both times.

### Journey D — Unowned suggestions (PR 5)

Entry: a deck whose collection is missing well-known staples, so `getDeckSuggestions` appends.

1. Open Consider. → The provenance line reads `59 owned · 5 you don't own`.
2. Scroll the shelves. → **No unowned card appears in a coverage shelf.** A shelf saying
   *you have 2 of 10* is about cards playable tonight.
3. Scroll to the end. → The trailing shelf sits **last, after the targetless shelf**, headed
   `Top picks for {commander}` with `not in your collection` and `· N to consider`.
4. A tile there carries the `buy` tag where the ownership dot would be, same word and same hex as
   the decklist row, and a **secondary** Add.
5. Add it. → It lands in the deck carrying its `buy` tag. The provenance count drops by one.
6. Force a collection that owns everything. → **No trailing shelf**, and the provenance line is the
   locked `provenance` string, unchanged.

Step 6 is Gate 1's question for PR 5 in journey form: prove the branch can be both entered and not
entered.

## Hard pause points — stop and ask

- **Any change to the locked R2 handoff or `add-panel · copy strings.ts` beyond the nine `REPLACES`
  entries.** They are locked. The addendum's nine entries are Design's own edits and are sanctioned;
  a tenth is not.
- **Deleting anything from `mix.ts`.** Plan correction 3 — the addendum's note is wrong. Only the
  comment at `:74-75` goes.
- **Any change to `suggestDeck`'s owned-pool premise.** Carried from #158 and unchanged by ruling A:
  ruling A is about the *append* in `getDeckSuggestions`, which already exists, not about widening
  the scorer.
- **Feeding the new components the optimistic list instead of the server `deckOracleIds`.** The
  comment at `builder-shell.tsx:70` explains why. Easy to "fix" by accident.
- **Adding a timer, a toast, or an auto-dismiss to the undo row.** #185 exists *because* things
  vanish before they are noticed.
- **A second live region.** One exists; three surfaces write to it.

## Notify-and-proceed

- **Overwriting `strip.hint` in the locked block** rather than adding a second key. Pre-authorized
  and explicitly called for by `REPLACES` 7. Shipping two live values is the hazard.
- **Deleting `strip.shelfLink` and `strip.shelfLinkAria`.** Pre-authorized by `REPLACES` 8–9. Grep
  for consumers first; expect `role-counter-cell.tsx:104,107`.
- **Substantially rewriting `role-counter-strip.test.tsx:34-70`.** Its six cases test an anchor PR 4
  deletes. Rewrite, do not patch.
- **De-hardcoding `suggestion-tile.tsx:109` into `tile.lift`.** A convention fix riding along with a
  copy change.
- **Extracting a shared `buy` tag component** if reusing the decklist row's tag on a suggestion tile
  needs it. Reuse the word and the hex either way; do not re-declare them.

## Done means

1. All six PRs merged at the full Copilot bar and deployed, and the journeys walked on the deployed
   URL — not merely local-green.
2. Journeys A–D walked forward, reverse, repeat and resume, recorded in
   `docs/superpowers/journey-lifecycle-add-panel-addendum.md` with what was forced and what came
   back. Journey A's repeat pass and Journey C's keyboard step are the two that must not be skipped.
3. Gate 1 artifact at `docs/superpowers/state-coverage-add-panel-addendum.md`, covering the unowned
   branch in both directions.
4. Gate 4 artifact at `docs/superpowers/design-tables/add-panel-addendum.md`, Agent 1 run **before
   PR 1** and passed into every build subagent's prompt.
5. **`strip.hint` has exactly one live value**, and no string in `addPanelCopy` contains an em dash.
   Both assert in `decks-builder.test.ts`.
6. Lint no worse than 118 warnings / 0 errors; the full suite green and larger than 917 tests.
7. Tracker updated in `docs/superpowers/design-pipeline-status.md`. The three R4 items in the plan's
   "For Design" section need a row — a `type: design` label alone is invisible to `design-status`.
8. Each of the six issues closed by its **own explicit `Closes #N` line**. A bare `#N` after the
   first in a comma-separated list carries no keyword and will not close.
9. Follow-ups surfaced as a **ranked list at close-out**, for Hugh to approve. Do not file issues
   unilaterally.
10. Final report via the `feature-run-report` skill. Not free-form. Its infrastructure table reads
    "none", which is the correct answer here rather than an omission.
