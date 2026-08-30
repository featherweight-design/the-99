# Epic Run Briefing — Card availability (#43)

Feature-specific facts for `epic-run`. Run mechanics live in the skill; repo conventions live in
`AGENTS.md`. Neither is restated here.

This is the first run against this feature. Unlike the two add-panel runs, #43 has a **separate eng
spec** as well as an execution plan, and a design handoff that went to **three rounds plus two
addenda**. The plan is 2,968 lines and is the authority on sequencing; this file exists to answer
the questions the plan does not: what is reachable when, where a user lands, and what gets walked.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-08-13-card-availability-plan.md` — the execution plan. Ten tasks,
   one PR each. **Follow its order exactly**; unlike the add-panel addendum, the order here *is* a
   dependency chain (see "Launch gating" below).
2. `docs/superpowers/specs/2026-08-08-card-availability-design.md` — the eng spec.
3. `design/design_handoff_the99_availability/README.md` (R3) — the base handoff.
   `ADDENDUM-README.md` (R2 rulings). `ADDENDUM-2-README.md` (R3 — `/collection` and the
   deck-detail roll-up). The three `.dc.html` files are the canvases.
4. `design/design_handoff_the99_availability/availability · copy strings.ts` — keyed and ready to
   paste, including the `collection` and `deckRollup` blocks Addendum 2 added.
5. `READINESS.md` · `ADDENDUM-READINESS.md` (🟢 Green, 2026-08-13) · `ADDENDUM-2-READINESS.md`
   (🟢 Green, 2026-08-27). The last of these carries **seven numbered items resolved
   engineering-side for Design to ratify** — all implemented as the drawings show, none blocking.
6. [#43](https://github.com/HartiganHM/the-99/issues/43).

**Where a canvas and a README disagree, the README wins.** This is the inverse of the add-panel
epic's rule and it is deliberate: the availability canvas's implementation-notes panel still says
"get a light-theme pair there" and "brass is not AA as small text", and both are corrected in the
README. Neither must be implemented.

**Addendum 2 is not trailing scope.** Its §6 (*a deck never claims a card against itself*) changes
the classifier that Tasks 1, 3, 4 and 8 all depend on. Read it before Task 1, not before Task 9.

## Current state (verified 2026-08-30 against `855ce4c`)

**No environment variables, no external services, no cron, no worker, no bucket, no queue and no
secret.** The infra table in the final report reads "none" — say so explicitly rather than omitting
the section. There **is** one migration; see the hard-pause section.

Baselines taken on `main` at `855ce4c`: **lint 113 warnings / 0 errors**, **1117 tests across 96
files**. Note that the main checkout's `node_modules` was missing `jsdom` on 2026-08-30 and every
test file errored until `pnpm install --frozen-lockfile` restored it; if a fresh worktree reports
96 unhandled errors and zero tests, that is the cause, not a regression.

`.github/workflows/ci.yml` runs the same four commands as the `AGENTS.md` pre-push gate, so a clean
local push is a green CI run and CI catches nothing new. This repo has **no `apps/e2e`, no
`releases.ts`, no `progress.md`, and no `render.yaml`** — the skill's bookkeeping step reduces to
the `docs/superpowers/design-pipeline-status.md` tracker row.

| Claim | Where | State |
|---|---|---|
| No availability code exists yet | `src/` | **Confirmed.** Zero files match `MATURE_DECK_SIZE` or `availability`. The run starts from nothing |
| `decks.status` is dead | `src/db/schema.ts:130` | **Confirmed.** `text("status", { enum: ["brewing","built"] }).notNull().default("brewing")` is the *only* occurrence of the column in all of `src/`. Zero reads |
| `celebration.ts` does not read it | `src/lib/decks/celebration.ts:14,19` | Its `status` field is typed `StatusPill` (the derived pill), and it compares against `"Complete"` — a value the column's enum cannot even hold. Not a consumer |
| Migration count | `drizzle/` | 11 `.sql` files, latest `0010_tiresome_vampiro.sql`. Task 1's drop generates `0011_*` |
| `searchCards` has no `deckId` | `src/app/decks/[id]/search-action.ts:38-40` | `searchCards(query, colorIdentity, ownedOnly)`. Sole call site is `src/components/decks/use-card-search.ts:48`. Task 4 adds the parameter |
| The cold-eyes sweep exists here | `scripts/audit-sweep.mjs` | **Present and adapted to this repo** — its own manifest, driving a local dev server on `PROBE_BASE` (default `localhost:3002`), phone + desktop, full-page screenshot plus an overflow report per route × viewport |
| Sweep credentials are placed | `.env` | `E2E_AUDIT_USER_EMAIL` and `CLERK_SECRET_KEY` both present. `E2E_AUDIT_ADMIN_*` is absent and irrelevant — The 99 has no admin role. `PROBE_BASE` is absent and defaults correctly |
| All six #43 surfaces are already in the sweep manifest | `scripts/audit-sweep.mjs:42-48` | `/`, `/collection`, `/commanders`, `/decks`, `/decks/new`, `/decks/import`, plus a `deck` entry resolved at run time from the account's first deck. **No manifest additions are needed** — which is unusual; confirm rather than assume when the cold-eyes pass runs |

**Re-verify at kickoff.** Every row was read directly on 2026-08-30. Nothing has touched `src/`
since `b897886` (#210), so if that is still `main`'s tip minus the two docs commits, the table holds.

## Risk shape — data-driven, with one keyed-state pocket

Not event-driven: nothing here creates a record in response to something else happening, so **Gate 6
does not fire**. Say so in the report rather than omitting it.

The bugs will come from two places, and they fail differently.

**The classifier's inputs (Tasks 1, 4, 8, 9).** This epic's characteristic bug is a number that is
*plausible but computed from the wrong vantage*. Self-exclusion means the same card legitimately
reads three ways on three surfaces, so "the marker says something" is never evidence it says the
right thing. The specific trap is recomputing `free` as `owned - hard` in TypeScript: correct
off-decklist, silently wrong on a deck's own list, and wrong in the quiet direction — it renders a
marker where there should be silence. **Gate 2 with deliberately ugly fixtures is the whole
ballgame**: a 4-copy Sol Ring, a card in two finished decks, a card in a finished deck *and* a brew,
a deck at exactly 99, and a deck at 100.

**Silence as a state (everywhere).** `free` renders nothing, deliberately. That makes the most
common outcome indistinguishable from "the feature didn't load", from a broken join, and from a
component that was never mounted. Gate 1's runtime-reachability question is doing real work here:
proving the *loud* branch can be entered is not the same as proving the silent one was chosen rather
than defaulted to. Every state assertion needs its negative twin.

**One keyed-state pocket (Task 6).** The `?avail=` ranking mode on `/commanders` is URL state that
must survive a reload and a back button. Gate 5's resume pass covers it. Note **Gap §4**: `?avail=`
is single-value on `/commanders` and multi-value on `/collection`. Accepted as non-blocking, no
shared reader — but the two parsers must not be refactored into one during the run.

## Launch gating — reachable on merge, and the order is a dependency chain

**No flag, no env var, no runbook step, no dark period.** The 99 is a private-beta app whose
audience is Hugh and a handful of friends; every prior epic here has shipped this way. #43 adds
annotation and one new filter to surfaces that are live today. **No PR in this plan makes a route
newly reachable** — the auth matrix is untouched and no middleware matcher changes.

**Task 4 is the PR that makes the vertical live.** Tasks 1–3 are invisible: a query, a token/copy
block, and an unmounted component. A run that stops after Task 3 is a no-op in production, which is
the safe place for it to stop.

**Unlike the add-panel addendum, the order is load-bearing.** Task 3 cannot render without Task 2's
copy block; Tasks 4, 6, 8, 9 and 10 all consume Task 1's query and Task 3's component. Do not
reorder to avoid a merge conflict. The one genuine conflict surface is `src/lib/copy/` — Task 2
creates `availability.ts` and Task 2 alone extends `decks-builder.ts:199-200`.

Each PR is nonetheless independently shippable from Task 4 onward: a run that stops after Task 6
leaves production strictly better than it found it, with the builder and commanders surfaces
annotated and `/collection` not yet.

**No changelog gate.** There is no `releases.ts` in this repo.

## Off-happy-path homes

Six new states. Five have a drawn home. The sixth is recorded as this epic's thinnest row and is
**settled, not open** — Hugh's call on 2026-08-30.

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| **Soft claim** (`1 in a brew`) | Inline on the row/tile/detail, wherever the card renders | Automatic when an unfinished deck holds a copy | Yes — it clears when the brew drops the card or reaches 99 and becomes a hard claim |
| **Hard claim** (`0 free`, `0 free — in Atraxa`) | Same, plus the deck name off-`/collection` | Automatic when a 99-card deck holds every copy | Yes — cut the card from the finished deck |
| **Over-committed** (`short 1 — also in Kykar`) | Row marker, plus the deck-detail roll-up's red line (`deckRollup.overHeading`) | Automatic when finished decks want more copies than exist | Yes, but **there is no link to the competing deck** — see below |
| **`What's free` ranking mode** | `/commanders`, `?avail=free`, with `ranking.subtitleFree` on the heading and `ranking.freeNote` under it | The `Score against` toggle | Yes — toggle back to `Everything I own`, which is the default and the URL-less state |
| **Availability filter active** | `/collection`, `?avail=<multi>`, surfaced as chips in the shipped chip row | The `Availability ▾` panel (fourth on desktop, fifth on phone) | Yes — `collection.chipRemoveAria` per chip, plus the shipped clear-all |
| **Degraded read** | `/commanders`: the generalised `degraded-banner.tsx`. `/collection`: **no banner** — the filter panel renders disabled with `degraded.collectionFilterDisabledAria` | Automatic when the availability join fails | Yes — it is a per-request condition; a reload clears it |

