# Themes filter on Discover: T1 (backend) and T2 (UI)

Build #159. The design is `design/design_handoff_the99_commanders_discover/addendum-theme-filter/` (READINESS Yellow, `READINESS_theme-filter.md`). This plan covers the split and the T1 backend; T2 is the UI.

## Split

- **T1 (this PR, no UI):** the URL params `t` and `tm`, the theme index read, the window filter, and the page and client wiring. Nothing draws a Themes control yet, so no reader can reach the filter except by typing the URL.
- **T2 (next PR, UI):** the Themes control, chips, the `activeControlCount` change, the empty-state copy, the picked-theme lead on rows. T2 carries the full UI bar plus copy review.

T1 deliberately leaves `activeControlCount` alone: with no chip, counting `t` would show a badge for a control that is not there.

## The floor: `THEME_FILTER_MIN_DECKS = 10`

A tag is offered as a theme only when at least 10 decks back it for the commander (`commander_support.tags[].count`). The constant lives in `src/lib/themes/commander-themes.ts`. A tag under the floor is one-off noise: it would add a pick that matches a handful of commanders on thin evidence.

Measured on staging, 2026-11-21, read-only, over the 3,577 commanders with `synergy_state = 'ok'`:

| Measure | Value |
|---|---|
| Distinct tag slugs, any count | 421 |
| Distinct tag slugs at the floor | 385 |
| Commanders with at least one tag at the floor | 2,702 (75.5% of 3,577) |
| Commander-tag pairs at the floor, mechanic labels | 29,606 |
| Commander-tag pairs at the floor, creature-type labels | 1,885 |

The distinct count the orchestrator asked for is **385 slugs at the floor**. Of those, the known kinds come from `MECHANIC_LABELS` (mechanic) and `CREATURE_TYPE_LABELS` (typal); a slug whose label is in neither list (a format tag, or a label added after the lists) is dropped by `buildCommanderThemes`, so the offered count is at most 385 and is read at runtime, never hard-coded.

**Typal share.** Joining label to kind, 1,885 of 31,491 pairs at the floor are creature types, 6.0%. By pair count typal picks are the minority; by label count the typal list has 128 labels against 249 mechanic labels, about a third. T2 should not lead the picker with creature types on the strength of share.

The 75.5% above is over all commanders, including those with few decks. The earlier ruling's "99% of commanders with 200 or more decks are covered" is a narrower denominator and still stands for the floor choice: the commanders a floor of 10 leaves tagless are the thinly-played ones.

## The "same vocabulary" claim

The handoff says the Themes control shares the Mechanics vocabulary. It does not. Mechanics are the fixed `MECHANIC_LABELS` list read from the card side; themes are the EDHREC tags read from `commander_support.tags`, filtered to the labels in `MECHANIC_LABELS` and `CREATURE_TYPE_LABELS`. They overlap in names (Blink, Treasure, Tokens) but come from different sources and can disagree for one commander. T2 copy must not say they are the same.

## What T1 builds

- `src/lib/themes/commander-themes.ts` (pure, client-safe): the floor, `normalizeThemeSlugs`, `themeKind`, `buildCommanderThemes`, `laneThemes`, `fileThemes`, `hasThemes` (Any and All).
- `src/lib/themes/commander-themes-read.ts` (server): one read of `commander_support`, memoised per catalog generation for ten minutes, ticket-ordered like `loadCommanderPrintings`.
- `src/lib/themes/lane-themes.ts`: `laneThemesFor(oracleIds)`, fail-soft. When the index is unavailable the page serves the unfiltered window (eng item 1: nothing is drawn as not-drawn on an index failure).
- `lane-params.ts`: `t` (lower-cased, de-duplicated, sorted) and `tm` (`tm=all` only with two or more themes). Themes AND colors.
- `discovery/window.ts` and `discovery-view.tsx`: `withThemes` applied before the color filter, on the server window and on the client narrowing.

## Eng items from the READINESS, and where they land

1. Index unavailable: fail soft, T1.
2. Themes with Printed-in empty copy extends `filteredTogetherBody`: T2.
3. Picked-theme lead on `noMechanics` rows: T2.
4. Per-request theme index, server window, payload measure: T1 builds the first two; the payload measure is below.
5. Correct the "same vocabulary" claim: this doc, and T2 copy.
6. No About label.

## Payload

The page passes `themes` (a position-aligned list of local theme indices per row plus the theme list) to `DiscoveryView`. It rides the existing first-window payload. T2 runs `pnpm probe:payload` against the page before its PR opens; T1 adds no drawn surface and the prop is empty when no row carries a theme.

## Proof in T1

`commander-themes.test.ts` and `lane-params.test.ts` cover the floor, kind filter, ordering, Any and All, URL round trip and `laneQuery` dropping `t` and `tm`. CI runs them.
