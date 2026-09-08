# In-flight feedback for control flips that fetch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a control above the `/commanders` list starts a fetch and the fetch outlasts 500 ms, the one subtitle clause that control owns is replaced by a participle until the answer lands. The list is not touched: no skeleton, no dim, no overlay, no spinner. The rows on screen are the previous answer and stay pressable until a better one arrives.

**Architecture:** Three layers, in dependency order. (1) `src/lib/copy/commander-discovery.ts` stops emitting the discovery subtitle as one pre-joined string and starts emitting its four clauses as parts, because a clause cannot be replaced while it is glued to its neighbours. (2) A new `src/lib/copy/in-flight.ts` holds `PENDING_GATE_MS`, the three participles, and `discoverySubtitle(parts, pending)` — the single place a clause is swapped for its participle. (3) `discovery-view.tsx` names which control is in flight, gates that name behind one timer, and passes it to `PageHeader`, which renders the sentence as spans so the participle alone can carry `aria-hidden`.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Design handoff:** `design/design_handoff_the99_in_flight/` — `README.md`, `RULING-in-flight-feedback.md` (the ruling, the four-clause table, and the three verbatim document amendments), `The 99 - In-Flight Feedback.dc.html` (both frames), `in-flight · copy strings.ts` (production-final copy and the reference assembler), `READINESS.md` (Design's self-assessment: 🟢 Green, one 390px judgement open).

**Readiness verdict:** 🟢 Green — `docs/superpowers/gap-report-in-flight.md`, audited 2026-09-07 against R2.

---

## Sequencing — read before starting

Another agent is mid-flight on the Commanders and Discover views under `design/design_handoff_the99_refresh`. Its one Commanders-list change is search moving in with the filters (`README.md:69-77`), which is `filter-bar.tsx`; this plan is `page-header.tsx` plus copy modules, so they do not overlap. **Start anyway only after that work has merged**, and rebase before the first commit — `discovery-view.tsx` is touched by both, and a rebase is cheaper than a conflict discovered at push time.

---

## Locked rulings — do not re-litigate

1. **The list is never touched.** No `RegionLoader`, no skeleton row, no dimmed list, no overlay, no `aria-busy`, no pointer trap. The outgoing rows are the previous answer.
2. **The pending clause replaces; it never appends.** Appending a fifth clause is the reflow this ruling exists to prevent.
3. **One gate, 500 ms, all three fetching controls.** Never tuned per control.
4. **`read against N cards` has no pending state at all.** It is owned by nobody and is invariant under every flip (locked and tested at `src/lib/discovery/list-wiring.test.ts:110-114`). R1's `re-reading…` is retired and must not be reintroduced.
5. **Every participle is shorter than the clause it replaces, at every width**, so the subtitle's wrap point can only move earlier. Clause 4 is measured against `free cards only` (15 chars), its shortest form — not `every card you own`.
6. **The participles are bare** — `counting…`, `re-ranking…`, `re-scoring…`. One string each, no desktop/phone variants, no object named. The pressed control is already showing a crown where its label was.
7. **Client-side toggles get no mark.** The owned-scope availability toggle and the colour pips have nothing to wait for.
8. **Nothing is announced mid-flight.** `PendingLabel`'s accessible name plus the existing settle message. The pending clause is `aria-hidden`.
9. **No escalation tier.** No second string at any duration, no "this is taking a moment", no error clause.
10. **The window reset stays on arrival, not on press.** A flip that fails leaves the reader where they were.
11. **A flip during a flip: the second press supersedes.** The crown and the pending clause both move to the second control.
12. **Search gets no treatment** — no crown, no participle, no clause. `findExcludedMatches` filters client-side and never gates the visible list.

## Corrections carried from the audit

- **Exactly one participle is reachable under `I own`** (`counting…`), not two. Owned-scope availability is a client swap; `commanders-view.tsx` passes no `availPending`. The handoff's "two under `I own`" sentence is a doc-sync slip and ruling 7 governs.
- **`ordering` is always present.** The reference assembler types it optional and filters falsy parts; taken literally that deletes `ranked by fit` from the owned-scope subtitle. The owned scope has no sort *control*, so clause 2 there can never go **pending** — that is the whole of the difference.

## Global constraints

- Package manager is **pnpm**.
- Copy lives in `src/lib/copy/`, taken verbatim from the handoff's copy file. **No string is invented at a call site.** Wording changes go through `/copy-review`.
- Mobile and desktop parity ship in the same PR. Every UI task states both sets of figures (390px / 1280px).
- Every UI PR passes the design-review skill (property-table enumerate → verify → confirm) before `gh pr create`.
- Pre-push gate, every push: `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then `git fetch origin && git rebase origin/main`.

---

## Task 1 — split the discovery subtitle into its clauses

- [ ] In `src/lib/copy/commander-discovery.ts`, replace `subtitleOwned` / `subtitlePlay` with a single `subtitleParts({ scope, candidates, cards, sort })` returning `{ population, ordering, collection }`.
- [ ] `population`: `${n(candidates)} commanders you own` (owned) / `${n(candidates)} commanders you have not built` (play).
- [ ] `ordering`: `ranked by fit` (owned) / `ranked by best fit` | `ranked by what is new to you` (play, by `sort`). These are the strings already shipped — do not re-word them here.
- [ ] `collection`: `read against ${n(cards)} cards`.
- [ ] `subtitleAll` / `subtitleFree` are unchanged; they are clause 4.
- [ ] Update `src/lib/copy/commander-discovery.test.ts` to assert against the parts. The assembled sentence must be byte-identical to what ships today under every scope × sort × avail combination — add that as an explicit test rather than trusting the refactor.
- [ ] The no-scope arm (`N cards scanned · ranked by fit`, `page-header.tsx:66-68`, `availabilityCopy.ranking.*`) is **not** touched by this task or any other. It has no controls above it.

## Task 2 — the copy module

- [ ] Create `src/lib/copy/in-flight.ts` from `design/design_handoff_the99_in_flight/in-flight · copy strings.ts`, verbatim, with the one correction: `ordering` is a required field of `parts` and the `.filter(Boolean)` guard goes with it.
- [ ] Export `PENDING_GATE_MS = 500`, `inFlightCopy` (`scope`/`sort`/`avail`), `FetchingControl`, and `discoverySubtitle(parts, pending)` returning `string[]` clauses rather than a joined string — `PageHeader` needs the clauses separately to put `aria-hidden` on one of them. Return `{ text, pendingIndex }` or an array of `{ text, pending }`; pick one and keep the module the only place that knows the order.
- [ ] Unit-test all four sentences from the handoff's worked example, plus the owned-scope sentence, plus the length constraint: assert each participle is shorter than every clause it can replace.

## Task 3 — the 500 ms gate

- [ ] Add `usePendingGate<T>(value: T | null, ms: number): T | null` beside the nav hooks (`src/components/commanders/list-nav.ts` or a sibling). One `setTimeout`, cleared on settle and on unmount. Returns `null` until `value` has been continuously non-null for `ms`, then returns the current `value`.
- [ ] A change of value while gated (ruling 11 — second press supersedes) does **not** restart the timer: the reader has been waiting since the first press and 500 ms has already been spent honestly.
- [ ] Test with fake timers: settles at 499 ms → never returns; settles at 501 ms → returns from 500 ms until settle; value swap mid-gate → the new value, same deadline.

## Task 4 — name the control in flight

- [ ] In `discovery-view.tsx`, hold the last-pressed fetching control in state, written by the three `go` wrappers (`setScope`, `goSort`, `goAvail`). Ruling 11 is about recency, and a fixed precedence over three concurrently-true `pending` flags would give the wrong answer for a scope press during an availability flip.
- [ ] Derive `const inFlight = (scopeNav.pending || sortNav.pending || availNav.pending) ? lastPressed : null;` and pass it through `usePendingGate`.
- [ ] Verify a cache-served repeat flip stays `null`: `useDiscoveryCache` writes the URL with `history.replaceState` rather than routing, so no transition starts. Add a test that asserts it, because it is the difference between "no treatment" and "a 0 ms flicker".
- [ ] `commanders-view.tsx` gains nothing. The owned scope's only fetching control is scope, which already passes `scopePending`.

## Task 5 — render the sentence

- [ ] `PageHeader` takes `pending?: FetchingControl | null` on the two scoped arms and builds its subtitle from `subtitleParts` + `discoverySubtitle`. The no-scope arm keeps its single string.
- [ ] Render the clauses as `<span>`s with `·` separators inside the existing `<p>`; only the pending clause carries `aria-hidden="true"`. Typography, colour (`--fg-faint`) and both sizes (11px / 12px) are unchanged — the participle is not dimmer than the words beside it.
- [ ] `pending === 'sort'` must be unreachable under `scope="owned"`; enforce it in the props type rather than at runtime.
- [ ] Extend `page-header.test.tsx` and `discovery-view.test.tsx`: one assertion per participle, one asserting `read against N cards` is present and not `aria-hidden` in every pending state, one asserting the owned scope keeps `ranked by fit`.

## Task 6 — the three document amendments

- [ ] Apply all three verbatim from `RULING-in-flight-feedback.md:185-220`:
  - `design/design_handoff_the99_discovery/CONTROLS-four-above-one-list.md:114-115`
  - `design/design_handoff_the99_discovery/The 99 - Commander Discovery.dc.html:588`
  - `design/design_handoff_the99_commanders_plane/CONTROLS-six-above-one-list.md:246`
- [ ] Each keeps its prohibition and replaces its stated reason. Without these the wrong reason — "the list is not being fetched" — stays on file in three places and this question comes back.

## Task 7 — verify on device, then close out

- [ ] 390px and 1280px, real browser, with the fetch held open (a `page.route` delay is the only way to see the state; jsdom cannot). Check: the list does not move down; the crown replaces the pressed control's label without changing its width; the participle appears at 500 ms and not before.
- [ ] The 390px transient line loss (~14px, list moves up then back) ships as drawn. If it reads badly on device, the fix is a `min-height` at 390px only — one line of CSS, and a note in the PR body rather than a redraw.
- [ ] `prefers-reduced-motion`: the crown sits static at 0.7 and the subtitle clause is unchanged. It was never motion.
- [ ] Close the in-flight/region-loader ticket. The answer to "which component is the region loader" is `LoadingScreen`, which already exists and is reached only when there are no outgoing rows.

---

## Out of scope

- Scroll offset on arrival (handoff gap 5) — a navigation question. Worth a look in the same PR only because the reader meets it in the same second.
- `Score against` under discovery (the discovery handoff's gap 1). If it is disabled under discovery rather than re-scoring, clause 4 loses its pending state and nothing else changes.
- Any duration histogram or escalation tier. Gap 2 names what would re-open it: p95 above ~4 s.
