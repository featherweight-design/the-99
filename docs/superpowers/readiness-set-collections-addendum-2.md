# READINESS — Set collections addendum 2, the desktop head (R1)

**Verdict: 🟢 Green.** Build may start, in **one** PR.

- **Handoff:** `design/design_handoff_the99_set_collections/ADDENDUM-2-*` (R1, 2026-09-18)
- **Amends:** `ADDENDUM-STATES.md` §"The phone head — two states", fifth Must-not only
- **Audited:** 2026-09-18 against `main` at `993438ff`
- **Design self-assessment:** 🟢 Green, five gaps named. Concur on the verdict; three of the
  five gaps are restated below with a decision attached, and one blocker is added that the
  self-assessment could not see because it is in a different file.

One ruling is reversed: the desktop head may now take the collapse the phone head already
has. Everything else in §"The phone head — two states" stands — the two phone heights, the
no-reflow rule, the no-interpolation rule, the delta gate and the reserve.

## Why this is a small round

R3 finding 6 built the mechanism generally rather than for the phone. The reserve is
measured, both offsets are derived from that measurement, and `isDesktop` is already a
parameter of `useHeadCollapse`. The reversal is mostly the deletion of a guard.

Every structural claim in the drop was checked against the tree:

| Claim | Result |
|---|---|
| Desktop rack controls are 32px, so a 34px row clears a lit pip's 2px ring | **True** — `button.tsx:54` `HAIRLINE`, `view-toggle.tsx:67`, `set-grid-view.tsx:1513` |
| The result line is already `sr-only` when shy, at every width | **True** — `set-grid-view.tsx:1298` |
| The chip line already hides on `shy`, at every width | **True** — `set-grid-view.tsx:1107` |
| `cost-strip.tsx` needs no change: `md:flex` always open, both disclosures `md:hidden` | **True** — `cost-strip.tsx:109`, `:137`, `:213` |
| No new copy string: the bar prints the set name and `head.ratioAria`, both shipped | **True** — `set-collections.ts:275-277` |
| `HYSTERESIS_PX` and `isDesktop` are already terms in the hook | **True** — `use-head-collapse.ts` |
| `probe:sets` has no desktop pass over the collapse | **True** — `probe-sets.mjs:822` sets 390 before the whole block and never revisits it |
| Two tests invert with this ruling | **True** — see below |

## The blocker: the drop edits a locked file

Addendum 2 §0 states that the R3 addendum's five files are "**locked and unedited**". They
are not. The drop as it arrived also modified `ADDENDUM-README.md`, deleting nine lines and
adding none — and those nine lines are the **ratification with Hugh of 2026-09-13** recording
that finding 6's move 2 anchors on the **ratio** line rather than the title line, because the
`line-clamp-2` title wraps and the move meant to save 15px cost 15px.

That note is not commentary. The surviving text specifies the title's trailing edge, and the
code does not do that:

```tsx
{sections.indexed ? (
  <span data-set-provenance-short className="md:hidden">
    {" · "}
    {setPageCopy.head.metaShort(code, releasedAt)}
```

— on the ratio `<p>` (`set-grid-view.tsx:786`), with the component's own comment citing the
erratum. With the note deleted the table certifies a design that was measured, rejected and
never shipped.

**Resolution: the deletion is not taken.** This PR lands the three new files only;
`ADDENDUM-README.md` stays as committed. Nothing in addendum 2 depends on the deletion — its
own §0 says the R3 files are untouched, so honouring that claim is the whole fix.

## Gaps, with decisions

1. **The breakpoint reopen cannot simply go — `restHeightRef` goes stale with it.**
   §3 drops `!isDesktop` from `mayCollapse` "and the breakpoint reopen goes with it", naming
   only the *bar* height as needing clearing at a crossing. The rest height is the other one.
   Phone rest is 148 and desktop rest is 276, and while the head is shy its open subtree is
   `display: none` and cannot be measured — so a reader who collapses on the phone and widens
   keeps a spacer reserving 92 where it owes 220. `gridTop` is read off that spacer, so both
   thresholds go with it.

   **Decision: keep the breakpoint reopen.** Clearing the recorded height instead was tried
   during finding 6 and measured worse (the hook's own comment records it), a crossing is
   rare, and reopening is the one action that makes the head measurable again. `mayCollapse`
   drops `!isDesktop`; the `seenDesktop` reopen stays. Eng call, per the standing rule that a
   mechanism with no layout consequence does not go back to Design.

2. **The file table is one file short.** The rarity-panel gate needs the panel's open state,
   which lives in `filter-panel.tsx:199` and is not reported to any caller. `FilterPanel` is
   shared across routes, so the fourth file is `src/components/ui/filter-panel.tsx` and the
   change is an additive optional `onOpenChange`, defaulted so no other caller moves.

3. **The desktop probe is required, not optional.** Design asks whether to add a desktop width
   to `probe:sets` in this PR. A browser probe is the only proof a visual ruling shipped, and
   every ruling in this round — the 56px bar, the rack row surviving as one node, the
   unchanged track count at scroll — is a fact about laid-out geometry that jsdom cannot see.
   **It is a task, not a question.**

4. **The focus gate's mechanism is an engineering call, correctly left open.**
   `contains(document.activeElement)` at decision time, rather than a `focusin`/`focusout`
   pair: the hook has no focus term today, the decision point already re-reads the DOM for
   every other input, and a listener pair adds two more lifecycles to the file whose twelve
   rounds of defects were all lifecycle defects.

5. **The wheel-notch figure is cited, not measured.** 80 → 120 at `md`. Accepted as specified:
   the failure mode of a too-wide band is that the head stays open slightly longer, and the
   probe's desktop pass exercises it either way.

## The two tests that invert

- `set-grid-view.test.tsx:2538` — "never collapses at desktop, however far the reader scrolls"
  asserts the rule being reversed. Rewritten, not deleted: at `md`, scrolling past the
  threshold collapses, and the cost strip goes with it.
- `set-grid-view.test.tsx:2169` — "does not animate a crossing to desktop" keeps its rule but
  loses its premise. It crosses while shy and, with the reopen kept, `shy` now survives the
  crossing; its stub reports the same height either side, so it would pass while measuring
  nothing. It is rewritten to cross between two different heights and assert no `Animation`.

## About entry

**None owed.** This changes where an edge is drawn on a surface the reader already knows and
adds no capability — cosmetic by `AGENTS.md`'s own test, not a feature. No entry, no
`ABOUT_VERSION` bump.

## Sequencing

One PR, after R3 finding 6 (shipped as #574 / #591). Nothing here touches a token, the grid,
the cell, the index row, the delta strip or the modal.
