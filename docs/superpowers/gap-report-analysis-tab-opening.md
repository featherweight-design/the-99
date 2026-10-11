# Gap report: Analysis tab §8, opening the tab (8a)

The design-review pass for the opening loader, run against
`docs/superpowers/design-tables/analysis-tab-opening.md`. Agent 1 enumerated the table from the
handoff alone. It applied the readiness audit's engineering corrections: keep the header chip, add
a reduced-motion rule of 8a's own, withhold the mix, and put `aria-busy` on the tabpanel. Agent 2
verified the table and Agent 3 confirmed the fix.

**Verdict: 0 gaps remain.** One was fixed and one was decided.

## Visual

| # | Gap | Resolution |
|---|---|---|
| 1 | The loader's marks had no resting opacity. With the 0.16s stagger and no fill mode, marks 2 to 5 sat at full ink until their delay ended. A browser running no animation drew all five at full ink. | FIXED. `.at-wave-rest { opacity: 0.22 }`, the wave's low point, applied to the loader's marks only. Superseded 2026-10-11: the loader is now the reading ring, and `.anim-at-wave` carries `animation-fill-mode: backwards`, which holds a waiting mark at the same 0.22 for the ring everywhere; `.at-wave-rest` is gone. `probe:tab-opening` reads mark 5 at 0.22 on the loader's first frame. Removing the rule reads 1 and fails. |

## State reachability

| # | Gap | Resolution |
|---|---|---|
| 1 | Press Analyze on a deck, move to another deck while the press is in flight, then come back. The peek no-ops for the deck with a press out, so 8a is drawn over the in-flight press, and the press's reply waits out the 400ms hold. | DECIDED, not changed. Settling the peek there would draw 2a, the not-analyzed ring, over an analysis that is running, which is the wrong answer rather than a slow one. The loader describes that moment correctly, the wait is at most 400ms, and the case needs a press, a deck change and a return inside one press's flight. |

## Decisions carried from the audit

- **The reading is not loaded server-side.** The gate is the stored permits the page already ships (the audit's "cheaper route"). No stored analysis draws 2a at once, with no loader and no delay. Otherwise the tab draws 8a until the peek settles. Shipping the reading would put a 33-40 KB document on every deck page load, and would need a variant of `readStoredReading` that never runs its quiet rebuild inside a render.
- **The header chip stays drawn** (audit correction 1). It is server-rendered from the permits, so it is already known.
- **Reduced motion:** the loader's marks hold still at 0.5, by a rule that outranks the ring's `opacity: 1` without changing it (correction 2). `probe:tab-opening` reads 0.5, and reads 1 with the rule removed.

## Copy, for /copy-review

- `deckAnalysisCopy.panel.opening`: `Loading…`, as the canvas draws it.
