# Readiness Review — Issue Inspector

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-20
**Related ticket(s):** #36
**Plan PR target:** TBD (opens after this handoff PR merges)

## Summary

The Issue Inspector handoff is thorough. All requested states are delivered (A–E plus the mirror edge E2), decisions are labeled LOCKED / TENTATIVE, brand tokens are referenced throughout, the copy strings are exported verbatim in `Issue Inspector - copy strings.js`, and the a11y baseline is spelled out end-to-end. The Yellow verdict reflects two eng-side items the plan PR needs to close: the virtualization threshold Design explicitly flagged TENTATIVE, and cross-checking the parse-error `reason` copy against the live backend text. The three "please confirm with design before building" bullets in `Issue Inspector - Claude Code brief.md` are all Yellow-shape (eng chooses; Design flags the assumed default).

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Boundary defined — the modal replaces inline-expand on the review page, is view-only, and does not touch the parent flow.
- ✅ Non-goals explicit — "no per-row actions in v1 (no re-match, edit, or remove)". `Also locked (per handoff brief)` section catalogues additional constraints.
- ✅ Open questions logged — TENTATIVE marker on decision #6 (virtualization threshold); brief.md's "Please confirm with design before building" section lists three.

### 🎭 State coverage
- ✅ Six states delivered (A, B, C, D, E, E2) with mobile + desktop parity called out per state.
- ✅ Empty-tab covered in both directions (0 parse errors AND 0 unmatched) per the workshop ask.
- ✅ No loading state needed — modal opens against already-loaded in-memory data. Design confirmed "no fetch, no route".
- ✅ No error state to design — same reason.

### 🔌 Data contract
- ✅ `UploadPreview.unmatchedRows` + `UploadPreview.parseErrors` referenced by exact shape and file (`src/app/collection/actions.ts`). Payload matches current code (verified against the actions file at `main`).
- ✅ No schema changes required.
- ✅ Every named state is reachable from the existing payload — states derive from `unmatchedRows.length`, `parseErrors.length`, and filter input.

### 🧱 Codebase fit
- ✅ Brand tokens referenced by hex + noted "production references token names, not raw values".
- ✅ Adjacent surface (card-detail modal) named as the visual precedent — reuses the shipped brand modal shell.
- ✅ "One component with variant prop" pattern called out in decision #7 — matches concert-crawl's shipped Price Transparency pattern per our template.
- 🟡 The folder's `README.md` was the parent Collection handoff, not the Issue Inspector's own README. Renamed in this PR: `README.md` → `COLLECTION-reference.md`, `The 99 - Issue Inspector README.md` → `README.md` so the folder convention holds. Design-owned content unchanged.

### ♿ Cross-cutting
- ✅ A11y baseline complete: focus trap, Esc to close, backdrop-click close (desktop), first-focusable = filter input, ARIA `role=tablist` / `role=tab` / `aria-selected`, roving arrow-key focus between tabs, `aria-disabled` on the zero-count tab, `role=tabpanel` + `aria-labelledby` on panels, focus restore to trigger on close, `prefers-reduced-motion` respected.
- ✅ Contrast per brand sheet — body `#C6B79A`, meta `#8E8269`, 3px state borders carry semantic (color never the only signal).
- 🟡 Perf: virtualization threshold marked TENTATIVE with a stated target (~150 rows plain, above that virtualize with `react-window` or `@tanstack/virtual`). Design owns the row spec; eng owns the library + exact threshold in the plan PR. Consistent with the workshop decision to defer virtualization to eng.

### ⏰ Drift from reality
- ✅ Data contract matches the shape currently in `src/app/collection/actions.ts` (no fields renamed since the workshop).
- ✅ Route `/collection/replace/review` current (unchanged by PRs #38–#41 which touched review layout but not the route).
- ✅ Adjacent flow references (review page, confirm modal, card-detail modal) match shipped v1 UI.

### 📝 Decision log
- ✅ Eight numbered decisions plus a catch-all "Also locked" section, all with LOCKED / TENTATIVE markers.
- ✅ Justifications given per decision (not just the choice, but the reasoning).
- ✅ Copy strings exported verbatim in `Issue Inspector - copy strings.js` with a voice-rule header.

## Eng-side clarifications (Yellow items to close in the plan PR)

- **Virtualization library + threshold.** Design's target is ~150 rows on plain `overflow-y: auto`; above that, virtualize with `react-window` or `@tanstack/virtual`. Pick the library, confirm the threshold, note the pick as locked once landed.
- **Parse-error `reason` copy cross-check.** Brief.md flags: "Exact copy for the parse-error `reason` strings if the backend wording differs from the mock." Cross-check the mock's reason wording against `previewUpload` / `previewPaste`'s actual `parseErrors[].reason` output, and either mirror the backend text or adjust the mock language in an addendum note.
- **Match-highlight scope.** Design assumes all matched substrings are wrapped in `<mark>`; the mock only shows the first run for brevity. Confirm the plan PR ships "highlight all runs" as assumed.

## Decisions inherited

- Locked interaction model, tabs, sort order, non-blocking semantics, filter-on-active-tab-only, and copy strings from `Issue Inspector - copy strings.js`.
- Locked patterns from the workshop spec at `docs/superpowers/specs/2026-07-19-show-all-issues-modal-design.md` (all still hold; no revisions from Design).
- File hygiene: `design/design_handoff_the99_issue_inspector/README.md` is the Issue Inspector's own README; the parent Collection handoff moved to `COLLECTION-reference.md` in this PR.
