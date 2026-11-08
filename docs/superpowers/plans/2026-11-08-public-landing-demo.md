# The public landing page and its demo (plan, lane the-99-why, 2026-11-08)

Brief: `docs/superpowers/design-briefs/2026-11-07-public-landing.md` (Settled, Hugh 2026-11-08). Routed by
the-99-orchestrator. **No UI before Design's handoff has a READINESS verdict**; the backend, guard and script PRs may
proceed now (AGENTS.md, design pipeline). Reviewed by a plan-review subagent on 2026-11-08: its two Critical, three High
and four Medium findings are folded in below.

## Goal

A signed-out visitor at `/` gets the landing page: real screens, real catalog numbers, how to bring a collection in, an
interactive demo of every tool on a fictional collection, free versus credits, and one main button ("Tell me at launch"
while sign-up is invite-only). Nothing on a signed-out surface calls a model, spends a credit or reads a player's data.

## Fixed constraints

- **No live model call from any signed-out surface.** Enforced by the public-surface walk (`check:public-reads`):
  `src/components/landing/` joins `PUBLIC_SURFACE_DIRS`; `src/lib/model/`, `src/lib/tuning/`, `src/lib/synopsis/`,
  `src/lib/intake/` and `src/lib/swaps/` join `FORBIDDEN_DIRS` (no current public file reaches them; checked).
- **Catalog tables only** on public reads (`ALLOWED_TABLES`, `scripts/lib/public-reads.mjs:27-29`).
- **Where the landing lives:** `/` is `src/app/page.tsx`, which imports `auth`, `lib/decks` and `lib/social` for the
  signed-in Home. A route group cannot also define `/`. The signed-out branch (`page.tsx:79`) renders one entry,
  `src/components/landing/landing.tsx`, and only `src/components/landing/` is walked as public surface.
- **Flags on the landing** are decided by `resolveFlags(null)`, as the public card page does (`card/[slug]/page.tsx:35`).
- **A new switch needs Hugh first.** `PUBLIC_LANDING_ENABLED` (plumbing, off in production until launch) is **approved**
  (Hugh, 2026-11-08). Registering it also touches `flags-rule.test.ts:127` and the Admin label in `copy/admin.ts` (/copy-review).

## FORK for a ruling: how the demo renders

The real tool components cannot be drawn on a public surface. Run through the walk, `synopsis-text.tsx` (226 findings),
`suggestion-lists.tsx` (226), `cuts-panel.tsx` (338), `mana-balance-panel.tsx` (366), `top-off-list.tsx` (411),
`choose-results.tsx` and `fits-view.tsx` all fail: server actions, `auth()`, `headers()`, per-player tables. Only
five small pieces pass (`analysis-banner`, `analysis-ring`, `synopsis-controls`, `tuning-tool-mark`,
`help-me-choose-door`).

- **(A) Capture walk. Recommended.** Each demo step is a real capture of the real signed-in tool on the fictional
  fixture (six themes, 390 and desktop), with Design's tap targets over it ("press Suggested changes", "open a swap")
  and a short caption. The demo reads no table and no tool code: a generated manifest lists each step's capture, its
  tap boxes and its caption. Real pixels, zero public-surface risk, no refactor of signed-in tools, and the same
  pipeline as the About captures. Cost: it is press-through, not free play (a visitor cannot scroll a live list).
- **(B) Presentational splits.** Split each of the nine tools into a pure drawing half (no actions, no per-player
  imports) that both the signed-in page and the demo render from projected data. Live interactivity, but about nine
  refactor PRs across signed-in surfaces, each with its own regression risk, before the demo can start.
- **(C) Demo-only components.** Rejected: they would drift from the real tools, which the brief forbids.

**Ruled (Hugh, 2026-11-08): how live the demo is goes to Design** (brief, Open call 3, both options with their costs).
**Design picked (B): a live dummy app** (handoff, Settled 3; approved by Hugh 2026-11-08). Each demo step renders the
shipped drawing half of the signed-in tool, fed by the fictional fixture's projected data. Read-only presses work as
signed in (card details, tabs); anything that writes is inert. The landing ships WITHOUT the demo section (Try it) first;
the section arrives once the splits below land. **PR 5 is therefore replaced by the split PRs 5a to 5l in the PR table**,
and the capture walk (A) is dropped: no demo step is a capture, so there is no manifest of captures and `capture:landing`
is not built. Where the text below still says "capture", "walk of captures" or "manifest", read it through this ruling.

## Generating the stored outputs ($5 hard cap)

