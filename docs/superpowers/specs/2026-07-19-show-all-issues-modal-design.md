# 2026-07-19 — Show-all-issues modal — design spec

Design spec for GitHub issue **#36** ("Full-list Show all X unmatched experience"). Captures the workshop decisions and provides the Track 2 handoff prompt for Claude Design.

- **Design ticket:** [#36](https://github.com/HartiganHM/the-99/issues/36)
- **Track:** 2 (design needed → handoff → readiness → plan PR → implementation)
- **Related tickets:** [#32](https://github.com/HartiganHM/the-99/issues/32), [#33](https://github.com/HartiganHM/the-99/issues/33) — shipped the review page (`PR #39`) whose inline "Show all" behavior this surface replaces.

---

## Problem

On `/collection/replace/review`, users see a truncated preview of unmatched card names and parse errors from their uploaded CSV. Clicking "Show all X …" today just drops the slice cap inline — the whole list renders on the review page, pushing the sticky action bar (Cancel / Continue to replace) off-screen and breaking the review layout. The bigger the list, the worse it gets — a 200-row CSV with 60 unmatched names + 12 parse errors makes the page unusable. Users need to inspect the full list without losing the review context.

## Workshop decisions (locked)

| Decision | Choice |
|---|---|
| Scale target | Design for the worst case (200+ entries). Degrade gracefully to short lists. |
| User capability | View-only diagnostic. No retry / dismiss / edit in v1. |
| Surface consolidation | One surface with two tabs — **Unmatched** (default) / **Parse errors** — shared across both "Show all" links on the review page. |
| Pattern | Modal — full-screen sheet on mobile, large centered dialog on desktop. |
| Blocking model | Non-blocking. "Continue to replace" stays available on the review page; opening the full list is opt-in. |
| Default sort | CSV line order (matches the row references users are debugging against). No sort toggle in v1. |
| Filter | Single text input above the list. Matches unmatched `name` and parse error `reason` on the active tab only. |
| Deep-link | None in v1. Modal is UI state, not URL state. The preview session is uploadId-scoped and ephemeral — a URL wouldn't survive a refresh. |
| A11y baseline | Focus trap, Escape to close, first-focusable = filter input, ARIA-compliant tab semantics. Contrast per the brand sheet. |
| Perf | Virtualization is an eng-side call in the plan PR. Handoff notes a max-rendered target so the plan PR can decide `overflow-y-auto` vs virtualization. |

## Out of scope (v1)

- Retry / dismiss / edit actions on individual entries
- Sort toggle
- Deep-linkable URL for the surface
- Dedicated route treatment (`/…/review/issues` etc.)
- Choice of virtualization library (eng-side call)

## Data available (no schema changes)

`UploadPreview` (in `src/app/collection/actions.ts`) already carries both lists — the modal reads from the same source as the review page:

```ts
type UploadPreview = {
  // …
  unmatchedRows: { name: string; setCode: string; line: number; quantity: number }[];
  parseErrors: { line: number; reason: string }[];
};
```

No new API. The modal is a client-side view of data already fetched for the review page.

## Design owns

Layout, control shapes, mobile pattern (full-screen sheet vs half-sheet), typography, tab treatment, filter treatment, per-row density, per-row treatment for unmatched vs errors, empty-filter state, one-tab-empty edge case.

---

## Track 2 handoff prompt (paste into the design ticket brief)

> ### Feature / surface + route
>
> Full-list "Show all X unmatched" modal — triggered from `/collection/replace/review`, the Step 2-of-3 destructive replace flow.
>
> ### Where it lives in the flow (entry → this → exit)
>
> - **Entry:** Two "Show all X unmatched →" / "Show all X errors →" links on the review page's issue tally block. Today they just drop the slice cap inline; this modal replaces that behavior.
> - **This surface:** Modal with two tabs — Unmatched (default) / Parse errors — filter input above the list, long-list underneath.
> - **Exit:** Modal dismisses (Escape / backdrop / close affordance) back to the review page. No navigation change — the review page stays exactly where the user left it and "Continue to replace" remains available.
>
> ### Design system / files to build from
>
> - Brand tokens: `design/design_handoff_the99_brand/` (Palette A "Table Candlelight", Cinzel + IBM Plex).
> - Adjacent shipped surfaces: `design/design_handoff_the99_collection/` — the review page and type-to-confirm modal are the same visual family.
>
> ### Interaction model
>
> - **Single close affordance.** Escape key OR backdrop tap OR one explicit close control in the header (X icon vs `Close` label is open). No footer "Done" button — this is view-only, there's nothing to confirm.
> - **View-only.** No CTAs on individual rows. No retry, no dismiss, no edit. Row tap does nothing (or expands for readability at your discretion — non-actionable either way).
> - **Non-blocking of the parent.** The review page's "Continue to replace" stays available underneath; opening the modal is opt-in inspection, not a gate.
> - **Tab switch is instant, no confirmation.** Filter input state resets on tab switch.
>
> ### Data contract
>
> - `UploadPreview.unmatchedRows: { name, setCode, line, quantity }[]`
> - `UploadPreview.parseErrors: { line, reason }[]`
> - Both defined in `src/app/collection/actions.ts`. Same payload as the review page — the modal reads from it directly. No new API, no schema changes.
> - **Treat every count and label in your mocks as real production data.** If a mock shows "Showing 27 of 213", eng will render that string faithfully — do not use placeholder counts that could ship as-is (e.g. "Showing 12 of 12" over 3 rows).
>
> ### States to cover (name all — do not skip)
>
> - Default open — tab 1 (Unmatched), populated
> - Tab 2 (Parse errors), populated
> - Filter active — matches found
> - Filter active — no matches (empty-filter state)
> - **Both empty-tab directions:** tab 1 populated + tab 2 has zero rows, AND tab 1 has zero rows + tab 2 populated. Show how each tab reads when its own list is empty (hidden? disabled? zero-state?).
> - Long list — 200+ rows in either tab. Note density.
>
> ### Copy
>
> - **Lift copy verbatim into a copy file** (eng-side call for exact path — likely `src/lib/copy/…`). Every string in the surface — header, tab labels, filter placeholder, empty-filter state, per-row text — appears as final production copy in the mock. Do not paraphrase later.
> - **Voice rule:** terse, mono for structured data (line numbers, counts, set codes), no reassurance fluff, no exclamation marks. Match the review page and confirm modal's tone.
>
> ### Locked (do not propose alternatives)
>
> - Pattern: modal, full-screen sheet on mobile, large centered dialog on desktop.
> - Two tabs, Unmatched default. Filter on active tab only.
> - View-only. No row actions.
> - Default sort: CSV line order.
> - Brand tokens.
> - Adjacent flows (review page, confirm modal) unchanged — do not redesign them.
>
> ### Open — propose options
>
> - Modal size at desktop (85% vs 90% viewport vs fixed max-width)
> - Per-row density at 200+ rows
> - Filter input treatment (icon, placeholder, clear affordance)
> - Close-affordance shape (X icon vs `Close` label)
> - Empty-tab treatment (hidden / disabled / zero-state)
>
> ### Viewports + a11y baseline
>
> - Mobile + desktop parity, both ship in the same PR.
> - Focus trap while open, Escape closes, first-focusable = filter input.
> - ARIA-compliant tab semantics.
> - Contrast per the brand sheet.
>
> ### Deliverables
>
> - Hi-fi mockups for both viewports covering **every** state above.
> - Prefer a single component with variant props over separate components for the two tabs (per concert-crawl's shipped pattern in Price Transparency).
> - Component handoff with brand-token references (bg, border, radius, spacing, type).
> - Decisions log in the handoff README, marking locked vs tentative.
> - Copy exported as strings ready to paste into eng's copy file.
> - Recommended max-rendered row count so the plan PR can pick `overflow-y-auto` vs virtualization.
>
> **If any bullet above feels light, restate your interaction and copy assumptions in chat before building — cheaper to correct a bullet list than a mockup.**

---

## Next steps

1. Attach the handoff prompt above to design ticket #36 as the design brief.
2. Claude Design produces the handoff folder → `design/design_handoff_the99_show_all_issues/` (name TBD by Design).
3. Readiness Review lands in that folder → verdict.
4. 🟢 Green / 🟡 Yellow → plan PR → implementation. 🟠 Orange / 🔴 Red → addendum or new design ticket.

## Traceability

- Design ticket: #36
- Handoff: `design/design_handoff_the99_show_all_issues/` (once landed)
- READINESS: `design/design_handoff_the99_show_all_issues/READINESS.md` (once landed)
- Plan PR: TBD
- Implementation PR: TBD