**The row worth staring at is over-commitment.** The marker names the competing deck but is
deliberately not a tap target (a 6px glyph responding to taps in a grid of 44px Add buttons is a
mis-tap generator — a locked constraint). So a user who reads `short 1 — also in Kykar` must
navigate to `/decks` and find Kykar by hand. **Decided 2026-08-30: ship as designed.** It is
consistent with Addendum 2's accepted Gap §1 reasoning (*the collection page is an inventory, not a
to-do list, and the deck with the problem shows it*) and with #43's premise that the marker
annotates rather than navigates. **Do not improvise a link during the run.** Surface it in the
close-out ranked list; do not file an issue for it unilaterally.

The one partial-use state worth naming: a deck crossing 99 turns every one of its soft claims into
hard claims **on other surfaces**, in a single add. Addendum 2 Gap §6 calls this the 98th-card
cliff and does not draw the transition. Expected, undrawn, not a bug.

## User journeys — walk script

Walked mid-run at Gate 5, and by Hugh after. **Every journey is exercisable on local dev** — this
epic needs no staging-only data and no infrastructure, so Gate 5 never blocks on a deploy. The same
journeys are walked once more on the deployed URL before the epic is called done.

Seeding matters more than usual. Before walking anything, build the fixture the states need:
one **finished** deck (exactly 99), one **brew** (under 99), one card held by both, one card held by
two finished decks (the over-committed case), and one card owned in quantity 4 held once. Without
that shape most of these journeys are indistinguishable from silence.

