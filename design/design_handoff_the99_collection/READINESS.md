# Readiness Review — Collection

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-18
**Related ticket(s):** #6 (upload-flow copy inherited from #5 audit)
**Plan PR target:** TBD

## Summary

Complete on scope: browse (rows ⇄ grid toggle), sticky filter bar with chips, card-detail modal with prev/next and deep-linking, the three-step replace flow (entry warning → single scrollable review → type-to-confirm), no-results state, and read-only scope all decision-logged with token references. Empty-collection state correctly deferred to the shell. No blocking Design gaps. The audit's decision point is the CSV-format question routed here from #5: Design designed for multi-format ("Moxfield · Archidekt · Deckbox · ManaBox · plain CSV") plus paste — resolving it eng-side by broadening the parser makes the verdict Yellow; insisting on ManaBox-only would instead require a Design copy addendum (Orange path). Recommendation: broaden the parser.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Read-only browse is an explicit decision (no inline edits, no foil/condition, no wishlist; replace is the only write path). Empty-collection state explicitly owned by the shell, no re-draw.

### 🎭 State coverage
- [✅] Browse (two densities), card detail, no-results (distinct from empty), replace steps 1–3, rejected alternative documented (2b). Mobile + desktop throughout.
- [🟡] Missing-art condition: `imageUri` is nullable in the catalog, but grid tiles/modal assume art present. The mockup's color-identity gradient placeholder is the natural fallback — plan PR should specify it as the real no-image treatment.

### 🔌 Data contract
- [🟡] **Format support (the #5-routed decision):** dropzone copy promises five formats + "Paste a list instead"; shipped parser requires ManaBox's six exact headers and `previewUpload` accepts only a `File`. Resolve by broadening eng-side: flexible header detection (Name + Quantity minimum; set optional), plus a paste server action sharing preview/confirm semantics. This also covers the shell's paste item (#5 audit item 2).
- [🟡] Unmatched rows are designed with line numbers; `UploadPreview.unmatchedRows` carries `{name, setCode}` only — thread `line` through `ManaBoxRow`/`matchRows`. Small payload addition.
- [🟡] Sort options: only "Sort: Name ▾" appears; the option list is unspecified. Plan PR picks (proposed: name, quantity, set, rarity, color).
- [✅] Everything else reachable: row/tile/detail fields (name, type line, mana cost, oracle text, set, rarity, color identity, quantity) all in `cards` + `collection_items`; browse query API is planned work with chips mapping 1:1 to query params; preview/confirm two-step flow shipped, including `currentCollectionCount` for the replace copy; type-to-confirm is a client gate.

### 🧱 Codebase fit
- [✅] Token references throughout; shell chrome reused, not re-invented; status-row/danger patterns follow the brand sheet; marks rebuilt as inline SVG per guidance.

### ♿ Cross-cutting
- [🟡] Modal a11y not specified: focus trap, Escape/return-focus, and focus-visible states for filter controls — plan PR applies brand focus treatment (same as #5 audit item 5). Type-to-confirm input needs an accessible label. 2,900-row list: plan PR should decide virtualization/pagination; design's sticky bar + count work either way.
- [✅] Warning/danger color semantics consistent (amber = recoverable, red = malformed) and paired with text, not color-only.

### ⏰ Drift from reality
- [🟡] The format-copy drift (above) — a known, routed decision rather than an accident; no other drift. Sample counts mirror `data/the-vault.csv`; browse names are real Oracle cards.

### 📝 Decision log
- [✅] Six decisions with rejected alternatives shown (1b, 2b), locked vs. assumed clearly marked (art "assumed present" flagged for eng).

## Eng-side clarifications (Yellow)

1. Broaden CSV ingest to match the designed promise: flexible header detection (Name + Quantity required; Set code/Foil/Condition/Scryfall ID optional) covering ManaBox/Moxfield/Archidekt/Deckbox/plain exports, plus a paste-list server action with identical preview → confirm semantics and the fatal-parse guard. *(Decided 2026-07-18: Hugh approved broadening — no Design addendum needed.)*
2. Add `line` to unmatched rows in `UploadPreview`.
3. Define the sort option list (proposed: name, quantity, set, rarity, color).
4. Specify gradient placeholder as the missing-art treatment.
5. Modal focus trap + Escape handling, focus-visible on filter controls, labeled type-to-confirm input.
6. Choose list virtualization or windowed pagination for the ~1,400-entry browse.

## Decisions inherited

- Uploads are full-replace, no merge (v1 model); "replace is the only write path."
- Empty-collection state is the shell's (`design_handoff_the99_appshell/`); this surface owns no-results only.
- Card detail is a modal with `?card=` deep-link, not a route.
- Read-only browse in v1 — no quantity editing, foil/condition, or wishlist.
- Review screen is single-scroll (2a); collapsed issues (2b) rejected.
- Type-to-confirm (`REPLACE`) arms the destructive confirm; button always states the concrete count.
