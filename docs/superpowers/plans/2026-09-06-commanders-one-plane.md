# Commanders as One Plane — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/commanders` a single honest plane. Add the two narrowing controls the list is missing (a name search, and a colour join mode), and — the substantial half — make the list state what it excluded and why, so that the populations printed on the page reconcile: `full pool − below-floor − unmeasurable = rows shown`.

**Architecture:** No new page, no new route, no new list component. Every change lands in the existing `/commanders` server read (`src/lib/discovery/`), the existing filter bar, and the existing discovery view. The two genuinely new pieces are (a) a second derived table in the candidate query that answers "would this commander have cleared the floor against the player's *whole* collection?" — the discriminator that finally makes the three pool copy keys reachable — and (b) one server action that answers "why is the commander I just searched for not in this list?" for the two reasons the client cannot see (scope and floor), because those rows are not in the client's data at all.

**Tech Stack:** Next.js 16 App Router (server components, server actions, `searchParams`), React 19, Drizzle ORM on Neon Postgres, Tailwind 4, Vitest.

**Spec:**
- Brief: `docs/superpowers/design-briefs/2026-09-06-commanders-one-plane.md`
- Handoff: `design/design_handoff_the99_commanders_plane/` (R6) — `README.md`, `CONTROLS-six-above-one-list.md` (§7), `STATES-search-and-exclusions.md` (§1–§6), `commanders-plane · copy strings.ts`, `brand/`, `support.js`
- Readiness: `design/design_handoff_the99_commanders_plane/R6-READINESS.md` — 🟡 Yellow, ready to build with the resolutions carried here
- Issues: #340, folding #335 (two-row header), #341 (join mode), #343 (archetype overflow), #344 (distance copy)

---

## Global Constraints

Every task's requirements implicitly include this section.

**Design system — the must-nots.** No new design token, hex value, motion class, empty-state pattern, or component. Search reuses the shipped field geometry; the join modifier reuses `ScoreAgainst`'s segmented-control vocabulary; the pool empty state is a variant of `FloorEmpty`, not a sibling. `filterByColors` gains a **mode, not a sibling function**. `PageHeader` stays **one subtree with responsive classes** — never a mobile copy and a desktop copy of the same content.

**Copy.** Every user-visible string comes from `src/lib/copy/commanders-plane.ts`, lifted verbatim from the handoff's copy file. Every number is locale-formatted through `n()`; percentages stay raw. Two shipped strings in `src/lib/copy/commander-discovery.ts` are **edited**, not added: `justify.floorNote` / `.floorNoteShort` gain a second argument, and `justifyEdit.distanceNear` reframes for #344.

**The floor percentage has one source.** `Math.round(NOVELTY_FLOOR * 100)` from `src/lib/discovery/floor.ts:10`, threaded to all seven call sites in `STATES-search-and-exclusions.md` §6. No literal `30` anywhere in copy or components. The threshold *percentage* is constant; what scales per commander is the absolute card requirement, through `edhrecTotal` (`novelty.ts:20-23`). R6's gap 1 premise is wrong and nothing is redrawn — see R6-READINESS blocker 4.

**Ruled out, do not implement.**
- `search.count` — the in-field match count. The pip row's `{filteredTotal}/{activeTotal}` (`filter-bar.tsx:374-379`) carries it, and printing the same figure twice breaks the handoff's own "the match figure appears once" rule. Shipping an unreachable copy key is the defect class R6 just fixed. Search keeps its non-visual feedback through `search.announce` on the live region.
- Search or the join modifier on the **owned** scope. The handoff draws no owned-scope states for either. Both are optional props on the shared `FilterBar`, absent for `CommandersView`.
- A filter sheet, a collapsed summary row, a sixth pip, a third `Score against` segment, a global app-shell search — all five rejected in `CONTROLS-six-above-one-list.md` with reasons.
- A seventh thing above the list. The bar is at its limit; #159's tag filter does not fit here.
- Any animation of the list from a control above it.

