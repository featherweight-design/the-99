# Plan — commander availability

**Brief:** `docs/superpowers/design-briefs/2026-09-15-owned-is-not-available.md` (merged, #660).
**Handoff:** `design/design_handoff_the99_commander_availability/` (merged, #668).
**Audit:** `docs/superpowers/readiness-commander-availability.md` — **Green**, seven errata, one drawn
defect. Everything below that departs from the handoff does so because the audit says to, and names
the erratum.

Written against `origin/main` at `fa0397f8`. #667 changed `OwnershipDot`'s callers, not its
signature, so the handoff's ledger is unaffected.

---

## The two PRs, and why the boundary is not clean

The brief's §7 names this and the plan restates it rather than discovering it mid-round.

**One availability read serves the whole page**, so it lands in PR 1 carrying *both* surfaces' oracle
ids — the synergy panel simply does not consume it yet. **`AvailabilityDot` / `availabilityDotState`
/ `LegendPip` cannot be deleted in PR 1**, because `synergy-row.tsx` and `synergy-panel.tsx` still
import them; PR 1 leaves them standing and PR 2 removes them. "Deleted, not deprecated" is the end
state across both, not a PR-1 task. Same for `committed.dotCommitted`: PR 1 stops using it in
`DotKey` and PR 2 deletes it once the synergy legend stops.

Neither PR stacks. Both cut from `main`; PR 1 is complete and shippable with the synergy panel
untouched.

---

## PR 1 — the read, Role Coverage, and the sort

### 1.1 The availability read

`src/app/commanders/[slug]/page.tsx`. One `loadAvailability(userId, { oracleIds })`, off-decklist
vantage (**no `excludeDeckId`** — this page has no current deck), narrowed to the union of the role
cards' and the synergy cards' oracle ids. Never cached: a claim read is point-in-time by contract.

**A missing map entry does not mean unowned** (brief §7). The outer select is driven by the `owned`
CTE and basics are excluded model-wide, so unowned, basic and unreachable all return absent. Nothing
in this PR may branch on absence to mean "not owned".

### 1.2 `RoleCard` gains `availability`

The brief leaves the choice open — widen the card, or pass the map as a second argument to
`sortRoleCards`. **Take the field.** `chipAria`, the chip's marker and the comparator all need it,
and threading a map through three call sites to avoid one optional field is the worse trade.

```ts
// src/lib/recs/score.ts
availability: Availability | null;   // null = no row; see 1.1. NOT "unowned".
```

Scoring leaves it `null`, exactly as it leaves `committedTo` null today, and the page fills it in
beside `withCommitted`.

### 1.3 `coverage-chip.tsx`

- Dot: `AvailabilityDot` → `OwnershipDot owned` (two states). Sizes unchanged, 6px / 7px.
- Marker: `AvailabilityMarker density="row" nameless spoken={false}`, after the name, `gap: 6` inside
  the name group, before the figure plate. Type per handoff §4.4: **mono 10.5px / 600 / `0.02em`** on
  the chip, **mono 11.5px / 600 / `0.02em`** on the phone row.
- **`seam` takes a TOKEN, never a hex** (erratum 2): `var(--surface-raised)` on the chip,
  `var(--surface)` on the coverage row. The handoff's three hexes are wrong in two of three cases and
  would freeze the seam to one theme.
- `chipBorder` / `rowBorder`: committed branch **deletes**; both gain an over branch written as
  `color-mix(in_srgb, var(--danger) 40%, var(--bg))` — the free branch's own form, not the handoff's
  `#6B3226` (erratum 3). Free branch untouched.
- `chipAria`: `committed.ariaSuffix` → `markerAria(a)`, name-bearing. `markerAria` returns `null` at
  free, so a free card keeps its shipped accessible name byte for byte.

**D1 — the drawn defect.** The chip's name takes **`whitespace-nowrap`**. It is a bare span today
(`:104-106`) and the marker's 69–89px is what finally makes it wrap. The marker is already
`flex-none whitespace-pre` and stays whole. No `max-w` floor: the audit measured the pathological
case at ~350px, which fits the narrowest desktop the chip renders at, and the phone draws
`CoverageRow`, which already truncates.

### 1.4 `coverage-section.tsx`

`DotKey`: `anyCommitted` → `anyMarker` (any card whose `availabilityState` is not `free`).
`LegendPip` → `OwnershipDot` at 6px, carrying `LegendPip`'s inline offsets (`marginRight: 5`,
`verticalAlign: baseline`, `top: -0.5`) — Design's gap 4, unverified there, so **eng checks the
baseline in the browser** rather than assuming. Key strings per handoff K.1/K.2.

Still reads all four panels, not the chips a cap happens to show, so expanding a panel cannot change
the key.

### 1.5 `coverage-sort.tsx`

`sortRoleCards` partitions on `availabilityState(c.availability)` instead of `committedTo`. **Total
order: free → soft → hard → over**, stable within each bucket (brief §7). A card with no availability
row sorts as `free`.

### 1.6 Copy

- `committed.dotOwned` **added**: `"Owned."`. `dotFree` keeps its string byte-for-byte.
- `dotCommitted` and `ariaSuffix` stay until PR 2 — `synergy-panel.tsx` still uses them.
- `coverageSort.availability.sub` → `"Free to use first, then wanted by a brew, then in use, then
  over-committed."` (handoff §4.3).
- **The stale comment deletes.** The block claiming the option "is not drawn at all" until the
  committed read lands is false against the shipped control and is what misled the brief's first
  draft.

### 1.7 Tests

Component tests for: the two-state dot, the marker present at soft/hard/over and absent at free, the
over border, `chipAria` carrying the marker prose and byte-identical at free, the key's two forms,
and the comparator's total order. **Mutation-check each** — revert the fix, confirm red, restore.

---

## PR 2 — the synergy panel, the price, and the deletions

### 2.1 Price

`SynergyCard` gains `price` and `newestAsOf`. Reuse `loadPrices`; do **not** hand-roll a CTE (§10b
rule 2 — a hand-written price CTE cost three rounds once already and was replaced wholesale by the
loader that already encoded foil/staleness/liveness).

### 2.2 `synergy-row.tsx`

- Dot → `OwnershipDot owned={card.owned}`.
- Desktop: one slot before the toggle, **88px, flex-none, right-aligned**, at every reading —
  `BuyTag variant="row" reserveSlot` when unowned, the count-only marker when owned and contended,
  nothing when free. Row type mono 11px. `seam` = `var(--surface)`, or `var(--elevated-hover)` on a
  selected row (erratum 2).
- Phone: marker joins the existing meta line at its own 10px. 52px unchanged, no second line.
- **Measure `buy · sold out` against 88px before fixing it** (Design's gap 5). If it overflows, widen
  and say so in the PR body rather than truncating a price.

### 2.3 §4.7 — the row's accessible name

**The audit reopened this and it is the one thing the handoff got wrong.** `rowAria` is the `<li>`'s
`aria-label` and **replaces** everything beneath it, so the visible `buy · $4.50` is never spoken —
and `markerAria` returns `null` for an unowned card, so calling it is not enough.

`rowAria` gains, beside the severity clause: a **price clause** and a **sold-out clause**. Derive
both from `BuyTag`'s own `priceState` so one source formats them, and keep the existing ownership and
figure clauses in place.

### 2.4 `synergy-panel.tsx` — the row Design's ledger omitted

**Erratum 6.** Ledger 7 deletes `LegendPip` with no row for this file, which renders it three times
and uses all three `dot*` strings (`:259-264`). As written the round is a typecheck failure and
K.4's legend never ships.

Legend becomes `OwnershipDot` × 2: `Owned.` and `Not owned.`, always drawn — it is the only panel
with both dots.

### 2.5 The deletions

`AvailabilityDot`, `availabilityDotState`, `LegendPip`, `committed.dotCommitted`,
`committed.ariaSuffix`. Deleted, not deprecated. Nothing outside these three commander surfaces
imports them — re-grep before deleting rather than trusting this line.

### 2.6 The About entry

**Named here rather than assumed.** `"When a card you own isn't free"`, chapter 02, plate width,
three key lines, `since: 1`, per handoff §4.5. **`ABOUT_VERSION` bumps** — a new entry always is a
bump, and `about.test.ts`'s content hash forces the choice to be deliberate.

### 2.7 Tests

The slot's three occupants, the phone meta line, the legend's two entries, `rowAria` carrying the
price and the sold-out forms, and the deletions leaving no importer. Mutation-check each.

---

## Acceptance

Per `feature-acceptance`, per PR and again at close:

| Route | Widths | What must be there |
|---|---|---|
| `/commanders/[slug]` Role Coverage | 390 · 1300 | two-state dot, marker at three readings, silence at free, over border, key's two forms |
| `/commanders/[slug]` synergy panel | 390 · 1300 | slot with tag / marker / nothing, phone meta line, two-entry legend |
| `/commanders/[slug]` sort menu | 390 · 1300 | `Availability` option, four-bucket sub-line |
| `/about` | 390 · 1300 | the new entry, version bumped |

**A browser probe is the gate, not a component test.** The chip wrap (D1), the marker's resolved type
and the key's pip baseline are all laid-out geometry that jsdom reports as passing. Extend
`scripts/probe-*.mjs` with a commander-availability probe, and **run each check's failure path before
believing its green.**

**The free state is the invariant.** A player whose collection covers their decks must see *nothing
changed* — the dot, both borders, the key string and every accessible name byte-identical. That is
the one thing worth a dedicated check.