**Run through the app, not by calling library functions.** Look deeper's run sits inline in a `"use server"` action
(`src/app/decks/cuts-actions.ts:78`, with `requireUserId`, `headers()`, `after()` and `revalidatePath`), and Top off and
Mana balance enter through auth-bound actions. A script calling them directly would first need risky extractions on a
credit path. Instead, `scripts/demo-generate.mjs` drives the real app in a browser (`next start` on the worktree, the
fixture account signed in through local Clerk), in the pattern of `scripts/probe-ai-sweep.mjs`, which already presses
all four model tools. Each tool runs once, through its real button, and stores its output where it always does. The
capture pass (PR 6) then shoots the same screens.

1. **Branch:** refuses anything but a scratch branch holding si10's fictional fixture (`assertScratchBranch`), and
   confirms the resolved `neon.branch_id` before the first press.
2. **Live, not stubbed:** sets `SYNOPSIS_LIVE=1`, `INTAKE_LIVE=1`, `FITS_READ_LIVE=1`, unsets `TUNING_STUB_DELAY_MS` and
   `TUNING_V2_STUB_DELAY_MS`, and checks `MODEL_CALLS_ENABLED` is not off. Before spending it asserts every path is live
   (`src/lib/model/stand-in-report.ts`), so a run can never store stub output.
3. **Credits:** the five model tools bill through the real reservation. The dry run asserts the fixture account holds at
   least 6 credits on the scratch branch (Suggested changes at N = 10 is 1; the others 1 each), and stops if not.
4. **Spend control:** a new ledger `ledger-landing-demo.jsonl` in `src/lib/eval/ledger-limits.ts`
   (`hardCapUsd: 5, askAtUsd: null`). Before each model press it reserves that feature's worst case
   (`featureWorstCaseMicroUsd`) as a pending entry and stops if `spent + worst > 5`; after, it settles at the real cost
   read from the new `model_calls` row. `--dry-run` (the default) prints the steps, the worst cases and the balance and
   presses nothing.
5. **Worst cases** (`src/lib/model/prices.ts`, computed): Suggested changes $2.134 (priced at N = 20, so conservative at
   10), Overview $0.832, Help me choose $0.599, Look deeper $0.580, Which deck needs it most? $0.140. **Total $4.285**: one
   pass fits, with about $0.71 for a single retry of anything but Suggested changes.

**Measured (2026-11-08):** two passes on scratch branch `br-damp-darkness-a6o4o64t`. Real spend **$0.331** from
`model_calls`: Help me choose $0.1032, Overview $0.1202, Suggested changes $0.0717, Look deeper $0.0341, Which deck needs
it most? $0.0021. The ledger reads $1.043 because one step settled at its worst case after a script bug, since fixed by
matching new `model_calls` ids. The stored outputs live on that branch until PR 6 exports them, so the branch is kept
until then.

**Superseded by the three-deck fixture (Design's addendum A1, 2026-11-08).** Those two passes ran on the earlier fixture.
Design's second deck changes what the tools run on: Ashling (99 of 99, mono-red elementals) carries Suggested changes,
Overview and analysis; **Giada (103 of 99, mono-white Angels) carries Look deeper**, so Look deeper's stored output must
be regenerated on her; Zimone (93 of 99, Simic lands) carries Top off and Mana Balance, which store nothing from a model
call here. The first run's outputs are not reused. **A second paid run is needed on the rebuilt fixture, and it needs
Hugh's yes** after a dry run under the $5 ledger cap is sent to the orchestrator (the cap already in
`ledger-landing-demo.jsonl`; the dry run prints the steps, the worst cases and the balance and presses nothing).

**What the fixture must hold (a requirement for si10, sent now):** the tools need different deck states.
Under Design's addendum A1 the three decks are named there with the cards each must hold (the fixture rebuild below
builds them); the states they cover are:
- A deck of **exactly 100** cards: Suggested changes v2 (`V2_DECK_TOTAL`, `src/lib/tuning/v2/run.ts:80`), Overview,
  analysis, Mana balance.
- A deck **over 100**: Look deeper refuses unless the deck runs long (`facts.over`, `cuts-actions.ts:96`).
- A deck **under 100**: Top off.
- A collection rich enough that "commanders you can build" is long and Help me choose returns several, and one card
  owned that fits several decks (Which deck needs it most?).
- At least 6 credits on the fixture account (scratch branch only).

## The demo's data

Under (B) the demo reads **projected fixture data and stored model outputs**, never a table and never a model:
- **Projected fixture data:** a committed, generated file of the fictional player's rows (collection, the three decks, the
  commanders with their fits, the card marks), shaped to the drawing halves' props. Written by an export script from the
  rebuilt fixture on its scratch branch, not read at request time.
