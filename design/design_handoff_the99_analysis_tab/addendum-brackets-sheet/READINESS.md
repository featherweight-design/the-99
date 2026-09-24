# Readiness: the brackets sheet

**Self-assessed: 🟢 Green for build, with one wording check.** Every figure is a constant on `main`, and the
chrome is `ModalChrome` with no new props.

## Check before ship

1. **The four explanation lines and the tutors line are our paraphrase.** They are written from the comments in
   `rules.ts`, not from Wizards' post, which the design tools could not fetch this round.
   - `/copy-review` should read them against the post once.
   - After that, `lastChecked` moves only when `rules.ts` and the post have been read side by side, as `sources.ts` requires.
   - Two claims need checking:
     - "removed the tutor limit in October 2025", taken from `comboLandsEarly`'s comment;
     - "late in a game" for B3 combos.

## Engineering, in order

1. The foot link in `BracketClimb`, under the rungs box: `aria-haspopup`, local `open` state.
2. `BracketsSheet` in `ModalChrome` `width={700}`. Cells come from the four limit constants and
   `COMBO_POLICY`, never transcribed. `limits` is not needed: the sheet is the same for every deck except the marking.
3. The reader's marking comes from `verdict.permits`: tint the columns in 1–3 and the Optimized · cEDH row for 4 and 5.
4. Strings go in `deckAnalysisCopy.bracketsSheet` (see `brackets-sheet · copy strings.ts`).

## Closes

- Verdict `READINESS.md`, engineering item 8.
- Analysis tab `READINESS.md`, "Still owed": `see all brackets →`.

The `[3,4]` split item there was already settled on 2026-09-20 (`permitsFor`). This sheet's combo line
describes the resolved rule.