**Data semantics.**
- `measurable(c)` is `c.tagTotal > 0 && c.floorPct != null` (`list.ts:122-133`). Every candidate is in exactly one of three sets, so `unmeasured = candidateCount − items.length − floorExcluded` needs no new query.
- `clearsFloor(c)` is `c.ownedSupport >= NOVELTY_FLOOR * c.edhrecTotal`, and returns false when `edhrecTotal` is null or ≤ 0.
- `clearsAgainstCollection` means: the same predicate, with `ownedSupport` computed over the player's **whole collection** rather than the free pool. It is only ever true when `avail === "free"`; under `avail === "all"` the two supports are identical by construction, so the second table is skipped.
- **It is a property of the *excluded* set, not of a shipped row.** `list.ts:127` keeps only rows that clear the floor, so every row in `items` clears against the whole collection trivially — a per-item flag would be a constant. The rows the pool copy is about are the ones dropped at `list.ts:130-133`. The list therefore carries an **aggregate**, `poolExcluded`, and the per-commander answer comes from the Phase 5 server action, which has the row in hand.
- **The threshold is evaluated in one engine, JS.** SQL projects the raw collection support as an `int`; `clearsFloor` decides. A SQL `>=` would get the two guards wrong — a null `edhrecTotal` yields NULL into a boolean field, and a zero one makes `0 >= 0` true where an unmeasurable commander must clear nothing — and a second spelling of the floor is a second thing that can drift. (Checked and *not* a reason: IEEE-754 and Postgres numeric agree on `0.3 × t` for every integer `t` up to 100,000, so there is no float boundary divergence to cite.)
- Exclusion precedence is the four-tier table in §4, untouched by R6: scope → colour/join → floor → `Score against`. A pool exclusion is a **sub-case of the floor tier**, not a fifth tier.

**URL state.** Two new client-side-only params, mirrored through the existing `replaceState` effect in `discovery-view.tsx` and written only when non-default: `?q=` (search) and `?join=exact`. A settled query change or a join-mode flip resets `shown` to `REVEAL_STEP` via the existing render-time `listKey` reset; the archetype overflow disclosure does not.

**Workflow.** Worktree `.worktrees/commanders-plane-readiness` on `design/commanders-plane-readiness`. pnpm only. Pre-push gate every push: `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`, then `git fetch origin && git rebase origin/main`. Stage files by name. Squash merge.

**Coordination.** A second agent owns `/commanders/[slug]`: `src/lib/recs/**`, `src/lib/copy/recommendations.ts`, `src/components/commanders/detail.tsx`, `coverage-*.tsx`, `src/app/commanders/[slug]/**`, and a new prose column in `src/db/schema.ts`. This plan touches none of them. Issues #390 and #391 are not in scope.

**One branch, one PR, a commit per phase.** The phases are not independently shippable: the copy module, the exclusion line and the new list fields are one contract, and the design-review skill runs once over the finished bar at both widths. A seven-deep stack of dependent PRs would be merge choreography for a single feature.

**Testing.** Vitest. DB-touching modules are tested by extracting the pure shaping function and testing it directly, or by `vi.mock`ing the `db` chain — follow `src/app/commanders/[slug]/synergy-read.test.ts`. No test may require a live database.

---

## File Structure

**New**
- `src/lib/copy/commanders-plane.ts` — the handoff's `planeCopy`, verbatim, minus `search.count`.
- `src/lib/commanders/join.ts` — `JoinMode` type and `parseJoin`. (Or folded into `params.ts` if it stays two lines; see Task 5.)
- `src/components/commanders/search-field.tsx` — the field, both widths, one subtree.
- `src/components/commanders/join-mode.tsx` — the segmented modifier, both widths.
- `src/components/commanders/exclusion-line.tsx` — the receipt beneath the bar.
- `src/components/commanders/excluded-match.tsx` — the aside for a named excluded commander.

**Edited — server**
- `src/lib/discovery/candidates.ts` — second derived table (`csc2`), `clearsAgainstCollection` column.
- `src/lib/discovery/list.ts` — `freePoolSize` + `unmeasured` on `DiscoveryList`; `clearsAgainstCollection` on `DiscoveryItem`; `floorPct` → `supportPct`.
- `src/lib/discovery/params.ts` — `parseJoin`.
- `src/app/commanders/actions.ts` — the settled-query lookup against the full index.

`src/app/commanders/page.tsx` is **not** edited: `?q=` and `?join=` are client-side narrowings mirrored with `replaceState`, so the server never reads them, exactly as `?c=` works today. `params.ts` touches no database, so `parseJoin` can live there and still be imported client-side.

