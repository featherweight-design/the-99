# Gap report — collection Set filter panel (plan phase 6)

design-review skill, three passes against
`docs/superpowers/design-tables/collection-filter-panel.md` (961 rows, enumerated from
`design/design_handoff_the99_collection_filter` before any code was written).

**VERDICT: 0 gaps remain.** Mobile and desktop both checked. Verify found 10 visual + 5 state
gaps; 12 fixes landed in `17c41fe`; the confirm pass re-checked each one and found none
outstanding.

## Behavioural gaps

1. **The mobile sheet had no way out of the no-results state.** `{!noResults && renderFooter()}`
   dropped the footer on both breakpoints, but the design drops it desktop-only — on mobile the
   footer holds the only `Done` button, so a search matching nothing trapped the user behind an
   `aria-modal` sheet. Now `(!noResults || !isDesktop)` (`filter-panel.tsx:539`).

2. **Tab out of the desktop popover left it open.** Outside clicks and `Esc` dismissed it, but
   keyboard focus leaving the subtree did not. Added `onPanelBlur`, which closes when
   `relatedTarget` falls outside the panel and trigger.

3. **`Clear` announced the toggled-off string at exactly one selection.** `browser.tsx` inferred
   the intent from `after.length === 0 && before.length > 1`, so clearing a single set fell
   through to `announceRemoved`. Replaced the count inference with an explicit
   `FilterChangeIntent` (`"clear-sets"`) threaded from the control that caused the change.

4. **Options carried no list position**, so the design's "2 of 254" screen-reader announcement was
   unreachable. Added `aria-posinset` / `aria-setsize` computed over the flat visible list, which
   continues across group boundaries rather than restarting per group.

5. **Drag-to-dismiss was a second close button, not a drag.** The sheet handle was focusable and
   clickable; the design specifies a pointer drag. Now a real pointer-drag dismissal
   (`DRAG_DISMISS_PX = 80`) on an `aria-hidden` handle, with `Done` and `Esc` remaining the
   accessible exits.

## Visual gaps

6. Search icon size, placeholder colour and focus ring were being changed in the shared
   `SearchField` primitive rather than at this call site. Reverted to overriding from the caller —
   `twMerge` means caller classes win for the same property — via one new optional
   `iconClassName` prop. Confirmed the four other `SearchField` call sites
   (`filter-bar.tsx`, `decks/search-pane.tsx`, `decks/create-picker.tsx`,
   `collection/issue-inspector.tsx`) render byte-identically.
7. The bottom scroll fade rendered in the sheet as well; the design confines it to the popover.
8. Option rows were `items-start`; the table specifies vertical centring.
9. The hover fill on the keyboard-active row was being overridden with `hover:bg-transparent`,
   which depends on Tailwind class ordering. The hover class is now withheld entirely when
   `isActive`.
10. Trigger label did not track `aria-expanded`.
11. Sheet search input padding and the group-header sticky offset.
12. Trigger chevron rotation transition duration.

## Deviations kept deliberately — flagged for Design ratification

- **Disabled zero-count rows fail AA contrast by design** (`opacity: .42` plus `aria-disabled`).
  WCAG exempts inactive controls; this is the handoff's specified treatment, not a defect.
- **Counts are computed under the structured filters only, excluding the collection free-text
  search**, so a set's number stays stable while the user types. This is how the handoff draws it.
- **The sheet search input stays at 14px**, accepting Safari's iOS focus zoom rather than adding a
  global `maximum-scale=1`. There is no `viewport` export in `src/` today and the existing
  collection search is already 14px, so raising this one input would be the inconsistent choice.
- **Trigger uses `rounded-full md:rounded-lg` and `text-[12.5px] md:text-[13px]`**, which
  contradict the table rows as written but match the shipped `Type ▾` / `Sort ▾` siblings it sits
  beside. Matching the neighbours was judged the smaller divergence.
