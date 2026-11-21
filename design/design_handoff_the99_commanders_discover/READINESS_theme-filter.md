# Readiness Review — Themes filter on Discover (addendum, #159)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21
**Related ticket(s):** #159; PR #3117 (`addendum-theme-filter/`); parent handoff `design_handoff_the99_commanders_discover`
**Plan PR target:** TBD (`docs/superpowers/plans/`)

## Summary

The control is drawn on both breakpoints for every state the ask needs, built from the shipped `FilterPanel`, `SetListSheet` and `Printed in` pattern, and its URL and copy rules fit the repo. Nothing needs a Design round-trip. The data exists but has no reader: `commander_support.tags` (jsonb, every tag with its deck count) holds a commander's full theme list, and the per-commander index the filter needs is new backend work. The plan PR records the clarifications below as decisions. Backend work (the index loader) may start now; UI waits for the plan.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Discover only, For you deferred (README.md:19-20). Non-goals are implicit, not listed.
- 🟡 Counts are "illustrative" (README.md:8); real theme total and per-theme counts are unmeasured.

### 🎭 State coverage

- ✅ None, open, one, several, search, All, with color, no match (All), no match (color+theme), very few are drawn at desktop (D1-D10) and phone (P1-P10) (README.md:60-73).
- 🟡 No loading or "index unavailable" state. Shipped pattern (`lanePrintedInFor` returns undefined, control not drawn) settles it: draw nothing, apply no `?t=`.
- 🟡 Empty result with Themes + Printed in (and all three controls) is not drawn (README.md:49-58). Follow `filteredTogetherBody` (colors + sets) extended to themes; the primary clears the control that returns the most rows alone.
- 🟡 `proposal.diff:13` skips the picked-theme lead when the gap slot is `noMechanics`, so a commander matched by a creature-type theme alone shows no picked word on its row, against README.md:42-46. Follow the shipped slot rule and keep the note, or render the lead from picked themes alone; the plan decides.
- ✅ Signed-out: Discover requires auth.

### 🔌 Data contract

- ✅ Source of themes: `commander_support.tags` (`src/db/schema.ts:1623`, `{label, slug, count}`). `commander_theme_support*` (schema.ts:1751) holds only the top 3 per commander (`THEME_PAGES_PER_COMMANDER`, `src/lib/edhrec/index-build.ts:170`), so it is NOT the source; README.md:24-25 correctly leaves this to eng.
- 🟡 Missing: any lane-side reader. Needs a per-request index (oracle id or slug to theme slugs, label, kind) outside the cached payload entry, as `lanePrintedInFor` (`src/lib/sets/lane-printed-in.ts`) does, failing soft. Mechanic vs typal comes from `MECHANIC_LABELS` / `CREATURE_TYPE_LABELS` (`src/lib/edhrec/tag-kinds.generated.ts`), formats from `FORMAT_LABELS`.
- 🟡 The server's first window (`discoveryRows`, `src/lib/discovery/window.ts`; `src/app/commanders/(list)/discover/page.tsx:73-77`) must apply the same theme step as the client, or a shared `?t=` link ships the wrong 25 rows whole. Wire budget is 0.3MB (`docs/agents/list-payloads.md`); encode the index compactly (slug dictionary) and measure with `probe:payload`.
- 🟡 README.md:22-23 says the vocabulary is "the same the row's play-style sentence prints"; it is not. The sentence is mechanics only (`gap-slot.ts`, `isMechanic`) with a 0.5% floor (`THEME_FLOOR_RATIO`), while Themes adds creature types at an absolute 50 decks (`THEME_MIN_DECKS`, index-build.ts:171). Commanders with under 50 decks in every tag get no theme and drop out whenever a theme is picked. Measure on staging (read-only): commanders with at least one theme, distinct theme count, typal share. Picked themes lead the sentence regardless (decision 8), which covers the mismatch.
- ✅ `normalizeThemeSlugs` matches the index's `THEME_SLUG` shape.

### 🧱 Codebase fit

- ✅ Reuses `FilterPanel` (one optional `headExtra` prop), `SetListSheet`, `chipsFor`, `activeControlCount`; no new tokens beyond `--accent-text`, `--fg-muted`, `--fg`.
- ✅ URL: `t`, `tm` join `LANE_KEYS` (proposal.diff:573); discovery-view writes through `mirrorUrl` and `laneQuery` (`discovery-view.tsx:240`), filters narrow a held list, no `router.replace`. `useDiscoveryCache` is keyed on sort and basis, not filters, so nothing to add. The Home and `/decks` list-cache rules do not apply.
- 🟡 `proposal.diff:62` `themeLabelFromSlug` is a fallback for unknown slugs; real labels come from the index.
- ✅ Copy: no em dashes in any string (proposal.diff:592-713, README); US English ("colors"). Copy-review still applies at build.

### ♿ Cross-cutting

- ✅ Full announce, aria and idle-reason copy (`themesPanelCopy`, proposal.diff:688-713); 44px rows and pills.
- 🟡 Performance: client-side counting over about 3,000 rows per pick; the plan measures it beside the payload wire.
- 🟡 No telemetry named; plan follows `Printed in`.

### ⏰ Drift from reality

- ✅ Files named exist on main: `rack/` components, `lane-params.ts`, `commander-row.tsx`, `filter-panel.tsx`, `copy/lanes.ts`. Route is `/commanders/discover` (`/discover` redirects).
- ✅ #159's own claims (color PR #21, `ORDER_OPTIONS.discover`) still hold.

### 📝 Decision log

- ✅ Ten numbered decisions, R1b ruling by Hugh dated (README.md:29). Locked vs tentative not marked; treat all as locked.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: Loading and index-unavailable: control not drawn, `?t=` not applied (the `Printed in` pattern).
- Item 2: Themes + Printed in empty copy and CTA, extending `filteredTogetherBody`.
- Item 3: Picked-theme lead on `noMechanics` rows.
- Item 4: Build the per-request theme index from `commander_support.tags`; server window applies themes; measure payload and coverage on staging.
- Item 5: Correct the "same vocabulary" claim in the plan; creature types and the absolute floor are new.
- Item 6: About: no label owed unless Hugh picks one (`docs/agents/design-pipeline.md`); the plan does not ask.

## Decisions inherited

Decisions 1-10 in `addendum-theme-filter/README.md`, notably: Discover only; Any default, All optional; `t=` sorted lower-case slugs and `tm=all` only with two or more; Themes AND colors; zero-count themes stay in place and unpickable; R1b fixed two-column pills with right-pinned counts.
