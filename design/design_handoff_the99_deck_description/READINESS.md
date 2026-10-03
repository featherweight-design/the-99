# READINESS: deck description and tailored Suggested changes (H35)

**Verdict:** ready to build, pending three yeses that need no redraw: (1) 240 characters, (2) the reading of "the ceiling", (3) the About switch. /copy-review owes a pass on the PLACEHOLDER strings.

## Checklist
- [ ] Every brief deliverable is drawn at 1300 and 390: the empty-state field (idle, typed, loading), the tagline (set, none, editing), and Suggested changes (never run, describing in place, limits set, the run pressed / ticking / writing / long wait, results with refusal).
- [ ] All seven rulings are covered:
  - asked before the first Analyze (1b)
  - editing adds no banner and no model call (no UI)
  - typed answers carry over and seeded lines are cleared (1b, 1f)
  - notes last one press (1k)
  - limits persist per deck (1i)
  - rules win, with one line (1k)
  - an About entry and a bump (1l)
- [ ] Hugh's checklist ruling (2026-10-03) is drawn: a stagger from the press, then a writing row, plus the long wait (1j1–1j4).
- [ ] Shipped surfaces reused, not redrawn:
  - the loading state
  - AnalysisBanner's frame
  - FilterPanel's Set trigger
  - Help me choose's Budget field and Cards for the 99 pair
  - the shipped action row, Stop, the suggestion card
- [ ] `INTENT-where-it-lives.md` has a replacement rationale (`DESCRIPTION-where-it-lives.md`).
- [ ] No em dashes in new strings. Every new string is in the copy file.
- [ ] The engineering security note on Additional notes is recorded (README, note 8).

## Out of scope (per the brief)
H35-E's three engineering fixes, mix-and-match swaps, and suggestion history.

## Eng calls (audit, 2026-10-03 — orchestrator resolved, no Design round needed)

- **Reduced motion on the checklist timer.** The handoff does not address it. Ruling: under
  `prefers-reduced-motion`, keep the staggered timing — it is pacing, not motion — and drop
  only the tick's own animation/transition. Screen readers get ONE announcement at the run's
  start and one at its end, never one per tick, with or without reduced motion.
- **Run start/end announcement, stated explicitly.** The handoff implies one announcement via
  the tagline section but never says "one at the start, one at the end" as plainly as the
  orchestrator's brief does. Build to that wording; no redraw needed, the mechanism already
  matches (`STATES-deck-description.md` §3 row 5-6).
