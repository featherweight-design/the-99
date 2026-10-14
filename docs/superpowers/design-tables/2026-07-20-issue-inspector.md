# Design Property Table + Verification — Issue Inspector (#36)

Source: `design/design_handoff_the99_issue_inspector/README.md` § Component notes (authoritative) + `Issue Inspector - Claude Code brief.md` § acceptance criteria + `Issue Inspector - copy strings.js` (verbatim copy).

Implementation files verified:
- `src/components/collection/issue-inspector.tsx`
- `src/components/collection/issue-inspector-list.tsx`
- `src/components/collection/card-fan-mark.tsx`
- `src/components/collection/review-screen.tsx`
- `src/lib/a11y/dialog.ts`
- `src/lib/copy/issue-inspector.ts`
- `src/lib/collection/issue-filter.ts`

Token map (`src/app/globals.css`): `--bg`=`#14110E`, `--surface`=`#1E1A15`, `--surface-raised`=`#221D16`, `--surface-rail`=`#1A160F`, `--surface-sunken`=`#181410`, `--border`=`#2A241D`, `--border-strong`=`#3A3229`, `--fg`=`#EDE6D8`, `--fg-body`=`#C6B79A`, `--fg-muted`=`#A89B84`, `--fg-faint`=`#8E8269`, `--fg-locked`=`#6A6152`, `--brass`=`#C9A24B`, `--brass-mid`=`#A9863E`, `--success`=`#6FA368`, `--warning`=`#E0913C`, `--danger`=`#C6533F`.

---

## Component: Dialog / Sheet container

