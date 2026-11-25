# Readiness Review: Collection quick filters

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-24 (Claude, after Hugh approved R2)
**Related ticket(s):** none (brief was Hugh's prompt in the project thread, 2026-11-24)
**Plan PR target:** TBD (`docs/superpowers/plans/`, opens after this handoff PR merges)

## Summary

The strip is fully specified at phone (390) and desktop (1300), with five states each. It uses existing filter state
(Availability Free, `facts`, `foil`) and existing chassis rows, and adds no new filter UI. Yellow rather than Green
because the combos view needs data the page does not load today: own-one partners for the whole collection, deduped
pairs, the deck that holds both, and the NEW link to the feed item. Each has a clear source. None needs Design.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ The brief's four points are mapped in README "Source of truth". C only; the Filters panel and the key don't change.
- ✅ Q1 to Q3 are settled.

### 🎭 State coverage
- ✅ Full, sparse (zero chips hidden), other filters on, combos own both, combos own one, at both widths.
- 🟡 Not drawn: every count 0, an empty side of the combos toggle, combos loading. The strings exist (`emptyBoth`,
  `emptyOne`). Follow the list's existing empty and loading patterns.
- 🟡 Tablet is not drawn. It uses the desktop chip row (chassis breakpoint), so no new layout.

### 🔌 Data contract
- ✅ Free, facts and foil are already on `BrowseListCard`, so their counts are client-side.
- 🟡 Own both: pairs come from the same source as `comboPartner` / `comboPartners`. The plan picks the payload (pairs
  list versus per-card partners) and dedupes A+B / B+A.
- 🟡 Own one: near-miss partners for the whole collection (`src/lib/combos/near-miss`). Load them only when the view
  opens. The missing card's price comes from the reader's store (store preference), and "Wanted by" comes from drafts.
- 🟡 The result word ("Infinite damage") and "Both in <deck>" need the combo's result and the holding deck (see
  `src/lib/combos/holding-decks.ts`).
- 🟡 NEW: the latest combo feed item (`src/lib/feed/combo-writer.ts`) names the pair. The feed item links to
  `?combos=both`.

### 🧱 Codebase fit
- ✅ Tokens only: `--accent`, `--border`, `--border-strong`, `--border-dashed`, `--fg*`, `--surface-rail`,
  `--surface-sunken`, `--elevated`, `--bg`. The pair placeholders in the art are mock-only.
- ✅ Copy: `copy strings.ts` has no em dash or exclamation mark and is US English. Buttons are 3 words or fewer. The
  strings go in `src/lib/copy/` (`check:inline-copy`).
- ✅ The chip row is the chassis's own (`FilterChip` for active chips). URL params follow `OWNED_PARAMS` in
  `browser.tsx`.

### ♿ Cross-cutting
- 🟡 Chips are toggle buttons (`aria-pressed`) with a 44px hit area (like the existing chip ×). The phone strip
  scrolls sideways, and keyboard focus must scroll a chip into view.
- ✅ Telemetry: reuse `find_a_deck_opened` with `from: "quick_chip"` for In no deck. Other chips are optional.

### ⏰ Drift from reality
- ✅ Drawn over main d5f1466. `browser.tsx`, `find-a-deck-callout.tsx` and `collection-mark-key.tsx` exist as named.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: the combos payload (pairs, partners, result word, holding deck), loaded on opening the view.
- Item 2: URL params for each chip and for the combos toggle; the feed item deep-link.
- Item 3: undrawn empty and loading states follow the list's patterns, with strings from `copy strings.ts`.
