# Design Brief — Commanders as one plane: filters, search, and an honest empty

**Workshop:** 2026-09-06, Hugh + agent, against **#340**, folding in **#335** (control wrap), **#341** (the 1,647 → 9 collapse), **#343** (archetype overflow) and **#344** (novelty contradicting itself). **Track 1, stage 1** — this brief is the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `20b8c1d` on 2026-09-06.** Every `file:line` below was read on that commit, not recalled. An earlier pass of this triage was run against a checkout eight commits stale and its conclusions were wrong; the corrections are on the issues themselves.

---

## §0 Dependency — none. Everything this brief needs is shipped.

The four controls, the shared filter bar, the discovery row and the empty states all landed in PRs #322, #326 and #327. The colour filter, the reveal window and the URL round-trip are live. Nothing here waits on a data source.

**This handoff is not gated.** The readiness audit may treat it as ready-to-build.

---

## §1 Feature / surface + route

**One surface: `/commanders`** — `src/app/commanders/page.tsx`, branching at line 67 into `CommandersView` (owned scope) or `DiscoveryView` (discovery scope), over one shared `FilterBar` (`src/components/commanders/filter-bar.tsx`).

The page already answers two questions from one plane: *how well is a commander I own supported by my collection?* and *what should I play that I am not playing?* This brief does not add a third question. It makes the controls that switch between the two legible, and makes the list say what it did when it removes things.

---

## §2 Where it lives in the flow (entry → this → exit)

- **Entry:** the shell's Commanders nav item. Unchanged, and no new route.
- **This surface:** one ranked list whose candidate universe is set by **scope**, whose collection side is set by **`Score against`**, whose colour identity is narrowed by the **pips**, and whose order under discovery is set by **sort**.
- **Exit:** a row → `/commanders/[slug]`, or "Build this deck" → `createDeck` → `/decks/[id]`. Both unchanged.

---

## §3 Design system / files to build from

- **Brand tokens:** `design/design_handoff_the99_brand/`
- **Six-theme visual system:** `src/app/globals.css` — `amonkhet` "Gilded Stone" (default), `kamigawa`, `innistrad`, `phyrexia`, `duskmourn`, `kaldheim`.
- **The handoff this extends:** `design/design_handoff_the99_discovery/`.
- **Committed property tables this brief reopens:** `docs/superpowers/design-tables/discovery-controls.md` and `docs/superpowers/design-tables/discovery-empties.md`.
- **Gap report recording what was already fixed into the controls:** `docs/superpowers/gap-report-discovery-controls.md`.

---

## §4 The five decisions taken at the workshop

### 4.1 One plane, and no fabricated unified metric

Ownership stays a filter of one list rather than becoming two screens. The workshop tested the alternative and rejected it, but the reason matters for everything below: **the two scopes cannot share a number.**

The owned scope ranks by a live 0–100 fit score (`scoreCommander`, `src/lib/recs/score.ts`). Discovery does not call it at all — `src/app/commanders/page.tsx:68-71` says why, in the code:

> Discovery does NOT call getRankedList, rankFree or receiptCountsByCommander: all three are shaped for the owned scope's few hundred rows, and two of them walk the collection once per commander. `loadDiscovery` answers the same questions from the offline index in one pass over ~3,300 candidates.

`DiscoveryItem` (`src/lib/discovery/list.ts:16-42`) carries no `score` field, and `discovery-view.tsx:9-16` forbids inventing one:

> Fabricating a score or a synergy state to fit its props would put invented numbers one prop away from a surface whose premise is that every figure prints its denominator.

**So rows print their own denominators and do not pretend to be comparable across scopes.** Design should not be asked to draw a single unified score. What it is being asked to draw is a plane where two differently-measured lists sit under one set of controls without either lying about what it measured.

### 4.2 Colour filtering: keep contains-all, add "exactly these", drop OR

Today's semantics are AND-as-superset, client-side (`src/lib/commanders/filter.ts`):

```ts
/**
 * Inclusion semantics: keep commanders whose colorIdentity contains ALL
 * selected colors (i.e. selected ⊆ colorIdentity).
 * An empty selection returns all results unchanged.
 * Never re-sorts.
 */
```

This is the source of the reported "the filter behaves like OR" confusion. Selecting G+B returns Golgari, Jund, Sultai, Abzan and every five-colour commander — a list that *looks* like noise from an OR filter but is a correct superset match.

**Ruling: keep contains-all as the default, add an "exactly these colours" modifier, and do not build an OR mode.** OR was the weakest of the three use cases, and the control bar cannot absorb another mode without making 4.5 worse. The join mode round-trips in the URL beside the existing `?c=`.

**What Design decides:** how a two-state modifier attaches to a row of five colour pips without reading as a sixth pip, at both widths, and how the current mode is legible at a glance rather than only on hover.

### 4.3 Search filters in place, and says so when it can't

There is no search input anywhere on `/commanders` today — confirmed by grep across `src/components/commanders/`.

