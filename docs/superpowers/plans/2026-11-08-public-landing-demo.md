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
No demo UI is built until the handoff lands. Everything below assumes (A); under (B) about nine presentational-split PRs
replace PR 5 and are planned when the handoff picks it.

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
matching new `model_calls` ids. The stored outputs live on that branch until PR 6 captures them, so the branch is kept
until then.

**What the fixture must hold (a requirement for si10, sent now):** the tools need different deck states.
- A deck of **exactly 100** cards: Suggested changes v2 (`V2_DECK_TOTAL`, `src/lib/tuning/v2/run.ts:80`), Overview,
  analysis, Mana balance.
- A deck **over 100**: Look deeper refuses unless the deck runs long (`facts.over`, `cuts-actions.ts:96`).
- A deck **under 100**: Top off.
- A collection rich enough that "commanders you can build" is long and Help me choose returns several, and one card
  owned that fits several decks (Which deck needs it most?).
- At least 6 credits on the fixture account (scratch branch only).

## The demo's data

A generated, committed manifest `src/lib/demo/manifest.generated.ts` (written by the capture pass): per step, the capture
paths per theme and width, the tap boxes measured from the DOM at capture time, and the caption key. The captions live
in `src/lib/copy/landing.ts` (/copy-review). The demo reads nothing else: no table, no tool module, no user data.

**Tests (with the manifest type, written only after Design picks A or B):** the manifest's steps match the copy keys; every capture file exists for every theme and width; a name
scan fails on any visible person name outside the fixture's fictional list, exempting catalog card names (fixture decks
are named after their commanders, which are real cards). The capture script keeps About's guard that fails a frame still
showing the real identity.

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
| 1b | Parser coverage fixtures (and any header alias) | nothing | Test-only, or not risky if an alias lands: cavecrew-reviewer |
| 2 | Folded into PR 4 (ruling 2026-11-08): the `PUBLIC_LANDING_ENABLED` registry entry, its test and Admin label, and `src/components/landing/` and the five model/tool dirs in the walk's lists ship with the first PR that reads them; the manifest type and its tests are written only after Design picks A or B | - | - |
| 3 | `scripts/demo-generate.mjs`, the ledger entry; the paid run (dry run to the orchestrator first) | si10's fixture | Claude review (it edits `src/lib/eval/ledger-limits.ts`) |
| 4 | The landing page, phone and desktop, behind `PUBLIC_LANDING_ENABLED`; with PR 2's switch and walk dirs, `observeAnonymousHit` on the landing branch and `saveLandingLaunchEmailAction` (per-visitor cap, then `overAnonymousCeiling`, on the `launch-list` buckets) | Design's handoff | Claude review, design-review skill, `feature-acceptance` |
| 5 | The demo walk (capture walk under A) | Design's handoff, PR 6 | As 4 |
| 6 | `capture:landing`: every demo step and landing screen, six themes, two widths, writing the manifest | si10's fixture, PR 3 | Script and captures: Claude review for the generated manifest |
| 7 | Bring your collection: the landing section, the first-run paths and export guides | Design's handoff | As 4 |

PRs 4, 5 and 7 split by surface so each stays under 20 files and 800 lines. Close-out: the `feature-acceptance` walk at 390
and desktop, signed out, both switch states, and the first run on a fresh account.

## Order

PR 1 shipped (#2673); 1b starts now; PR 2 is folded into PR 4. PR 3 waits for si10's fixture and sends the dry-run estimate first. PR 6 follows PR 3. PRs 4,
5 and 7 wait for Design's handoff.

## Rulings (2026-11-08)

1. The demo fork: Design's call (brief, Open call 3).
2. `PUBLIC_LANDING_ENABLED`: approved, plumbing, off in production.
3. The fixture's deck-state requirement: relayed to si10.