### Journey A — The decklist and the add panel (Task 4)

Entry: `/decks/[id]` for the **brew**, desktop and phone.

1. Scan the decklist. → **At least three of five rows carry no marker at all.** If most rows are
   marked, the vantage is wrong — this is the epic's loudest smoke signal.
2. Find the card also held by the finished deck. → `0 free — in <deck>`, brass, glyph *and* number
   *and* word. Greyscale the screenshot; all four states stay distinct.
3. Find the over-committed card. → `short 1 — also in <deck>`, in `--avail-over-fg` `#E9917A`.
   **The text is never `--danger` `#C6533F`** — that hex is glyph-and-border only.
4. Narrow the viewport until the deck name would overflow. → The **name** truncates; the marker
   prefix does not. Full name in `title` and in the accessible name.
5. Open the add panel and search for a card **already on this decklist**. → It renders **exactly as
   its decklist row does**, one panel away. If the panel says `0 free — in <this deck>` while the row
   behind it is silent, self-exclusion did not reach `searchCards` — Addendum 2 ratify item 5.
6. Add the over-committed card. → **It adds.** No block, no confirmation dialog, no refusal. #140's
   refusal pattern must appear nowhere.

- **Reverse:** remove each card added; markers return to their prior state.
- **Repeat:** add → remove → add the same card again. Identical behaviour both times.
- **Resume:** reload mid-journey; nothing here is component state, so everything survives.
- **Throttle the network before step 6.** The marker must not animate on add — zero net motion is a
  locked constraint, so what you are checking is that nothing appears *and* nothing moves.

