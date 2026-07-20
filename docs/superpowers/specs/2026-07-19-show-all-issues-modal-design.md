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

> ### Problem (objective)
>
> On `/collection/replace/review`, users see a truncated preview of unmatched card names and parse errors from their uploaded CSV. To inspect the full list they click "Show all X …", but the current behavior expands the list inline on the review page, pushing the sticky action bar (Cancel / Continue to replace) off-screen and breaking the review layout. This gets worse the longer the list — a 200-row CSV with 60 unmatched names + 12 parse errors becomes unusable. Users need to inspect the full list without losing the review context and without the layout collapsing on them.
>
> ### App context (reminders for Design)
>
> - Lives inside the destructive replace flow at `/collection/replace/review` (Step 2 of 3). Step 3 is the type-to-confirm modal in `design/design_handoff_the99_collection/`.
> - Ships on both mobile and desktop in the same PR. The review page itself is designed for both viewports already — this surface must match the parity requirement.
> - Uses the brand system in `design/design_handoff_the99_brand/`. Palette A (Table Candlelight), Cinzel display + IBM Plex sans/mono.
> - Same session lifetime as the review preview (uploadId-scoped, ephemeral). Not shareable via URL.
> - View-only diagnostic — no follow-on actions on entries in v1.
>
> ### Technical requirements
>
> - **Data available now** (no schema changes): `UploadPreview.unmatchedRows: { name, setCode, line, quantity }[]` and `UploadPreview.parseErrors: { line, reason }[]` — the same payload as the review page (`src/app/collection/actions.ts`).
> - **Auth:** Clerk-authenticated (inherits from the review page).
> - **Scale:** design for the worst case — 200+ entries per list. Note the max rendered target (row count) so the plan PR can decide `overflow-y-auto` vs virtualization.
> - **A11y baseline:** focus trap while open, Escape closes, first-focusable is the filter input, ARIA-compliant tab semantics. Contrast per the brand sheet.
>
> ### Deliverables we expect
>
> - Hi-fi mockups for **both viewports**, covering:
>   - Default open state — tab 1 (Unmatched), populated
>   - Tab 2 (Parse errors), populated
>   - Filter active — matches found
>   - Filter active — no matches (empty-filter state)
>   - One-tab-empty edge case (e.g. 0 parse errors — is the tab hidden, disabled, or shown with a zero-state?)
> - Component handoff with brand-token references (bg, border, radius, spacing, type)
> - Decisions log in the handoff README, marking locked vs tentative
> - Mobile pattern decision (full-screen sheet vs half-sheet)
> - Filter input treatment (icon, placeholder, clear affordance)
> - Per-row density recommendation at 200+ rows

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