**Ruling: search narrows the list in place.** It does not navigate, and it does not open a separate results surface. When it returns nothing, or when it matches a commander that an *upstream* control excluded — a colour pip, the availability mode, or the novelty floor — the list says which control removed it and offers to search all commanders.

That second case is the whole point. A player typing a commander's name knows it exists; a bare "no results" tells them the app is broken. Naming the responsible control turns a dead end into a one-tap correction.

**What Design decides:** where the input lives relative to the four existing controls, its empty and its excluded-match states, and whether the escape offer is inline or a distinct affordance.

### 4.4 The novelty floor scales with the pool it measures

**#341 was filed against the wrong cause.** The reported collapse from 1,647 rows to 9 is not the availability toggle acting as a filter. It is the novelty sort's floor, `src/lib/discovery/list.ts:125-128`:

```ts
const active =
  input.sort === "new"
    ? enriched.filter((c) => measurable(c) && clearsFloor(c))
    : enriched;
```

A commander must be measurable (`tagTotal > 0 && floorPct != null`) and clear a 30% floor (`src/lib/discovery/floor.ts:10`). `floorPct` is the share of a commander's support list the player owns. Switching `Score against` to "What's free" shrinks the owned pool, which drags `floorPct` under 30% for very nearly everything. Under `sort: "fit"` there is no filtering at all.

**Ruling: the floor scales with the pool being measured, and the list always names what it excluded.** A threshold calibrated against a whole collection is not the same threshold against a free-cards-only subset. Nine survivors is the floor working correctly on a pool it was never tuned for.

The exclusion sentence is copy Design should treat as drawn content, on the model of: *"3,301 commanders fall below the support floor for this pool. The closest is at 22%."* It extends `docs/superpowers/design-tables/discovery-empties.md`.

**`Score against` survives as a scoring input.** It was never redundant with scope; it changes which cards count, not which commanders are candidates.

### 4.5 The scope control moves when you use it (#335)

Under the discovery scope the header subtitle is longer — *"3,326 commanders you have not built · ranked by best fit · read against 2,800 cards"* — than the owned scope's string. The header row is `justify-content: space-between` with `flex-wrap: wrap` on desktop, so the longer subtitle pushes the scope control onto a second line.

**This is conformant to the drawn design, not a defect.** The wrap is gap 2 in `docs/superpowers/gap-report-discovery-controls.md` — a value that was *fixed into* the implementation to match the table. It was refiled from `type: bug` to `type: design` for that reason.

**What Design decides:** a control that changes position the moment you click it is disorienting. Either the wrap is prevented at this breakpoint, or the scope control does not live on the title row. This is not something eng should silently "fix" against a committed table.

---

## §5 Two row-level items folded in

### #343 — the archetype overflow is never surfaced

`src/components/commanders/discovery-row.tsx:105-117` renders three archetype names and a trailing count:

```ts
const names = item.unplayedLabels.slice(0, 3);
const extra = Math.max(0, item.unplayedCount - names.length);
```

`item.unplayedLabels` already carries the **full** array to the client. The remaining names are in the payload and simply not displayed, so this is a disclosure affordance over data the row already holds — no fetch, no query, no new field.

**What Design decides:** how a row discloses the rest without breaking the list's scan rhythm. `docs/superpowers/design-tables/discovery-rows.md` draws the row as a single dense sentence; whatever opens must not turn the list into a stack of cards.

### #344 — "Something new" leads with the closest thing you already own

The row's tail sentence names the nearest deck the player has already built. Under the novelty sort that is an argument against the recommendation, printed at the end of it.

**What Design decides:** whether the nearest-deck clause belongs under the novelty sort at all, and if it does, what framing makes it a reason to try the commander rather than a reason not to. The clause is genuinely useful under the fit sort, so this is a per-sort decision, not a delete.

---

## §6 Must-nots

1. **Do not draw a unified 0–100 score across both scopes.** The code forbids it and the reason is in §4.1.
2. **Do not add a second filter bar.** The shared bar is a ratified decision (`gap-report-discovery-controls.md`, "Ratification requested" item 3); a discovery-only bar was explicitly forbidden.
3. **Do not restyle the shipped header, its colours, or `Score against`.** Rules 1, 8 and 15 of the discovery handoff still stand, and the gap report lists the shipped values the branch is required to preserve.
4. **Do not add an OR colour mode.** Decided against at the workshop; it is not a gap to fill.
5. **Do not solve #335 by shortening the subtitle.** The availability clause is the only place `/commanders` states which pool it ranked against, and dropping it regresses a shipped surface.

---

## §7 Open for Design — one question this brief cannot answer

There are now potentially six controls above one list: scope, `Score against`, colour pips, the new join-mode modifier, sort, and search. §4.5 says the row already fails at five.

**Design should say whether these six can coexist above one list at 375px, or whether the set needs a different structure — a filter sheet, a collapsed summary row, or a different grouping entirely.** The workshop deliberately did not pre-commit to an answer, because every option we could construct was drawn from the current bar's premise and inherited its constraints.

If the answer is a restructure, say so plainly; the eng cost of a new arrangement is far lower than the cost of six controls that wrap unpredictably.
