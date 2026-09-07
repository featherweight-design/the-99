# Readiness Review — Commanders as one plane (R6)

**Verdict:** 🟡 Yellow — ready to build, with the resolutions below carried into the plan.
**Audited:** 2026-09-06
**Related ticket(s):** #340, folding #335, #341, #343, #344
**Handoff:** `design/design_handoff_the99_commanders_plane/` (R6, six documents + `brand/` + `support.js`)
**Brief:** `docs/superpowers/design-briefs/2026-09-06-commanders-one-plane.md`

This is an engineering audit of Design's own R6 self-assessment (`READINESS.md` in the same
folder). Every claim about shipped behaviour below was read from `src/` on this branch, not
recalled.

---

## Verdict in one paragraph

R6 closes both blocking findings the R5 audit carried, and it closes them the way the product
owner's two decisions asked: each surface prints its own population, and the populations sum
(`3,114 + 212 = 3,326`). The nine blockers R6 lists are not nine holes in the design. Four are
answered by reading the shipped code (4, 5, 7, 9), four are choices Design correctly declined to
make alone and are built as drawn with a flag in the PR body (1, 2, 3, 6), and one is real new
server work that the plan carries in full rather than defers (8). Nothing needs another design
round.

---

## What R6 closed

| R5 finding | R6's answer | Verified |
|---|---|---|
| The pool floor empty state blames the floor for everything it excluded, ignoring the unmeasurable group | `floorPool.body` now names both departing groups and the three figures sum to the pool | `commanders-plane · copy strings.ts` — `floorPool.body(floorPct, below, unmeasured, candidates, freeCards, clearingAgainstCollection)` |
| `heldPool`, `excluded.pool`, `excluded.poolAlso` have no reachable trigger because the floor branch always wins | `clearsAgainstCollection` supplies the discriminator, so a pool exclusion is a **sub-case of the floor**, not a fifth tier — the four-tier precedence table is untouched | `STATES-search-and-exclusions.md` §4 precedence table |

The unmeasurable group is arithmetically available today and needs no new query:

```
unmeasured = candidateCount − items.length − floorExcluded
```

`src/lib/discovery/list.ts:122-133` filters `active` and `excluded` through the same
`measurable()` predicate, so every candidate is in exactly one of the three sets.

---

## The three corrections the brief carried — all confirmed against source

1. **`freeCards` is `scored.length`.** `src/lib/discovery/list.ts:181` —
   `const scored = avail === "free" ? freePool(collection, availability) : collection;`
   `DiscoveryList` exposes `items`, `candidateCount`, `cardsRead`, `bestPct`, `floorExcluded`,
   `hasDecks`, `availOk`, `deckIdentities`, `sort` — **no free-pool size**. One field is added.
2. **The row-note call sites are labelled backwards in the handoff.**
   `src/components/commanders/discovery-row.tsx:401` renders `justify.floorNoteShort` (mobile,
   `fontSize: 10.5`); `:542` renders `justify.floorNote` inside `<Emphasised>` (desktop grid,
   `fontSize: 11.5`). The handoff states the reverse in `READINESS.md` blocker 5 and again in the
   copy file at lines 14 and 383. **Corrected silently at build time; no redraw, no round-trip.**
3. **`NOVELTY_FLOOR` is not a data gap.** `src/lib/discovery/floor.ts:10` exports it, in its own
   module precisely so both the ranking and the empty state can print the same number.

---

## The nine blockers

### Resolved by engineering — no redraw

**4 · The floor's scaling function (gap 1).** Design writes that §4.4 makes the threshold a
function of the pool. Shipped code says otherwise, and the drawn pixels agree with the code:

```ts
// src/lib/discovery/novelty.ts:20-23
export function clearsFloor(c: Overlap): boolean {
  if (c.edhrecTotal == null || c.edhrecTotal <= 0) return false;
  return c.ownedSupport >= NOVELTY_FLOOR * c.edhrecTotal;
}
```

The threshold *percentage* is the constant 30. What scales is the **absolute card requirement**,
per commander, through `edhrecTotal`. The availability toggle lowers the numerator
(`ownedSupport`), never the bar. Every drawn figure in the handoff prints 30%, so there is nothing
to redraw — and a percentage that varied by pool would make `floorPool.body`'s own arithmetic
incoherent, since "would clear against everything you own" would then be comparing against a
different bar than the one the sentence just named.

**Resolution:** one source — `Math.round(NOVELTY_FLOOR * 100)` from `floor.ts:10` — printed at all
seven call sites in §6's contract table. The copy strings are unaffected; every one of them
already carries a `floorPct` slot. Design is asked to ratify the sentence in the copy header, not
to redraw.

**5 · Two shipped strings are edited, not one.** Declared, not a hole. Both edits are built:
`justify.floorNote` / `.floorNoteShort` gain a second argument
(`(floorPct, supportPct)`), and `justifyEdit.distanceNear` reframes for #344.