| Property | Mobile (design → impl) | Desktop (design → impl) | Verdict |
|---|---|---|---|
| width | 100vw (full-screen sheet) → `w-full h-full` | 660px → `md:w-[660px]` | ✅ |
| max-height | (viewport) → `h-full` | ~600–640px → `md:max-h-[640px]` | ✅ |
| background | `#14110E` (--bg) → `bg-[color:var(--surface-sunken)]` | `#1A160F` (--surface-rail) → `md:bg-[color:var(--surface-rail)]` | ❌ mobile uses `--surface-sunken` (#181410) not `--bg` (#14110E) |
| border | — → — | `1px #3A3229` → `md:[border:1px_solid_var(--border-strong)]` | ✅ |
| border-radius | — → — | 16px → `md:rounded-2xl` | ✅ |
| box-shadow | — → same | `0 40px 100px rgba(0,0,0,.7)` → same inline | ✅ |
| overflow | hidden → `overflow-hidden` | hidden → `overflow-hidden` | ✅ |

## Component: Backdrop (desktop only)

| Property | Desktop (design → impl) | Verdict |
|---|---|---|
| background | `rgba(8,6,4,.72)` → same inline | ✅ |
| backdrop-filter | `blur(3px)` → `backdropFilter: blur(3px)` + `-webkit-` fallback | ✅ |
| click behavior | closes dialog | ✅ (`onClick={onClose}` on backdrop + `stopPropagation` on dialog) |

## Component: Header

| Property | Mobile | Desktop | Verdict |
|---|---|---|---|
| title font-family | Cinzel → `font-display` | Cinzel → `font-display` | ✅ |
| title font-weight | 700 → `font-bold` | 700 → `font-bold` | ✅ |
| title font-size | 19px → `text-[19px]` | 22px → `md:text-[22px]` | ✅ |
| title color | `#EDE6D8` → `var(--fg)` | `#EDE6D8` → `var(--fg)` | ✅ |
| subtitle font-family | Plex Mono → `font-mono` | Plex Mono → `font-mono` | ✅ |
| subtitle font-size | 11.5px → `text-[11.5px]` | 11.5px → `text-[11.5px]` | ✅ |
| subtitle color | `#8E8269` → `var(--fg-faint)` | `#8E8269` → `var(--fg-faint)` | ✅ |
| subtitle text | `file · N of T rows skipped` | same | ✅ (copy helper) |
| close ✕ background | `#221D16` → `var(--surface-raised)` | same | ✅ |
| close ✕ border | `1px #3A3229` → `1px solid var(--border-strong)` | same | ✅ |
| close ✕ size | 32×32 (my choice, README unspec) | 32×32 | (n/a) |
| close ✕ hover | brass → `hover:[color:var(--brass)]` | same | ✅ |
| close ✕ DOM order | (n/a) | last-in-dialog per Design tab-order intent | ❌ close is first in DOM, breaks stated tab order |

## Component: Header help line / hoisted zero-note

| Property | Design → Impl | Verdict |
|---|---|---|
| help line font-family | Plex Sans → `font-sans` (default) | ✅ |
| help line font-size | 12px → `text-[12px]` | ✅ |
| help line color | `#A89B84` → `var(--fg-muted)` | ✅ |
| zero-note background | `#181410` → `var(--surface-sunken)` | ✅ |
| zero-note left border | `3px #6FA368` → `3px solid var(--success)` | ✅ |
| zero-note radius | 8px → `rounded-lg` | ✅ |
| zero-note dot | success | `background: var(--success)`, 8×8, rounded-full | ✅ |
| zero-note text color | Plex Sans `#A89B84` → `var(--fg-muted)` | ✅ |
| conditional | zero-note when either tab total = 0, else help line | ✅ |

## Component: Tab list + Tab button

| Property | Design → Impl | Verdict |
|---|---|---|
| tablist role | `role=tablist` + `aria-label` | ✅ |
| tab font-family | Plex Sans → `font-sans` | ✅ |
| tab font-weight | 600 → `font-semibold` | ✅ |
| tab font-size | 14px → `text-[14px]` | ✅ |
| tab padding | 10px 4px 13px → `pt-[10px] px-[4px] pb-[13px]` | ✅ (no Tailwind class conflict) |
| active color | `#EDE6D8` → `var(--fg)` | ✅ |
| active underline | `inset 0 -2px 0 #C9A24B` → `inset 0 -2px 0 var(--brass)` | ✅ |
| idle color | `#8E8269` → `var(--fg-faint)` | ✅ |
| disabled color | `#5A5245` → `var(--fg-locked)` (`#6A6152`) | ⚠️ near-match: token differs by ~12 units; use existing `--fg-locked` (per plan's Tokens-not-hex constraint) |
| disabled opacity | .7 → `0.7` | ✅ |
| disabled cursor | not-allowed → `disabled:cursor-not-allowed` | ✅ |
| `aria-disabled` on empty tab | required → set | ✅ |
| native `disabled` on empty tab | required → set | ✅ |
| `tabIndex=-1` on unselected | required (roving) → set | ✅ |
| count pill font-family | Plex Mono → `font-mono` | ✅ |
| count pill font-size | 11px → `text-[11px]` | ✅ |
| count pill radius | 999px → `rounded-full` | ✅ |
| count pill tint (unmatched) | `rgba(224,145,60,.14)` bg / `#E0913C` text → same | ✅ |
| count pill tint (errors) | `rgba(198,83,63,.16)` bg / `#C6533F` text → same | ✅ |
| count pill tint (0 → success) | `rgba(111,163,104,.14)` bg / `#6FA368` text → same | ✅ |
| roving arrow-key focus | Left/Right/Home/End cycle enabled tabs, skip disabled | ✅ (`onKeyDown` handler) |

## Component: Filter input

| Property | Mobile | Desktop | Verdict |
|---|---|---|---|
| container background | `#181410` → `var(--surface-sunken)` | same | ✅ |
| container border | `1px #3A3229` → `1px solid var(--border-strong)` | same | ✅ |
| container radius | 8px → `rounded-lg` | same | ✅ |
| container height | 44px → `h-[44px]` | 40px → `md:h-[40px]` | ✅ |
| leading ⌕ color | `#8E8269` → `var(--fg-faint)` | same | ✅ |
| input color | `#EDE6D8` → `var(--fg)` | same | ✅ |
| input font-size | 14px → `text-[14px]` | same | ✅ |
| input autofill/spellcheck | off | off | ✅ (`autoComplete="off" spellCheck={false}`) |
| clear ✕ visibility | shown only when filled | shown only when filled | ✅ |
| clear ✕ background | `#2A241D` (--border) | same | ❌ impl uses `var(--surface-raised)` (#221D16), off by one token step |
| clear ✕ aria-label | "Clear filter" | same | ✅ (verbatim copy) |
| focus border | `#C9A24B` (brass) | same | ❌ input has `outline-none` and no custom focus border — missing |
| focus ring | `0 0 0 3px rgba(201,162,75,.16)` | same | ❌ missing (same fix as above) |
| debounce | ~120ms (per brief.md §2) | same | ✅ (`rawQuery`/`query` state pair) |
| placeholder text | copy helper | copy helper | ✅ |

## Component: Result count

| Property | Design → Impl | Verdict |
|---|---|---|
| font-family | Plex Mono → `font-mono` | ✅ |
| font-size | 11px → `text-[11px]` | ✅ |
| color idle | `#8E8269` → `var(--fg-faint)` | ✅ |
| color filtering-with-hits | `#C6B79A` → `var(--fg-body)` | ✅ |
| color Showing 0 | `#E0913C` → `var(--warning)` | ✅ |
| aria-live | zero-match only (SR-only sibling) | ✅ (visual count has no aria-live) |
| text format | `Showing {n} of {total}` | ✅ (copy helper) |

## Component: Unmatched row

| Property | Mobile | Desktop | Verdict |
|---|---|---|---|
| background | `#1E1A15` → `var(--surface)` | same | ✅ |
| border | `1px #2A241D` → `1px solid var(--border)` | same | ✅ |
| left border | `3px #E0913C` → `3px solid var(--warning)` | same | ✅ |
| radius | 8px → `rounded-lg` | same | ✅ |
| min-height | ~40px → `minHeight: 40` | same | ✅ |
| name font | Plex Sans → default | Plex Sans → default | ✅ |
| name font-size | 13px → `text-[13px]` | 14px → `md:text-[14px]` | ✅ |
| name color | `#EDE6D8` → `var(--fg)` | same | ✅ |
| name overflow | nowrap ellipsis → `truncate` | same | ✅ |
| meta font | Plex Mono → `font-mono` | same | ✅ |
| meta font-size | 10.5px → `text-[10px]` mobile, `md:text-[10.5px]` desktop | 10.5px → `md:text-[10.5px]` | ⚠️ mobile 10px is 0.5px smaller than spec's 10.5; acceptable |
| meta color | `#8E8269` → `var(--fg-faint)` | same | ✅ |
| meta text | `line X · set Y · no match` (long) / `L{line} · {set} · no match` (compact) | (long) | ✅ (copy helpers) |
| quantity font | Plex Mono → `font-mono` | same | ✅ |
| quantity color | `#8E8269` → `var(--fg-faint)` | same | ✅ |
| quantity text | `×{qty}` | same | ✅ (copy helper) |

## Component: Parse-error row

| Property | Mobile | Desktop | Verdict |
|---|---|---|---|
| background | `#1E1A15` → `var(--surface)` | same | ✅ |
| border | `1px #2A241D` → `1px solid var(--border)` | same | ✅ |
| left border | `3px #C6533F` → `3px solid var(--danger)` | same | ✅ |
| radius | 8px → `rounded-lg` | same | ✅ |
| line badge width | 46px → `width: 46` | same | ✅ |
| line badge font | Plex Mono → `font-mono` | same | ✅ |
| line badge color | `#C6533F` → `var(--danger)` | same | ✅ |
| line badge font-size | 10.5px → `text-[10.5px]` mobile, `md:text-[11px]` desktop | 11px → `md:text-[11px]` | ✅ |
| line badge text | `L{line}` | same | ✅ (copy helper) |
| reason font | Plex Sans → default | same | ✅ |
| reason line-height | 1.45 → `lineHeight: 1.45` | same | ✅ |
| reason color | `#C6B79A` → `var(--fg-body)` | same | ✅ |
| reason text | as-is from backend | as-is | ✅ (per copy note + Task 6 addendum) |
| offending value bolded | design mock shows bold portions | not rendered | ⚠️ deferred — backend emits plain strings, per Task 6 addendum (out of scope for #36) |

## Component: Match highlight (`<mark>`)

| Property | Design → Impl | Verdict |
|---|---|---|
| background | `rgba(201,162,75,.28)` → same | ✅ |
| color | `#EDE6D8` → `var(--fg)` | ✅ |
| border-radius | 2px → `borderRadius: 2` | ✅ |
| scope | all matched runs (Yellow #3) | ✅ (`findMatchRanges` returns all runs; `HighlightedText` wraps each) |

## Component: Empty-filter state

| Property | Design → Impl | Verdict |
|---|---|---|
| card-fan mark | brand secondary, inline SVG: three FILLED 26×38 cards, radius 5, 1.5px border, -16°/0°/+16° 10px apart, opacity 0.9, 52px phone / 56px desktop, 18/20px above the title | ✅ (`<CardFanMark />`: per-card token fills lightening back to front, front card on `--accent`; was stroke-only 16×24 until prod walk 2026-09-28 item 4) |
| title font | Cinzel 600 → `font-display font-semibold` | ✅ |
| title text | `No names match "{query}"` (curly quotes) | ✅ (copy helper renders `“…”`) |
| body text | Plex Sans, `None of the {n} unmatched names …` | ✅ (copy helper) |
| body color | (unspecified) → `var(--fg-muted)` | ✅ |
| Clear filter button | primary brass | ✅ (`background: var(--brass), color: var(--bg)`) |

## Component: Entry-point CTA (review page)

| Property | Design → Impl | Verdict |
|---|---|---|
| location | below both preview columns | ✅ (after the 2-col grid, `md:justify-center` centered on desktop) |
| single CTA (not per-column) | required | ✅ (both per-column "Show all N …" buttons removed) |
| copy | `View all {total} issues →` where total = unmatched + errors | ✅ (`issueInspectorCopy.entry.cta(skipped)`) |
| conditional | only when skipped > 0 | ✅ |
| initial tab on open | Unmatched by default, Parse errors when Unmatched empty | ✅ (`initialInspectorTab` computed from row counts) |

## A11y baseline

| Requirement | Verdict |
|---|---|
| Focus trap while open | ✅ (`useDialogA11y`) |
| Esc closes | ✅ |
| Backdrop click closes (desktop) | ✅ |
| First focus = filter input | ✅ (`initialFocusRef` option on extended `useDialogA11y`) |
| Focus restore to trigger on close | ✅ (`useDialogA11y` cleanup captures/restores `document.activeElement`) |
| Tab order: filter → clear → tabs → list → close | ❌ current DOM order gives close → tabs → filter → clear (wrapped); close is first in DOM |
| `role=tablist`/`role=tab`/`aria-selected` | ✅ |
| Roving arrow-key focus (Left/Right/Home/End) | ✅ |
| Disabled tab: `aria-disabled` + native `disabled` + non-focusable | ✅ |
| `role=tabpanel` + `aria-labelledby` | ✅ (panel id = `issue-inspector-panel-{tab}`, labelledby = `issue-inspector-tab-{tab}`) |
| Color never the only signal (3px state borders, badge text) | ✅ |
| `prefers-reduced-motion` respected | ✅ (no animations added) |

---

## Gap list

### Blockers (must fix before push)

None.

### Meaningful (fix before push)

1. **Mobile sheet background** — should be `var(--bg)` (#14110E), currently `var(--surface-sunken)` (#181410). File: `src/components/collection/issue-inspector.tsx` dialog className. One-token swap.
2. **Filter clear button background** — should be `var(--border)` (#2A241D), currently `var(--surface-raised)` (#221D16). File: `src/components/collection/issue-inspector.tsx` clear button style.
3. **Filter input focus ring missing** — design specifies `border: var(--brass) + ring 0 0 0 3px rgba(201,162,75,.16)`. Input has `outline-none` and no focus style. Fix: add focus-within styles on the container div (border → brass, add box-shadow ring).
4. **DOM tab order** — close button is first in DOM; design's stated tab order requires it last. Fix: move the `<button ✕>` out of the header div to the end of the dialog contents, position it absolutely (`position: absolute; top: 18; right: 20` mobile / `md: top: 22; right: 26` desktop). Dialog container already has effective `position: relative` via flex context — may need explicit `relative`.

### Deferred (out of scope for #36, filed for follow-up)

5. **Disabled tab color exactness** — `--fg-locked` (`#6A6152`) vs design's `#5A5245` (12 units off). Existing token used per plan's "tokens, not hex" constraint. Could add a new `--fg-locked-strong` token in a follow-up if Design flags it.
6. **Parse-error offending-value bolding** — design mock shows bold portions of reason strings; backend emits plain strings without markup. Consistent with Task 6 addendum's decision.

### Design-review-round-2 (Hugh's browser walk, 2026-07-20)

Fixed inline in this PR:

7. **Sticky bar CTA copy** — "Continue to replace" wrong when there's no existing collection to replace. Branched on `preview.currentCollectionCount === 0` (matches confirm-modal branching from #48). Fix in `review-screen.tsx`. *Not scoped to #36 but caught in the same walk.*
8. **List last-row clipping** — `IssueInspectorList`'s plain `<ul>` was capped at fixed `maxHeight: 420` which cut off partial rows at the boundary. Refactored to flex-fill the panel; tabpanel wrapper became `flex flex-col h-full`. Virtualized branch (>150 rows) now uses `ResizeObserver` to measure container and pass numeric height to `FixedSizeList`. Fix in `issue-inspector-list.tsx` + `issue-inspector.tsx`.
9. **Filter input reflow on last-character-deleted** — clear ✕ was conditionally rendered (`{rawQuery !== "" && ...}`), so removing the last char caused the input to jump wider by 22px + gap. Changed to always-rendered with `visibility: hidden` + `tabIndex=-1` when empty; layout stays stable. Fix in `issue-inspector.tsx`.

Filed for Design follow-up (not fixed in this PR):

10. **Empty-tab zero-note contrast** — Design's spec uses `--surface-sunken` (`#181410`) as the callout background on top of `--bg` (`#14110E`) mobile / `--surface-rail` (`#1A160F`) desktop — a ~2-unit green-channel delta that renders as near-invisible. The green 3px left border + dot + text carry the semantic, but Hugh flagged that visually the callout container disappears against the modal background. **Not an eng fix — Design's own token choice.** Options for a Design revisit:
    - Bump callout bg to `--surface` (`#1E1A15`) — more visible
    - Add a subtle green tint via `rgba(111,163,104,0.06)` bg
    - Accept as-is (semantic carried by border/dot/text)
    Punt to Design decision; no PR change here.

11. **List body virtualization height on mobile edge case** — even after fix #8, the virtualized branch (>150 rows on full-screen mobile sheet) hasn't been visually verified. `useMeasuredHeight` should work but wasn't in Hugh's browser walk. Flag for follow-up if the edge case ships broken.

---

## Verdict

**Round 1: 4 meaningful gaps fixed** (all localized to `issue-inspector.tsx`).
**Round 2: 3 more gaps fixed** (CTA copy, list clipping, input jump) after Hugh's browser walk.
1 gap deferred to Design (zero-note contrast). No blockers remaining.

Re-verify pre-push gate, then push.
