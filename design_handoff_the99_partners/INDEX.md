# Handoff package — Partner commanders (#364 · R2)

Serves §6 of `docs/superpowers/specs/2026-09-08-partner-commanders-design.md`
(branch `design/partner-commanders`, PR #465). Decisions **17–23**, continuing
`design_handoff_the99_deck_details_wash/` (11–15).

**R2 redraws the header against #473**, which replaced the deck header's thumb with a full-bleed
`ArtWash` seven hours before R1 drew. R1's decision 16 is withdrawn, 17 narrows to the picker, 18 is
re-anchored, and 22 and 23 are new. The README's *R2 · what changed* table is the supersession record.

## Read in this order

1. **`README.md`** — the rulings. The R2 supersession table first, then decisions 17–23, what is deliberately untouched, and five open items.
2. **`The 99 - Partner Commanders.dc.html`** — the drawings. Canvas: pan/zoom, a **theme** prop (all six), and **showRejected** to read it without the rejected options.
3. **`READINESS.md`** — self-assessment, dependencies, and what R1 does not reopen.
4. **`partners · copy strings.ts`** — four new strings plus three aria forms; five things reused by reference and marked do-not-re-mint.
5. **`The 99 - Partner Commanders (standalone).html`** — the same canvas, self-contained and offline. For anyone without the project.

`brand/` is the locked brand sheet, carried for reference. **Not a colour source** — the canvas reproduces the token contract from `src/app/globals.css`.

## The four §6 calls, in one line each

- **Spine** — **no second portrait.** The band stays the primary’s `left-portrait`; the pair is the caption plus `/ 98`, and the partner’s name opens its printing. Identity label stays on desktop, leaves on mobile.
- **Picker slot** — **absent, not disabled.** Ability printed verbatim + `canPair` count; dashed = not settled, for both the empty plate and the import proposal.
- **Rail + resume** — **primary-only, no diptych.** The rail's pair signal is the `/ 98` the §4 ceiling already gives.
- **Resume name line** — short names joined; ten real characters render `Ishai + Br…`. The count is pinned at its short form and the to-buy clause drops on pair rows.

## Two things eng must not paraphrase

1. **Truncation is an ordered shrink**, never a `flex-none` primary — group `overflow-hidden`, both halves `min-w-0` + ellipsis, partner shrinking first. The `flex-none` version overflows and draws under the count. Decision 18.
2. **A figure is never partly truncated** — the count is pinned at `86 / 98` and the to-buy clause is a separate, droppable span. This overturns the comment at `resume-decks.tsx:115`, deliberately and scoped to that line. Decisions 19 and 23.

## Not from Design

Product confirming oracle text printed to players as a label · Product on the to-buy clause dropping from pair resume rows · eng on the partner name’s trigger affordance and hit area. See README open items 1–3; eng can start against either answer. The two R1 opens about `colorLabel` and `shortCommanderName` are **closed** — see the README’s *Closed since R1*.
