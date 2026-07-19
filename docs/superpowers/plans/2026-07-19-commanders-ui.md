# Commanders Surface (#7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/commanders` — ranked recommendation cards with self-explaining evidence (three-part Fit bar, role chips, named-card receipts) — plus a shareable `/commanders/[slug]` detail page with the Build entry point, both degraded scopes, both empty states, and the live guided-step-2 banner. Mobile + desktop parity in the same PR.

**Architecture:** Extend the shipped scoring engine (`src/lib/recs/`) with a `wipes` role, per-component Fit values, `fitNS` renormalization, and named-card receipts; extend `recommendCommanders` with first-run counts and a slug map. The page stays a server component (bounded-concurrency EDHREC fetches already shipped); filtering is a thin client wrapper mirroring `?c=` (Collection's pattern). Detail is its own route resolving slug → scored commander.

**Tech Stack:** Next.js App Router (RSC + minimal client components), Drizzle/Neon, Vitest, Tailwind arbitrary values + brand CSS variables.

## Global Constraints

- Design source of truth: `docs/superpowers/design-tables/commanders.md` (property table, ~550 rows) + `design/design_handoff_the99_commanders/README.md`. Pixel-perfect is the bar; the design-review Agent 2/3 gate runs against the table before the ship PR.
- Mobile + desktop parity in the same PR (breakpoint `md:` / 768px).
- All figures render in Plex Mono (`font-mono`); headings in Cinzel (`font-display`); tokens via CSS variables, never raw hexes in components (raw hexes in the table map to existing `globals.css` tokens — e.g. `#C9A24B`→`--brass`, `#E0913C`→`--warning`, `#8E8269`→`--fg-muted`, `#6FA368`→`--success`).
- Ranking is opinionated: Fit descending, non-reorderable; the color filter narrows only, labeled `Order: Fit ↓ · fixed`.
- Fit model: `pool 15 + roles 25 + synergy 60` = /100. When synergy is null, show the **renormalized two-part** score `round((pool + roles) / 40 * 100 * 10) / 10` — never synergy-as-0.
- Wipes role baseline 3; `destroy all` / `exile all` classify as **wipes only** (moved out of removal — double-counting would inflate both chips).
- Degraded severity: global = amber (`--warning`); per-commander = neutral (`--fg-muted`). Both offer Retry (= re-invoke; failed EDHREC fetches are not negatively cached).
- Focus-visible brand treatment (`focus-visible:outline-2` brass, matching #5/#6) on pips, cards, retry buttons; lightbox needs Escape/tap close + focus return.
- Pre-push gate: `npx tsc --noEmit && npx eslint src && npx vitest run` and `DATABASE_URL="postgres://stub:stub@localhost/stub" npm run build`.

---

### Task 1: `wipes` role in the classifier

**Files:**
- Modify: `src/lib/recs/roles.ts`
- Test: `src/lib/recs/roles.test.ts`

**Interfaces:**
- Produces: `Role = "ramp" | "draw" | "removal" | "wipes" | "land"`; `ROLE_TARGETS` gains `wipes: 3`; `classifyRoles` emits `"wipes"` for mass removal and no longer emits `"removal"` for it.

- [ ] **Step 1: Write failing tests** — append to `roles.test.ts`:

```ts
describe("wipes role", () => {
  it("classifies 'destroy all creatures' as wipes, not removal", () => {
    const roles = classifyRoles({ typeLine: "Sorcery", oracleText: "Destroy all creatures.", keywords: [] });
    expect(roles).toContain("wipes");
    expect(roles).not.toContain("removal");
  });
  it("classifies 'exile all' as wipes", () => {
    expect(classifyRoles({ typeLine: "Sorcery", oracleText: "Exile all nonland permanents.", keywords: [] })).toContain("wipes");
  });
  it("classifies symmetric -X/-X as wipes", () => {
    expect(classifyRoles({ typeLine: "Sorcery", oracleText: "All creatures get -2/-2 until end of turn.", keywords: [] })).toContain("wipes");
  });
  it("still classifies single-target removal as removal only", () => {
    const roles = classifyRoles({ typeLine: "Instant", oracleText: "Destroy target creature.", keywords: [] });
    expect(roles).toEqual(["removal"]);
  });
  it("has a wipes target of 3", () => {
    expect(ROLE_TARGETS.wipes).toBe(3);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/recs/roles.test.ts` — expect FAIL (wipes not emitted).
- [ ] **Step 3: Implement** in `roles.ts`:

```ts
export type Role = "ramp" | "draw" | "removal" | "wipes" | "land";
export const ROLE_TARGETS: Record<Exclude<Role, "land">, number> = {
  ramp: 10, draw: 10, removal: 8, wipes: 3,
};
// Mass removal is its own role (design baseline 3); these patterns move OUT of
// the removal set so a wrath doesn't inflate both chips.
const WIPE_PATTERNS = [/destroy all/, /exile all/, /all creatures get [-−]\d/];
const REMOVAL_PATTERNS = [
  /destroy target/, /exile target/,
  /counter target/, /deals? \d+ damage to (any target|target creature)/,
  /target creature gets [-−]\d/,
];
```

and in `classifyRoles`, before the removal check:

```ts
  if (WIPE_PATTERNS.some((p) => p.test(text))) roles.push("wipes");
```

- [ ] **Step 4: Run** the full recs suite `npx vitest run src/lib/recs` — expect PASS (fix any existing removal-pattern tests that asserted `destroy all` → removal by updating them to wipes).
- [ ] **Step 5: Commit** `feat: add wipes role to classifier (baseline 3, mass removal moves out of removal)`

### Task 2: Score payload — receipts, per-component Fit, `fitNS` renormalization

**Files:**
- Modify: `src/lib/recs/score.ts`
- Test: `src/lib/recs/score.test.ts`

**Interfaces:**
- Consumes: Task 1's `Role`/`ROLE_TARGETS` (wipes included).
- Produces (added to `CommanderScore`): `roleCounts`/`roleGaps` keyed over `ramp|draw|removal|wipes`; `roleCards: Record<"ramp"|"draw"|"removal"|"wipes", string[]>` (owned card names filling each role); `overlapOwned: string[]` and `overlapMissing: string[]` (EDHREC top-card names owned / not owned, `[]` when synergy null); `fitPool: number`, `fitRoles: number`, `fitSynergy: number | null` (component values on the /100 scale: pool 0–15, roles 0–25, synergy 0–60); `score` becomes the design's Fit — three-part sum when synergy is present, **renormalized** `round((fitPool + fitRoles) / 40 * 100 * 10) / 10` when `fitSynergy === null`.

- [ ] **Step 1: Write failing tests** covering:
  - `roleCards.ramp` contains the name of a pool card whose text matches a ramp pattern; a wrath lands in `roleCards.wipes` not `roleCards.removal`.
  - With `edhrecTopCards: ["Sol Ring", "Rhystic Study"]` and only Sol Ring owned in-identity: `overlapOwned` is `["Sol Ring"]`, `overlapMissing` is `["Rhystic Study"]` (original casing from the EDHREC list).
  - With `edhrecTopCards: null`: `fitSynergy` is `null`, `overlapOwned`/`overlapMissing` are `[]`, and `score === Math.round((fitPool + fitRoles) / 40 * 100 * 10) / 10` (assert against computed components, not a magic number).
  - With synergy present: `score === Math.round((fitPool + fitRoles + fitSynergy) * 10) / 10` and `fitPool <= 15 && fitRoles <= 25 && fitSynergy <= 60`.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** in `scoreCommander`: build `roleCards` inside the existing pool walk (`roleCards[role].push(c.name)` for non-land roles); split the overlap filter into owned/missing name arrays (keep the existing DFC front-face matching — check `poolNames.has(n.toLowerCase())` per top card); compute

```ts
  const fitPool = Math.round(poolFactor * 15 * 10) / 10;
  const fitRoles = Math.round(roleCoverage * 25 * 10) / 10;
  const fitSynergy = edhrecTotal == null ? null : Math.round(overlapRatio * 60 * 10) / 10;
  const score = fitSynergy == null
    ? Math.round(((fitPool + fitRoles) / 40) * 100 * 10) / 10
    : Math.round((fitPool + fitRoles + fitSynergy) * 10) / 10;
```

- [ ] **Step 4: Run** `npx vitest run src/lib/recs` — expect PASS. Update any home-dashboard callers/tests that asserted the old synergy-as-0 score.
- [ ] **Step 5: Commit** `feat: score payload carries receipts, per-component fit, and fitNS renormalization`

### Task 3: `recommendCommanders` — first-run counts, slugs, per-commander degraded

**Files:**
- Modify: `src/lib/recs/recommend.ts`
- Modify: `src/lib/edhrec/slug.ts` (no change expected — reuse `commanderSlug`)
- Test: `src/lib/recs/recommend.test.ts` (create if absent; mock `db` + `getEdhrecData` as existing suites do — if db mocking has no precedent, extract the pure post-processing into `finalizeRecommendations(results, uniqueCardsRead)` and unit-test that)

**Interfaces:**
- Produces: return type becomes `{ results: RankedCommander[]; degraded: boolean; uniqueCardsRead: number; candidateCount: number }` where `RankedCommander = CommanderScore & { slug: string }`. Slugs come from `commanderSlug(name)`; collisions get `-2`, `-3`… suffixes in rank order so every slug is unique and stable within a response.
- Consumes: Task 2's `CommanderScore`.

- [ ] **Step 1: Write failing tests** for the pure parts: slug uniquing (`["Krenko, Mob Boss","Krenko, Mob Boss"] → ["krenko-mob-boss","krenko-mob-boss-2"]`), counts passthrough.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**: `uniqueCardsRead = owned.length`, `candidateCount = candidates.length`; after the existing sort, assign slugs:

```ts
  const seen = new Map<string, number>();
  const ranked = results.map((r) => {
    const base = commanderSlug(r.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...r, slug: n === 1 ? base : `${base}-${n}` };
  });
```

- [ ] **Step 4: Run** full suite — PASS.
- [ ] **Step 5: Commit** `feat: recommendCommanders returns slugs and first-run counts`

### Task 4: Retry server action + `/commanders` page shell (data wiring)

**Files:**
- Create: `src/app/commanders/actions.ts`
- Modify: `src/app/commanders/page.tsx` (replace the interim shell)
- Create: `src/components/commanders/commanders-view.tsx` (client wrapper: filter state + list)

**Interfaces:**
- `actions.ts`: `"use server"; export async function retryRecs() { revalidatePath("/commanders"); }` — Retry buttons submit this via a `<form action={retryRecs}>`; failed EDHREC fetches aren't negatively cached, so revalidate = re-fetch.
- `page.tsx` (server): keeps the existing `stats.uniqueCards === 0` → upload-CTA branch verbatim; otherwise calls `recommendCommanders(userId)`; `candidateCount === 0` → renders the no-candidates empty state (adapt the existing interim markup to the table's §Empty State — No Candidates rows); else renders `<CommandersView results degraded uniqueCardsRead candidateCount firstRun={/* no confirmed deck yet: reuse the shipped guided-flow condition from the home dashboard */} />`.
- `commanders-view.tsx` (client): owns `colors: string[]` mirrored to `?c=` via `router.replace` shallow (copy Collection's `parseColors`/serialize pattern in `src/components/collection/browser.tsx`); filters `results` by `r.colorIdentity.every(c => selected.has(c))`-style *inclusion* semantics per design ("identity includes Black" → keep commanders whose identity contains **all** selected colors); never re-sorts.

Steps: build page + view with placeholder card rendering (name + score only), verify `/commanders?c=B` filters and survives reload, commit `feat: commanders page data wiring, color filter, retry action`.

### Task 5: Recommendation card + Fit bar + role chips + synergy line + receipts preview

**Files:**
- Create: `src/components/commanders/rec-card.tsx`, `fit-bar.tsx`, `role-chips.tsx`
- Test: `src/lib/recs/format.test.ts` + Create: `src/lib/recs/format.ts`

**Interfaces:**
- `format.ts` (pure, tested): `receiptsPreview(names: string[], max = 3): string` → `"Dockside Extortionist · Pitiless Plunderer · Mayhem Devil +25"` (`+N` only when overflow; `""` for empty); `fitSegments(s: Pick<CommanderScore,"fitPool"|"fitRoles"|"fitSynergy"|"score">)` → `{ pct: number; segments: { key: "pool"|"roles"|"synergy"; grow: number }[] }` where `pct = min(score,100)` and `grow` values are the component values (flex-grow ratios), synergy omitted when null.
- `rec-card.tsx`: desktop grid `40px 100px 1fr 236px` (rank · art · evidence · fit), mobile stacked tile with Fit pinned top-right; art = identity-gradient placeholder via `gradientFor` from `src/lib/collection/gradients.ts` with WUBRG pips (`mana-pips.tsx` from Collection); whole card links to `/commanders/${slug}`. Per-commander degraded (`fitSynergy === null` while global `degraded === false`): inline neutral note + per-card Retry form. All styling verbatim from the property table (§Recommendation Card, §Fit Bar, §Role Chips, §Synergy Line, §Receipts Preview, §Per-Commander Degraded Note) — brass ramp segments `--brass-dim`/`--brass-mid`/`--brass` (add the two missing ramp tokens to `globals.css` if not present, values `#6E5B33`/`#A9863E`).
- Role chips: 4 chips (Ramp/Draw/Removal/Wipes) `count/target`, gap styling (warning count + `gap` suffix) when `roleCounts[r] < ROLE_TARGETS[r]`.

Steps: TDD `format.ts`, then components, wire into `commanders-view.tsx`, verify against table rows, commit `feat: recommendation card with fit bar, role chips, receipts preview`.

### Task 6: First-run banner, global degraded banner, filtered-to-zero empty state

**Files:**
- Create: `src/components/commanders/guided-banner.tsx`, `degraded-banner.tsx`, `filtered-empty.tsx`

**Interfaces:**
- `guided-banner.tsx`: props `{ uniqueCardsRead: number; candidateCount: number }` — XCIX ring, `Guided setup · step 2 of 3` + 3-diamond crumb (done/active/locked), Cinzel heading, `1,418 cards → 24 legal generals` line. Shown only when `firstRun` (page prop).
- `degraded-banner.tsx`: global amber banner per table (§Global Degraded Banner) with `<form action={retryRecs}>` **Retry now** secondary button; rendered when `degraded === true`; list drops to two-part Fit automatically (Task 2's `fitSynergy === null`).
- `filtered-empty.tsx`: props `{ colors: string[]; total: number; onClear: () => void }` — dimmed pips of the active filter, Cinzel `No generals in …` heading, `Showing 0 of {total}` in `--warning`, `Clear color filter` button.

Steps: build per table, wire conditionals in `commanders-view.tsx`/`page.tsx`, commit `feat: guided banner, degraded banner, filtered-to-zero state`.

### Task 7: Detail route `/commanders/[slug]`

**Files:**
- Create: `src/app/commanders/[slug]/page.tsx`
- Create: `src/components/commanders/detail.tsx`

**Interfaces:**
- `page.tsx` (server): `requireUserId()`, `recommendCommanders(userId)`, find `results.find(r => r.slug === params.slug)`; not found → `notFound()`. (`recommendCommanders` re-runs but EDHREC hits the warm 30-day cache; acceptable per readiness.)
- `detail.tsx`: desktop = sticky left column (63/88 gradient card, oracle glass block, identity pips, primary **Build this deck →** linking `/decks?commander=${slug}` — #8 owns that param going live, seed note, back link) + scrolling right column (Fit hero with 52px score + 12px segmented bar + per-component legend %, The pool, Role coverage panels with owned green-dot chips per role from `roleCards`, EDHREC synergy panel: `overlapOwned` green-dot chips + `overlapMissing` dashed chips). Mobile = cropped art header band with `⛶ Full card` affordance + sticky bottom Build bar. Degraded variants: two-part hero + hidden-receipts note per table.

Steps: build per table (§Commander Detail Page), verify slug 404s, commit `feat: commander detail page with full receipts and build entry`.

### Task 8: Mobile full-card lightbox

**Files:**
- Create: `src/components/commanders/lightbox.tsx` (client)

**Interfaces:**
- Props `{ commander: RankedCommander; onClose: () => void }`. Full 63/88 card with oracle text over dimmed backdrop; closes on backdrop tap AND Escape; focus moves into the dialog on open and returns to the `⛶ Full card` trigger on close (copy the focus-trap pattern from `src/components/collection/card-modal.tsx`); `role="dialog" aria-modal="true"`.

Steps: build, wire trigger in `detail.tsx` mobile header, commit `feat: mobile full-card lightbox with focus return`.

### Task 9: Focus-visible sweep + home-dashboard consumers

**Files:**
- Modify: new commanders components (focus-visible brass outline on pips, cards, retry/build buttons — match #5/#6 treatment)
- Modify: any `src/lib/home/` or `src/components/home/` consumer of `CommanderScore`/`recommendCommanders` whose types shifted (wipes in roleCounts, new return shape)

Steps: `npx tsc --noEmit` drives the consumer list; fix, keyboard-walk every interactive element, commit `fix: focus-visible treatment and consumer updates for new recs payload`.

### Task 10: Verify

- [ ] `npx tsc --noEmit && npx eslint src && npx vitest run` — all green.
- [ ] `DATABASE_URL="postgres://stub:stub@localhost/stub" npm run build` — succeeds.
- [ ] Design-review Agent 2 (dual-pass: visual + state reachability, all 10 states) against `docs/superpowers/design-tables/commanders.md`; fix gaps; Agent 3 confirm → 0 gaps; commit gap report to `docs/superpowers/gap-report-commanders.md`.
- [ ] Manual pass on `npm run dev`: first-run banner, filter → chips → filtered-to-zero → clear, detail navigation + back, lightbox, retry buttons, both degraded scopes (simulate by disabling network for EDHREC host if feasible — otherwise verify via unit-level props on the components).