- **Stored outputs:** PR 6 exports each model tool's stored output (Overview, Suggested changes, Help me choose, Look
  deeper, Which deck needs it most?) from the second paid run into a committed file, `src/lib/demo/outputs.generated.ts`.
- The demo's captions live in `src/lib/copy/landing.ts` (/copy-review). The demo reads nothing else: no table, no tool
  module that reaches a table or a model, no user data.

**Tests (written with PR 6, which owns the file shapes):** every demo step has its caption key and its data; a name scan
fails on any visible person name outside the fixture's fictional list, exempting catalog card names (the fixture's five
decks are named like "Lanternlight Tinkers", not after commanders, so the scan cannot assume commander-named decks); every
drawing half's props are satisfied by the exported shape.

## Public loaders and the allowlist

- **Landing stats loader** `src/lib/public/landing-stats.ts`: counts of `commander_support` (and with prose), `precons`,
  `precon_synopses` (current), `spellbook_variants`, `cards`, `printings`. Cached on `catalog_refreshes` like the card
  page. A count that fails is dropped, never shown as zero.
- **Allowlist:** `precon_synopses`, `precons` and `spellbook_variants` join `ALLOWED_TABLES`, each with a doc comment;
  `docs/agents/guards.md:216-217`'s list is brought level (it also lacks `catalog_refreshes`).
- **Featured precon Overview** (brief section 6, if Design keeps it): `src/lib/public/precon-overview.ts`, one precon's
  current `precon_synopses.content`, picked from precons that have one (182 of 186 plain precons do).
- **Featured commanders** reuse `src/lib/public/cached-commander.ts`.
- The existing walk proves the loaders import nothing forbidden; `pnpm probe:public-loaders` gains a landing case.

## Anonymous rate bucket