### Journey B — A finished deck's own list (Tasks 4 + 8, Addendum 2 §6)

Entry: `/decks/[id]` for the **finished** deck. This is the journey that R2 blocked on and R3
answered; it is the single most important walk in the epic.

1. Scan the list. → **Nearly every non-land row is silent.** Commander being singleton, without
   self-exclusion almost every row would read `0 free — in <this deck>`, inverting the whole
   feature on the one surface where a finished deck is the success state.
2. Find the over-committed card. → `short 1 — also in <other deck>`. **The loud state survives
   self-exclusion** — that is the proof the rule drops noise and not signal.
3. Find a card this deck holds that a *brew* also wants. → `1 in a brew`.
4. Confirm no row anywhere on this list reads `0 free`. → The hard state is **unreachable** inside a
   finished deck, including for multi-copy cards. One such row is a self-exclusion bug.
5. Look at the deck header. → The roll-up region (`deckRollup.regionAria` = `Card commitments`),
   **max two lines, red above muted, always** — never sorted by count.
6. Force a deck with both lines. → The soft line reads `N **more** are in other brews too`
   (`softHeadingAfterOver`). The word `more` is load-bearing: the counts are disjoint and that word
   is what makes them add up.
7. Open the same card on `/collection`. → It reads **differently**, because there is no exclusion
   off-decklist. This is Gap §7 and it is by design.

- **Reverse:** cut a card from the finished deck. → The deck drops below 99, its claims become soft
  everywhere else, and its own list's markers re-derive. **A cut releases a card; nothing here may
  warn about it.** A marker that argues against a cut is a soft block.
- **Repeat:** cut → re-add → cut again.
- **Resume:** reload after the cut. The 99/98 transition is Gap §6's cliff; expected, undrawn.

### Journey C — Ranking against what's free (Tasks 5, 6, 7)

Entry: `/commanders`.

1. Land with no query string. → `Everything I own` is selected. `ranking.subtitleAll` reads
   `ranked by fit`. **This is the default; #43 changes no default ranking.**
2. Read a card's receipt. → `34 of your cards fit · 12 already in use`. **The `already in use`
   clause renders in both modes** — settled; only the score *delta* is `What's free`-only.
3. Flip to `What's free`. → URL gains `?avail=free`. Subtitle becomes `ranked by what's free`.
   `ranking.freeNote` appears. The live region announces `ranking.announce('free', n)`.
4. Read the receipt again. → `N of your cards are free`, plus the delta `↓X from Y`.
5. Confirm the ordering actually changed. → If the two rank maps produce an identical order on a
   collection with finished decks, one map is not being consumed.
6. **Force the degraded read** — make the availability join throw. → The generalised
   `degraded-banner.tsx` renders with the availability variant, not the synergy copy. The toggle
   goes disabled carrying `degraded.segmentDisabledAria`, which is the thing to look at hardest.
7. **Force both reads down** — availability *and* synergy. → **One banner, two sentences, one
   Retry**, using `degraded.bodyWithSynergy`. Two stacked banners is the failure this key exists to
   prevent, and it is only reachable by breaking both at once.

