# Readiness Review: Strategy focus, theme glyphs addendum (PR #3064)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20
**Related ticket(s):** strategy focus R2g handoff; this addendum (`ADDENDUM-theme-glyphs.md`, boards Glyphs-Main, Glyphs-Themes, Glyphs-Pairs)
**Plan PR target:** TBD

## Summary

All 13 glyphs are present on all three boards and as paste-ready JSX in the addendum. They are built exactly as the shipped ones are: SVG children of `STRATEGY_GLYPHS` in `src/components/decks/strategy-icon.tsx` (24 grid, stroke 1.6, `currentColor`, round caps). Nothing blocks the three FixedAxis glyphs. The ten new themes have no theme key or classifier in the codebase, so their glyphs can only land once those themes exist. That is an eng sequencing decision, not a Design gap.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Boundary stated: only `STRATEGY_GLYPHS` changes; focus flow, ring, medallion and legend locked; no new tokens or components.
- [✅] Non-goals named (no Wizards, mana, set, loyalty, Saga numeral or frame-crown art).

### 🎭 State coverage
- [✅] No new states. Glyphs draw at legend 16, medallion 60/77, precon 14/18; Main shows 14, 16, 18, 16 picked and both medallion widths, so phone and desktop are both covered.
- [✅] All six themes covered on Glyphs-Themes.

### 🔌 Data contract
- [✅] `planeswalkers`, `sagas`, `proliferate` are already `FIXED_AXES` keys; they drop straight in and replace the three stand-ins.
- [🟡] The ten new keys (storm, monarch, extraTurns, extraCombats, minusCounters, burn, groupHug, pillowFort, bigMana, politics) are not in `THEMES` (`src/lib/labels/types.ts`) or `FIXED_AXES`. `STRATEGY_GLYPHS` is `Record<Glyph, ...>`, so adding them breaks typecheck until the keys exist. The addendum itself says to use eng's keys.

### 🧱 Codebase fit
- [✅] Same implementation and stroke as shipped; no fill, no new colours (`--fg-muted` and `--accent-text` already used).
- [✅] Storm and Monarch reuse the tracker marks (`src/components/tracker/icons.tsx`); Monarch's path is identical, at stroke 1.6.
- [🟡] `strategy-icon.test.tsx` has a `BORROWED` list and a test asserting the stand-in equality; both must be removed or rewritten.
- [🟡] Legend names are placeholders for `/copy-review`.

### ♿ Cross-cutting
- [✅] Decorative glyphs beside text labels; no new a11y surface.
- [🟡] Legibility at 14px is claimed and drawn on the boards (outlines separate, ten confusable groups at 14/16/24), but not measured here. The closest pair is -1/-1 vs +1/+1 (same frame; the sign is the only difference). Design says the plus cross still shows at 14, so judge it in the plan's contact sheet.
- [✅] No performance or telemetry impact.

### ⏰ Drift from reality
- [✅] Named file, component, glyph keys and shipped glyphs exist as described; branch already on current origin/main.

### 📝 Decision log
- [✅] Calls 1 to 5 are numbered; R1 notes and Hugh's R2 approval are recorded.

## Gaps requiring a Design round-trip

None.

## Eng-side clarifications

- Item 1: Land `planeswalkers`, `sagas`, `proliferate` first (keys exist). Add the ten others to `STRATEGY_GLYPHS` only together with their theme keys; until then they stay unused, or are held for the PR that adds the themes.
- Item 2: Update `strategy-icon.test.tsx`: empty `BORROWED`, drop the stand-in test, keep the distinct-drawings check (it now covers the new 13).
- Item 3: Send legend names to `/copy-review`.
- Item 4: Verify 14px legibility, in particular -1/-1 vs +1/+1, on the acceptance contact sheet.

## Decisions inherited

- Crown kept for Monarch (throne dropped); plain drawn crown, never the card-frame crown.
- One mark per mechanic: Storm and Monarch match the tracker.
- No Wizards, mana or set symbols.
- Same 24-grid, stroke 1.6 family; 56% of ring centre on the medallion.
