# Readiness audit: deck tuning addendum r3 (section E)

**Verdict: 🟢 Green.** Audited 2026-09-23 against `origin/main` at `d43a3e9a` (#893) plus
Design's r3 commit. Scope, as the r3 README says: finding 1 of `READINESS-addendum-audit.md` and
the four follow-up items only. All five are drawn or recorded as asked, and nothing here goes
back to Design. Three small engineering notes follow, and none of them blocks PR D.

## The five items

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | **Bracket flag** | Drawn at 1300 and 390, up and down. It uses the shipped `BracketChip`, whose `permits: readonly Bracket[]` prop (`src/components/decks/bracket-chip.tsx:20-24`) takes the stored `bracket_after integer[]` directly (`src/db/schema.ts:1599`). No new mark and no direction colour. The rationale rule (`noBracketClaim`) stands. Hugh's ruling is met. | README §Addendum r3 row 1; canvas section E1/E1b |
| 2 | **Intent line** | Placed second in the header order, wrapping and never truncating; absent means absent. | README row 2; E2/E2b |
| 3 | **Phone frames** | Ready with no games and credits used up at 390, both in the rolling-window copy. | README row 3; E3, E4 |
| 4 | **Ready, games logged, none marked** | Lead and games row drawn at both widths. | README row 4; E5/E5b |
| 5 | **Re-analyze credit note** | Recorded for the synopsis round, not drawn. Correct. | README row 5 |

Design's own `READINESS.md` now records the 2026-09-23 settlements (refunds, the Re-analyze
note, rolling credits), which closes the two Copilot comments declined on #893.

## Engineering notes (PR D and the C-fix PR)

1. **What "raises" and "lowers" mean for a range.** `bracket_after` and the current reading are
   both permit SETS (`[3]`, `[3,4]`), so a swap can widen or narrow a range as well as move it. Rule
   for the build: compare the LOWEST permitted bracket. Higher reads *raises*, lower reads
   *lowers*, and an equal lowest with a different set (for example `[3]` → `[3,4]`) still draws the
   flag with the chip carrying the new range, worded *changes the deck's bracket to*. That third
   string goes through `/copy-review` with the two drawn ones.
2. **The time in the credit line** is drawn as `14:20`. The app's audience reads 12-hour times, so
   format it with the app's existing time formatting, through `/copy-review`, not as a literal.
3. **The intent line lives in the shipped deck header** (`spine-desktop.tsx`, `spine-mobile.tsx`,
   from #889). The analysis-tab lane that built it has closed, so PR D takes those two files, with
   the orchestrator's grant, for the one added line.

## Still open (not Design's)

`READINESS.md`'s remaining item, "C (lifecycle) is approved pending engineering feedback on the
version tie and the draft check", is finding 3 of the addendum audit, which the tuning lane's
C-fix PR decides.