`public-read` exists (120 a minute per visitor, observe-only, `src/lib/rate/rules.ts:31-38`), and both public pages
already call `observeAnonymousHit`. PR 4 adds the call to the landing's signed-out branch (moved from PR 1, which shipped as #2673 without it). Launch week: read the observe
log; enforce only if it shows loops (L12's rule).

**Tell me at launch** gets its own action, `saveLandingLaunchEmailAction` (PR 4; moved from PR 1). It follows the
anonymous-write order from #2671: the per-visitor cap, then `overAnonymousCeiling`, on the existing `launch-list` buckets,
then `saveLaunchEmail` with no flyer code. It cannot reuse `saveLaunchListAction` (`src/app/join/flyer-actions.ts:71`), which
answers "launched" whenever `FLYER_TRIAL_ENABLED` is off (it is off in production). No migration: `launch_list` holds
`email`, `code_id`, `created_at`, and a landing row is `code_id` null. **"Already on the list" draws the same as
"sent"** (the store's `onConflictDoNothing` returns ok), so the page never reveals whether an address is listed. The
brief's state 4 gets that note for Design.

**Sign-up states.** No switch opens sign-up today (L12 ties it to shared deck pages). PR 4 ships the invite-only state.
The open-sign-up state is drawn now and built in the PR that opens sign-up, keyed to whatever switch that PR adds.

## The PUBLIC_PAGES flip

`PUBLIC_PAGES_ENABLED` is plumbing; production's app row is `off` (read 2026-11-06). Settled 2: on when the landing ships.
In Admin > Switches (Hugh flips; no code):
1. A day before: `PUBLIC_PAGES_ENABLED` on. Check `/card/sol-ring` and `/commander/edgar-markov` load signed out, the
   second hit is a CDN `HIT`, and the observe log shows `public-read` hits.
2. Landing day: `PUBLIC_LANDING_ENABLED` on; signed-out `/` switches from the splash to the landing.
3. Rollback: either switch off; the splash returns.

## Onboarding backend

- **Per-app export guides** are copy and captures: `src/lib/copy/collection-sources.ts`, one entry per app the parser
  names (ManaBox, Moxfield, Archidekt, Deckbox) plus "Another app".
- **Parser coverage:** real exports from TCGplayer, Dragon Shield and Delver Lens as test fixtures through
  `src/lib/manabox/parse.ts`, so "any CSV with a Name and a Quantity column" is proven. A failing source gets a header
  alias.
- **Scanning on the first run:** the scan sits one press inside "Add cards by hand" today
  (`first-run-step-one.tsx:113-117`). The match route answers 503 `no-index` on a database with no scan index: before
  Design's first-timer path ships, confirm production holds the index (read-only count).
- **"I own these cards" default:** if Design starts it on in the first run, the import takes the default from its caller.

## PR boundaries (named now; one open PR at a time; none stacked)

| PR | Contents | Needs | Review |
|---|---|---|---|
| 1 | Landing stats loader, allowlist and guards.md, precon-overview loader. Shipped as #2673; `observeAnonymousHit` on the landing branch and `saveLandingLaunchEmailAction` moved to PR 4 | nothing | Risky (public reads, an anonymous write): `/code-review` medium plus the risk-checklist pass, under `## Claude review` with `## Copilot off` (Copilot cut, Hugh 2026-11-08) |
| 1b | Parser coverage fixtures (and any header alias). Shipped as #2684 | nothing | Test-only, or not risky if an alias lands: cavecrew-reviewer |
| 2 | Folded into PR 4 (ruling 2026-11-08): the `PUBLIC_LANDING_ENABLED` registry entry, its test and Admin label, and `src/components/landing/` and the five model/tool dirs in the walk's lists ship with the first PR that reads them; the manifest type and its tests are written only after Design picks A or B | - | - |
| 3 | `scripts/demo-generate.mjs`, the ledger entry. Shipped as #2677; the first paid run is measured below, the second runs on the rebuilt fixture (dry run to the orchestrator first, Hugh's yes) | si10's fixture | Claude review (it edits `src/lib/eval/ledger-limits.ts`) |
| 4 | The landing page, phone and desktop, behind `PUBLIC_LANDING_ENABLED`; with PR 2's switch and walk dirs, `observeAnonymousHit` on the landing branch and `saveLandingLaunchEmailAction` (per-visitor cap, then `overAnonymousCeiling`, on the `launch-list` buckets) | Design's handoff | Claude review, design-review skill, `feature-acceptance` |
| 5 | **Replaced under (B)** by 5a to 5l below. No capture walk. | - | - |
| 6 | **Export of the stored outputs and the fixture's projected data** into committed files (`src/lib/demo/outputs.generated.ts` and the projected-data file) with the name-scan test. It exports the SECOND paid run's outputs; `br-damp-darkness-a6o4o64t` (the first run, earlier fixture) is kept until this PR merges, then deleted. Replaces the old `capture:landing`. | the rebuilt fixture, the second paid run | Script and generated files: Claude review |
| F | **Fixture rebuild** for Ashling, Giada and Zimone (cards named in Design's addendum A1), renaming the player to match Design's handoff. si10 owns it. | lane 02's About re-shoots (5e) merged | Script/fixture: Claude review |
| 7 | Bring your collection: the landing section, the first-run paths and export guides | Design's handoff | As 4 |

PRs 4 and 7 split by surface so each stays under 20 files and 800 lines; PR 5's split is the table below. Close-out: the `feature-acceptance` walk at 390
and desktop, signed out, both switch states, and the first run on a fresh account.


### The split PRs that replace PR 5 (option B)

Each split moves one tool's drawing into a **pure half** (props in, JSX out: no server action, no `auth()`, no
`headers()`, no per-player table, no import the public-surface walk forbids) that both the signed-in surface and the demo
render. The signed-in surface must come out pixel-identical, proved the way About proves its screens (the same capture
before and after) and by the existing tests. Sizes are today's line counts. A PR over ~20 files or ~800 changed lines
(a move counts as added plus removed) is split again at the seam named for it, never merged oversized. No PR is stacked on
another: one open at a time. The tool's stateful half (state, actions, model calls) stays where it is.

| PR | Tool (demo step) | Pure half taken from | Boundary |
|---|---|---|---|
| 5a | Collection grid, Commanders row and page (steps 1, 2; the hero's screen) | `collection/grid-view.tsx` 388; `commanders/commander-row.tsx` 574 and `commanders-view.tsx` 938 (its drawing, not its fetch and sort state) | **Shipped in two steps.** First: `grid-view.tsx` and `commander-row.tsx`, made walk-clean and listed in `PUBLIC_SURFACE_COMPONENTS` (their per-user helpers moved to `src/lib/cards/`, old paths re-export). Then `commanders-view.tsx`: its 168 walk findings (server actions, `auth()`, per-user tables) are a real split of the page frame from its fetch and sort state |
| 5b | Help me choose (step 3) | `intake/choose-results.tsx` 306, `choose-row.tsx` 431, `choose-header.tsx` 71 | The three files whole; `choose-history.tsx` stays signed-in |
| 5c | The deck's one-line rows, card marks and key line (step 4) | The one-line card row (`docs/agents/card-row.md`), the marks in `cards/` (`card-fact-mark`, `combo-mark`, `foil-mark`, `two-faced-mark`) | Rows and marks; the buy tag is 5i. The file list is fixed by reading the row's imports when the PR opens |
| 5d | Analysis and Overview (step 5) | `decks/analysis-panel.tsx` 337, `synopsis-overview.tsx` 407, `synopsis-text.tsx` 59 | Drawing only; `synopsis-controls` and the run stay |
| 5e | Suggested changes (step 6) | The result's drawing: `decks/update-diff.tsx` 491 and `update-diff-row.tsx` 758 (confirm against what step 6 draws when the PR opens). **Not** `tuning-panel.tsx`'s 1,458-line stateful body (`TuningPanel`, lines 197 to 1655) | Two PRs if the pair passes the budget: list, then row |
| 5f | Proposed cuts (Look deeper) and Mana Balance (step 7) | `decks/cuts-panel.tsx` 564; `mana-balance-panel.tsx` 183 | One PR (747 lines) unless the cuts panel's move passes the budget |
| 5g | Top off, the rows (step 7) | `decks/top-off-list.tsx` 1,769: `CandidateRow` (1281 to 1672), `DeclinedRow`, `IllegalRow`, `RefusalPlate`, `CostTrack`, `rowLabel`, `moneyOf`, `ownershipClause` | The rows and their helpers (about 750 lines moved) |
| 5h | Top off, the list frame (step 7) | `top-off-list.tsx`: `TopOffList` (344 to 1272), `BulkControl`, `sameSelection`, the commit row | The frame after the rows. The demo's presses tick; Add stays inert |
| 5i | Shopping and the buy tag (step 8) | `decks/buy-tag.tsx` 407, `shopping-key.tsx` 93, `tokens-shopping-group.tsx` 94 | Whole files |
| 5j | Card details with marks, the non-modal blocks (any step's card press) | `cards/card-modal.tsx` 3,482: `ProxyDetail`, `BracketFactsDetail`, `OwnedLine`, `ReceiptHeading`, `AvailabilityDetail` (lines 107 to 465) | The blocks ahead of `CardModal` |
| 5k | Card details, the modal's drawing, and Which deck needs it most? (step 8) | `CardModal`'s `return` (2241 to 3274, about 1,030 lines) as a view over props, with `CardModal` keeping its roughly 1,500 lines of state and actions (744 to 2240); `cards/fits-view.tsx` 634 | **Split in three:** the view's upper half, its lower half at a seam the first PR names in its description before coding, then `fits-view.tsx` |
| 5l | The demo section itself: the eight-step frame, the dummy app shell, theme switch, Skip, the end | Design's handoff | Needs 5a to 5k and PR 6. As PR 4: Claude review, design-review skill, `feature-acceptance` |

Card details (5j, 5k) are the one place the demo reads per-player data today (`card-modal.tsx` imports collection
actions): Design's handoff says read-only presses work, so the pure half takes the availability and ownership facts as
props and the demo feeds them from the fixture; the write actions stay in the signed-in `CardModal`.

## Order

PR 1 shipped (#2673), PR 3 shipped (#2677), 1b started, PR 2 folded into PR 4; PR 4 is being built. The demo's order:

1. **Lane 02's About re-shoots (5e) merge.** They capture these same screens, and the fixture must not change under them.
2. **F, the fixture rebuild** for Ashling, Giada and Zimone (after step 1).
3. **The second paid run:** a dry run under the $5 cap goes to the orchestrator first; the run needs Hugh's yes.
4. **PR 6**, the export of that run's outputs and the fixture's projected data.
5. **The demo PRs, 5a to 5l.** The splits 5a to 5k are signed-in refactors that read no fixture and no stored output, so
   they may start once step 1 has merged (a split must not move a screen the re-shoots captured) and need not wait for
   steps 2 to 4; 5l waits for all of them. This is a sequencing call, not a ruling; the orchestrator may hold the splits
   behind step 4 instead.

PR 4 and PR 7 wait on Design's handoff, which has landed; the landing ships without the demo section until 5l.

## Rulings (2026-11-08)

1. The demo fork: Design's call (brief, Open call 3).
2. `PUBLIC_LANDING_ENABLED`: approved, plumbing, off in production.
3. The fixture's deck-state requirement: relayed to si10.
4. The demo's liveness: Design picked (B), a live dummy app; the plan's PR 5 is replaced by 5a to 5l (2026-11-08).
