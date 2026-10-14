# Claude Code brief — Collection Issue Inspector

Paste this into Claude Code. It assumes the repo already has the step-2 review page and the
`UploadPreview` server flow. **The HTML in this folder is a hi-fi design reference, not code to
ship** — recreate it with the app's existing React components, styling system, and a11y helpers.

---

## What to build
A modal (desktop) / full-screen sheet (mobile) that shows the **full** unmatched-names and
parse-errors lists, opened from the review page at `/collection/replace/review`. It replaces the
current inline expand, which pushes the sticky confirm bar off-screen.

Reference files (this folder):
- `The 99 - Issue Inspector.dc.html` — hi-fi states (entry point, A–E, E2, anatomy).
- `The 99 - Issue Inspector README.md` — decisions log (locked vs tentative) + component tokens.
- `brand/` — color/type tokens. Use token names, not raw hex.

## Data contract (already exists — no schema changes)
- `UploadPreview.unmatchedRows: { name, setCode, line, quantity }[]`
- `UploadPreview.parseErrors: { line, reason }[]`
Same payload the review page already holds. The inspector reads it **from memory — no new fetch,
no route.** `uploadId`-scoped, ephemeral, not URL-shareable. Clerk auth inherits from the page.

## Entry point
The review page shows only the first few of each list. Add **one** `View all N issues →` CTA
(below both preview columns on desktop; a single button on mobile). It opens the inspector on the
populated tab — Unmatched by default, Parse errors when Unmatched is empty. Do **not** add a
per-column CTA.

---

## Design gaps to resolve in code (this is what the mock leaves to you)

1. **List virtualization.** Worst case is 200+ rows per tab. Plain `overflow-y: auto` is fine up
   to ~150 rows; above that, virtualize the list body (e.g. `react-window`/`@tanstack/virtual`).
   Keep the header, tabs, and filter pinned; only the list scrolls. *(Tentative in design — you
   own the exact threshold; the row spec is locked.)*
2. **Filtering.** Client-side, case-insensitive substring over the in-memory rows. Unmatched
   filters on `name`; parse errors filter on `reason` **and** `line` (typing `2210` finds L2210).
   Debounce input (~120ms). Live count `Showing N of M`; turn it to the warning token when N = 0.
3. **Match highlight.** Wrap **all** matched substrings (the mock only shows the first run) in a
   brass-wash `<mark>`. Escape the query before building the matcher.
4. **Empty states.** (a) Filter with no hits → card-fan mark + `No names match "…"` + `Clear
   filter`. (b) A tab with 0 items → tab stays **visible but disabled** (`aria-disabled` + real
   `disabled`), count pill in the success token, and a prominent success callout at the **top** of
   the dialog confirming e.g. "No parse errors." Cover both directions (0 parse errors, 0
   unmatched). If both are 0, the review page never shows the CTA, so this never opens empty.
5. **Accessibility (baseline, must-have).**
   - Focus trap while open; **Esc** closes; backdrop click closes (desktop).
   - **First focus = the filter input.**
   - Tabs: `role="tablist"`/`role="tab"`/`aria-selected`, roving arrow-key focus; panels
     `role="tabpanel"` + `aria-labelledby`. Disabled tab is not focusable via arrows.
   - Restore focus to the triggering CTA on close. Respect `prefers-reduced-motion`.
6. **Mobile pattern.** Full-screen sheet (not a half/drag sheet) — the 200+ case needs the whole
   column. Pinned header/tabs/filter, single scrolling body.
7. **View-only.** No per-row actions in v1 (no re-match/edit/remove) and **no footer CTA** — `✕` /
   Esc / backdrop are the only dismiss. The fix path is "correct the export and re-upload."

## Acceptance criteria
- Opening the inspector never shifts or hides the review page's sticky confirm bar.
- 200-row unmatched + 12 parse errors renders and scrolls smoothly; filter stays responsive.
- Keyboard-only: open → type to filter → arrow between tabs → Esc to close, focus returns to CTA.
- Screen reader announces tab names, counts, selected state, and the disabled tab.
- All colors/spacing/radii/type resolve to existing brand tokens (see README table + `brand/`).

## Please confirm with design before building
- The virtualization library/threshold you land on (so we note it as locked).
- Whether to highlight all match runs or just the first (design assumes all).
- Exact copy for the parse-error `reason` strings if the backend wording differs from the mock.
