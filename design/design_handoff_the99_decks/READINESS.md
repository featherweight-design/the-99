# Readiness Review — Decks & deck-builder

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-18
**Related ticket(s):** #8 (guided step 3 inherited from #5; entered from #7's detail)
**Plan PR target:** TBD

## Summary

Complete on scope, and the reviewer round is already incorporated (`REVIEWER NOTES.md`): by-type grouping is the default with by-role as the alternate lens, role numbers are sourced advisory recommendations styled neutral below-rec, the export copies names only with pricing explicitly flagged as a planned add, and the redundant "nothing is committed" copy is gone. All eight states delivered across three routes (`/decks`, `/decks/new` both doors, `/decks/[id]` empty/mid/degraded/first-run) plus the two-tab export, mobile + desktop throughout. No Design round-trip needed. The gaps are eng-side payload/derivation work: the deck read-side (per-card role/owned, list aggregates, status pill), a suggestions payload that matches the designed card (names, owned/inDeck flags, EDHREC inclusion %, unowned staples), and the same wipes-role addition #7's audit already carries.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Three routes with crisp jobs; this surface owns live guided step 3 (shell ships it dimmed); setup completes the moment the first deck gains a card. "Advisory, never blocking" is literal — export enabled at any size, below-rec styled neutral.
- [✅] Price is deliberately out of the core flow — mock reference figures are muted and calloutted as a planned feature, not a requirement.

### 🎭 State coverage
- [✅] Deck list, create pre-filled, create picker, builder empty/mid-build/degraded, export (both tabs), first-run arrival — all present, phone + desktop (Add panel = right column / bottom sheet; export = modal / sheet).
- [✅] Degraded is builder-local: suggestions fall back to role coverage with a retry; the builder is otherwise unchanged.

### 🔌 Data contract
- [🟡] **Deck read-side:** the builder needs per-card `{name, role, owned, quantity}` and the list needs per-deck aggregates (`built/99`, owned · to-buy). All derivable — `classifyRoles` + a collection EXISTS — but no deck query ships them yet; plan PR adds the queries. Shopping list = `cards.filter(!owned)`, a view not a table. ✅ as a model.
- [🟡] **Status pill** (Building / Playable / Complete / Draft) has no defined derivation. Proposed: Complete = 99 built all owned; Playable = 99 built with gaps; Draft vs Building below 99 needs a rule (proposed: Draft until first suggestion/search add or <50% built) — plan PR fixes the definition.
- [🟡] **Suggestions payload:** designed card carries `{name, reason, reasonType, owned, inDeck}` with reasons like `EDHREC · 71% of decks`; shipped `Suggestion` is `{oracleId, reason: enum}`. Three additions: resolve names/flags, retain EDHREC inclusion % in `parseEdhrecPayload` (cached payloads already hold it — re-parse, no refetch), and include **unowned** EDHREC staples (mock suggests Bolas's Citadel unowned · buy; `suggestDeck` draws from the owned pool only).
- [🟡] **Wipes role** — same gap as #7's audit item 2, one shared fix (target 3). **Lands advisory:** design says `rec ~37`, `LAND_TARGET` is 36 — align on one number. Each recommendation needs its rationale/source string ("EDHREC averages…" + per-cell hover copy) — static copy, eng-side.
- [🟡] `inDeck` missing from search results (`searchCards` returns `{oracleId, name, typeLine, owned}`) — derive client-side from the loaded decklist or add an EXISTS.
- [🟡] **Rename:** design flags it as a cheap add (reuse the name field inline); no `renameDeck` action exists — plan PR adds it.
- [✅] Everything else shipped and matching: create validates commander legality server-side (both doors), decks start empty and named, singleton no-op + basic-land increment match the ✓ In deck treatment exactly, search is colour-scoped/legal-only/min-2/≤20/owned-flagged, `toDecklistText` is already commander-first `N Name` lines. Shopping-list text export is a two-line helper away.

### 🧱 Codebase fit
- [✅] Token references throughout; shell chrome, Collection's pip/gradient/dot vocabulary, and the card-fan mark map all reused; card-detail modal borrowed from #6 rather than re-drawn; SVG rebuild flagged per brand sheet.

### ♿ Cross-cutting
- [🟡] Export dialog + Add bottom sheet need the standard modal treatment (focus trap, Escape/dismiss, focus return) and focus-visible on toggles/tabs — same as #5/#6/#7 audits. Role-cell rationales are `title` hovers in the mock — plan PR needs a touch/keyboard-reachable equivalent. Copy-to-clipboard needs a confirmation announce.
- [✅] Ownership never colour-only (dot + buy tag + label); below-rec neutral vs met green is paired with `rec N` text.

### ⏰ Drift from reality
- [🟡] Unowned suggestions and EDHREC % reasons (above) are the mock outrunning the shipped payload — anticipated additions, not accidents. Card names are real Oracle cards (Korvold Jund shell); counts/prices/scores flagged as mock.

### 📝 Decision log
- [✅] Eight decisions plus an incorporated-feedback file recording Hugh's four review points and their resolutions — locked vs planned (pricing) clearly marked.

## Eng-side clarifications (Yellow)

1. Deck read-side queries: per-card `{name, role, owned, quantity}` for the builder; per-deck `built/owned/to-buy` aggregates for the list; define the status-pill derivation.
2. Suggestions payload to match the designed card: resolve names + owned/inDeck flags, retain EDHREC inclusion % in `parseEdhrecPayload`, include unowned EDHREC staples with buy marking.
3. Add the `wipes` role (shared with #7 audit item 2); align lands advisory (~37 vs `LAND_TARGET = 36`); ship rationale/source copy for the Recommended-mix strip.
4. `inDeck` flag on search results (client-derived or EXISTS).
5. Shopping-list text export helper (names only) + Download .txt; `toDecklistText` already conforms.
6. `renameDeck` server action (design's flagged cheap add).
7. Modal/sheet a11y (focus trap, dismiss, focus return), focus-visible, touch-reachable role rationales, clipboard confirmation.

## Decisions inherited

- Guided step 3: shell owns the dimmed item; this surface owns the live banner; setup completes when the first deck gains a card.
- Singleton rule is server-enforced silent no-op (basics increment) — UI renders it as ✓ In deck, never an error.
- Role numbers are sourced recommendations, never gates; export is enabled at any deck size.
- By-type grouping is the default lens; by-role is the alternate (reviewer round 1).
- Pricing is a planned later feature — names-only exports until it's deliberately designed (reviewer round 3).
- Art placeholders are identity gradients until Scryfall art lands; card-detail modal comes from #6.
