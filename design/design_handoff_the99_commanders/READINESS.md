# Readiness Review — Commanders

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-18
**Related ticket(s):** #7 (guided step 2 inherited from #5; Build handoff feeds #8)
**Plan PR target:** TBD

## Summary

Complete on scope: ranked recommendation cards with inline evidence, the three-part Fit bar, receipts at both densities (preview on cards, full chip clouds on detail), a dedicated `/commanders/:slug` detail page with the Build entry point, both degraded scopes (global banner + per-commander neutral note), both empty states (no-candidates vs filtered-to-zero), first-run guided-step-2 banner, and full mobile/desktop parity including the mobile full-card lightbox. All decision-logged with token references. No blocking Design gaps — every gap is an eng-side payload/scoring addition the workshop already anticipated ("receipts — payload additions planned"). The largest items: the payload must carry named cards per component, and the mockup ranks a fourth role (**Wipes**, baseline 3) the classifier doesn't emit yet.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Boundary crisp: this surface owns the live guided step 2 (shell ships it dimmed); *Build this deck* hands off to #8 where step 3 goes live. Ranking stays opinionated — color filter narrows, never re-sorts (`Order: Fit ↓ · fixed` labeled in the UI).

### 🎭 State coverage
- [✅] First-run, populated+filtered, detail, degraded global, degraded per-commander, no-candidates, filtered-to-zero — all present, mobile + desktop. Degraded states are first-class designs, not error pages.
- [✅] Missing-art handled: identity-gradient placeholder, same system as Collection.

### 🔌 Data contract
- [🟡] **Receipts payload:** `CommanderScore` carries counts only. Design needs, per commander: the owned card names filling each role (full lists on detail, 3-name preview on cards), the owned∩EDHREC overlap names (green chips), and the EDHREC-top cards *not* owned (dashed "gap to close" chips). All derivable — `scoreCommander` already walks the pool and holds `edhrecTopCards` — it just discards the names. Plan PR extends the payload.
- [🟡] **Wipes role:** mockup shows four role chips (Ramp 10 · Draw 10 · Removal 8 · **Wipes 3**) and a "Board wipes" detail panel. `classifyRoles` folds `destroy all`/`exile all` into removal. Plan PR adds a `wipes` role (target 3) and decides whether wipe matches still also count as removal.
- [🟡] **Fit decomposition + `fitNS`:** the shipped score is already `synergy 60 + roles 25 + pool 15` /100, matching the three bar segments — but only the aggregate is returned; plan PR exposes per-component values. When synergy is null the design shows a **renormalized two-part** Fit (`fitNS`); the shipped formula instead scores synergy as 0/60, deflating the number. Plan PR renormalizes (compute or display-side).
- [🟡] `colorIdentity` and `imageUri` missing from the payload — same gap as #5 audit item 1; one shared fix.
- [🟡] **Detail route:** `/commanders/:slug` needs a slug scheme — `commanderSlug()` in `src/lib/edhrec/slug.ts` already exists and is a natural fit; plan PR decides (and handles collisions/lookup).
- [🟡] First-run banner copy needs "N unique cards read → M legal generals" — both counts derivable from `recommendCommanders` internals; small payload addition.
- [✅] Retry (both scopes) is cheap: failed EDHREC fetches aren't negatively cached, so retry = re-invoke; 30-day TTL + stale-on-error already shipped. Color filter maps to `?c=` and filters by commander identity (needs the `colorIdentity` field above). Per-commander degraded derivable from null edhrec fields; global flag shipped.

### 🧱 Codebase fit
- [✅] Token references throughout; Collection's pip/gradient/chip vocabulary reused; XCIX seal + diamonds flagged for inline-SVG rebuild per brand sheet.

### ♿ Cross-cutting
- [🟡] Focus-visible states not called out for filter pips / cards / retry buttons — plan PR applies the brand focus treatment (same as #5/#6 audits). Mobile lightbox needs Escape/tap-close + focus return; 30+ chip clouds are static text, no virtualization concern.
- [✅] Amber = system fault, neutral gray = single data gap — a deliberate, documented severity distinction, always paired with text.

### ⏰ Drift from reality
- [🟡] The Wipes role (above) is the one place the mockup outruns the shipped classifier — an anticipated payload addition, not an accident. Sample commanders/receipts are real Oracle cards; scores are mock.

### 📝 Decision log
- [✅] Eight decisions with rationale; rejected alternatives noted (sortable table, modal detail); mock vs real data flagged.

## Eng-side clarifications (Yellow)

1. Extend the recs payload with receipts: per-role owned card names, EDHREC overlap names (owned + missing), and a 3-name preview string; plus `colorIdentity`, `imageUri`, and per-component Fit values (shared with #5 audit item 1).
2. Add a `wipes` role to `classifyRoles` (target 3; decide removal double-counting).
3. Renormalize Fit to a two-part /100 when synergy is unavailable (design's `fitNS`), instead of scoring synergy as 0.
4. Slug scheme for `/commanders/:slug` (proposed: reuse `commanderSlug()`).
5. Surface "unique cards read" + candidate counts for the first-run banner.
6. Retry actions for global/per-commander degraded (re-invoke fetch; no negative cache to clear).
7. Brand focus-visible treatment on pips/cards/retries; lightbox dismiss + focus-return a11y.

## Decisions inherited

- Guided step 2: shell owns the dimmed checklist item; this surface owns the live banner, which dissolves into the populated header on later visits.
- Ranking is opinionated — Fit descending, non-reorderable; color filter narrows only.
- Detail is a dedicated shareable route, not a modal — it's the launch pad into #8's deck builder (where step 3 goes live).
- Degraded severity: global = amber warning; per-commander = neutral note.
- Art placeholders are identity gradients (Collection's system) until Scryfall art lands.
