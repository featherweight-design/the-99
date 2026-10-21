# Help me choose · bracket reach (R1) · account 2, 2026-10-21

**Brief:** `docs/superpowers/design-briefs/2026-10-21-bracket-reach-choice.md` on `main` (#2117).
**Canvas:** https://claude.ai/artifact/QCqMQe8fygDdKeUoV4iF8R ("The 99 · Bracket reach choice R1", account 2).
**Status:** R1 drawn, awaiting Hugh's audit. Nothing on `main`. On approval this goes to `main` as
`design/design_handoff_the99_help_me_choose/addendum-bracket-reach/`, and the How credits work board goes to
`design/design_handoff_the99_about/addendum-credits-entry/`.

Drawn over the shipped components in Neon Rain (kamigawa): `intake-form.tsx` (`BracketRadios`, `Field`),
`choose-row.tsx` (`OwnershipLine`, `Segment`), `create-pre-filled.tsx` + `hand-off-answers.tsx`,
`about/reference/reference-tab.tsx` + `entry-frame.tsx`, `credits/balance.tsx`. Every word is a placeholder for
`/copy-review` (strings in `bracket-reach · copy strings.ts`). Outlined or highlighted pieces are new.

## Boards

| File | What |
|---|---|
| `Main.dc.html` | The five calls, rulings on the states, gaps |
| `Choice-Phone.dc.html` | C at 390: reached, short within budget, after a pick, over budget, only cards I own, nothing reaches |
| `Choice-Desktop.dc.html` | C at 1300, same six |
| `Form.dc.html` | A: the caption under the Bracket radios (seven states at 390, two at desktop) |
| `Rows.dc.html` | B: the reach segment on the ownership line (390, own-only 390, desktop) |
| `About-HMC.dc.html` | Help me choose's entry, with the edit and unchanged, for Hugh to rule on |
| `About-Credits.dc.html` | How credits work, redrawn, on a new Credits screen |

## The five calls

1. **Form (A):** a caption change under the Bracket radios. From 3 up the caption that restates the pick goes on to
   say what a collection-only deck lands in and the cheapest buy (`--fg-muted` when short). It sits above the credit
   press. Bracket 1 and 2 keep today's caption.
2. **Choice (C):** two radio rows inside the hand-off's Bracket row, neither selected. *Create deck →* stays where it
   is, disabled until a pick, with one line in the error slot ("Choose how to build it under Bracket to create the
   deck."). With *Hit* picked, the Budget row's line names the card it pays for first (`budgetFirst`).
3. **Row (B):** one more ownership-line segment led by a locked `BRACKET` label: `lands 3`, `lands 1-2 · 3 adds $32`,
   or `lands 1-2`. Short readings in `--fg-body`. Only when a bracket of 3+ was asked.
4. **Reached:** no deck-page mark; the hand-off line names the owned card that gets there (opens like any card).
5. **Names:** value `3 · Upgraded` as the radios' caption; sentences and options say "bracket 3".

## Rulings

- Over budget: the buy row is pickable and says picking it raises the budget to its cost (alternative drawn in
  words on Main: greyed, with Change, which re-runs the search and can spend a credit).
- Only cards I own: drawn; Hit names the card from outside the collection.
- Nothing reaches: statement with the why; Create deck live.
- Fixed cards above the target: not drawn (filtered on the rank screen today; no trigger).
- No line ever offers mass land denial or an extra-turn loop.

## Gaps

G1 raised budget vs the rest of the fill · G2 nothing-reaches reason not told · G3 heads-up names cards only for a
one-card set · G4 deck page Bracket row after *From my collection* reads the landed bracket (shipped row) · G5 How
credits work moves to a new `credits` screen (`ABOUT_SCREENS`, `credits.webp` per theme); its two Overview keys are
left for Hugh (suggest moving to the Overview entry) · G6 Sai, Master Thopterist stands in for Captain N'ghathrod
(no art in the design folder); prices are placeholders.

## Files

`art/` holds the images as committed (the canvas uses uploaded `/_blob` copies). `scratch-gen/` is the generator
(`python3 build.py local|blob`).
