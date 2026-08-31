# Gate 1 — State reachability, card availability (#43)

Epic: #43 · Handoff: `design/design_handoff_the99_availability/` · Plan:
`docs/superpowers/plans/2026-08-13-card-availability-plan.md`
Run: before Task 6 (`/commanders` — the `Score against` toggle), 2026-08-31.

Gate 1 asks three questions of every state the handoff names, and the third is the one that
matters: **given how the component is actually mounted, seeded and cached, can the triggering
condition ever be true?** A field that is typed and assigned can still be unreachable.

Task 6 is the first UI PR of this epic that reads from a server ranking computed *after* the
persisted one, so the API→UI seam is new. Tasks 3, 4 and 5 shipped before it: the marker
(#225), the builder rows (#226, #227) and `rankFree` (#228).

Legend: ✅ reachable · ⚠️ type present, route incomplete · ❌ not surfaced · 🚫 unreachable at runtime

## Evidence

```
$ pnpm vitest run src/lib/recs/free-ranking.test.ts
Test Files  1 passed (1) · Tests  7 passed (7)

$ pnpm test
Test Files  101 passed (101) · Tests  1202 passed (1202)
```

Read directly: `src/lib/recs/recommend.ts` (the `CommanderListItem` type),
`src/lib/recs/score.ts:64-142` (`scoreCommander`, and what survives of `pool`),
`src/components/commanders/rec-card.tsx:16-33` (the card's whole prop surface),
`src/components/commanders/commanders-view.tsx:28-115`, `src/app/commanders/page.tsx`.

## The states Task 6 names

| # | State | Type | Route | Runtime reachable | Verdict |
|---|---|---|---|---|---|
| 1 | `Score against · Everything I own` (default) | `results: CommanderListItem[]` | `page.tsx` → `getRankedList(userId)` | The shipped path. Any user with a persisted list | ✅ |
| 2 | `Score against · What's free` | `freeItems: CommanderListItem[]` | `rankFree(userId, items)` — merged in #228, **no caller yet** | Task 6 adds the call. `rankFree` early-returns an empty list when `canonical` is empty, so a user with no persisted list gets an empty free list rather than a crash | ⚠️ → resolved by this task |
| 3 | Availability read failed | `availOk: false` | `rankFree` catch at `free-ranking.ts:87-90` | Forced in Gate 2 by pointing the deck read at a dead branch. Task 7 owns the banner; Task 6 must not render the toggle as if the mode were live | ✅ |
| 4 | Receipt, first clause | `receipt.fit(n)` / `receipt.fitFree(n)` | `colorPoolSize` on the item | Always. The line renders for every commander in both modes | ✅ |
| 5 | Receipt, second clause (`n already in use`) | `receipt.inUse(n)` | **No field carries it** — see gap 1 | 🚫 as the plan draws it | 🚫 |
| 5b | Receipt, second clause, soft (`n wanted by a brew`) | `receipt.wantedByBrew(n)` | Nothing in the plan computes it at all — see gap 3 | 🚫 as the plan draws it | 🚫 |
| 6 | Score delta (`↓21 from 82`) | `receipt.deltaFrom(drop, was)` | Joined client-side from `results` + `freeItems` on `oracleId` | Both arrays are on the client once Task 6 passes `freeItems`. `free` mode only, and only where the score moved | ✅ |
| 7 | Re-rank announcement | `ranking.announce(mode, n)` | The page's existing live region | Fires on every toggle flip | ✅ |
| 8 | Numerals after a colour filter | `rankMap` built pre-filter | `rank-maps.ts` (Task 6) | Filtering hides rows and leaves a gap in the numerals — the shipped invariant, preserved in both modes | ✅ |

## Gap 1 — `inUse` cannot be computed on the client (state 5, 🚫)

The plan's Task 6 Step 7 computes the second clause as:

```ts
const inUse = pool.filter((c) => {
  const a = availability.get(c.oracleId);
  ...
}).length;
```

Neither binding exists where the clause renders. `RecCard`'s entire prop surface is
`{ commander: CommanderListItem; rank: number }` (`rec-card.tsx:16-19`), and
`CommanderListItem` carries **`colorPoolSize`, a number** — not the fitting-card list. The
list itself is a local inside `scoreCommander` (`score.ts:69-72`, the colour-identity filter
over the collection) and is discarded the moment its length is taken. There is no
`availability` map on the client either.

This is exactly the #1169 shape: every type checks, and the state is still unreachable,
because nothing hands the component what it needs.

**Resolution.** `inUse` is a per-commander count over a per-commander pool, so it is
server work. Task 6 computes it in the page beside the two rankings and passes it down keyed
by oracle id, reusing the same colour-identity predicate `scoreCommander` uses so
the two numbers describe the same pool. One `loadAvailability(userId)` for the page, one
pass over the collection per commander, no second scoring run and no EDHREC fanout — the
cost the plan's prose already assumed. `commanderPool` is extracted from `scoreCommander`
and exported to hold that predicate in one place: two call sites filtering by hand would
drift apart silently, and nothing on screen would say which of the two numbers was wrong.

## Gap 2 — availability must load in both modes

The plan states, correctly and with the canvas to back it: *"The receipt's second clause
renders in both modes, and Design drew it that way."* Canvas state A is labelled
*"Everything I own (default)"* and its rows already read `34 of your cards fit · 12 already
in use`.

But the only thing that loads availability today is `rankFree`, which Task 6 would sensibly
call only for `?avail=free`. Gate `loadAvailability` on the toggle and the default view
loses its second clause — the majority state, silently degraded.

**Resolution.** `loadAvailability(userId)` runs on **every** `/commanders` load. `rankFree`
keeps its own call (it is independently useful and cheap on a warm read); the page's call is
what feeds `inUse` in both modes.

## Gap 3 — the soft clause has no producer at all (state 5b, 🚫)

Found by Gate 4, not this pass, and recorded here because it is the same seam.

Design table row 8.5 and the canvas's Muldrotha row both specify a gentler second clause —
`33 of your cards fit · ◇ 4 wanted by a brew`, hollow diamond, dimmer than the brass one —
for cards only an unfinished brew lists. The plan's Step 7 counts `hard` and `over` and stops
there, so the soft state is unreachable for the same reason state 5 was: nothing computes it.

**Resolution.** `receiptCountsByCommander` returns `{ inUse, wantedByBrew }` rather than a
bare number. The two are disjoint by construction, because `availabilityState` returns one
state per card, so no card is described twice.

**Left for Design to ratify.** `RecCard` renders exactly ONE clause, hard outranking soft,
mirroring the deck roll-up's fixed severity order. §8's prose says "the second clause",
singular, and no canvas row draws both. A pool holding both severities therefore says
nothing about its soft claims.

## What this gate did not settle

- **The toolbar at a narrow desktop width.** Adding a third control to the desktop toolbar is
  a layout question, not a reachability one. Gate 2 forces it at 1300px, and the decklist-row
  width contest fixed in #227 is the warning: a floor cannot yield, so if the toolbar needs
  arbitration it wants a shrink priority, not a `min-w`.
- **`availabilityCopy.detail.expandedFor(n)`.** Task 6 must call the parameterised form;
  `detail.expanded` hardcodes "These twelve" and would lie for every other count. Recorded
  here because it is a correctness trap in the copy layer, not because it is a state.
