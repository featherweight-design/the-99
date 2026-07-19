# Readiness Review — App Shell

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-18
**Related ticket(s):** #5 (plus dependencies routed to #6, #7, #8)
**Plan PR target:** TBD

## Summary

The handoff is complete on its own scope: nav pattern (rail/tab bar), both `/` conditions, home dashboard, first-run checklist, all three empty states, account chrome, and mobile/desktop parity — all decision-logged with brand-token references. No Design round-trip is needed for the shell itself. The gaps are eng-side data-contract items (commander card payload fields, paste-fallback backend, un-gating `/`) plus two dependencies deliberately routed to other in-flight or queued tickets: the upload preview/confirm screens and CSV-format copy belong to #6, and first-run guided-flow steps 2 and 3 are the first-run states of #7 and #8 respectively.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Boundary crisp: "the shell, not the rooms." Non-goals stated explicitly (guided-flow steps 2–3, real card art, production chrome).
- [✅] Upload-flow overlap with #6 is handled: shell owns step 1 (dropzone entry) and the dimmed presentation of steps 2–3 only.

### 🎭 State coverage
- [✅] Signed-out `/`, signed-in dashboard, first-run checklist, collection-empty, no-candidates, no-decks, account popover — all present, mobile + desktop.
- [🟡] Not designed here, by scope choice: upload preview/review + replace-confirmation (→ #6, in flight, explicitly in its deliverables) and the live first-run states of Commanders/Decks (→ #7/#8).
- [🟡] No loading treatment for the home dashboard (recommendations are a multi-second cold load) and no EDHREC-degraded treatment on home. Both can inherit from #7's designs; plan PR should note interim behavior.

### 🔌 Data contract
- [🟡] Home commander cards need fields `CommanderScore` doesn't carry: `colorIdentity` (WUBRG pips) and a defined "completeness %" (derivable as `edhrecOwnedCount/edhrecTotal`; definition to be fixed in the plan PR). Eng-side addition.
- [🟡] "Paste a list instead" has no backend: `previewUpload` accepts only a CSV `File`. Needs a small paste-parsing server action ("quantity then name"). Eng-side addition.
- [🟠→#6] Dropzone copy claims "Moxfield / Archidekt / Deckbox / plain CSV, only Name + Quantity required." The shipped parser is ManaBox-only (six required headers: Name, Set code, Foil, Quantity, Scryfall ID, Condition). Resolve in #6 (which owns the upload flow and states ManaBox as the source): either Design corrects copy or eng broadens the parser — decision tracked there.
- [🟡] Signed-out `/` requires un-gating `/` in `src/proxy.ts` (currently the whole app is Clerk-gated). Known, small.
- [✅] Everything else reachable: hero = `results[0]` of sorted `recommendCommanders`; "All N →" = `results.length`; recent decks and collection counts are plain queries; upload preview/confirm shipped.

### 🧱 Codebase fit
- [✅] All values are brand tokens with the instruction to reference token names in production; marks rebuilt as inline SVG per brand sheet.

### ♿ Cross-cutting
- [🟡] Hover states specified throughout, but focus-visible states aren't called out for rail/tab items — plan PR should apply the brand sheet's focus treatment. Contrast follows the locked palette.

### ⏰ Drift from reality
- [🟡] The one drift is the CSV-format copy (above, routed to #6). Everything else matches the shipped backend and tickets.

### 📝 Decision log
- [✅] Eight decisions plus mark-usage rules, locked vs. reference-only clearly marked; mock data flagged as mock.

## Eng-side clarifications (Yellow)

1. Extend the commanders payload with `colorIdentity` and define completeness (proposed: `edhrecOwnedCount/edhrecTotal`, thresholds 90/75 per the bar-fill spec) in the plan PR.
2. Add a paste-list server action mirroring `previewUpload` semantics (same preview → confirm flow, same fatal-parse guard).
3. Un-gate `/` in `src/proxy.ts`; all other routes stay Clerk-gated.
4. Home loading + EDHREC-degraded treatment: interim skeleton/plain behavior in the plan PR, superseded by #7's designs.
5. Apply brand focus-visible treatment to nav/tab/account controls.

## Decisions inherited

- Rail (desktop) + bottom tabs (mobile); home is a dashboard; first-run = home-as-checklist that dissolves after upload.
- Tagline locked: "99 problems, but your commander ain't one."
- Auth forms are Clerk-hosted; we own trigger placement + popover skin only. No access-denied state exists (Clerk restricted mode).
- Guided-flow steps 2 & 3 are the first-run states of #7 (Commanders) and #8 (Decks) — not a separate build task; shell ships them dimmed/locked only.
- Crowned-99 = identity mark only; card fan = Collection/Decks; XCIX seal = Commanders.
