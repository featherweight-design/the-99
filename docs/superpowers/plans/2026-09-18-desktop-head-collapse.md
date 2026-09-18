# Plan — The desktop head takes the collapse too

**Handoff:** `design/design_handoff_the99_set_collections/ADDENDUM-2-*` (R1) · **Verdict:**
🟢 Green, `docs/superpowers/readiness-set-collections-addendum-2.md`

**One PR.** Three files of source, one test file, one probe — well under the split threshold, and
the slices do not separate: the hook without the markup collapses into a head that hides its own
filters, and the markup without the hook is a form nothing reaches.

**No About entry.** Same surface, no new capability — cosmetic by `AGENTS.md`'s test.

---

## Task 1 — `use-head-collapse.ts`: the guard goes, two gates arrive

- `mayCollapse` drops its `!isDesktop` term. It becomes `!deltaFiring` — ~~`&& !panelOpen`~~,
  withdrawn with the gate in Task 2.
- **The `seenDesktop` breakpoint reopen STAYS**, against the handoff's §3, per the verdict:
  `restHeightRef` holds one width's rest height (148 phone, 276 desktop) and the open subtree is
  `display: none` while shy, so a crossing made while collapsed can neither use the recorded
  figure nor re-measure. Reopening is the one action that makes the head measurable again. Its
  comment is rewritten — it no longer says desktop never collapses; it says a crossing is the one
  event that invalidates every measurement this hook holds.
- `HYSTERESIS_PX` becomes `hysteresisFor(isDesktop)`: 80 phone, 120 at `md`. A wheel notch is
  ~100–120px in every major engine, so an 80px band can be crossed in both directions by two
  consecutive notches.
- ~~New parameter `panelOpen`~~ — withdrawn, see Task 2.
- **New: the crossing's SETTLE must not animate either.** Not in the handoff, and found by the
  test that inverts. With the reopen kept, a crossing made while shy reopens the head and the
  scroll listener — re-armed by the same `isDesktop` change — immediately re-decides at the
  reader's offset, usually back to collapsed. That second decision lands in its own commit where
  `crossedBreakpoint` is already false, so without a flag it animates and the reader watches the
  head pop open and slide shut for a window resize.
- **The recorded bar height gains the width it was measured at.** Both widths draw a bar now (52
  and 56) and the old rule was "clear the phone's figure once we are on desktop", which is no
  longer a rule at all.
- **New focus gate.** In `evaluateCollapse`, before `setCollapsed`: if the head is open and
  `document.activeElement` is inside a member the collapse hides, hold. Read at decision time
  rather than through a `focusin`/`focusout` pair — the hook has no focus term today and every
  other input here is already re-read at that point, and the twelve rounds this file cost were all
  lifecycle defects. The hidden members are marked `data-set-shy-hides` in Task 3.

## Task 2 — ~~`filter-panel.tsx`: report the open state~~ — WITHDRAWN, and the gate with it

Built, then measured unreachable and removed. The desktop popover **already dismisses itself on
scroll** (`filter-panel.tsx`'s own `scroll` listener on the open popover), so there is no state in
which a collapse lands under an open panel: `probe:sets` opened the panel, scrolled, and reported
`FAIL … shy=true` — not because the head misbehaved but because there was no open panel left to
hold it. A gate nothing reaches is worse than none, because the next reader takes it for a rule
that holds.

So `filter-panel.tsx` is untouched after all and the file count is back to addendum 2 §6's three.
What replaces the gate is an assertion of the property it was standing in for: the probe now checks
that the panel is dismissed by the same scroll, and the unit suite deliberately does **not** — a
jsdom `scroll` event targets `window`, which is not a `Node`, so the panel's own
`panelRef.contains(target)` guard never runs and a unit test would report the panel open on a build
where it closes.

## Task 3 — `set-grid-view.tsx`: one row, the same nodes

- The phone bar renders on `shy && !isDesktop`. Unchanged otherwise.
- **New: the desktop identity prefix**, on `shy && isDesktop` — 22px `SetIcon`, the `h1` truncating
  at `text-[15px]` (the addendum's own figure for this row), the `baseOwned / baseTotal` ratio with
  its existing `ratioAria`. No search
  button and no `Filters` button: both exist on the phone because its controls are behind a sheet,
  and at `md` the controls themselves are on the row.
- **Rack row 1 stays mounted while shy at `md`.** Its `shy ? "hidden" : "flex"` becomes hidden only
  when `shy && !isDesktop`. The prefix and the row sit on ONE line: a wrapper goes `flex-row` with
  a vertical hairline between them in that state, and the row's `mt-[10px]` goes to 0.
- Rows 2 (chips) and 3 (result line) already hide on `shy` at every width and need no change; the
  result line keeps `sr-only`, so a filter changed from the bar is still announced.
- The open identity block and the cost wrapper already hide on `shy`. Both gain
  `data-set-shy-hides` for Task 1's focus gate, as does the chip line.
- **The prefix is the shrinking member.** It takes `min-w-0` and truncates; the search field keeps
  its `min-w-[132px]` floor. The row must not wrap at the narrowest desktop — see Task 5.
- No `panelOpen` lift — see Task 2.

## Task 4 — `set-grid-view.test.tsx`

Two tests invert and are rewritten rather than deleted:

- `:2538` "never collapses at desktop" — now asserts the collapse happens at `md` and that the cost
  strip goes with it.
- `:2169` "does not animate a crossing to desktop" — keeps its rule, loses its premise. With the
  reopen kept, `shy` still turns off at the crossing, but the stub must report two DIFFERENT
  heights either side or the test passes with the guard deleted.

New, one per claim:

- At `md`, shy renders the field **once** in the document — one element with its accessible name,
  at every offset. The round's load-bearing claim.
- The desktop prefix draws no `Filters` trigger and no back-to-search button.
- No collapse while focus is inside a `data-set-shy-hides` member, and the delta gate still holds
  at `md`. ~~No collapse while the rarity panel is open~~ — withdrawn with the gate in Task 2; the
  probe asserts the panel's own scroll-dismissal instead.
- The band is 120 at `md` and 80 on the phone: collapse at `reopenAt + band`, asserted at both.
- The result line stays `role="status"` and `sr-only` while shy at `md`.

## Task 5 — `scripts/probe-sets.mjs`: the desktop pass

The collapse block runs at 390 only (`:822`). It gains a desktop pass at **1180, 1440 and 768** —
768 because it is the narrowest width at which the rack is inline, and the prefix is a member the
handoff's row arithmetic never carried. Asserted:

- The collapsed bar is **one row**: prefix and field share a vertical centre, and the head's height
  is 56±3 against a rest the probe also measures. **Measured: 57px collapsed against a 300px rest**
  at all three widths on `dsk`, where the handoff derives 56 and 276 — see the verdict's erratum.
  Nothing in code depends on either figure; both heads measure themselves.
- The grid's track count is identical at scroll 0 and scroll 400, at every width.
- The field is present and focusable at both offsets, and there is exactly one of it.
- The name in the prefix is wider than 40px at 768 — the failure mode if the prefix wins the
  shrink is a name at zero, which every other check passes over.
- The rarity panel is dismissed by the same scroll that collapses the head (Task 2).

## Task 6 — Tracker

`design-pipeline-status.md`: the row moves from 🟢 Ready to ✅ Shipped with the PR numbers —
#721 for the drop and the verdict, this PR for the build.
