# The 99 — Issue Inspector (design handoff)

The full-list overlay behind **Show all N unmatched →** / **Show all N errors →** on
`/collection/replace/review` (Replace flow, step 2 of 3). Replaces the current inline-expand
behavior, which pushed the sticky confirm bar (Cancel / Continue to replace) off-screen and
collapsed the review layout on long lists.

File: `The 99 - Issue Inspector.dc.html` (canvas — pan/zoom). Each state leads with the desktop
modal, mobile sheet beside it. Built against the locked brand system in
`design_handoff_the99_brand/` and consistent with the review page in `The 99 - Collection.dc.html`
(states `2a`/`2b`). All hexes are brand tokens; production references token names, not raw values.

## Entry point
Surfaced from the **step-2 review page** after upload. Each issue column there shows only the
first few rows; a **single `View all N issues →` CTA** — the same one CTA on desktop and mobile,
placed below both columns — opens the inspector. Its tabs hold both lists, so there is no per-column
trigger to duplicate (both would open the same modal). The review page and its sticky confirm bar
do not move — the inspector layers over them. See the **Entry point** frame at the top of the mockup.

## Help text (skip vs. import)
What happens to flagged rows is stated **up front**, not buried in a footer: the review-page summary
("29 rows will be skipped") and confirm bar already say it, and inside the inspector a line under the
header subtitle repeats it — *"Skipped rows are left out of the import — every other row still
replaces your collection."* There is **no footer CTA or footer note**; `✕` / Esc / backdrop-click are
the only dismiss (the surface is view-only, so a "Done" button would wrongly imply an action).

## States delivered
- **A — Default open · Unmatched, populated** — filter input focused (first-focusable).
- **B — Parse errors, populated** — reason-first rows keyed by line number.
- **C — Filter active · matches** — substring highlighted, live count, clear affordance visible.
- **D — Filter active · no matches** — empty-filter state, count turns amber, Clear filter reset.
- **E — One tab empty (0 parse errors)** — tab shown & disabled; zero-note **hoisted to the top**.
- **E2 — Mirror edge (0 unmatched)** — Unmatched tab disabled at 0; opens on the only populated tab.

## Data (no schema changes)
- `UploadPreview.unmatchedRows: { name, setCode, line, quantity }[]` → Unmatched tab.
- `UploadPreview.parseErrors: { line, reason }[]` → Parse errors tab.
- Same payload as the review page (`src/app/collection/actions.ts`); already loaded — the
  inspector opens against in-memory data, **no new fetch**. `uploadId`-scoped, ephemeral, not
  URL-shareable. Clerk auth inherited from the review page.

---

## Decisions log

### 1. Overlay, not inline expand → **modal (desktop) / full-screen sheet (mobile)** — LOCKED
The bug is that inline expansion grows the review page and shoves the sticky confirm bar out of
view. An overlay decouples inspection from the review layout entirely: the review page (and its
sticky bar) is untouched underneath; the inspector owns its own scroll and closes back to exactly
where you were. Reuses the existing brand modal shell (card-detail modal tokens).

### 2. Mobile pattern → **full-screen sheet**, not half-sheet — LOCKED
Design for the worst case (200+ entries). A half-sheet would waste half the viewport on the exact
screen where vertical room matters most, and forces a nested scroll inside a draggable sheet.
Full-screen gives the list the whole column, a fixed header/tabs/filter, and a single scroll body.
Matches the collection's card-detail mobile pattern (full-screen sheet), so the app stays coherent.

### 3. Two lists → **tabs**, not one merged list or two stacked sections — LOCKED
Unmatched (recoverable, skipped) and parse errors (malformed rows) are different kinds of problem
with different row shapes and different fixes. Tabs keep each list full-height and let the filter
placeholder/count speak to one dataset at a time. `role=tablist`/`role=tab`/`aria-selected`;
arrow-key roving focus between tabs per WAI-ARIA.

### 4. Empty tab → **shown & disabled with its zero count; zero-note hoisted to the top** — LOCKED
Hiding a tab at 0 makes the count disappear — but "0 parse errors" is *reassuring information* the
user wants confirmed. The tab stays visible, disabled (`aria-disabled`, `cursor:not-allowed`), with
its count pill in **success `#6FA368`**. The zero-note sits **at the top of the dialog** (under the
header subtitle), not below the list, so it can't get lost beneath a long list of the *other* tab's
rows. Works both ways — 0 parse errors (State E) and 0 unmatched (State E2); the inspector opens on
whichever tab is populated. If *both* lists were empty the review page never shows the CTA, so the
inspector never opens empty.

### 5. Filter → **client-side substring, single input, first-focusable** — LOCKED
One text input, no operators. Leading `⌕` glyph, placeholder scoped to the active tab
(`Filter 21 unmatched names…` / `Filter 8 errors by line or reason…`), trailing `✕` clear button
appearing only when filled. Focus lands here on open (a11y requirement). Unmatched filters on
`name`; parse errors filter on `reason` **and** `line` (so `2210` finds a row). Matches highlight
the substring with a brass wash; live `Showing N of M` count sits to the right and turns
**warning `#E0913C`** at `Showing 0`.

### 6. Row density at 200+ → **~40px single-line rows, ellipsis, fixed-height scroll body** — TENTATIVE (plan-PR call)
Compact single-line rows (name + mono meta) keep ~14–16 rows visible per screen. The list body is
a fixed-height `overflow-y:auto` region so header/tabs/filter/footer stay pinned. **Max rendered
target: ~150 rows on plain `overflow-y:auto`; above that, virtualize** (react-window or equivalent).
Worst case is 200+ per tab. Flagged tentative because the virtualize threshold is an engineering
call for the plan PR — the visual row spec is locked either way.

