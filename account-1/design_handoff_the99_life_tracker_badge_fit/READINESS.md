# READINESS · every badge fits · 🟡 Yellow (R1, awaiting Hugh)

Green once Q1 and Q2 are settled.

- The change is local to `src/components/tracker/panel.tsx` (BadgeRow, Chip, compact Badge) and `src/lib/copy/tracker.ts` (4 keys). `scratch-gen/proposal.diff` is a working draft that renders the boards, not shipped code.
- Tests to update: `panel.test.tsx` "draws a badge for each counter in play" reads visible text ("Poison 2"); the words move to aria-label/title. jsdom has no layout, so the fit sees 0 width: tests should stub `clientWidth`/`offsetWidth` or assert on `data-total`.
- `whats-what.tsx` targets `[data-testid="panel-badges"]`: kept, but the row now holds an invisible ruler child; the "badges" hole is drawn from the row rect, so check its `childElementCount > 0` test still means "has badges" (it does: chips or +N are always present when the row exists).
- The ruler is `inert`, `aria-hidden`, `invisible`, so screen readers and Tab see each chip once.
- `ResizeObserver` is used in the client panel only; no SSR path renders the row.
- Desktop is classed as tablet: same code path, no extra work.
