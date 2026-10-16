# Moments (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Moments** (discovery R1, plan `2026-10-16-moments.md`, handoff `design_handoff_the99_discovery_onboarding/`), behind
  `MOMENTS_ENABLED` (`'true'` on staging, unset on production; PR 1 is the foundation and mounts no moment). A moment is a
  one-time bubble beside a control a reader has not used. Fifteen (M16, Home's Friends card, became a permanent
  Friends section on Home, not a moment), in a FIXED ORDER that breaks ties
  (`src/lib/moments/registry.ts`), each also following its tool's switch (`liveMoments`, from the reader's resolved env;
  none live with the switch off, and the shell then reads nothing). `pickMoment` is the pure rule: one per visit, spent
  never returns, Mana Balance only after Suggested changes is spent.
  The spent set is `user_prefs.moments_spent`, append-only, written only when it adds an id (`spendMomentWrite`), since
  `user_prefs` carries the stamp trigger. A VISIT is client-side, in `localStorage` so two tabs make one, ended by 30
  minutes away (`lib/moments/visit.ts`). The shell mounts `MomentsProvider`, which watches every control registered
  through `useMomentAnchor` with one IntersectionObserver, opens a 600ms tie window on the first on screen, and draws
  `MomentBubble` (a portal at z 35, under every sheet, dialog, menu and toast; inside the topmost modal for a control in
  card details). Nothing arrives while a surface is open over the page, read two ways: `dialog.ts`'s scroll-lock
  counter and `useMomentHold` (the desktop account popover, every `ToastFrame`), and the DOM, where any drawn
  `aria-modal`, `role="dialog"` or `role="menu"` counts, since many surfaces lock nothing; a covered control is looked
  at again each second. A bubble the reader closes
  is spent at once, one the page tears down only after a second on screen, through `spendMomentAction`, which re-checks
  the id is live for the reader. Every moment is spoken once through the provider's one polite live region.
