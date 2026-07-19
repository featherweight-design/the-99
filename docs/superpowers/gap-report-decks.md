# Design Gap Report — Decks surface (#8)

Date: 2026-07-19 · Branch: `feat/8-decks` · Table: `docs/superpowers/design-tables/decks.md`

## Process

- **Agent 2 (dual-pass verify, opus):** 15 decks components (AppShell Rail + Bottom Tab Bar skipped — shipped in #5) + 38 State Coverage states. Result: 28 visual gaps, 2 state gaps. Full report: `.superpowers/sdd/design-gate-agent2.md`.
- **Fix round 1 (commit `79c50d6`):** all 28 visual gaps fixed — deck-card + spine progress-fill colors rebucketed on `built` (≥99 `#6FA368` / ≥55 `#E0913C` / <55 `#C6533F`; dead `progressColor` field removed from `read.ts`), 22 mobile/desktop pixel splits moved to Tailwind `md:` classes across `create-pre-filled`, `create-picker`, `builder-spine`, `role-counter-cell`, `degraded-banner`, 3 conditional-rendering fixes (helper text on mobile, export header border mobile-only, shopping callout desktop-only), empty-mark desktop clipped to 104×112.
- **Agent 3 (confirm-only):** all 28 visual gaps + state gap 1 verified FIXED. **VERDICT: 0 gaps remain.**

## Accepted deviations

1. **Export sheet overlay `position: fixed`** (table says `absolute`) — the sheet is not portaled; `fixed` produces the correct full-viewport dim. Intentional.
2. **Shopping-list prices omitted** — table marks prices as "planned feature"; v1 exports names only.
3. **Download `.txt` parity** — downloaded file matches the displayed/copied text exactly (built by shared `export-helpers`).
4. **Legal-strip `legal: true` prop not modeled** (state gap 2) — server validation gates rendering of `CreatePreFilled`; an invalid `?commander=` falls through to the picker. No failure UI exists in the design, so a boolean prop would be dead code.

## Verdict

0 outstanding gaps. Ready for ship PR.