**Edited — client**
- `src/components/commanders/discovery-view.tsx` — search + join state, the two new params, the exclusion line, the aside, the three list states.
- `src/components/commanders/filter-bar.tsx` — optional search slot (leading edge desktop; mobile row 4 replacing `WindowCount`), optional join slot inside the pip wrapper.
- `src/components/commanders/discovery-empty.tsx` — pool variant of `FloorEmpty`.
- `src/components/commanders/discovery-row.tsx` — `supportPct` rename; archetype overflow disclosure (#343).
- `src/components/commanders/page-header.tsx` — two-row structure (#335).
- `src/lib/commanders/filter.ts` — `exactly` mode.
- `src/lib/copy/commander-discovery.ts` — the two string edits.

**Edited — design tables**
- `docs/superpowers/design-tables/discovery-controls.md` — two-row header, the filter bar's leading slot.
- `docs/superpowers/design-tables/discovery-empties.md` — two new states, one new element.

---

## Phase 1 — Server: the second derived table and the honest populations

One PR. No UI. Ships the data every later phase reads.

- [ ] **1.1 `collectionSupportTable` in `candidates.ts`.** A second derived table, same shape as `ownedSupportTable` but parameterised on the full collection's oracle ids. Its **inner** alias stays `csc` (it is scoped to the subquery); the **derived table** takes a new alias — `csa`, distinct from `osc` — and its column a new name, `collection_support`, because `owned_support` is taken at `candidates.ts:101`. LEFT JOIN on the same key. Project `coalesce(csa.collection_support, 0)::int`.
  - **No predicate in SQL.** The projection is a raw count; `clearsFloor` in `list.ts` decides. See the Data semantics note on the two engines.
  - Skip the join when the caller passes no collection ids (i.e. `avail === "all"`, where the two sets are identical); project `owned_support` again so the row shape is stable and the JS predicate is trivially consistent.
  - Aggregation stays inside both derived tables, so the outer query still has no GROUP BY, and each yields at most one row per `commander_oracle_id` — the second LEFT JOIN cannot multiply rows. This is the whole reason the locked decision is affordable. Cost that the readiness note did *not* claim away: a second `uuid[]` bind payload and a second aggregate scan of `commander_support_cards`.
- [ ] **1.2 Thread it through `loadCandidates`.** New optional argument for the collection id set. `list.ts:202` passes `collection.map(c => c.oracleId)` alongside the existing scored ids, and only when `avail === "free"`.
- [ ] **1.3 `DiscoveryList` gains `freePoolSize`, `unmeasured`, and `poolExcluded`.**
  - `freePoolSize` is `scored.length` (`list.ts:181`), which is local to `loadDiscoveryPool` — `assembleDiscovery` (`list.ts:73-82`) takes no pool today, so it gains an input. `list.test.ts` and `list-wiring.test.ts` both need the new field.
  - `unmeasured` is `candidateCount − items.length − floorExcluded`.
  - `poolExcluded` counts the `excluded` array at `list.ts:130-133` where `clearsFloor({ ownedSupport: c.collectionSupport, edhrecTotal: c.edhrecTotal })` — the group that fell below the floor **only because the pool is the free one**. Zero under `avail === "all"` by construction.
- [ ] **1.4 Rename `DiscoveryItem.floorPct` → `supportPct`.** `floorPct` must unambiguously mean *the threshold* at all seven §6 call sites. Sites: `novelty.ts` (the function keeps its name — it returns the row's figure), `list.ts`, `discovery-row.tsx:399-401,536-543`, and three test files. **`discovery-empty.tsx:52-81`'s `floorPct` prop is the threshold and must NOT be renamed** — that is exactly the collision this rename exists to end. Nothing in the other agent's files reads it (`rec-card.tsx:22` imports the type but not the field), so the rename is collision-free across the coordination boundary.
- [ ] **1.5 Unit tests.** The three-set partition sums to `candidateCount`. `poolExcluded` is 0 under `avail === "all"`. A commander below the floor on the free pool but above it on the whole collection is counted in `poolExcluded` and not in `items`. Null and zero `edhrecTotal` are unmeasurable on both pools, not cleared on either. A row sitting exactly on the floor (21/70) is ranked, because `clearsFloor` is inclusive — and is inclusive once.
- [ ] **1.6 Gate + PR.**

**Verification:** `pnpm test`. Then load `/commanders?scope=play&sort=new&avail=free` in dev and confirm the three figures sum.

**Note:** 1.4 edits `discovery-row.tsx`, so Phase 1 is not literally server-only — but the edit is a rename with no rendered change, which is why it ships here rather than blocking a UI phase.

## Phase 2 — Copy module

Folded into Phase 3's PR if it is small enough to review together; otherwise its own commit.

- [ ] **2.1 Port `planeCopy`** to `src/lib/copy/commanders-plane.ts`, verbatim, with the handoff's `n()` and `identity()` helpers. **Omit `search.count`.**
- [ ] **2.2 Edit the two shipped strings** in `commander-discovery.ts`: `justify.floorNote(floorPct, supportPct)` and `.floorNoteShort(floorPct, supportPct)`; `justify.distanceNear` reframed per the handoff's `justifyEdit`.
- [ ] **2.3 Fix the call-site labelling** as built, silently: `discovery-row.tsx:401` is **mobile** (`floorNoteShort`, 10.5px) and `:542` is **desktop** (`floorNote` inside `<Emphasised>`, 11.5px). The handoff states the reverse in two places. No redraw, no round-trip.
- [ ] **2.4 Route the module through `/copy-review`** before it ships.

## Phase 3 — Colour join mode (#341)

- [ ] **3.1 `filterByColors` gains a mode.** Signature `(results, selected, mode: JoinMode = "contains")`. `exactly` is `selected.length === r.colorIdentity.length && selected.every(c => r.colorIdentity.includes(c))`. Empty selection still returns unchanged under both modes.
- [ ] **3.2 `parseJoin`** in `params.ts`; `?join=exact` mirrored through the existing `replaceState` effect, written only when non-default.
- [ ] **3.3 `join-mode.tsx`, desktop.** Inside the pip wrapper, after a `1px × 16px --border-strong` hairline with 2px margins. Radiogroup, roving tab stop, `aria-label` `Colour match`. **Absent — not disabled — when no pip is lit.**
- [ ] **3.4 Mobile variant.** Own row, `margin-top: 10px`, mono 9px uppercase label, segments `flex: 1` at 38px. Still absent with no pip lit, which is what keeps §7's row count honest.
- [ ] **3.5 The exact note.** `join.exactNote` / `.exactNoteShort`, suppressed at 375px whenever a report already names the mode (the one-report rule, §4).
- [ ] **3.6 Announce.** `join.announce(mode, count, colors)` on the existing live region, debounced to one per settle.
- [ ] **3.7 Tests.** `filterByColors` under both modes, including the empty-selection and single-colour cases.

## Phase 4 — Search

- [ ] **4.1 `search-field.tsx`.** One subtree, responsive classes. `FIND` caption is `aria-hidden`; the input carries `search.inputAria`. Clear button per the component notes.
- [ ] **4.2 Placement.** Desktop **leading edge** (option 1 in §7) — flagged in the PR body because the pip wrapper and `Score against` move right 292px with no declared value changing. **Check the wrap at ~1024px:** the row is `flex-wrap` (`filter-bar.tsx:179`) with `ml-auto` on `WindowCount` (`:295-301`) and an auto-margin order slot (`:306`), so +292px can push the trailing "Showing N of M" (`:310-317`) onto a second line. "No declared value changes" is a claim about tokens, not about layout. Mobile takes row 4, **replacing `WindowCount`** — also flagged, because it is a deletion of shipped content. `RevealControl` still prints "N shown · M more below" inside the `<ul>`.
- [ ] **4.2b The owned scope must not move.** `FilterBar` has exactly two call sites (`discovery-view.tsx` and `commanders-view.tsx:271-281`). With no search prop the leading slot must render **nothing at all** — not an empty wrapper, which would still contribute the row's gap and shift the owned bar.
- [ ] **4.3 `?q=`** mirrored, non-defaults only, read back off the live URL like `?c=`. The `replaceState` effect at `discovery-view.tsx:141-153` has deps `[colors]` — **both new params must join that array**, or mirroring silently stops.
- [ ] **4.4 Search composes into the existing `filtered` memo** (`discovery-view.tsx:59-62`), after `filterByColors`. That memo feeds `filteredTotal` into the pip row (`filter-bar.tsx:374-379`), which is the entire basis for ruling out `search.count`; if search filtered somewhere else, the shipped figure would go stale and the ruling would be wrong. Name matching only (gap 6, accepted). A settled query and a join flip both join `listKey` (`discovery-view.tsx:108`), so they reset `shown` to `REVEAL_STEP` through the existing render-time reset.
- [ ] **4.5 `search.announce(matches, pool)`** on the live region, one per settle.
- [ ] **4.6 The no-match state, and the three things `FilteredEmpty` gets wrong for it.** The component (`filtered-empty.tsx:15-29`) exposes `heading/body/cta/extraClause/secondary` — it has no `emphasis` slot, its diagnostic is hard-coded to `commandersCopy.filteredEmpty.count(total)` (`:103-110`), its pips render off `colors` (`:52-64`), and `onClear` is wired to `clearColors` at the call site (`discovery-view.tsx:252-253`). Rendered as-is for a search miss with no pips lit, it would show an empty pip row, a colour-vocabulary count line, and a button that clears colours instead of the query. Three minimal additions, all optional and all inert for the owned scope:
  - `diagnostic?: string` overriding the hard-coded count line, carrying `search.noneEmphasis(candidates)`.
  - Render the pip row only when `colors.length > 0`. The owned scope only reaches this state with colours lit, so it stays byte-identical.
  - `onClear` and `cta` supplied by the caller, so the search miss clears the query (`search.noneCta`).

## Phase 5 — The server lookup and the excluded-match aside

- [ ] **5.1 Server action** in `src/app/commanders/actions.ts`: match a **settled** query against the full index and report which stage removed the row (scope · colour/join · floor · pool · `Score against`). One request per settled query, never per keystroke. Colour and join answers stay client-side — the rows are already in hand.
- [ ] **5.2 `excluded-match.tsx`.** `role="status"`. Body 12.5px `--fg-muted`, names `--fg` 600, correction as a mono 11.5px `--accent` button (own line at 375px). Two clauses maximum, joined ` · ` (gap 4).
- [ ] **5.3 The three list states** from §2: no match (2a), every match excluded (2b), aside above a live list (2c).

The one-report rule moves to Phase 6 — it ranks the aside *against the exclusion line*, which does not exist until 6.1.

## Phase 6 — The exclusion line and the pool empty state

- [ ] **6.1 `exclusion-line.tsx`.** At list padding, leading rotated diamond, mono 11.5px / 10.5px, figures `--fg-body`, **same strings at both widths**, unmounts when nothing is excluded. Two clauses max via `exclusion.join2`.
- [ ] **6.2 The five sentences and the four-tier precedence**, with R6's discriminator: floor **and** clearing against the whole collection → `excluded.pool`; floor alone → `excluded.floor`. The line reads `poolExcluded` from the list; the per-commander sentence reads the Phase 5 action's answer.
- [ ] **6.3 Pool variant of `FloorEmpty`** — `floorPool.heading/body/emphasis/cta`. `body` takes `(floorPct, below, unmeasured, candidates, freeCards, clearingAgainstCollection)`; `freeCards` is `freePoolSize`, `clearingAgainstCollection` is `poolExcluded`, and the figures must sum to the pool.
- [ ] **6.4 The one-report rule at 375px:** the aside outranks the exclusion line, and the exact note is suppressed whenever a report already names the mode (§4). Desktop renders both — it has the width.
- [ ] **6.5 All seven floor call sites print the same figure**, from `Math.round(NOVELTY_FLOOR * 100)`.
- [ ] **6.6 Tests** for the precedence resolver: one test per tier, plus the pool sub-case, the two-clause cap, and the 375px suppression ranking.

## Phase 7 — Header and overflow

- [ ] **7.1 Two-row `PageHeader` (#335).** Row 1 `h1` + `ScopeControl`, `space-between`, `align-items: center`, `gap: 24px`, no `flex-wrap`. Row 2 subtitle full width, `margin-top: 4px`. `align-items: flex-end → center` and dropping `flex-wrap` are consequences of the structure §4.5 asks for, not a restyle — must-not 3 forbids restyling, and §4.5 hands Design the row's layout axis.
- [ ] **7.2 Archetype overflow disclosure (#343).** The count clause becomes a `button` with `aria-expanded`, `--fg-body`, `border-bottom: 1px dotted --fg-faint`, negative-margin padding. It does **not** reset `shown`.

## Phase 8 — Close-out

- [ ] **8.1 Amend the two committed design tables** — `discovery-controls.md` (two-row header, leading filter slot) and `discovery-empties.md` (two new states, one new element).
- [ ] **8.2 Design-review skill** — property-table enumerate → verify → confirm, at both widths, mobile + desktop parity in the same PR. Watch for subtree duplication in any responsive split.
- [ ] **8.3 Update `docs/superpowers/design-pipeline-status.md`.**
- [ ] **8.4 PR body carries the four ratification items** from R6-READINESS: +173px accepted (option a); leading-edge search (option 1); must-not 3's scope on the header row; `WindowCount` dropped from the mobile bar. Plus the two eng decisions: `search.count` not shipped, and search/join are discovery-only.
- [ ] **8.5 Copilot to the merge bar**, then squash merge.

---

## Open with Hugh — not blocking

None of these stop the build; each ships as drawn and is listed in the PR body.

1. **+173px above the list at 375px** in the worst reachable state (503px against a shipped 330px). Accepted per option (a). Flipping to (b), a phone-only tier-2 disclosure, is additive and does not invalidate the build.
2. **Leading-edge search on desktop.** Option 2 is a one-line reorder if the x-positions should be frozen.
3. **Must-not 3's scope** on the header row.
4. **`WindowCount` dropped from the mobile bar.** Keeping it in both places costs a fifth phone row, +48px on every state including the default.