**7 · The in-field count conflicts with a shipped prop.** The product owner's locked decision has
the pip row **and** the in-field count both printing rows on screen — identical figures, which the
handoff's own "the match figure appears once" rule forbids. **Resolution: the in-field count is
dropped**; `filter-bar.tsx:374-379`'s `{filteredTotal}/{activeTotal}` carries it, as it does
today. Consequence recorded so it is not re-litigated: **`search.count` is not shipped.** An
unreachable copy key is the same class of defect R6 just fixed for the pool keys. Search keeps its
non-visual feedback through the live region (`search.announce`).

**9 · The two-row header amends a committed table.** Mechanical. `discovery-controls.md` (two-row
header; the filter bar gains a leading slot) and `discovery-empties.md` (two new states, one new
element) are amended in the same branch, or the next verify pass refiles gap 2 against them.

### Built as drawn, flagged for ratification in the PR body

These are the four Design correctly refused to decide alone. Under the standing instruction to
execute rather than block, each ships as the canvas draws it, and each is listed in the PR body
with the cost of the alternative.

**1 · +173px above the list at 375px.** Option **(a) accept**, as
`CONTROLS-six-above-one-list.md` measures it: 503px against a shipped 330px in the worst state a
player can reach — every row of which is something they turned on, on a bar that is not sticky and
that one scroll puts away. About three rows of list remain visible on an 812px phone. Option (b),
a phone-only tier-2 disclosure, costs ~130px and reintroduces for one tier exactly what §7's
answer rejected for the bar. Flipping to (b) later is additive and does not invalidate the build.

**2 · Search placement on desktop.** **Leading edge** (option 1), as every state in the handoff is
drawn. It preserves the reading order *narrow → score → order* that the bar exists to express.
Cost, stated plainly: the pip wrapper and `Score against` move right 292px. **No declared value
changes** — not a padding, a font-size, a colour, or anything about `ScoreAgainst`'s own geometry.
Option 2 is a one-line reorder if Hugh wants the x-positions frozen.

**3 · Must-not 3's scope on the header row.** Accepted as Design reads it: must-not 3 forbids
*restyling* the header, and §4.5 explicitly hands the row's layout axis to Design.
`align-items: flex-end → center` and dropping `flex-wrap: wrap` are consequences of the two-row
structure the section asks for, not a restyle of the shipped one.

**4 · Dropping `WindowCount` from the mobile bar (blocker 6).** As drawn — and flagged
prominently, because it is **a deletion of shipped content**, not a free substitution.
`filter-bar.tsx:420-427` is the mobile `WindowCount | sort` row; the search field takes it. The
count is not lost: `RevealControl` already prints "N shown · M more below" *inside* the `<ul>`,
at the point the player reaches the end of the window (`discovery-view.tsx:316-333`). If Hugh
wants it in both places the phone needs a fifth row, +48px on **every** state including the
default.

### Real work, planned in full

**8 · Two exclusion sentences gated on a lookup nothing currently does.** Confirmed:
`src/app/commanders/actions.ts` contains only `retryRecs()` — no route or action searches the full
index. Colour and join exclusions are answerable client-side from the pre-filter candidate set;
**scope and floor exclusions are not**, because the row is not in the client's data at all.

**Resolution:** a server action in `src/app/commanders/actions.ts` that matches a *settled* query
against the full index and reports which stage removed the row. One request per settled query —
never per keystroke. This is my side of the coordination boundary and is a numbered task in the
plan, not a deferral.

---

## One rename, carried into the build

`DiscoveryItem.floorPct` becomes `supportPct`. The handoff's own copy header flags the collision:
`floorPct` must unambiguously mean *the threshold* at every one of the seven call sites, and the
row's own figure needs its own name. Mechanical, type-checked, no behaviour change.

---

## Cost check on the locked decision

The product owner asked to be told if `clearsAgainstCollection` costs more than one extra derived
table. **It does not.** `src/lib/discovery/candidates.ts:ownedSupportTable` already builds a
derived table over `sql.param(ownedOracleIds)` + `unnest(...::uuid[])`, LEFT JOINed and aliased
`osc`, so aggregation happens inside and the outer query needs no GROUP BY. A second table with a
different alias, over the full collection rather than the free pool, yields both `ownedSupport`
figures in the same round trip. No second ranking pass. Building it.

---

## Dimensions

| Dimension | Result |
|---|---|
| 🗺️ Scope clarity | ✅ — boundary is `/commanders`, no third question, five rejected structures recorded with reasons |
| 🎭 State coverage | ✅ — 4 field states, 3 list states, 5 exclusion sentences with a 4-tier precedence table, the one-report rule at 375px, both widths drawn |
| 🔌 Data contract | 🟡 — one new field (`freePoolSize`), one new column (`clearsAgainstCollection`), one new server action (blocker 8). All specified, none speculative |
| 🧱 Codebase fit | ✅ — `filterByColors` gains a mode not a sibling; `PageHeader` stays one subtree with responsive classes; `?q=`/`?join=exact` ride the existing `replaceState` effect |
| ♿ Cross-cutting | ✅ — the scope radiogroup appears once in the a11y tree, one `aria-live` region, 44px minimum touch targets on the phone rows |
| ⏰ Drift from reality | 🟡 — two stale claims, both corrected above with cites (the row-note call-site labels; gap 1's scaling premise) |
| 📝 Decision log | ✅ — nine numbered decisions, R2–R6 addenda, locked vs. open marked throughout |