- **Reverse:** toggle back to `Everything I own`. → The query string clears; it must not linger as
  `?avail=all`.
- **Repeat:** flip free → all → free. Ordering and receipts must be identical on the second visit
  to each mode.
- **Resume:** load `/commanders?avail=free` **cold in a new tab**, and press the browser back button
  after a flip. Both must land on the right mode. This is the epic's only keyed-state risk.

### Journey D — `/collection` (Tasks 9, 10)

Entry: `/collection`, row view and tile view, desktop and phone.

1. Row view. → The marker is **inside the existing `1fr` name cell**; no grid change. It is
   **count-only** — `0 free`, never `hardIn` or `hardMulti`, in the accessible name as well as the
   label (`collection.rowAria`'s fourth clause lands **last**, after set and rarity).
2. Tile view. → The chip is **top-left**. Top-right is the brass quantity badge and stays.
3. Open a card's detail modal. → **Here and only here** the full clause with the deck name appears,
   under `collection.detailHeading` (`In your collection`), plus the state note
   (`detailHardNote` / `detailSoftNote` / `detailOverNote`). Note Gap §3: only the hard note is
   drawn; the other two ship to the same rules.
4. Open `Availability ▾`. → Fourth panel on desktop, **fifth on phone**. Four options with counts.
   **Nothing defaults on.** A zero-count option renders `aria-disabled` with
   `filterEmptyOptionAria` — it is **not removed**; a menu that changes length between players is
   worse than one with dim rows.
5. Select two options. → Chips appear in the **shipped** chip row; no new chip component.
   `?avail=` carries both. The result count updates.
6. Remove one chip, then clear all. → Round-trips cleanly through `serializeParams`.
7. **Force the join to fail.** → The panel renders **disabled** with
   `degraded.collectionFilterDisabledAria` and there is **no banner**. `/collection` fails quiet.
   This differs from `/commanders` on purpose.

- **Reverse:** clearing every filter returns the page to its unfiltered state and an empty query
  string.
- **Repeat:** apply → clear → apply the same combination. Counts must be identical.
- **Resume:** deep-link `?avail=` cold; reload with filters active.

**Denominator note, so it is not re-reported as a bug:** with a filter active the shipped
`chip-row.tsx` renders `Showing <rows> of <total quantity>` — the `2,933`-shaped figure. Addendum
2's canvas draws `Showing 61 of 1,418` using the unique-card total. The **numerator agrees exactly**;
only the denominator differs, and the shipped variant stays. Ratify item 4.

## Hard pause points — stop and ask

- **The `decks.status` drop is the epic's only schema change, and it is a production migration.**
  Migrations auto-apply on every Vercel production build. **Pre-authorized by Hugh on 2026-08-30:
  drop it in Task 1 as planned**, on the evidence that the column has exactly one occurrence in
  `src/` (its own definition) and zero reads. *This authorization covers this one column drop and
  nothing else* — any second migration, any change to an existing column, or any drop that turns out
  to have a live reader is a fresh stop.
- **Recomputing `free` as `owned - hard` anywhere in TypeScript.** The query returns it from both
  vantages. Recomputing is right off-decklist and silently wrong on a deck's own list. If a call
  site seems to need it, that call site has the wrong `Availability` object.
- **Any string for the `free` state.** There is deliberately none, so a future copy edit cannot give
  silence a label. Adding one is a stop, not a judgement call.
- **Swapping the `free` / `in use` vocabulary**, e.g. to "available". All strings at once or none.
  **"Deck tax" is banned** — it collides with commander tax.
- **Making the marker a tap target**, or linking it to the named deck. Settled above.
- **Editing the design handoff or the copy file.** The seven ratify items in
  `ADDENDUM-2-READINESS.md` go back to Design as items; they are not licence to edit Design's files.
- **Merging the two `?avail=` parsers** (Gap §4). Two readers, deliberately.
- **Rendering a second degraded banner** when availability and synergy are both down. The copy file
  is explicit: one banner, two sentences, one Retry (`degraded.bodyWithSynergy`). This is R1 gap
  §11 and it is the co-occurring-degraded case the handoff already ruled on.
- **`src/lib/decks/availability.ts` importing `db`.** It is value-imported by three `"use client"`
  components; the import kills the page on hydration. `src/lib/decks/status.ts:1-5` exists solely
  because this already shipped once (#146). `client-bundle-safety.test.ts` is the guard.

## Notify-and-proceed

- **Adding `deckId` to `searchCards`** (Addendum 2 ratify item 5). Pre-authorized. The file already
  lives under `src/app/decks/[id]/`, so this makes an existing scoping explicit rather than adding
  coupling. Sole call site is `use-card-search.ts:48`.
- **Shipping the card-detail clause without the `[Complete]` status pill** (ratify item 3).
  Pre-authorized. `hardDeckNames` is names only; deriving "Complete" from `hard > 0` would render a
  guess in the shape of a fact.
- **Deriving the count-only `hardAria` by slicing `marker.hardAria`'s first clause** (ratify item 2)
  rather than re-typing the phrase, so the copy file stays authoritative. The plan carries a
  mock-free invariant test asserting the derivation still matches its hard-coded fallback.
- **Generalising `degraded-banner.tsx` from synergy-only to a variant prop** (Task 7). Grep for
  existing consumers first.
- **Dropping the plan's `decks.status` references from `schema.ts` and the pipeline tracker** in the
  same PR as the migration.

## Done means

1. All ten PRs merged at the full Copilot bar and deployed, and the journeys walked on the
   **deployed** URL — not merely CI-green. Verify the deploy rather than loading a page: `GET
   /api/health` must return 200 after Task 1's migration ships.
2. Journeys A–D walked forward, reverse, repeat and resume, recorded in
   `docs/superpowers/journey-lifecycle-card-availability.md` with what was forced and what came
   back. **Journey B is the one that must not be skipped** — it is the walk R2 blocked on.
3. Gate 1 artifact at `docs/superpowers/state-coverage-card-availability.md`, run before Task 4's
   build starts, covering each of the four states **and its silent twin**.
4. Gate 4 artifact at `docs/superpowers/design-tables/card-availability.md`, Agent 1 run **before
   Task 1** and passed into every build subagent's prompt.
5. Gate 7 (`copy-review`) run on Tasks 2, 6, 8, 9 and 10 — every PR that adds strings.
6. Gate 6 explicitly **not run**, with the one-line reason: nothing here creates records in response
   to events.
7. **Mid-run cold-eyes review triggered after Task 8**, not later. That is the point at which the
   builder and commanders verticals are both whole and `/collection` is still unbuilt — so the
   triage list can be fed forward into Tasks 9 and 10 instead of becoming cleanup PRs. Capture via
   `node --env-file=.env scripts/audit-sweep.mjs` against a local dev server; the manifest already
   covers all six routes.
8. **Task 10 doubles as the reserved polish slot.** Ten PRs is already long; rather than an
   eleventh, Task 10's PR carries the cold-eyes triage items that are not blockers. If the triage
   list is large enough to swamp it, open an eleventh PR rather than skipping the polish.
9. `free` renders nothing, asserted in `availability-marker.test.tsx`; no string in
   `availabilityCopy` labels the free state; `MATURE_DECK_SIZE` has exactly one definition.
10. Lint no worse than 113 warnings / 0 errors; the full suite green and larger than 1117 tests.
11. `docs/superpowers/design-pipeline-status.md` updated — the seven `ADDENDUM-2-READINESS.md`
    ratify items need a **tracker row**, not just a `type: design` label. `design-status` parses
    that file and never queries GitHub labels.
12. #43 closed by an explicit `Closes #43` line.
13. Follow-ups surfaced as a **ranked list at close-out** for Hugh to approve — including the
    over-commitment navigation gap. **Do not file issues unilaterally.**
14. Final report via the `feature-run-report` skill. Not free-form. Its infrastructure table reads
    "none"; its migration row reads the one `decks.status` drop.
