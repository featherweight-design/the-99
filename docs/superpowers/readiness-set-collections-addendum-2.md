# READINESS — Set collections addendum 2, the desktop head (R1)

**Verdict: 🟢 Green.** Build may start, in **one** PR.

- **Handoff:** `design/design_handoff_the99_set_collections/ADDENDUM-2-*` (R1, 2026-09-18)
- **Amends:** `ADDENDUM-STATES.md` §"The phone head — two states", fifth Must-not only
- **Audited:** 2026-09-18 against `main` at `993438ff`
- **Design self-assessment:** 🟢 Green, five gaps named. Concur on the verdict; all five are
  answered below with a decision attached, and one blocker is added that the self-assessment
  could not see because it is in a different file.

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
| `probe:sets` has no desktop pass over the collapse | **True** — the block opens at 390 (`probe-sets.mjs:822`) and every threshold, band, animation and reversal check runs there. It does visit 1280 once, for the breakpoint round trip, but that measures the phone's reserve after the trip rather than a collapsed desktop head |
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

2. **The file table is one file short — and then it is not.** The rarity-panel gate needs the
   panel's open state, which lives in `filter-panel.tsx:199` and is reported to no caller, so
   this was ruled a fourth file taking an additive `onOpenChange`.

   **Built, measured unreachable, and removed — the count is back to three.** The desktop popover
   already dismisses itself on scroll, so there is no state in which a collapse lands under an
   open panel: `probe:sets` opened the panel, scrolled, and reported the head collapsed for want
   of a panel left to hold it. A gate nothing reaches is worse than none, because the next reader
   takes it for a rule that holds. `filter-panel.tsx` is untouched.

   What ships instead is an assertion of the property the gate stood in for — the probe checks the
   panel is dismissed by the same scroll. Deliberately not a unit test: a jsdom `scroll` event
   targets `window`, which is not a `Node`, so the panel's own `panelRef.contains(target)` guard
   never runs and the test would report the panel open on a build where it closes.

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
- `set-grid-view.test.tsx:2169` — "does not animate a crossing to desktop" keeps its rule and
  loses its ENDING. With the reopen kept the crossing still reopens, exactly as it asserts today —
  but the scroll listener is re-armed by the same `isDesktop` change and re-decides at the reader's
  offset, which at the test's 400 is back to collapsed. Its `expect(isShy).toBe(false)` therefore
  fails, and it is rewritten to assert the rule alone: neither the crossing nor the step that
  settles it animates.

  **That settle is a mechanism the handoff does not carry.** The second decision lands in its own
  commit, where `crossedBreakpoint` is already false — so without a flag carrying the crossing into
  the next run, the reader watches the head pop open and slide shut for a window resize. Added in
  the build, with the test above as its proof.

## Errata against the handoff, from the build

1. **The rest head is 300px and the bar is 57, not 276 and 56.** Design's gap 1 names this exactly
   — the figure is summed from type sizes and assumed line heights, and `probe:sets` had no
   desktop pass to check it against.

   **These figures are not evidence in this PR and are not what the verdict rests on.** They come
   off the desktop pass added on the implementation branch, which lands in its own PR; this one
   changes no code and the probe here still has only the 1280px breakpoint round trip. Recorded
   now because the verdict is the document the next reader consults, and it would otherwise carry
   a derivation that the build has already corrected: 57 against 300 at 1440, 1180 and 768 on
   `dsk`.
   The 24px sits in the identity block, where the derivation assumes 1.2/1.45/1.4 line heights.
   **No ruling moves** — both heads measure themselves and no constant in code carries either
   figure — but §2's table is 24px optimistic about the saving, which is 81% rather than 80%.
2. **The rarity-panel gate is not shipped.** See gap 2 above.
3. **The crossing's settle needs suppressing too.** See the 2169 rewrite above.

## About entry

**None owed.** This changes where an edge is drawn on a surface the reader already knows and
adds no capability — cosmetic by `AGENTS.md`'s own test, not a feature. No entry, no
`ABOUT_VERSION` bump.

## Sequencing

One PR, after R3 finding 6 (shipped as #574 / #591). Nothing here touches a token, the grid,
the cell, the index row, the delta strip or the modal.
