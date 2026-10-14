# Readiness: the brackets sheet

**R3, self-assessed: 🟢 Green for build.** This answers `READINESS-audit.md` findings 1, 2 and 4, and Hugh's review of R2 (see `README.md`, R3).
Every figure is a constant on `main`, and the chrome is `ModalChrome` with no new props.

## R3 changes

1. **No reader marking on the sheet.** It is a reference with five bracket columns, and it does not read `verdict.permits`.
2. **No aside.** `ModalChrome` gets a title and a close label only.
3. **Quotes (Hugh, 2026-09-24).** Each note entry gets one verbatim Wizards line tagged with its post, six in all.
   New slots: `bracketsSheet.quotes`, `quoteTag`, `quotedFrom` and `corner`, plus two new source constants for `sources.ts`.
4. **Climb contrast (finding 1).** Text on the yours rung is `--fg`, with a minimum of 8.73:1 across six themes (it was 3.90).

## Check before ship

1. `/copy-review` opens both quote posts and confirms each line is still verbatim, since the posts are revised in place.
2. Findings 7 and 8 (the lead and tutors wording) stay with `/copy-review`. The lead was rewritten in R3.

## Engineering, in order

1. The foot link in `BracketClimb`, under the rungs box: `aria-haspopup` and local `open` state.
2. On the yours rung in `bracket-climb.tsx`, the name, role label, and Allowances name and count change to `var(--fg)`.
3. `BracketsSheet` in `ModalChrome` `width={700}`. Cells come from the four limit constants and `COMBO_POLICY`, with 4–5 as `climb.noCap`.
   The grid transposes below `md`.
4. The notes list is built from `bracketsSheet.readings` and `quotes`, with `FindingMark` and `BracketMark` (20px chips in the 4–5 entry).

## Closes

- Verdict `READINESS.md`, engineering item 8.
- Analysis tab `READINESS.md`, "Still owed": `see all brackets →`.