### 7. Also locked (per handoff brief)
- **Component architecture:** one component with a `tab` variant prop, not two — matches the shipped Price Transparency pattern.
- **Default sort:** CSV line order (no re-sorting).
- **Filter resets on tab switch;** it applies to the active tab only.
- **Non-blocking:** the review page's "Continue to replace" stays available underneath; the inspector is opt-in inspection, not a gate.
- **Copy** is exported verbatim in `Issue Inspector — copy strings.js` for eng's copy file.

### 8. Scope → **view-only diagnostic** — LOCKED
No per-row actions in v1 (no re-match, edit, or remove). The row is the diagnostic; the fix is to
correct the export and re-upload. Footer states this plainly (`View only · fix in export &
re-upload`). Keeps the inspector aligned with the collection's read-only model.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Dialog (desktop)** | 660px wide, height-capped ~600–640px; `#1A160F` / `1px #3A3229`, radius 16px, shadow `0 40px 100px rgba(0,0,0,.7)`. Backdrop `rgba(8,6,4,.72)` over the blurred (`blur(3px)`) review page. Focus-trapped; Esc closes; click-scrim closes. |
| **Sheet (mobile)** | Full-screen on `#14110E`; pinned header + tabs + filter, single `overflow-y:auto` body, footer note. Same close/Esc/back semantics. |
| **Header** | Title Cinzel 700 22px (mobile 19px) `#EDE6D8`; sub Plex Mono 11.5px `#8E8269` (`file · N of T rows skipped`). Close `✕` `#221D16` circle, `1px #3A3229`, hover brass. |
| **Tab** | Plex Sans 600 14px; active `#EDE6D8` + `box-shadow: inset 0 -2px 0 #C9A24B`; idle `#8E8269`. Count pill Plex Mono 11px, radius 999px, tinted to state (`rgba(224,145,60,.14)` unmatched / `rgba(198,83,63,.16)` errors / `rgba(111,163,104,.14)` success at 0). Disabled: `#5A5245`, `opacity .7`, `cursor:not-allowed`, `aria-disabled`. |
| **Filter input** | `#181410` / `1px #3A3229`, radius 8px, 40px (44px mobile). Leading `⌕` `#8E8269`; trailing `✕` clear (`#2A241D` circle) when filled. Focus: border `#C9A24B` + ring `0 0 0 3px rgba(201,162,75,.16)`. |
| **Result count** | Plex Mono 11px `#8E8269`; `#C6B79A` when filtered with hits; **`#E0913C` at `Showing 0`**. |
| **Unmatched row** | `#1E1A15`, `1px #2A241D`, `3px` left border `#E0913C`, radius 8px, ~40px. Name Plex Sans `#EDE6D8` (nowrap ellipsis); `line · set · reason` Plex Mono 10.5px `#8E8269`; `×qty` Plex Mono trailing. |
| **Parse-error row** | Same shell, `3px` left border `#C6533F`. Leading `L####` Plex Mono `#C6533F` (46px fixed col); reason Plex Sans `#C6B79A` 1.45, offending value bolded `#EDE6D8`. No qty. |
| **Match highlight** | `<mark>` `background rgba(201,162,75,.28)`, `color #EDE6D8`, radius 2px over the matched substring. |
| **Empty-filter state** | Card-fan mark (brand secondary, CSS boxes in mock → inline SVG in prod) + Cinzel 600 line `No names match "…"` + Plex Sans hint + `Clear filter` primary (brass). |
| **Empty-tab zero-note** | `#181410`, `3px` left border `#6FA368`, radius 8px; success dot + Plex Sans `#A89B84`. |
| **Footer** | **None.** The skip/import help is hoisted to the header (see below); `✕` / Esc / backdrop-click are the only dismiss. No "Done" CTA — the surface is read-only, so a button would wrongly imply an action. |
| **Header help line** | Under the mono subtitle: Plex Sans 12px `#A89B84`, states skip-vs-import behavior. On an empty-tab state this slot instead holds the success zero-note (left border `#6FA368`). |

## A11y
- Focus trap while open; **Esc closes**; backdrop click closes (desktop).
- **First focus = filter input.** Tab order: filter → clear (if shown) → list → footer → close.
- Tabs: `role=tablist` / `role=tab` / `aria-selected`; disabled tab `aria-disabled` + native `disabled`.
  Panels get `role=tabpanel` + `aria-labelledby` in production.
- Contrast per brand sheet: body copy `#C6B79A`, meta `#8E8269`, state borders at 3px carry the
  semantic; color is never the only signal (line badge / label text also present).

## Notes for engineering
- Opens against the **already-loaded** `UploadPreview` payload — no fetch, no route. Deep-linking
  intentionally omitted (ephemeral, `uploadId`-scoped).
- The review page's single `View all N issues →` CTA (below both preview columns on desktop, one
  button on mobile) is the only entry point; the inspector opens on the populated tab (Unmatched by
  default, or Parse errors when Unmatched is empty).
- No footer CTA: `✕` / Esc / backdrop-click are the only ways to dismiss (view-only surface).
- **Count semantics:** `Showing N of M` — M is the tab total, N is what passes the current filter
  (N = M when unfiltered). The mock renders a sample of rows in a scrolling body; production shows
  all M in the `overflow-y:auto` list.
- Card-fan empty mark and all state dots are CSS boxes in the mock; rebuild the fan as inline SVG
  in production per brand-sheet guidance.
- Filter is a client-side case-insensitive substring; debounce optional. Highlight wraps the first
  match run only in the mock — production may highlight all runs.
